// generate-stories-v8.mjs — Katha v8 pipeline: Architect → Screenwriter → Validator
// EP1+EP2 single branch, ONE choice at end of EP2, EP3-6 branch A/B.
// Architect: gpt-5.4 | Screenwriter/State: gpt-5.4-mini
// Scene limits: 140 words / 5 dialogue lines. No story_rules. No action block limit.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Buffer } from 'buffer';

const __dir = dirname(fileURLToPath(import.meta.url));

const envText = readFileSync(join(__dir, '.env'), 'utf8');

const OPENAI_KEY = envText.match(/OPENAI_API_KEY\s*=\s*"?([^"\n]+)"?/)?.[1]?.trim();
if (!OPENAI_KEY) { console.error('No OPENAI_API_KEY in .env'); process.exit(1); }

const PREMISES = [
  'Ek famous detective ko ek aisi crime scene par bulaya gaya jahan victims ki body par wahi nishaan hain jo uski apni diary mein bane hain.',
  'Ek corporate office mein boss aur employee jo din bhar ek dusre se ladte hain, par raat ko wahi dono ek anonymous dating app par best friends bane baithe hain.',
];

// ─── API: OpenAI ──────────────────────────────────────────────────────────────

async function gptRaw(messages, model, maxTokens) {
  const maxRetries = 4;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model, max_completion_tokens: maxTokens, messages }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`); }
      const d = await res.json();
      const raw = d.choices?.[0]?.message?.content?.trim() || '';
      if (!raw) throw new Error('Empty response from model');
      return raw;
    } catch (e) {
      lastErr = e;
      const transient = /HTTP (429|5\d\d)|fetch failed|terminat|reset|ECONNRESET|network|socket|timeout/i.test(e.message);
      if (transient && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 800 * 2 ** (attempt - 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function gptJSON(messages, model, maxTokens) {
  const raw = await gptRaw(messages, model, maxTokens);
  const fenced = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/s);
  const parsed = JSON.parse(fenced ? fenced[1].trim() : raw);
  return { parsed, raw };
}

// ─── Stage 1: Architect ───────────────────────────────────────────────────────

const ARCHITECT_SYSTEM = `You are a story architect for Katha, an Indian interactive fiction app set in modern Indian cities.

Given a one-sentence premise, build a complete story blueprint JSON. This is the single source of truth — the screenwriter cannot invent anything not declared here.

STORY SHAPE:
Episode 1 — single branch, 3 scenes, no choice
Episode 2 — single branch, 3 scenes, ONE choice at the very end (this is the ONLY choice in the entire story)
Episodes 3–6 — two branches (A and B), 3 scenes each. Each branch ends on its OWN cliffhanger.
Total: 30 scenes generated. Player reads 18 — episodes 1 and 2 (6 shared scenes), then one full branch of episodes 3–6 (12 scenes).

CRITICAL RULES:

secret: must name what happened, who was involved, what was concealed.
WRONG: "carries guilt." RIGHT: "Seven years ago Ravi hit a cyclist, filed a false police report blaming the cyclist, family never knew."

target_cliffhanger (EP1, EP2): a physical impossibility or external threat made visible. NOT internal reflection.
WRONG: "Matlab, kya yeh sab meri wajeh se tha?" RIGHT: "Woh aadmi bina chehre ke seedha darwaze ke doosri taraf khada tha."

CRITICAL — EP3–6 cliffhangers: Each branch (A and B) ends on its OWN cliffhanger sentence. They do NOT share one. Branch A and Branch B are in different physical situations — their endings must reflect that.
Use fields: "target_cliffhanger_a" and "target_cliffhanger_b" for episodes 3–6.

choice_a / choice_b labels (on EP2 only): concrete actions (what the player does), not moral statements.
WRONG: "Sacrifice your honour." RIGHT: "Chup raho aur nikalo."

scene_objectives_a[0] / scene_objectives_b[0] (EP3 only): must describe the specific physical situation the player enters as direct consequence of choosing that branch at EP2.

voice_card: 3 lines of Hinglish in different emotional registers — casual, uncertain, under pressure. Specific to this character's rhythm and vocabulary.

CHARACTER NAMES: avoid overused Bollywood names — Rahul, Priya, Meera, Arjun, Kabir, Rhea, Rohan, Naina, Dev, Vikram, Riya, Ananya, Ishaan. Use authentic but less common Indian names.

FIDELITY: every specific element the user mentioned must appear exactly as given. Never generalize.

OUTPUT: valid JSON only, no markdown fences.

{
  "genre": "ROMANCE|THRILLER|MYTHOLOGY",
  "title": "2-5 word Hinglish title apt for this specific story",
  "city": "Indian city",
  "secret": "specific past event naming what happened, who, what was concealed",
  "logline": "protagonist, disruption, stakes",
  "protagonist": {
    "name": "first name only",
    "story_goal": "the concrete thing they want by episode 6",
    "motivation": "why this matters to them personally",
    "nature": "1-2 word disposition",
    "past": "prior event that shapes reactions — not the secret",
    "voice_card": ["casual register Hinglish line", "uncertain register Hinglish line", "under pressure register Hinglish line"]
  },
  "characters": [
    {"name": "first name only", "role": "relationship + story function in one sentence"}
  ],
  "episodes": [
    {
      "episode_number": 1,
      "scene_objectives": ["Scene 1 objective", "Scene 2 objective", "Scene 3 objective"],
      "target_cliffhanger": "exact Hinglish sentence"
    },
    {
      "episode_number": 2,
      "scene_objectives": ["Scene 1 objective", "Scene 2 objective", "Scene 3 objective"],
      "target_cliffhanger": "exact Hinglish sentence",
      "choice_question": "Hinglish dilemma question",
      "choice_a": {"label": "3-5 word action label"},
      "choice_b": {"label": "3-5 word action label"}
    },
    {
      "episode_number": 3,
      "scene_objectives_a": ["direct physical consequence of choice_a", "...", "..."],
      "scene_objectives_b": ["direct physical consequence of choice_b", "...", "..."],
      "target_cliffhanger_a": "exact Hinglish sentence for Branch A ending",
      "target_cliffhanger_b": "exact Hinglish sentence for Branch B ending"
    }
  ]
}

Episodes 4–5: same structure as episode 3 (scene_objectives_a, scene_objectives_b, target_cliffhanger_a, target_cliffhanger_b).
Episode 6: same structure as episodes 4–5 — story ends here, no further episodes.`;

async function runArchitect(premise) {
  const { parsed: blueprint, raw: rawOutput } = await gptJSON(
    [{ role: 'system', content: ARCHITECT_SYSTEM }, { role: 'user', content: `Premise: ${premise}` }],
    'gpt-5.4',
    8000
  );
  return { blueprint, rawOutput, systemPrompt: ARCHITECT_SYSTEM, userMessage: `Premise: ${premise}` };
}

// ─── Stage 2: Screenwriter ────────────────────────────────────────────────────

function writerSystem(bp) {
  const vc = bp.protagonist.voice_card || [];
  return `You write one episode of three scenes for Katha, an Indian interactive fiction app.

OUTPUT FORMAT (CRITICAL):
- Each scene is a single string in the "script" field.
- Action/setting goes inside *asterisks*. Dialogue goes outside asterisks, on its own line.
- EVERY dialogue line MUST start with the speaker's name in ALL-CAPS followed by a colon: "RIYA: Yaar sun..." — no exceptions. No quotation marks. Never nest asterisks.
- SCENE STRUCTURE: Open with an *action block*, then let the scene breathe. Dialogue can happen even when a character is alone — calling out, muttering, speaking into a phone. But never use dialogue to announce a discovery or state an emotion out loud. Never have the same character speak twice in a row.
- SCENE LENGTH: Every scene (action blocks + dialogue combined) must be under 140 words total. Count before writing. If it exceeds 140 words, cut dialogue lines first, then trim action blocks.
- DIALOGUE CAP: Maximum 5 dialogue lines per scene. No exceptions. Every extra dialogue line must become an action beat instead.

SENTENCE COMPLETENESS (CRITICAL — every *asterisk block*):
- Every sentence inside *asterisks* must have a subject and a verb. No noun-phrase fragments. No em-dash shortcuts in place of a verb.
- WRONG: *Rudra — aam insaan ab, handcuffed.*
- RIGHT: *Rudra jo ki ab ek aam insaan tha, usko handcuffed kiya tha.*
- WRONG: *Mahalaxmi mandir ke bahar. Police van ruki hui.*
- RIGHT: *Mahalaxmi mandir ke bahar police van ruki hui thi.*

SCENE-TO-SCENE CONTINUITY (CRITICAL):
- No invisible gaps between scenes. If no time has passed, Scene 2 opens exactly where Scene 1 ended.
- If time has passed, the first line names it explicitly: *Ek ghante baad.*
- If location changed, the first action block shows the movement: *Woh bhaagi. Auto pakda, Bandra bol diya.*
- The reader must never wonder "how did we get here?"

SHORT REACTIONS (CRITICAL):
- Short reactions (Kya..., Matlab?, Haan.) go inside *asterisks* as action beats when they are responses to a physical event — NOT as standalone dialogue lines.
- This preserves your dialogue cap for real exchanges.

NARRATOR LANGUAGE (CRITICAL — applies to EVERY *action beat*, not just the opening):
- Every single *asterisk block* anywhere in the scene is Hindi-dominant Hinglish. No exceptions.
- English enters ONLY where an urban Indian person would naturally use it — "exit", "meeting", "phone", "deadline". Not as narration style.
- NO literary English constructions: no "she felt a chill", no "the atmosphere was tense", no "he couldn't help but notice".
- WRONG: *She felt nervous as she entered the crowded room.*
- RIGHT: *Haath kaamp raha tha. Andar se awaaz aa rahi thi — bahut log the, bahut shor.*

LANGUAGE:
- Roman-script Hinglish — Hindi-English code-switching the way urban Indian 18-30 year olds actually speak.
- Code-switch AT the emotionally loaded word, not at random.
- Use the simplest word that does the job. Never stack two adjectives onto one noun.
- Concrete object similes over adjective declarations: "like a glass placed too close to a table edge" > "scared."
- Repetition with one altered element does emotional work.
- Shortest sentence in a scene is the heaviest. Land scenes on short final sentences.
- One Sanskrit or Urdu loanword per scene maximum.
- Direct address (beta, yaar, sir, bhaiya, aunty) is load-bearing texture. Always use "aunty" — never "aunt".

CRAFT:
- Scene 1 of every episode must open with a hook — a line that creates an unanswered question within the first 10 words.
- Open all scenes mid-action. No backstory or exposition.
- Show emotion through action, never through statement.
- Scene 3 MUST end with the target_cliffhanger word for word, placed INSIDE asterisks as a narrator action line. Must NOT appear as dialogue.

STORY CONTEXT:
Genre: ${bp.genre} | City: ${bp.city}
Secret (drives subtext — never name it directly): ${bp.secret}
Protagonist: ${bp.protagonist.name}
Nature: ${bp.protagonist.nature}
Goal: ${bp.protagonist.story_goal}
Why it matters: ${bp.protagonist.motivation}
Past event (surface in subtext, never explain): ${bp.protagonist.past}
Characters: ${(bp.characters || []).map(c => `${c.name} (${c.role})`).join(', ')}

PROTAGONIST VOICE CARD:
1. ${vc[0] || ''}
2. ${vc[1] || ''}
3. ${vc[2] || ''}

ANTI-PATTERN (do NOT write like this):
Rahul was feeling very nervous. The room felt cold and tense. He said: "Priya, I am worried about this situation." Priya looked at him with concern in her eyes. She said: "I understand your feelings." There was a lot of tension between them.`;
}

function writerUserMsg({ epNumber, title, objectives, cliffhanger, branch, choiceLabel, storyState, bannedLines, prevLastLine }) {
  const branchBlock = branch
    ? `\nBranch: ${branch} — player chose "${choiceLabel}"`
    : '';

  const stateBlock = storyState
    ? `\nSTORY STATE (from previous episode):\n${JSON.stringify(storyState, null, 2)}`
    : '';

  const prevBlock = prevLastLine
    ? `\nPREVIOUS EPISODE LAST SENTENCE (for continuity): ${prevLastLine}`
    : '';

  const bannedBlock = bannedLines?.length
    ? `\nBANNED LINES (phrases from prior episodes — do NOT reuse):\n${bannedLines.map(l => `- ${l}`).join('\n')}`
    : '';

  return `Write Episode ${epNumber} of "${title}".${branchBlock}

Scene objectives:
1. ${objectives[0]}
2. ${objectives[1]}
3. ${objectives[2]}

CLIFFHANGER REQUIREMENT: Scene 3 must end with this sentence copied word for word, wrapped in *asterisks* as a narrator line — do not paraphrase, do not translate, do not alter a single word, do not place it as dialogue outside asterisks:
*${cliffhanger}*
${stateBlock}${prevBlock}${bannedBlock}

HARD LIMITS — check before outputting:
- Every scene: under 140 total words
- Every scene: max 5 dialogue lines

Output:
{
  "scenes": [
    {"scene_number": 1, "script": "..."},
    {"scene_number": 2, "script": "..."},
    {"scene_number": 3, "script": "... ends with *${cliffhanger}*"}
  ]
}`;
}

// ─── Validator ────────────────────────────────────────────────────────────────

function validate(scenes, cliffhanger, castNames) {
  const hardIssues = [];
  const softIssues = [];

  if (!scenes || scenes.length === 0) {
    hardIssues.push('0 scenes produced');
    return { pass: false, hardIssues, softIssues };
  }

  for (let i = 0; i < scenes.length; i++) {
    const script = scenes[i].script || '';
    const n = i + 1;

    // Hard: cliffhanger must be last line of Scene 3
    if (n === 3) {
      const lines = script.split('\n').map(l => l.trim()).filter(Boolean);
      const lastLine = lines[lines.length - 1];
      if (lastLine !== `*${cliffhanger}*`) {
        hardIssues.push(`Scene 3: cliffhanger not the final standalone *asterisk block*`);
      }
    }

    // Hard: unknown speaker
    const dialogueLines = script.split('\n').filter(l => /^[A-Z][A-Z\s.]+:\s/.test(l.trim()));
    if (castNames?.length) {
      for (const dl of dialogueLines) {
        const speaker = dl.split(':')[0].trim();
        if (!castNames.includes(speaker)) {
          hardIssues.push(`Scene ${n}: unknown speaker "${speaker}" — not in cast`);
        }
      }
    }

    // Hard: same character twice in a row
    for (let j = 0; j < dialogueLines.length - 1; j++) {
      const s1 = dialogueLines[j].split(':')[0].trim();
      const s2 = dialogueLines[j + 1].split(':')[0].trim();
      if (s1 === s2) { hardIssues.push(`Scene ${n}: ${s1} speaks twice in a row`); break; }
    }

    // Hard: missing ALL-CAPS speaker label
    const nonAction = script.split('\n').filter(l => l.trim() && !l.trim().startsWith('*'));
    for (const line of nonAction) {
      if (!/^[A-Z][A-Z\s.]+:\s/.test(line.trim())) {
        hardIssues.push(`Scene ${n}: missing ALL-CAPS label: "${line.trim().slice(0, 60)}"`);
      }
    }

    // Soft: total scene over 140 words
    const wc = script.trim().split(/\s+/).length;
    if (wc > 140) softIssues.push(`Scene ${n}: ${wc} words (limit 140).`);

    // Soft: more than 5 dialogue lines
    if (dialogueLines.length > 5) softIssues.push(`Scene ${n}: ${dialogueLines.length} dialogue lines (limit 5).`);
  }

  return { pass: hardIssues.length === 0, hardIssues, softIssues };
}

// ─── Write one episode (with retry) ──────────────────────────────────────────

async function writeEpisode({ epNumber, branch, objectives, cliffhanger, blueprint, storyState, bannedLines, prevLastLine, choiceLabel }) {
  const sys = writerSystem(blueprint);
  const castNames = [
    blueprint.protagonist.name.toUpperCase(),
    ...(blueprint.characters || []).map(c => c.name.toUpperCase()),
  ];

  const userMsg = writerUserMsg({
    epNumber,
    title: blueprint.title,
    objectives,
    cliffhanger,
    branch,
    choiceLabel: choiceLabel || null,
    storyState,
    bannedLines,
    prevLastLine,
  });

  const attempts = [];
  let finalScenes = null;
  let finalIssues = [];
  let degraded = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let raw = '', parsed = null;
    try {
      const res = await gptJSON(
        [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
        'gpt-5.4-mini', 2000
      );
      raw = res.raw;
      parsed = res.parsed;
    } catch (e) {
      attempts.push({ attempt, error: e.message });
      if (attempt < 3) continue;
      degraded = true;
      finalIssues = [e.message];
      break;
    }

    const scenes = parsed?.scenes || [];
    const vr = validate(scenes, cliffhanger, castNames);
    attempts.push({ attempt, rawOutput: raw, validatorResult: vr });

    if (vr.pass && vr.softIssues.length === 0) {
      finalScenes = { scenes };
      break;
    }

    if (vr.pass && vr.softIssues.length > 0) {
      finalScenes = { scenes };
      finalIssues = vr.softIssues;
      degraded = true;
      break;
    }

    if (attempt === 3) {
      if (scenes.length > 0) {
        finalScenes = { scenes };
        finalIssues = [...vr.hardIssues, ...vr.softIssues];
        degraded = true;
      } else {
        degraded = true;
        finalIssues = vr.hardIssues;
      }
    }
  }

  return { result: finalScenes, issues: finalIssues, degraded, attempts, systemPrompt: sys, userMessage: userMsg };
}

// ─── Story State (Stage 4) ────────────────────────────────────────────────────

const STORY_STATE_SYSTEM = `You summarize a completed episode of Katha (Indian interactive fiction) into a compact JSON story state. This state is passed to the screenwriter for the next episode to maintain continuity.

Output ONLY valid JSON, no markdown fences:
{
  "relationships": [{"pair": "Name-Name", "state": "under 20 words"}],
  "active_mysteries": ["under 20 words each"],
  "emotional_state": "protagonist emotional state under 10 words",
  "objects": ["props that carry story weight"],
  "character_goals": ["under 20 words each"]
}`;

async function generateStoryState(episodeScript, blueprint, epLabel = '?') {
  try {
    const { parsed } = await gptJSON(
      [
        { role: 'system', content: STORY_STATE_SYSTEM },
        { role: 'user', content: `Story: "${blueprint.title}" (${blueprint.genre})\n\nEpisode script:\n${episodeScript}` },
      ],
      'gpt-5.4-mini', 500
    );
    return parsed;
  } catch {
    console.warn(`[STATE] EP${epLabel} state failed — null passed to next episode`);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lastLine(result) {
  const scenes = result?.scenes || [];
  const last = scenes[scenes.length - 1];
  if (!last?.script) return null;
  const lines = last.script.split('\n').filter(l => l.trim());
  return lines[lines.length - 1] || null;
}

function scenesToScript(result) {
  return (result?.scenes || []).map(s => s.script).join('\n\n');
}

function extractBannedLines(result) {
  const lines = [];
  for (const sc of (result?.scenes || [])) {
    for (const line of (sc.script || '').split('\n')) {
      const t = line.trim();
      if (t && !t.startsWith('*')) {
        const after = t.replace(/^[A-Z][A-Z\s.]+:\s*/, '');
        if (after.length > 5) lines.push(after);
      }
    }
  }
  return lines.slice(0, 12);
}

function epCliffhanger(ep, branch) {
  if (!branch) return ep.target_cliffhanger || '';
  return branch === 'A'
    ? (ep.target_cliffhanger_a || ep.target_cliffhanger || '')
    : (ep.target_cliffhanger_b || ep.target_cliffhanger || '');
}

function epObjectives(ep, branch) {
  if (!branch) return ep.scene_objectives || [];
  return branch === 'A' ? (ep.scene_objectives_a || []) : (ep.scene_objectives_b || []);
}

// ─── Cover image ─────────────────────────────────────────────────────────────

const GENRE_MOOD = {
  ROMANCE:   'warm golden light, intimate and longing atmosphere, urban India',
  THRILLER:  'tense moody shadows, high-contrast night lighting, urban India',
  MYTHOLOGY: 'ethereal divine glow, ancient meets modern, mystical India',
};

async function generateCoverImage(bp) {
  const mood = GENRE_MOOD[bp.genre] || 'cinematic, urban India';
  const prompt = `Cinematic vertical still photograph. No text, no watermarks, no faces. ${bp.city}, India. ${mood}. Scene: ${bp.logline}. Style: Bollywood film poster mood, shallow depth of field, rich color grading, editorial photography. Vertical mobile composition.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1536', output_format: 'jpeg', quality: 'medium' }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`); }
      const j = await res.json();
      const b64 = j.data?.[0]?.b64_json;
      if (!b64) throw new Error('No image data returned');
      return `data:image/jpeg;base64,${b64}`;
    } catch (e) {
      console.warn(`  [IMG] Attempt ${attempt} failed: ${e.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  console.warn('  [IMG] Cover image generation failed — continuing without image');
  return '';
}

// ─── Story orchestrator ───────────────────────────────────────────────────────

async function generateStory(premise) {
  const log = { premise, architect: null, episodeLogs: [] };

  // Stage 1: Architect
  console.log(`\n[ARCHITECT] "${premise.slice(0, 70)}..."`);
  log.architect = await runArchitect(premise);
  const bp = log.architect.blueprint;
  console.log(`[ARCHITECT] Done — "${bp.title}" (${bp.genre}, ${bp.city})`);

  // Cover image (non-blocking)
  console.log(`[IMG] Generating cover image...`);
  log.coverImg = await generateCoverImage(bp);
  console.log(`[IMG] ${log.coverImg ? 'Done' : 'Skipped'}`);

  const ep2bp = bp.episodes[1];
  const choiceLabelA = ep2bp?.choice_a?.label || 'Choice A';
  const choiceLabelB = ep2bp?.choice_b?.label || 'Choice B';

  // ── Episode 1 ─────────────────────────────────────────────────────────────
  const ep1bp = bp.episodes[0];
  console.log(`[EP1] Writing...`);
  const pr1 = await writeEpisode({
    epNumber: 1, branch: null,
    objectives: epObjectives(ep1bp, null),
    cliffhanger: epCliffhanger(ep1bp, null),
    blueprint: bp,
    storyState: null, bannedLines: [], prevLastLine: null,
  });
  log.episodeLogs.push({ epNumber: 1, branch: null, ...pr1 });
  console.log(`[EP1] ${pr1.degraded ? 'DEGRADED: ' + pr1.issues.join(' | ') : 'PASS'}`);

  const state1 = await generateStoryState(scenesToScript(pr1.result), bp, '1');
  const banned1 = extractBannedLines(pr1.result);

  // ── Episode 2 ─────────────────────────────────────────────────────────────
  console.log(`[EP2] Writing...`);
  const pr2 = await writeEpisode({
    epNumber: 2, branch: null,
    objectives: epObjectives(ep2bp, null),
    cliffhanger: epCliffhanger(ep2bp, null),
    blueprint: bp,
    storyState: state1,
    bannedLines: banned1,
    prevLastLine: lastLine(pr1.result),
  });
  log.episodeLogs.push({ epNumber: 2, branch: null, ...pr2 });
  console.log(`[EP2] ${pr2.degraded ? 'DEGRADED: ' + pr2.issues.join(' | ') : 'PASS'}`);

  const state2 = await generateStoryState(scenesToScript(pr2.result), bp, '2');
  const bannedShared = [...banned1, ...extractBannedLines(pr2.result)].slice(-24);

  let stateA = state2, stateB = state2;
  let bannedA = [...bannedShared], bannedB = [...bannedShared];
  let prevLineA = lastLine(pr2.result);
  let prevLineB = prevLineA;

  // ── Episodes 3–6 (A/B in parallel) ───────────────────────────────────────
  for (const epNum of [3, 4, 5, 6]) {
    const epbp = bp.episodes[epNum - 1];
    console.log(`[EP${epNum}A+B] Writing in parallel...`);

    const [prA, prB] = await Promise.all([
      writeEpisode({
        epNumber: epNum, branch: 'A',
        objectives: epObjectives(epbp, 'A'),
        cliffhanger: epCliffhanger(epbp, 'A'),
        blueprint: bp,
        storyState: stateA, bannedLines: bannedA, prevLastLine: prevLineA,
        choiceLabel: choiceLabelA,
      }),
      writeEpisode({
        epNumber: epNum, branch: 'B',
        objectives: epObjectives(epbp, 'B'),
        cliffhanger: epCliffhanger(epbp, 'B'),
        blueprint: bp,
        storyState: stateB, bannedLines: bannedB, prevLastLine: prevLineB,
        choiceLabel: choiceLabelB,
      }),
    ]);

    log.episodeLogs.push({ epNumber: epNum, branch: 'A', ...prA });
    log.episodeLogs.push({ epNumber: epNum, branch: 'B', ...prB });
    console.log(`[EP${epNum}A] ${prA.degraded ? 'DEGRADED' : 'PASS'} | [EP${epNum}B] ${prB.degraded ? 'DEGRADED' : 'PASS'}`);

    stateA = await generateStoryState(scenesToScript(prA.result), bp, `${epNum}A`);
    stateB = await generateStoryState(scenesToScript(prB.result), bp, `${epNum}B`);
    bannedA = [...bannedA, ...extractBannedLines(prA.result)].slice(-24);
    bannedB = [...bannedB, ...extractBannedLines(prB.result)].slice(-24);
    prevLineA = lastLine(prA.result);
    prevLineB = lastLine(prB.result);
  }

  return log;
}

// ─── Script → App scene ───────────────────────────────────────────────────────

function scriptToScene(script) {
  if (!script) return { hl: '', body: '', img: '' };
  const lines = script.trim().split('\n').map(l => l.trim()).filter(Boolean);
  let hl = '';
  const bodyParts = [];

  for (const line of lines) {
    if (line.startsWith('*') && line.endsWith('*')) {
      const text = line.slice(1, -1).trim();
      if (!hl) {
        const m = text.match(/^(.+?[।.!?])\s*/);
        hl = m ? m[1].trim() : text;
        const rest = m ? text.slice(m[0].length).trim() : '';
        if (rest) bodyParts.push(rest);
      } else {
        bodyParts.push(text);
      }
    } else {
      bodyParts.push(line);
    }
  }

  return { hl, body: bodyParts.join(' '), img: '' };
}

// ─── Log → App JSON ───────────────────────────────────────────────────────────

function buildAppStory(log) {
  const bp = log.architect.blueprint;

  function getScenes(epNum, branch) {
    const entry = log.episodeLogs.find(e => e.epNumber === epNum && e.branch === branch);
    return (entry?.result?.scenes || []).map(sc => scriptToScene(sc.script));
  }

  const episodes = [];

  episodes.push({
    title: 'Episode 1',
    scenes: getScenes(1, null),
  });

  const ep2bp = bp.episodes[1];
  episodes.push({
    title: 'Episode 2',
    scenes: getScenes(2, null),
    choice: {
      q: ep2bp?.choice_question || '',
      A: { text: ep2bp?.choice_a?.label || 'Choice A', sub: '', img: '' },
      B: { text: ep2bp?.choice_b?.label || 'Choice B', sub: '', img: '' },
    },
  });

  for (const epNum of [3, 4, 5, 6]) {
    episodes.push({
      title: `Episode ${epNum}`,
      scenesA: getScenes(epNum, 'A'),
      scenesB: getScenes(epNum, 'B'),
    });
  }

  return { version: 'v8', title: bp.title, genre: bp.genre, city: bp.city, logline: bp.logline, cover_img: log.coverImg || '', episodes };
}

// ─── JSON writer ──────────────────────────────────────────────────────────────

function writeJSON(logs) {
  const stories = logs.map(log => buildAppStory(log));
  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = join(__dir, `stories-${ts}.json`);
  writeFileSync(out, JSON.stringify(stories, null, 2), 'utf8');
  console.log(`\nJSON saved: ${out}`);
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Katha v8 — generating ${PREMISES.length} stories...\n`);
  const logs = [];
  for (const premise of PREMISES) {
    console.log('\n' + '═'.repeat(70));
    const log = await generateStory(premise);
    logs.push(log);
  }
  const out = writeJSON(logs);
  console.log('\nDone. Open:', out);
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
