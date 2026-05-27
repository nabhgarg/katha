// generate-stories.mjs — Full Katha v6 pipeline with Excel output
// Runs two premises through: Architect → Screenwriter → Validator → State Extractor
// Outputs: stories-<timestamp>.xlsx with one sheet per story

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dir   = dirname(fileURLToPath(import.meta.url));

const OPENAI_KEY = readFileSync(join(__dir, '.env'), 'utf8')
  .match(/OPENAI_API_KEY\s*=\s*"?([^"\n]+)"?/)?.[1]?.trim();
if (!OPENAI_KEY) { console.error('No OPENAI_API_KEY in .env'); process.exit(1); }

const PREMISES = [
  'Ek famous detective ko ek aisi crime scene par bulaya gaya jahan victims ki body par wahi nishaan hain jo uski apni diary mein bane hain.',
  'Ek corporate office mein boss aur employee jo din bhar ek dusre se ladte hain, par raat ko wahi dono ek anonymous dating app par best friends bane baithe hain.',
];

// ─── API ─────────────────────────────────────────────────────────────────────

async function gptRaw(messages, model, maxTokens) {
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
}

async function gptJSON(messages, model, maxTokens) {
  const raw = await gptRaw(messages, model, maxTokens);
  const fenced = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/s);
  const parsed = JSON.parse(fenced ? fenced[1].trim() : raw);
  return { parsed, raw };
}

// ─── Architect ────────────────────────────────────────────────────────────────

const ARCHITECT_SYSTEM = `You are a story architect for Katha, an Indian interactive fiction app set in modern Indian cities.

Given a one-sentence premise, build a complete story blueprint JSON.

STORY SHAPE:
Episode 1 — single branch, 3 scenes
Episode 2 — single branch, 3 scenes + ONE choice at the end
Episodes 3-6 — two branches (A and B), 3 scenes each
Total: 18 scenes. Player reads 12 — episodes 1 and 2 (shared), then one full branch based on their choice at the end of Episode 2.

RULES:

story_rules: 3 concrete VISIBLE constraints the audience can observe. Not personality traits.
GOOD: "Jab bhi Arjun jhooth bolta hai, uski left hand kaanpti hai"
BAD: "Arjun bahut intelligent hai"

choice (end of Episode 2): CONCRETE ACTION dilemma — where to go, who to help, what to do right now.
Never abstract or moral.
GOOD: "Vikram ke saath police station chalo ya akele crime scene wapas jao"
BAD: "Sachhai ka saath do ya jhooth chhupaao"

Branch divergence: Episode 3A and 3B MUST open in physically different situations caused by the choice.

Characters: 3 supporting characters. Each role describes what they DO to the protagonist's situation — not a label.
BAD role: "The mentor"
GOOD role: "Protagonist ko woh sach batati hai jo woh nahi sunna chahta, aur har baar sahi nikalta hai"

━━━ THEMATIC UNITY LAW (CRITICAL) ━━━
The "secret" field must serve as the deep, emotional backstory of the current genre. It must NEVER force a mid-story genre migration.
- For ROMANCE/DRAMA: The secret must be intimate and interpersonal (e.g., past betrayal, shared history, hidden guilt). It must NOT involve corporate conspiracies, rogue data experiments, or physical danger.
- For THRILLER: The secret must be directly connected to the mechanics of the mystery, forcing a direct psychological tie between the protagonist and the antagonist.

Cliffhangers for Episodes 3-6: Each branch has its OWN cliffhanger.
Episodes 1-2: cliffhanger_objective (single field)
Episodes 3-6: cliffhanger_objective_a AND cliffhanger_objective_b (two separate fields)
Cliffhanger format: write a 1-2 sentence narrative goal describing WHAT should happen in the final beat — not an exact line. The Screenwriter will find the best words for it. Example: "Meera shocks Kabir by revealing that a page from his personal diary was found at the murder scene." Concrete, physical, under 40 words.

RETURN ONLY VALID JSON. No commentary, no markdown fences.

{
  "genre": "THRILLER | ROMANCE | MYTHOLOGY | DRAMA",
  "title": "Story title in Hindi or Hinglish",
  "city": "Indian city name",
  "logline": "One compelling sentence",
  "secret": "The hidden backstory driving the whole plot — never named directly in scenes",
  "story_rules": ["rule 1", "rule 2", "rule 3"],
  "protagonist": {
    "name": "Indian first name",
    "nature": "Two words max",
    "story_goal": "What they must achieve by Episode 6",
    "motivation": "Why this is personally devastating for them",
    "past": "One past event that made them who they are",
    "voice_card": [
      "Casual: example dialogue line",
      "Uncertain: example dialogue line when confused or scared",
      "Under pressure: example dialogue line when cornered"
    ]
  },
  "characters": [
    { "name": "Name", "role": "What this character does to the protagonist's situation when they appear" },
    { "name": "Name", "role": "..." },
    { "name": "Name", "role": "..." }
  ],
  "episodes": [
    {
      "episode_number": 1,
      "title": "Episode title",
      "scene_objectives": ["scene 1 objective", "scene 2 objective", "scene 3 objective"],
      "cliffhanger_objective": "1-2 sentence narrative goal for the final beat of Scene 3"
    },
    {
      "episode_number": 2,
      "title": "Episode title",
      "scene_objectives": ["scene 1 objective", "scene 2 objective", "scene 3 objective"],
      "cliffhanger_objective": "1-2 sentence narrative goal for the final beat of Scene 3",
      "choice_question": "The exact question shown to player — concrete action dilemma",
      "choice_a": { "label": "Option A text" },
      "choice_b": { "label": "Option B text" }
    },
    {
      "episode_number": 3,
      "title": "Episode title",
      "scene_objectives_a": ["scene 1", "scene 2", "scene 3"],
      "scene_objectives_b": ["scene 1", "scene 2", "scene 3"],
      "cliffhanger_objective_a": "1-2 sentence narrative goal for Branch A final beat",
      "cliffhanger_objective_b": "1-2 sentence narrative goal for Branch B final beat"
    },
    {
      "episode_number": 4,
      "title": "Episode title",
      "scene_objectives_a": ["scene 1", "scene 2", "scene 3"],
      "scene_objectives_b": ["scene 1", "scene 2", "scene 3"],
      "cliffhanger_objective_a": "...",
      "cliffhanger_objective_b": "..."
    },
    {
      "episode_number": 5,
      "title": "Episode title",
      "scene_objectives_a": ["scene 1", "scene 2", "scene 3"],
      "scene_objectives_b": ["scene 1", "scene 2", "scene 3"],
      "cliffhanger_objective_a": "...",
      "cliffhanger_objective_b": "..."
    },
    {
      "episode_number": 6,
      "title": "Episode title",
      "scene_objectives_a": ["scene 1", "scene 2", "scene 3"],
      "scene_objectives_b": ["scene 1", "scene 2", "scene 3"],
      "cliffhanger_objective_a": "...",
      "cliffhanger_objective_b": "..."
    }
  ]
}`;

async function runArchitect(premise) {
  const systemMsg = { role: 'system', content: ARCHITECT_SYSTEM };
  const userMsg   = { role: 'user',   content: `Premise: "${premise}"\n\nBuild the complete story blueprint.` };
  const { parsed, raw } = await gptJSON([systemMsg, userMsg], 'gpt-5.4', 8000);
  return { blueprint: parsed, systemPrompt: ARCHITECT_SYSTEM, userMessage: userMsg.content, rawOutput: raw };
}

// ─── Validator ────────────────────────────────────────────────────────────────

const GENERIC_LABELS = new Set([
  'GUARD', 'POLICE', 'CONSTABLE', 'GAWAH', 'CHOWKIDAR', 'DOCTOR', 'DR',
  'NURSE', 'WITNESS', 'MANAGER', 'RECEPTIONIST', 'DRIVER', 'WAITER',
  'WAITRESS', 'VOICE', 'STRANGER', 'OFFICER', 'INSPECTOR', 'DETECTIVE',
  'PEON', 'CLERK', 'SECURITY', 'ANNOUNCER', 'CONDUCTOR', 'TEACHER',
  'PRINCIPAL', 'AURAT', 'AADMI', 'LADKI', 'LADKA',
]);

function mergeConsecutiveSpeaker(script) {
  const lines = script.split('\n');
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (out.length > 0 && /^[A-Z][A-Z\s]+:\s/.test(trimmed)) {
      const prev = out[out.length - 1].trim();
      const prevSpeaker = prev.match(/^([A-Z][A-Z\s]+):/)?.[1]?.trim();
      const curSpeaker  = trimmed.match(/^([A-Z][A-Z\s]+):/)?.[1]?.trim();
      if (prevSpeaker && prevSpeaker === curSpeaker) {
        out[out.length - 1] = prev + ' ' + trimmed.replace(/^[A-Z][A-Z\s]+:\s/, '');
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

async function validate(epScenes, cliffhangerObjective, blueprint) {
  const scenes = epScenes?.scenes || [];
  const issues = [];
  let cliffhangerCheck = null;

  const allowedSpeakers = blueprint ? new Set([
    blueprint.protagonist.name.toUpperCase(),
    ...blueprint.characters.map(c => c.name.toUpperCase()),
  ]) : null;
  const unknownSeen = new Set();

  for (let i = 0; i < scenes.length; i++) {
    scenes[i].script = mergeConsecutiveSpeaker(scenes[i].script || '');
    const script = scenes[i].script;
    const n = i + 1;
    const dlg = script.split('\n').filter(l => /^[A-Z][A-Z\s]+:/.test(l.trim()));
    for (const blk of [...script.matchAll(/\*([^*]+)\*/g)].map(m => m[1])) {
      const wc = blk.trim().split(/\s+/).length;
      if (wc > 35) issues.push(`Scene ${n}: action block ${wc} words (limit 35).`);
    }
    for (const line of script.split('\n').filter(l => l.trim() && !l.trim().startsWith('*'))) {
      if (!/^[A-Z][A-Z\s.\d]+:\s/.test(line.trim()))
        issues.push(`Scene ${n}: missing ALL-CAPS label: "${line.trim().slice(0, 50)}"`);
    }
    const wc = script.trim().split(/\s+/).length;
    if (wc > 100) issues.push(`Scene ${n}: ${wc} words (limit 100).`);
    if (dlg.length > 4) issues.push(`Scene ${n}: ${dlg.length} dialogue lines (limit 4).`);
    if (allowedSpeakers) {
      for (const [, label] of script.matchAll(/^([A-Z][A-Z\s._\d]+):/gm)) {
        const name = label.trim();
        const first = name.split(/[\s_]/)[0];
        if (!allowedSpeakers.has(name) && !allowedSpeakers.has(first) && !GENERIC_LABELS.has(first) && !unknownSeen.has(name)) {
          unknownSeen.add(name);
          issues.push(`Scene ${n}: unknown speaker "${name}" — not in blueprint cast.`);
        }
      }
    }
  }

  // Cliffhanger objective check — LLM, async, fail-open on error
  const scene3 = scenes[2];
  if (scene3 && cliffhangerObjective) {
    try {
      const messages = [
        { role: 'system', content: 'You are a script quality checker. Answer with only YES or NO, then one sentence reason.' },
        { role: 'user', content: `Did this Scene 3 script achieve the cliffhanger objective?\n\nOBJECTIVE: ${cliffhangerObjective}\n\nSCENE 3:\n${scene3.script}\n\nAnswer YES or NO and one sentence reason.` },
      ];
      const raw = await gptRaw(messages, 'gpt-5.4-mini', 100);
      const pass = /^yes\b/i.test(raw.trim());
      cliffhangerCheck = { pass, reason: raw.trim() };
      if (!pass) issues.push(`Scene 3: cliffhanger objective not achieved. Evaluator: ${raw.trim()}`);
    } catch (e) {
      cliffhangerCheck = { pass: true, reason: `validator_error: ${e.message}`, skipped: true };
    }
  }

  return { pass: issues.length === 0, issues, cliffhangerCheck };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lastLine(epResult) {
  const scenes = epResult?.scenes || [];
  const last = scenes[scenes.length - 1];
  if (!last?.script) return '';
  return last.script.split('\n').map(l => l.trim()).filter(Boolean).at(-1) || '';
}

function collectBanned(episodeResults) {
  const lines = [];
  for (const ep of episodeResults) {
    for (const sc of ep?.scenes || []) {
      lines.push(...(sc.script || '').split('\n').filter(l => /^[A-Z][A-Z\s]+:/.test(l.trim())).map(l => l.trim()));
    }
  }
  return lines.slice(-24);
}

// ─── Screenwriter system prompt (keep in sync with run-v6-story.mjs) ─────────

function writerSystem(bp) {
  return `You write one episode of three scenes for Katha, an Indian interactive fiction app.

━━━ OUTPUT FORMAT ━━━
Each scene is a single string in the "script" field.
Action/setting goes inside *asterisks*. Dialogue goes outside asterisks, on its own line.
EVERY dialogue line MUST start with the speaker's name in ALL-CAPS followed by a colon: "INDU: Main tumhein yaad hun Rahul?" — no exceptions.
All character identifiers—including minor, background, or episodic characters (e.g., GAWAH, CHOWKIDAR, DR_SANYAL)—must be written entirely in English uppercase letters followed by a colon. No Devanagari or mixed casing allowed in the speaker label.
Never have the same character speak twice in a row.
Never nest asterisks.

━━━ ACTION BLOCK RULES (CRITICAL) ━━━
HARD LIMIT: Every *action block* must be under 35 words. If you need more, split into two blocks.
If the opening action needs more than 35 words, break it into two blocks — arrival image first, then scene setup.

LANGUAGE LAW — every *asterisk block* must follow this:
- Written in spoken conversational Hindi — words people actually use talking, not writing novels.
- English only where people use it naturally: "office", "phone", "deadline", "studio". Never as narration style.
- Concrete physical actions only — what moved, what stopped, what made a sound.
- Never use English narrative constructions inside asterisks.
- COMPLETE SENTENCES ONLY. Every sentence in an action block must have a subject and a verb. No noun-phrase fragments. No em-dash shortcuts in place of a verb.

WRONG: *She felt nervous as she entered the crowded room.*
WRONG: *Mahalaxmi mandir ke bahar. Police van ruki hui. Rudra — aam insaan ab, handcuffed.* (fragments, no verbs)
RIGHT: *Mahalaxmi mandir ke bahar police van ruki hui thi. Rudra jo ki ab ek aam insaan tha, usko handcuff kar lia.*
WRONG: *Dadar auto se utri. Aunty ka flat.* (fragment, no verb, just labelling)
RIGHT: *Auto ruka. Indu bahar nikli. Aunty ki khidki wahi thi, usko apna bachpan yaad aa gaya.*

━━━ SCENE LENGTH ━━━
Every scene (action + dialogue combined): under 100 words total.
Max 4 dialogue lines per scene (2 exchanges). No exceptions.

━━━ SCENE-TO-SCENE CONTINUITY ━━━
No invisible gaps. Every scene transition must be accounted for.
If no time has passed: Scene 2 picks up exactly where Scene 1 left off.
If time has passed: First line names it explicitly — *Ek ghante baad.* *Raat ho gayi thi.*
If location changed: First action block shows physical movement — *Woh waha se bhaagi. Auto pakda, aur Dadar ke liye nikal gayi.*
NEVER just label a location. Show the movement.

━━━ CRAFT ━━━
Scene 1 of every episode: open mid-action. First 10 words must create an unanswered question.
WRONG: *Indu neend se jaagi. Kal raat bahut kuch hua tha — Prabha ne temple mein bulaya tha, Rudra ki BMW bahar thi, ek choice thi. Abhi subah thi.*
RIGHT: *Indu ke haath mein phone tha. Woh bahot zyaada garam tha, phir aur garam ho gaya. Screen par fingerprint nahi tha, wahan ki metal pighal gayi thi.*
Show emotion through action only. Never state it.
Callbacks and foreshadowing must echo a detail already visible in this episode. If a scene connects a phrase, gesture, or object to a character memory, that detail must have appeared earlier in the same episode — attributed clearly to the right character. Never plant a connection and its explanation in the same beat.
Every object used in an action beat must connect to the scene's active conflict — not just to the character's general personality. A prop that could appear in any scene of any story is filler. If the scene is about a character hiding behind an app, the prop is the phone — not sticky notes, not a napkin fold.
When a premise-level element appears for the first time in an episode — the anonymous app, a secret identity, a hidden relationship — show it before referencing it. One concrete action or exchange that lets the reader understand what it is. Never reference a premise element by pronoun ("the app", "woh sab") before the reader has seen it.
Scene 3 MUST end on a strong cliffhanger that achieves the episode's cliffhanger objective. Let the scene's momentum choose the format — a spoken revelation, a physical action, a character's final gesture. The ending must feel earned by what came before, not inserted.
Direct address (beta, yaar, sir, bhaiya, aunty) is the texture of Indian dialogue — use it.
Never use "aunt" — always "Aunty".
WRONG: INDU: Aunt, kahan ja rahi ho tum?
RIGHT: INDU: Aunty, aap kahan ja rahi ho?
One Sanskrit or Urdu loanword per scene maximum.
Story rule physical tells (nosebleed, tie-knot, etc.) appear at most once per episode. Scale intensity to episode number — restrained in episodes 1-2, disruptive in 3-4, unravelling in 5-6.
DO NOT introduce new named characters. The complete named cast is: ${bp.protagonist.name}${bp.characters.map(c => `, ${c.name}`).join('')}. These are the ONLY named people in this story. If a scene requires anyone else, use a role label only: GUARD, WITNESS, CHOWKIDAR — never invent a new proper name.

━━━ STORY CONTEXT ━━━
Genre: ${bp.genre} | City: ${bp.city}
Story rules: ${bp.story_rules.join(' | ')}
Secret (subtext only — never name it directly): ${bp.secret}
Protagonist: ${bp.protagonist.name} | Nature: ${bp.protagonist.nature}
Story goal: ${bp.protagonist.story_goal}
Motivation: ${bp.protagonist.motivation}
Past event (surface in subtext): ${bp.protagonist.past}
Characters: ${bp.characters.map(c => `${c.name} (${c.role})`).join(', ')}

PROTAGONIST VOICE CARD (rhythm reference, not lines to use):
These are example rhythms for the protagonist's voice. Use them as a feel for how this character builds sentences. Do not transcribe these lines into scenes verbatim. Do not reuse a voice-card line across episodes. Each scene generates its own lines in this rhythm.
How they speak casually: ${bp.protagonist.voice_card[0]}
How they speak when uncertain: ${bp.protagonist.voice_card[1]}
How they speak under pressure: ${bp.protagonist.voice_card[2]}

━━━ ANTI-PATTERN ━━━
WRONG: *She felt nervous as she entered the crowded room.*
WRONG: *Rudra — aam insaan ab, handcuffed.* (em-dash in place of a verb — incomplete sentence)
WRONG: Same character speaking twice in a row.

WRONG — short reaction written as dialogue (causes double-speaker violation):
PRABHA: Yeh Trishul Bindu hai. Tere andar chhupa ke rakha tha isko teri maa ne.
KAVYA: Kya?
KAVYA: Meri maa ne... matlab kya kar diya unhone?
RIGHT — reaction goes inside asterisks, dialogue slot saved for the real line:
PRABHA: Yeh Trishul Bindu hai. Tere andar chhupa ke rakha tha isko teri maa ne.
*Indu ka muh khul gaya. Uske haath kaanpe.*
INDU: Meri maa ne... matlab kya kar diya unhone?

RIGHT — full action+dialogue:
*Auto ruka. Indu bahar nikli. Aunty ki khidki wahi thi — sab kuch waise hi tha.*
KABIR: Andar chalein?
*Indu ne kuch nahi bola. Uska haath already garam tha.*

━━━ EXAMPLE EPISODE ━━━
This is what a correct episode looks like. Match this format exactly.

SCENE 1:
*Mahalaxmi mandir ke gate pe ek hi diya jal raha tha. Prabha ne Indu ko zameen par bitha ke mantra bolna shuru kara.*
PRABHA: Aankhein band karo, Indu. Jo bhi dikhe, usse bhago mat.
*Indu ne aankhein band ki. Diye ki lau ekdum se tezz ho gayi.*
INDU: Prabha Aunty... kuch garam ho raha hai mere haath mein.
*Prabha ne kuch nahi bola. Woh mantra bolti rahi.*

SCENE 2:
*Indu ki aankhein band thi. Phir use ek purana kamra dikhaayi dene laga. Kamre mein har taraf aag thi, andar ek aurat thi, darvaze par Rudra khada tha.*
INDU: Yeh... yeh meri maa thi.
PRABHA: Beta, haath roko. Abhi roko.
*Indu ka haath anjaane mein uthne laga. Diye ki lau Indu ke haath tak kheench aayi.*

SCENE 3:
*Diye ki lau 10 feet tak badh gayi. Indu khadi ho gayi. Uski aankhein abhi bhi band thi.*
PRABHA: Indu, ruko. Bahar kuch ho raha hai.
*Indu ka badan kaanpne laga.*
INDU: Mujhe rok nahi sakte ab, Aunty.
*Mandir ki deewaar mein ek badi daraar aa gayi, upar se neeche tak.*`;
}

// ─── Story state extractor ────────────────────────────────────────────────────

async function extractState(epResult, title, blueprint) {
  const text = (epResult?.scenes || []).map(s => s.script).join('\n\n');
  const castNames = blueprint
    ? [blueprint.protagonist.name, ...blueprint.characters.map(c => c.name)].join(', ')
    : 'only names from the episode';
  const messages = [
    { role: 'system', content: `Extract a compact story state from this episode script. Return ONLY valid JSON:
{
  "relationships": [{"pair": "Name1-Name2", "state": "one line"}],
  "active_mysteries": ["..."],
  "emotional_state": "Protagonist — one line",
  "objects": ["significant objects introduced"],
  "character_goals": ["who wants what"]
}
IMPORTANT: Use ONLY these character names in all fields: ${castNames}. Do not invent or introduce any other names.` },
    { role: 'user', content: `Episode: "${title}"\n\n${text}` },
  ];
  const { parsed, raw } = await gptJSON(messages, 'gpt-5.4-mini', 500);
  return { state: parsed, inputMessages: messages, rawOutput: raw };
}

// ─── Episode writer ───────────────────────────────────────────────────────────

async function writeEpisode({ epNumber, branch, prevLastLine, choiceLabel, storyState, bannedLines, cliffhangerObjective, blueprint }) {
  const epPlan = blueprint.episodes[epNumber - 1];
  const isSingle = epNumber <= 2;
  const objs = isSingle
    ? epPlan.scene_objectives
    : (branch === 'A' ? epPlan.scene_objectives_a : epPlan.scene_objectives_b);

  const stateBlock  = storyState  ? `STORY STATE (maintain continuity):\n${JSON.stringify(storyState, null, 2)}` : '';
  const prevBlock   = prevLastLine ? `Previous episode ended on: "${prevLastLine}" — Scene 1 must flow from this.` : 'This is Episode 1 — open mid-action, zero backstory.';
  const branchBlock = choiceLabel  ? `BRANCH ORIGIN: The player chose "${choiceLabel}" at the end of Episode 2.\nThis is Branch ${branch}. It does not know about the other branch.\nEvery scene must feel causally connected to that choice.` : '';
  const bannedBlock = bannedLines?.length ? `BANNED PHRASES (do not repeat or paraphrase):\n${bannedLines.join('\n')}` : '';

  const systemContent = writerSystem(blueprint);
  const userContent = `Write Episode ${epNumber}${branch ? ` (Branch ${branch})` : ''} of "${blueprint.title}" — "${epPlan.title}".

${prevBlock}
${branchBlock}
${stateBlock}
${bannedBlock}

Scene objectives:
1. ${objs[0]}
2. ${objs[1]}
3. ${objs[2]}

CLIFFHANGER OBJECTIVE — Scene 3 must end achieving this narrative goal:
${cliffhangerObjective}

Choose dialogue or action format — whichever lands hardest given how the scene plays out.

HARD LIMITS:
- Every scene: under 100 total words
- Every scene: max 4 dialogue lines
- Every action block: under 35 words (split if needed)
- Scene 2: show transition from Scene 1 — if location changed, show physical movement; if time passed, name it
- Scene 3: same rule from Scene 2
- Do NOT just label locations ("Dadar. Aunty ka flat.") — show one image that places the reader

Output:
{"scenes": [{"scene_number": 1, "script": "..."}, {"scene_number": 2, "script": "..."}, {"scene_number": 3, "script": "...ends on a strong cliffhanger achieving the objective"}]}`;

  const messages = [{ role: 'system', content: systemContent }, { role: 'user', content: userContent }];
  const attempts = [];
  let best = null;
  let bestIssues = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { parsed, raw } = await gptJSON(messages, 'gpt-5.4-mini', 2000);
      const v = await validate(parsed, cliffhangerObjective, blueprint);
      attempts.push({ attempt, rawOutput: raw, parsed, validatorResult: v });
      best = parsed;
      bestIssues = v.issues;
      if (v.pass) {
        return { result: parsed, issues: [], degraded: false, attempts, systemPrompt: systemContent, userMessage: userContent };
      }
    } catch (e) {
      attempts.push({ attempt, rawOutput: null, parsed: null, validatorResult: null, error: e.message });
      bestIssues = [`Generation error: ${e.message}`];
    }
  }

  return { result: best, issues: bestIssues, degraded: true, attempts, systemPrompt: systemContent, userMessage: userContent };
}

// ─── Story orchestrator ───────────────────────────────────────────────────────

async function generateStory(premise) {
  const log = { premise, architect: null, episodeLogs: [], stateLogs: [] };

  // Stage 1: Architect
  console.log(`\n[ARCHITECT] "${premise.slice(0, 70)}..."`);
  log.architect = await runArchitect(premise);
  const bp = log.architect.blueprint;
  console.log(`[ARCHITECT] Done — "${bp.title}" (${bp.genre}, ${bp.city})`);

  const episodeResults = [];
  let baseState = null;

  // Stage 2: Episodes 1 & 2
  for (const epNum of [1, 2]) {
    const epPlan = blueprint_ep(bp, epNum);
    const cliffhangerObjective = epPlan.cliffhanger_objective;
    const prevLast = epNum === 1 ? null : lastLine(episodeResults[0]?.result);
    const banned = collectBanned(episodeResults.map(e => e?.result).filter(Boolean));

    console.log(`[EP${epNum}] Writing...`);
    const epResult = await writeEpisode({ epNumber: epNum, branch: null, prevLastLine: prevLast, choiceLabel: null, storyState: baseState, bannedLines: banned, cliffhangerObjective, blueprint: bp });
    episodeResults.push(epResult);
    log.episodeLogs.push({ epNumber: epNum, branch: null, ...epResult });
    console.log(`[EP${epNum}] ${epResult.degraded ? 'DEGRADED: ' + epResult.issues.join(' | ') : 'PASS'}`);

    if (epResult.result) {
      const st = await extractState(epResult.result, epPlan.title, bp);
      baseState = st.state;
      log.stateLogs.push({ epNumber: epNum, branch: null, ...st });
    }
  }

  // Stage 3: Episodes 3-6 (parallel A+B pairs)
  let stateA = baseState;
  let stateB = baseState;
  const brA = [];
  const brB = [];

  for (const epNum of [3, 4, 5, 6]) {
    const epPlan = blueprint_ep(bp, epNum);
    const choice  = blueprint_ep(bp, 2);
    const prevA   = epNum === 3 ? lastLine(episodeResults[1]?.result) : lastLine(brA[brA.length - 1]?.result);
    const prevB   = epNum === 3 ? lastLine(episodeResults[1]?.result) : lastLine(brB[brB.length - 1]?.result);
    const banned  = collectBanned([...episodeResults, ...brA, ...brB].map(e => e?.result).filter(Boolean));

    console.log(`[EP${epNum}A+B] Writing in parallel...`);
    const [epA, epB] = await Promise.all([
      writeEpisode({ epNumber: epNum, branch: 'A', prevLastLine: prevA, choiceLabel: choice.choice_a?.label, storyState: stateA, bannedLines: banned, cliffhangerObjective: epPlan.cliffhanger_objective_a, blueprint: bp }),
      writeEpisode({ epNumber: epNum, branch: 'B', prevLastLine: prevB, choiceLabel: choice.choice_b?.label, storyState: stateB, bannedLines: banned, cliffhangerObjective: epPlan.cliffhanger_objective_b, blueprint: bp }),
    ]);

    brA.push(epA); brB.push(epB);
    log.episodeLogs.push({ epNumber: epNum, branch: 'A', ...epA });
    log.episodeLogs.push({ epNumber: epNum, branch: 'B', ...epB });
    console.log(`[EP${epNum}A] ${epA.degraded ? 'DEGRADED' : 'PASS'} | [EP${epNum}B] ${epB.degraded ? 'DEGRADED' : 'PASS'}`);

    if (epNum < 6) {
      const [stA, stB] = await Promise.all([
        epA.result ? extractState(epA.result, epPlan.title + ' A', bp) : null,
        epB.result ? extractState(epB.result, epPlan.title + ' B', bp) : null,
      ]);
      if (stA) { stateA = stA.state; log.stateLogs.push({ epNumber: epNum, branch: 'A', ...stA }); }
      if (stB) { stateB = stB.state; log.stateLogs.push({ epNumber: epNum, branch: 'B', ...stB }); }
    }
  }

  return log;
}

function blueprint_ep(bp, num) { return bp.episodes[num - 1]; }

// ─── Excel builder ────────────────────────────────────────────────────────────

function buildRows(log) {
  const rows = [];
  const sec  = (label)         => rows.push(['━━━ ' + label + ' ━━━', '']);
  const row  = (label, content) => rows.push([label, typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content ?? '')]);

  sec('PREMISE');
  row('Premise', log.premise);

  sec('ARCHITECT');
  row('System Prompt Sent', log.architect.systemPrompt);
  row('User Message Sent', log.architect.userMessage);
  row('Raw Output Received', log.architect.rawOutput);

  sec('BLUEPRINT SUMMARY');
  const bp = log.architect.blueprint;
  row('Title', bp.title);
  row('Genre', bp.genre);
  row('City', bp.city);
  row('Logline', bp.logline);
  row('Secret', bp.secret);
  row('Story Rules', bp.story_rules?.join('\n'));
  row('Protagonist', bp.protagonist);
  row('Characters', bp.characters);
  for (const ep of (bp.episodes || [])) {
    row(`Blueprint — Episode ${ep.episode_number}`, ep);
  }

  for (const epLog of log.episodeLogs) {
    const lbl = `EP${epLog.epNumber}${epLog.branch || ''}`;
    sec(lbl);
    row(`${lbl} — Screenwriter System Prompt`, epLog.systemPrompt);
    row(`${lbl} — Screenwriter User Message`, epLog.userMessage);
    for (const att of (epLog.attempts || [])) {
      row(`${lbl} — Attempt ${att.attempt} Raw Output`, att.rawOutput ?? att.error ?? '');
      if (att.validatorResult) {
        const vr = att.validatorResult;
        let status = vr.pass ? 'PASS' : 'FAIL:\n' + vr.issues.join('\n');
        if (vr.cliffhangerCheck) {
          const cc = vr.cliffhangerCheck;
          status += `\nCliffhanger: ${cc.skipped ? 'SKIPPED (validator error)' : (cc.pass ? 'ACHIEVED' : 'NOT ACHIEVED')} — ${cc.reason}`;
        }
        row(`${lbl} — Attempt ${att.attempt} Validator`, status);
      }
    }
    row(`${lbl} — Final Status`, epLog.degraded ? 'DEGRADED:\n' + epLog.issues.join('\n') : 'PASS');
    for (const sc of (epLog.result?.scenes || [])) {
      row(`${lbl} — Scene ${sc.scene_number} (final)`, sc.script);
    }
  }

  sec('STATE EXTRACTOR OUTPUTS');
  for (const st of log.stateLogs) {
    const lbl = `EP${st.epNumber}${st.branch || ''}`;
    row(`${lbl} — State Input (user msg)`, st.inputMessages?.[1]?.content ?? '');
    row(`${lbl} — State Raw Output`, st.rawOutput);
    row(`${lbl} — State Parsed`, st.state);
  }

  return rows;
}

function writeExcel(logs) {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();

  logs.forEach((log, i) => {
    const title = log.architect?.blueprint?.title || `Story ${i + 1}`;
    const rows = buildRows(log);
    const ws = XLSX.utils.aoa_to_sheet([['Section', 'Content'], ...rows]);
    ws['!cols'] = [{ wch: 50 }, { wch: 130 }];
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  });

  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = join(__dir, `stories-${ts}.xlsx`);
  XLSX.writeFile(wb, out);
  console.log(`\nExcel saved: ${out}`);
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Katha v6 — generating 2 stories...\n');
  const logs = [];
  for (const premise of PREMISES) {
    console.log('\n' + '═'.repeat(70));
    const log = await generateStory(premise);
    logs.push(log);
  }
  const out = writeExcel(logs);
  console.log('\nDone. Open:', out);
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
