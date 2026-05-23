import { oaiChat, oaiImage, pollinationsUrl, IMG_STYLE } from './openai.js';
import { parseScriptStringToUiNodes } from './script-parser.js';

export { parseScriptStringToUiNodes };

export async function stageArchitect(userPrompt) {
  const schema = `{
  "genre": "ROMANCE|THRILLER|MYTHOLOGY",
  "title": "2-4 word Hinglish title",
  "city": "Indian city",
  "secret": "one sentence — a specific past event involving a named character that the protagonist is hiding or hasn't faced",
  "logline": "one sentence: protagonist, disruption, stakes",
  "story_rules": ["concrete and checkable constraint — if broken, any reader would notice", "key plot constraint a scene cannot contradict", "unique world or character detail"],
  "protagonist": {
    "name": "first name",
    "story_goal": "the concrete thing they want by episode 6 — a person, an answer, an escape, a confession",
    "motivation": "one sentence — why this matters to them personally",
    "nature": "1-2 word disposition — impulsive / guarded / observant / loyal-to-a-fault / etc.",
    "past": "one specific prior event that shapes how they react — different from secret; this one they remember, the secret is what's hidden",
    "voice_card": ["casual/relaxed — natural Hinglish", "uncertain/worried — different emotion", "under pressure/urgent — stressed register"]
  },
  "characters": [{"name": "first name", "role": "relationship to protagonist and story function"}],
  "episodes": [
    {
      "episode_number": 1,
      "title": "2-3 words Hinglish",
      "scene_objectives": ["Scene 1 — mid-action entry, no backstory", "Scene 2 — complication or escalation", "Scene 3 — revelation that recontextualizes Scene 1"],
      "target_cliffhanger": "exact Hinglish sentence Scene 3 ends on — must be a physical impossibility or an external threat made visible, NOT internal reflection",
      "choice_question": "Hinglish dilemma question",
      "choice_a": {"label": "3-5 words"},
      "choice_b": {"label": "3-5 words"}
    }
  ]
}`;

  return oaiChat([
    { role: 'system', content: `You are the lead story architect for Katha, an Indian interactive fiction app.

GENRE FRAMEWORK:
- ROMANCE: Modern Indian setting. Class, family, or generational tension is the dominant conflict. Romance is obstructed by social structure, not personality.
- THRILLER: Paranoia or high-stakes survival. Protagonist starts ordinary; the world they wake into is not.
- MYTHOLOGY: A modern character is disrupted by an ancient force they did not believe in. The supernatural arrives through physical wrongness, never through music or vocabulary.

CORE PRINCIPLES:
1. The "secret" is a specific hidden past event — a concrete fact, not an interpretation. It must name what happened, who was involved, and what was concealed. WRONG: "The protagonist carries guilt from his past." RIGHT: "Seven years ago Ravi hit a cyclist with his car, filed a false police report blaming the cyclist, and the family never learned the truth."
2. story_rules must be CONCRETE and CHECKABLE — if broken in any episode, any reader would immediately notice. WRONG: "The faceless man represents fear." RIGHT: "Ravi has never owned or driven a vehicle since age 19 — he takes autos everywhere." Each rule is a specific constraint on character, world, or plot.
3. target_cliffhanger is the exact Hinglish sentence Scene 3 ends on, word for word. It must be a physical impossibility or an external threat made visible — NOT internal reflection. WRONG: "Matlab, kya woh sab meri wajeh se tha?" (internal reflection). RIGHT: "Woh aadmi bina chehre ke, bina pair ki awaaz ke, seedha darwaze ke doosri taraf khada tha." (physical impossibility).
4. choice_a and choice_b must encode a real character-level tension — each side sacrifices something different (survival vs loyalty, truth vs safety, self vs others). The label itself stays concrete and short (3-5 words, what the player does); the trade-off lives in what each choice causes in the next episode, not in spelled-out moral text. WRONG label: "Sacrifice your honour for safety." RIGHT label: "Chup raho aur nikalo." Let the player feel the cost; do not state it.
5. Episodes must escalate. Ep1 establishes; eps 2-5 complicate and branch; ep6 resolves.

VOICE CARD RULES:
- voice_card lines must be primarily Hinglish — Hindi syntax with natural English words only.
- The 3 lines must show 3 DIFFERENT emotional registers: one casual/relaxed, one uncertain/worried, one under pressure/urgent.
- Each line should reveal how this specific person speaks — their rhythm, their vocabulary, how they hold back or push forward. The voice emerges from the lines themselves, not from a named tic.
- WRONG (generic registers, no character): "Yeh sahi nahi hai." / "Kya kar raha hai woh?" / "Bhago yahan se!"
- RIGHT (specific person, distinct voice): "Yaar sun, aaj office mein kuch ajeeb hua — bilkul samajh nahi aaya." / "Woh ladka... kya pata uska kya irada tha." / "Ek kaam kar, phone mat rakh — main aa raha hoon abhi."

OUTPUT: A single valid JSON object. No markdown fences. Start with { and end with }.` },
    { role: 'user', content: `User premise: "${userPrompt}"

FIDELITY (non-negotiable): every specific element the user mentioned — character traits, profession, age, setting details, named events, relationships, named objects — MUST appear in the blueprint exactly as described. Do not generalize, substitute, or "improve" them. If the user said "UPSC aspirant in Lucknow", the protagonist is a UPSC aspirant in Lucknow, not an engineering student in Delhi. The user's specifics anchor the story; you invent the rest around them.

Build the complete blueprint. Include all 6 episodes. Episodes 1-5 have choice_question, choice_a, choice_b. Episode 6 omits those fields (no choice, it resolves).

For episodes 2-6, also include "scene_objectives_a" and "scene_objectives_b". CRITICAL: scene_objectives_a[0] MUST describe the specific physical situation the player enters as a direct consequence of choosing choice_a from the previous episode. scene_objectives_b[0] MUST describe the specific physical situation from choosing choice_b. These are causally tied to the choice label — not generic story beats. Example: if choice_a was "Bhaago wahan se" then scene_objectives_a[0] = "Scene 1 — protagonist mid-run, faceless man visible in auto mirror still chasing". If choice_b was "Rukne ko kaho" then scene_objectives_b[0] = "Scene 1 — auto has stopped, protagonist now face-to-face with the faceless man on a silent road".

Schema:
${schema}` }
  ], 'gpt-5.4');
}

export async function stageScenesV3({ blueprint, episodeNumber, story_state, prev_last_sentence, choice_label, branch, banned_lines }) {
  const epPlan = blueprint.episodes[episodeNumber - 1];
  const isFirst = episodeNumber === 1;
  const sceneObjectives = branch === 'b'
    ? (epPlan.scene_objectives_b || epPlan.scene_objectives || [])
    : branch === 'a'
    ? (epPlan.scene_objectives_a || epPlan.scene_objectives || [])
    : (epPlan.scene_objectives || []);
  const obj1 = sceneObjectives[0] || 'Open mid-action';
  const obj2 = sceneObjectives[1] || 'Escalate the conflict';
  const obj3 = sceneObjectives[2] || 'End on the target cliffhanger';

  const stateBlock = story_state
    ? `STORY STATE (maintain continuity from previous episode):\n${JSON.stringify(story_state)}`
    : '';
  const prevBlock = prev_last_sentence
    ? `Previous episode's last sentence: "${prev_last_sentence}" — Scene 1 must flow from this.`
    : 'This is Episode 1 — open mid-action, zero backstory or exposition.';
  const choiceBlock = choice_label
    ? `BRANCH PATH (non-negotiable): The player chose "${choice_label}". Scene 1 MUST open with the direct physical consequence of this choice already in motion. If the choice was to stop something, Scene 1 opens with it stopped or stopping. If the choice was to run, Scene 1 opens mid-run. The first sentence of Scene 1 must make this choice consequence unmistakable. Do not write a Scene 1 that could belong to the other branch.`
    : '';
  const bannedBlock = (banned_lines && banned_lines.length)
    ? `BANNED PHRASES (do NOT repeat or paraphrase):\n${banned_lines.slice(-24).join('\n')}`
    : '';

  const antiPattern = `ANTI-PATTERN (do NOT write like this):
Rahul was feeling very nervous. The room felt cold and tense. He said: "Priya, I am worried about this situation." Priya looked at him with concern in her eyes. She said: "I understand your feelings." There was a lot of tension between them.`;

  return oaiChat([
    { role: 'system', content: `You write one episode of three scenes for Katha, an Indian interactive fiction app.

OUTPUT FORMAT (CRITICAL):
- Each scene is a single string in the "script" field.
- Action/setting goes inside *asterisks*. Dialogue goes outside asterisks, on its own line.
- EVERY dialogue line MUST start with the speaker's name in ALL-CAPS followed by a colon: "RIYA: Yaar sun..." — no exceptions. No quotation marks. Never nest asterisks.
- SCENE STRUCTURE: Open with an *action block*, then let the scene breathe. Dialogue can happen even when a character is alone — calling out, muttering, speaking into a phone. But never use dialogue to announce a discovery or state an emotion out loud ("Yeh marker... main isse pehchanta hoon" is exposition, not dialogue). Never have the same character speak twice in a row.
- WORD LIMIT: Every *action block* must be under 35 words. Count before writing. If it exceeds 35 words, cut until it doesn't.
- SCENE LENGTH: Every scene (action blocks + dialogue combined) must be under 80 words total. Count before writing. If it exceeds 80 words, cut dialogue lines first, then trim action blocks.
- DIALOGUE CAP: Maximum 4 dialogue lines per scene (2 exchanges). No exceptions. Every extra dialogue line you are tempted to write must become an action beat instead — that trade is always better.
- WRONG: *Office mein sab log the. Tension tha.* / Kab aaya? / Abhi.
- RIGHT: *Usne file table par rakh di, haath nahi kaanpe — bas ek baar.* / ROHAN: Kab aaya? / *Woh ruk gaya, jawaab dene se pehle.* / ARJUN: Abhi hi.

NARRATOR LANGUAGE (CRITICAL — applies to EVERY *action beat* in the scene, not just the opening):
- Every single *asterisk block* anywhere in the scene is Hindi-dominant Hinglish. No exceptions.
- English enters ONLY where an urban Indian person would naturally use it — "exit", "meeting", "phone", "deadline". Not as narration style.
- NO literary English constructions anywhere inside asterisks: no "she felt a chill", no "the atmosphere was tense", no "he couldn't help but notice".
- WRONG: *She felt nervous as she entered the crowded room.*
- RIGHT: *Haath kaamp raha tha. Andar se awaaz aa rahi thi — bahut log the, bahut shor.*

LANGUAGE:
- Roman-script Hinglish — Hindi-English code-switching the way urban Indian 18-30 year olds actually speak.
- Code-switch AT the emotionally loaded word, not at random.
- Concrete object similes over adjective declarations: "like a glass placed too close to a table edge" > "scared."
- Repetition with one altered element does emotional work.
- Shortest sentence in a scene is the heaviest. Land scenes on short final sentences.
- One Sanskrit or Urdu loanword per scene maximum — when one appears, it lands with weight. Do not pile them.
- Direct address (beta, yaar, sir, bhaiya) is the load-bearing texture of Indian dialogue.

CRAFT:
- Scene 1 of every episode must open with a hook — a line that creates an unanswered question in the reader's mind within the first 10 words. WRONG: *Rahul office pahuncha.* RIGHT: *Rahul ne phone uthaya — tera call nahi tha.*
- Open all scenes mid-action. No backstory or exposition.
- Show emotion through action, never through statement.
- Use the simplest word that does the job. Never stack two adjectives onto one noun. If a description needs more than one modifier, rewrite it as an action beat instead. WRONG: *hara hua dhua sa register* RIGHT: *aadha jala register* or *register ke pages ki raakh ungliyon pe chipak gayi*
- Scene 3 MUST end with this exact sentence word for word, placed INSIDE asterisks as a narrator action line (e.g. *${epPlan.target_cliffhanger || ''}*). It must NOT appear outside asterisks as a dialogue line.

STORY CONTEXT:
Genre: ${blueprint.genre} | City: ${blueprint.city}
Story rules: ${(blueprint.story_rules || []).join(' | ')}
Secret (drives subtext — never name it directly): ${blueprint.secret || ''}
Protagonist: ${blueprint.protagonist?.name}
Protagonist nature: ${blueprint.protagonist?.nature || ''}
Protagonist's story goal: ${blueprint.protagonist?.story_goal || ''}
Why it matters to them: ${blueprint.protagonist?.motivation || ''}
Past event that shapes their reactions (surface in subtext, never explain): ${blueprint.protagonist?.past || ''}
Characters: ${(blueprint.characters || []).map(c => `${c.name} (${c.role})`).join(', ')}

PROTAGONIST VOICE CARD:
${(blueprint.protagonist?.voice_card || []).map((l, i) => `${i + 1}. ${l}`).join('\n')}

${stateBlock}
${prevBlock}
${choiceBlock}
${bannedBlock}

${antiPattern}

OUTPUT: Single valid JSON object, no markdown fences.` },
    { role: 'user', content: `Write Episode ${episodeNumber} of "${blueprint.title}".

Scene objectives:
1. ${obj1}
2. ${obj2}
3. ${obj3}

CLIFFHANGER REQUIREMENT: Scene 3 must end with this sentence copied word for word, wrapped in *asterisks* as a narrator line — do not paraphrase, do not translate, do not alter a single word, do not place it as dialogue outside asterisks:
*${epPlan.target_cliffhanger || ''}*

HARD LIMITS — check before outputting:
- Every scene: under 80 total words
- Every scene: max 4 dialogue lines (2 exchanges)
- Every action block: under 35 words

Output:
{
  "scenes": [
    {"scene_number": 1, "script": "..."},
    {"scene_number": 2, "script": "..."},
    {"scene_number": 3, "script": "... ends with exact cliffhanger inside *asterisks*"}
  ]
}` }
  ], undefined, { max_completion_tokens: 2000 });
}

export function stageValidate(epScenes, blueprint, episodeNumber = 1) {
  const epPlan = blueprint.episodes[episodeNumber - 1];
  const cliffhanger = epPlan?.target_cliffhanger || '';
  const scenes = epScenes?.scenes || [];
  const issues = [];

  for (let i = 0; i < scenes.length; i++) {
    const script = scenes[i].script || '';
    const sceneNum = i + 1;

    if (sceneNum === 3) {
      const lines = script.split('\n').map(l => l.trim()).filter(Boolean);
      const lastLine = lines[lines.length - 1];
      const expectedBlock = `*${cliffhanger}*`;
      if (lastLine !== expectedBlock) {
        issues.push(`Scene 3: cliffhanger is not the final standalone *asterisk block*. Expected: ${expectedBlock}`);
      }
    }

    const dialogueLines = script.split('\n').filter(l => /^[A-Z][A-Z\s]+:/.test(l.trim()));
    for (let j = 0; j < dialogueLines.length - 1; j++) {
      const speaker1 = dialogueLines[j].split(':')[0].trim();
      const speaker2 = dialogueLines[j + 1].split(':')[0].trim();
      if (speaker1 === speaker2) {
        issues.push(`Scene ${sceneNum}: ${speaker1} speaks twice in a row.`);
        break;
      }
    }

    const actionBlocks = [...script.matchAll(/\*([^*]+)\*/g)].map(m => m[1]);
    for (const block of actionBlocks) {
      const wordCount = block.trim().split(/\s+/).length;
      if (wordCount > 35) {
        issues.push(`Scene ${sceneNum}: action block exceeds 35 words (${wordCount} words): "${block.trim().slice(0, 60)}..."`);
      }
    }

    const allLines = script.split('\n').filter(l => l.trim() && !l.trim().startsWith('*'));
    for (const line of allLines) {
      if (!/^[A-Z][A-Z\s]+:\s/.test(line.trim())) {
        issues.push(`Scene ${sceneNum}: dialogue line missing ALL-CAPS speaker label: "${line.trim().slice(0, 60)}"`);
      }
    }

    const totalWords = script.trim().split(/\s+/).length;
    if (totalWords > 80) {
      issues.push(`Scene ${sceneNum}: total scene length is ${totalWords} words (limit: 80).`);
    }

    if (dialogueLines.length > 4) {
      issues.push(`Scene ${sceneNum}: ${dialogueLines.length} dialogue lines (limit: 4).`);
    }
  }

  return { pass: issues.length === 0, issues, target_node: null, revised_script: null };
}

export async function stageStoryState(epResult, blueprint, episodeNumber, branch) {
  const scenes = branch ? (epResult[branch.toUpperCase()]?.scenes || []) : (epResult?.scenes || []);
  const scriptsText = scenes.map((s, i) => `Scene ${i + 1}:\n${s.script}`).join('\n\n---\n\n');
  return oaiChat([
    { role: 'system', content: `Extract a compact story state from these scenes. Output raw JSON only, no markdown fences.
{"relationships":[{"pair":"string","state":"string"}],"active_mysteries":["string"],"emotional_state":"string","objects":["string"],"character_goals":["string"]}
Keep each string under 20 words. Total output must be under 150 tokens.` },
    { role: 'user', content: `Story: "${blueprint.title}" — Episode ${episodeNumber}${branch ? ` (Branch ${branch.toUpperCase()})` : ''}
Characters: ${(blueprint.characters || []).map(c => c.name).join(', ')}

Scenes:
${scriptsText}` }
  ], 'gpt-5.4-mini', { max_completion_tokens: 200 });
}

export function extractBannedLinesV3(epResult) {
  const lines = [];
  for (const s of (epResult?.scenes || [])) {
    if (!s.script) continue;
    const nodes = parseScriptStringToUiNodes(s.script);
    for (const n of nodes) {
      n.text.split(/[.!?।]+/).map(x => x.trim()).filter(x => x.length > 12).forEach(x => lines.push(x));
    }
  }
  return lines;
}

export function extractLastSentenceV3(epResult) {
  const scenes = epResult?.scenes || [];
  if (!scenes.length) return '';
  const last = scenes[scenes.length - 1];
  if (!last?.script) return '';
  const text = last.script.replace(/\*/g, '').trim();
  const parts = text.split(/[.!?।]+/).map(s => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || '';
}

export function buildCoverPromptV3(blueprint) {
  const style = IMG_STYLE[blueprint.genre] || IMG_STYLE.MYTHOLOGY;
  return style.prefix + ' ' + (blueprint.logline || blueprint.title) + ' ' + style.suffix;
}

export function buildEpisodeImagePrompt(blueprint, epNum) {
  const epPlan = blueprint.episodes[epNum - 1];
  const style = IMG_STYLE[blueprint.genre] || IMG_STYLE.MYTHOLOGY;
  const city = blueprint.setting?.city || blueprint.city || 'India';
  const mood = epPlan?.scene_objectives?.[0] || epPlan?.title || '';
  return style.prefix + ' ' + city + '. ' + (blueprint.protagonist?.name || 'protagonist') + '. ' + mood + '. ' + style.suffix;
}

export function assembleStoryV3(blueprint, allEpisodes, coverImg) {
  const episodes = blueprint.episodes.map((epPlan, i) => {
    const epData = allEpisodes ? allEpisodes[i] : null;
    const isFirst = i === 0;
    const isLast = i === blueprint.episodes.length - 1;

    if (isFirst) {
      return {
        title: epPlan.title || 'Episode 1',
        scenes: epData?.scenes || [],
        choice: {
          q: epPlan.choice_question || 'Aage kya hoga?',
          A: { text: epPlan.choice_a?.label || 'Option A' },
          B: { text: epPlan.choice_b?.label || 'Option B' }
        }
      };
    }

    const scenesA = epData?.A?.scenes || [];
    const scenesB = epData?.B?.scenes || (scenesA.length ? scenesA : []);

    if (isLast) {
      return { title: epPlan.title || 'Ek Ant', scenesA, scenesB };
    }

    return {
      title: epPlan.title || ('Episode ' + (i + 1)),
      scenesA,
      scenesB,
      choice: {
        q: epPlan.choice_question || 'Aage kya hoga?',
        A: { text: epPlan.choice_a?.label || 'Option A' },
        B: { text: epPlan.choice_b?.label || 'Option B' }
      }
    };
  });

  return {
    title: blueprint.title,
    genre: blueprint.genre,
    cover_img: coverImg || '',
    version: 'v3',
    episodes
  };
}

export function assembleCreditsV3(blueprint) {
  return (blueprint.episodes || []).slice(0, 5).filter(ep => ep.choice_a).map((ep, i) => ({
    name: i === 0 ? (blueprint.protagonist?.name || 'PROTAGONIST').toUpperCase() : (ep.title || ('Episode ' + (i + 1))).toUpperCase(),
    A: ep.choice_a?.label || '',
    B: ep.choice_b?.label || ''
  }));
}
