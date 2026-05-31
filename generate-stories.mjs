// generate-stories.mjs — Katha v5 pipeline: Architect → Screenwriter → Validator
// Direct prose from scene objectives. Story state tracks continuity between episodes.
// Both branches converge on the same target cliffhanger per episode.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

const OPENAI_KEY = readFileSync(join(__dir, '.env'), 'utf8')
  .match(/OPENAI_API_KEY\s*=\s*"?([^"\n]+)"?/)?.[1]?.trim();
if (!OPENAI_KEY) { console.error('No OPENAI_API_KEY in .env'); process.exit(1); }

const PREMISES = [
  // ROMANCE
  'Mumbai mein do rival stand-up comedians ko ek romantic-comedy web-series co-write karni padti hai — jabki dono yeh chhupa rahe hain ki teen saal pehle unki shaadi hone wali thi aur woh rishta behad buri tarah toot gaya tha.',
  'Bengaluru ka ek cynical food inspector aur ek cloud-kitchen chef roz compliance audits pe ladte hain — unhe nahi pata ki woh dono raat ko ek anonymous poetry app par ek doosre ko chup-chaap dilasa dete hain.',
  // HORROR
  'Ek Delhi tech-bro apne luxury apartment ke liye ek advanced smart-home AI laata hai — phir dheere dheere usse samajh aata hai ki AI uski marhi hui dadi ki awaaz aur andaaz copy karne laga hai.',
  'Kolkata ke ek purane single-screen cinema ka midnight-shift projectionist dekhta hai ki ek vintage film ke background extras dheere dheere apna sar ghumakar seedha uski taraf dekhne lage hain.',
  // MYTHOLOGY REIMAGINED
  'Ashwatthama — dard bhari amarta ka shraap liye hua — aaj-kal modern Varanasi mein ek thaka-haara late-night trauma surgeon hai, jab achanak ek mysterious patient ke zaKhm mein woh ancient celestial weapon ka nishaan pehchaanta hai.',
  'Delhi ke ek cutthroat corporate empire ki ladaai mein ek brilliant lekin unacknowledged executive ko pata chalta hai ki uska katta rival CEO actually wahi maa hai jisne use paida hote hi chhod diya tha.',
  // FAMILY DRAMA
  'South Delhi ki ek ameer matriarch apni poori jaydaad apne estranged middle-class driver ke naam kar jaati hai — ab uske teen ultra-privileged corporate bachon ko settlement ke liye uske ghar mein rehna padega.',
  'Hyderabad ke ek elite family dinner mein beti galti se apne baap ka phone screen cast kar deti hai — aur poori family dekhti hai ki ussi sheher mein ek bilkul alag doosra parivaar bhi hai.',
];

// ─── API ─────────────────────────────────────────────────────────────────────

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
Episode 1 — single branch, 3 scenes
Episodes 2–6 — two branches (A and B), 3 scenes each, both branches end on the SAME target_cliffhanger
Total: 33 scenes generated. Player reads 18 — episode 1 (3 scenes), then one full branch of episodes 2–6 (15 scenes).

RULES:

secret: must name what happened, who was involved, what was concealed.
WRONG: "carries guilt." RIGHT: "Seven years ago Ravi hit a cyclist, filed a false police report blaming the cyclist, family never knew."

target_cliffhanger: a physical impossibility or external threat made visible. NOT internal reflection.
WRONG: "Matlab, kya yeh sab meri wajeh se tha?" RIGHT: "Woh aadmi bina chehre ke seedha darwaze ke doosri taraf khada tha."

CRITICAL: For episodes 2–6, BOTH branches (A and B) must end on the EXACT SAME target_cliffhanger sentence. The divergence is in HOW they get there — not where they end.

choice_a / choice_b labels: concrete actions (what the player does), not moral statements.
WRONG: "Sacrifice your honour." RIGHT: "Chup raho aur nikalo."

scene_objectives_a[0] / scene_objectives_b[0]: must describe the specific physical situation the player enters as direct consequence of choosing that branch. Causally tied to the label.

voice_card: 3 lines of Hinglish in different emotional registers — casual, uncertain, under pressure. Specific to this character's rhythm, vocabulary, how they hold back or push.

CHARACTER NAMES: avoid overused Bollywood names — Rahul, Priya, Meera, Arjun, Kabir, Rhea, Rohan, Naina, Dev, Vikram, Riya, Ananya, Ishaan. Use authentic but less common Indian names.

FIDELITY: every specific element the user mentioned must appear exactly as given. Never generalize.

OUTPUT: valid JSON only, no markdown fences.

{
  "genre": "ROMANCE|THRILLER|MYTHOLOGY",
  "title": "2-4 word Hinglish title",
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
      "target_cliffhanger": "exact Hinglish sentence",
      "choice_question": "Hinglish dilemma question",
      "choice_a": {"label": "3-5 word action label"},
      "choice_b": {"label": "3-5 word action label"}
    },
    {
      "episode_number": 2,
      "scene_objectives_a": ["direct physical consequence of choice_a", "...", "..."],
      "scene_objectives_b": ["direct physical consequence of choice_b", "...", "..."],
      "target_cliffhanger": "SAME exact Hinglish sentence for both branches",
      "choice_question": "Hinglish dilemma question",
      "choice_a": {"label": "3-5 word action label"},
      "choice_b": {"label": "3-5 word action label"}
    }
  ]
}

Episodes 3–5: same structure as episode 2 (scene_objectives_a, scene_objectives_b, target_cliffhanger, choice fields).
Episode 6: same but no choice_question, choice_a, choice_b — story ends here.`;

async function runArchitect(premise) {
  const messages = [
    { role: 'system', content: ARCHITECT_SYSTEM },
    { role: 'user',   content: `Premise: ${premise}` },
  ];
  const { parsed: blueprint, raw: rawOutput } = await gptJSON(messages, 'gpt-5.4', 8000);
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

NARRATOR LANGUAGE (CRITICAL — applies to EVERY *action beat*, not just the opening):
- Every single *asterisk block* anywhere in the scene is Hindi-dominant Hinglish. No exceptions.
- English enters ONLY where an urban Indian person would naturally use it — "exit", "meeting", "phone", "deadline". Not as narration style.
- NO literary English constructions: no "she felt a chill", no "the atmosphere was tense", no "he couldn't help but notice".
- WRONG: *She felt nervous as she entered the crowded room.*
- RIGHT: *Haath kaamp raha tha. Andar se awaaz aa rahi thi — bahut log the, bahut shor.*

LANGUAGE:
- Roman-script Hinglish — Hindi-English code-switching the way urban Indian 18-30 year olds actually speak.
- Code-switch AT the emotionally loaded word, not at random.
- Use the simplest word that does the job. Never stack two adjectives onto one noun. If a description needs two modifiers, rewrite as an action beat.
- Concrete object similes over adjective declarations: "like a glass placed too close to a table edge" > "scared."
- Repetition with one altered element does emotional work.
- Shortest sentence in a scene is the heaviest. Land scenes on short final sentences.
- One Sanskrit or Urdu loanword per scene maximum.
- Direct address (beta, yaar, sir, bhaiya) is load-bearing texture.

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

async function writeEpisode({ epNumber, branch, objectives, cliffhanger, blueprint, storyState, bannedLines, prevLastLine }) {
  const sys = writerSystem(blueprint);
  const castNames = [
    blueprint.protagonist.name.toUpperCase(),
    ...(blueprint.characters || []).map(c => c.name.toUpperCase()),
  ];
  const ep = blueprint.episodes[epNumber - 1];
  const choiceLabel = branch === 'A' ? ep.choice_a?.label : branch === 'B' ? ep.choice_b?.label : null;

  const userMsg = writerUserMsg({
    epNumber,
    title: blueprint.title,
    objectives,
    cliffhanger,
    branch,
    choiceLabel,
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
      // Soft issues only — keep but mark degraded
      finalScenes = { scenes };
      finalIssues = vr.softIssues;
      degraded = true;
      break;
    }

    // Hard issues — retry if attempts remain
    if (attempt === 3) {
      // On final attempt keep soft-pass output if available, otherwise degraded
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

// ─── Story State (Stage 3) ────────────────────────────────────────────────────

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
  const msgs = [
    { role: 'system', content: STORY_STATE_SYSTEM },
    { role: 'user',   content: `Story: "${blueprint.title}" (${blueprint.genre})\n\nEpisode script:\n${episodeScript}` },
  ];
  try {
    const { parsed } = await gptJSON(msgs, 'gpt-5.4-mini', 300);
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
  return lines.slice(0, 10);
}

function epObjectives(ep, branch) {
  if (!branch) return ep.scene_objectives || [];
  return branch === 'A' ? (ep.scene_objectives_a || []) : (ep.scene_objectives_b || []);
}

// ─── Story orchestrator ───────────────────────────────────────────────────────

async function generateStory(premise) {
  const log = { premise, architect: null, episodeLogs: [] };

  // Stage 1: Architect
  console.log(`\n[ARCHITECT] "${premise.slice(0, 70)}..."`);
  log.architect = await runArchitect(premise);
  const bp = log.architect.blueprint;
  const castNames = [bp.protagonist.name.toUpperCase(), ...(bp.characters || []).map(c => c.name.toUpperCase())];
  console.log(`[ARCHITECT] Done — "${bp.title}" (${bp.genre}, ${bp.city})`);

  // Episode 1 — single branch
  const ep1 = bp.episodes[0];
  console.log(`[EP1] Writing...`);
  const pr1 = await writeEpisode({
    epNumber: 1, branch: null,
    objectives: epObjectives(ep1, null),
    cliffhanger: ep1.target_cliffhanger,
    blueprint: bp,
    storyState: null, bannedLines: [], prevLastLine: null,
  });
  log.episodeLogs.push({ epNumber: 1, branch: null, ...pr1 });
  console.log(`[EP1] ${pr1.degraded ? 'DEGRADED: ' + pr1.issues.join(' | ') : 'PASS'}`);

  const state1 = await generateStoryState(scenesToScript(pr1.result), bp, '1');
  const banned1 = extractBannedLines(pr1.result);
  let prevLineA = lastLine(pr1.result);
  let prevLineB = prevLineA;
  let stateA = state1, stateB = state1;
  let bannedA = [...banned1], bannedB = [...banned1];

  // Episodes 2-6 — branched A/B in parallel
  for (const epNum of [2, 3, 4, 5, 6]) {
    const ep = bp.episodes[epNum - 1];
    console.log(`[EP${epNum}A+B] Writing in parallel...`);

    const [prA, prB] = await Promise.all([
      writeEpisode({
        epNumber: epNum, branch: 'A',
        objectives: epObjectives(ep, 'A'),
        cliffhanger: ep.target_cliffhanger,
        blueprint: bp,
        storyState: stateA, bannedLines: bannedA, prevLastLine: prevLineA,
      }),
      writeEpisode({
        epNumber: epNum, branch: 'B',
        objectives: epObjectives(ep, 'B'),
        cliffhanger: ep.target_cliffhanger,
        blueprint: bp,
        storyState: stateB, bannedLines: bannedB, prevLastLine: prevLineB,
      }),
    ]);
    log.episodeLogs.push({ epNumber: epNum, branch: 'A', ...prA });
    log.episodeLogs.push({ epNumber: epNum, branch: 'B', ...prB });
    console.log(`[EP${epNum}A] ${prA.degraded ? 'DEGRADED' : 'PASS'} | [EP${epNum}B] ${prB.degraded ? 'DEGRADED' : 'PASS'}`);

    stateA = await generateStoryState(scenesToScript(prA.result), bp, `${epNum}A`);
    stateB = await generateStoryState(scenesToScript(prB.result), bp, `${epNum}B`);
    bannedA = [...bannedA, ...extractBannedLines(prA.result)].slice(-20);
    bannedB = [...bannedB, ...extractBannedLines(prB.result)].slice(-20);
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

  // EP1 — single branch + choice
  const ep1bp = bp.episodes[0];
  episodes.push({
    title: `Episode 1`,
    scenes: getScenes(1, null),
    choice: {
      q: ep1bp.choice_question || '',
      A: { text: ep1bp.choice_a?.label || 'Choice A', sub: '', img: '' },
      B: { text: ep1bp.choice_b?.label || 'Choice B', sub: '', img: '' },
    },
  });

  // EP2–5 — branched A/B + choice
  for (const epNum of [2, 3, 4, 5]) {
    const epbp = bp.episodes[epNum - 1];
    episodes.push({
      title: `Episode ${epNum}`,
      scenesA: getScenes(epNum, 'A'),
      scenesB: getScenes(epNum, 'B'),
      choice: {
        q: epbp.choice_question || '',
        A: { text: epbp.choice_a?.label || 'Choice A', sub: '', img: '' },
        B: { text: epbp.choice_b?.label || 'Choice B', sub: '', img: '' },
      },
    });
  }

  // EP6 — branched A/B, no choice
  episodes.push({
    title: `Episode 6`,
    scenesA: getScenes(6, 'A'),
    scenesB: getScenes(6, 'B'),
  });

  return { title: bp.title, genre: bp.genre, city: bp.city, logline: bp.logline, episodes };
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
  console.log(`Katha v5 — generating ${PREMISES.length} stories...\n`);
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
