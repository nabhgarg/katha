// test-full-v4.mjs — full v4 pipeline: all 6 eps + 7 images → output folder
// Usage: OPENAI_API_KEY=sk-... node test-full-v4.mjs "your prompt"

import fs from 'fs';
import path from 'path';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';
const TOKEN = process.env.OPENAI_API_KEY || '';
if (!TOKEN) { console.error('FATAL: OPENAI_API_KEY not set'); process.exit(1); }

const USER_PROMPT = process.argv[2] || 'I am going in an auto in BLR at 2 am at night I see a faceless man in front of my auto and then it starts chasing me. What happens';

// ─── Output folder ────────────────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = path.join('/Users/nabhgarg/Desktop/interactive stories', `test-output-${ts}`);
fs.mkdirSync(OUT_DIR, { recursive: true });
function writeJson(name, data) { fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2)); }
function writeText(name, text) { fs.writeFileSync(path.join(OUT_DIR, name), text, 'utf8'); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeJsonParse(raw) {
  const s = (raw || '').trim();
  const fenced = s.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return JSON.parse(fenced ? fenced[1].trim() : s);
}

async function oaiChat(messages, model = 'gpt-5.4-mini', extra = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  let res;
  try {
    res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, ...extra }),
      signal: ctrl.signal,
    });
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || 'API error ' + res.status);
  }
  const d = await res.json();
  if (!d.choices?.[0]?.message?.content) throw new Error('Empty response from model');
  return safeJsonParse(d.choices[0].message.content);
}

// gpt-image-1 returns b64_json — decode and save directly, no URL download needed
async function gptImage(prompt, label, filename) {
  console.log(`  🎨 gpt-image-1: ${label}...`);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  let res;
  try {
    res = await fetch(OPENAI_IMAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024' }),
      signal: ctrl.signal,
    });
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error('gpt-image-1 error: ' + (e.error?.message || res.status));
  }
  const d = await res.json();
  const b64 = d.data?.[0]?.b64_json;
  if (!b64) throw new Error('gpt-image-1: no b64_json in response');
  const buf = Buffer.from(b64, 'base64');
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

function pollinationsUrl(prompt) {
  const encoded = encodeURIComponent(prompt.slice(0, 300));
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
}

async function downloadUrlToFile(url, filepath) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } finally { clearTimeout(timer); }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  return filepath;
}

// ─── IMG_STYLE ────────────────────────────────────────────────────────────────
const IMG_STYLE = {
  ROMANCE: {
    prefix: 'Cinematic still, warm golden hour, shallow depth of field, Indian urban setting.',
    suffix: 'Shot on 35mm film. Intimate, emotional. No text.'
  },
  THRILLER: {
    prefix: 'Dark cinematic still, high contrast, desaturated, Indian city at night.',
    suffix: 'Moody, suspenseful. Shot on 35mm film. No text.'
  },
  MYTHOLOGY: {
    prefix: 'Epic cinematic still, dramatic lighting, mystical atmosphere, India.',
    suffix: 'Ancient and modern collide. Shot on 35mm film. No text.'
  }
};
function buildCoverPrompt(bp) {
  const s = IMG_STYLE[bp.genre] || IMG_STYLE.MYTHOLOGY;
  return `${s.prefix} ${bp.logline || bp.title} ${s.suffix}`;
}
function buildEpImagePrompt(bp, epNum) {
  const ep = bp.episodes[epNum - 1];
  const s = IMG_STYLE[bp.genre] || IMG_STYLE.MYTHOLOGY;
  const city = bp.city || 'India';
  const mood = ep?.scene_objectives?.[0] || ep?.title || '';
  return `${s.prefix} ${city}. ${bp.protagonist?.name || 'protagonist'}. ${mood}. ${s.suffix}`;
}

// ─── Golden scenes (from golden-scenes-v1.md — injected into scene prompts) ───
const GOLDEN_SCENES = [
  {
    genre: 'THRILLER', scene_position: 'OPENER',
    script: `*Kitchen window se dikhta tha — courtyard ke uss taraf waale flat mein kuch halchaal. Teen hafte se wahan lights nahi thi. Ek figure window ke paas se guzra. Phir dobara guzra. Phir ruk gaya.*
*Uska haath abhi bhi tap ke neeche tha. Paani abhi bhi chal raha tha. Woh hili nahi. Hili nahi. Hili nahi.*
*Figure ne apna sar ghumaaya.*
*Woh itni tezi se counter ke neeche jhuki ki kuhni cabinet se lagi. Andar se ek steel katori giri — awaaz badi lagi. Saanson ko rok liya. Neeche se landlord ka TV — koi news anchor chilla raha tha. Das take gine. Fir bees. Phir actually ghutno pe chali — haath aur ek ghutne ke side par — aur kitchen ki light band kar di.*
*Andheron mein saans li.*
*Phone counter par tha, do feet upar. Uthane ke liye khada hona hoga.*
Phone. Phone, phone, phone.
*Aankhen band kin. Phir se gina. Haath upar badhaya.*
*Phone mil gaya. Screen palm ke neeche jali — kisi ka delivery notification — aur window ke uss taraf wali figure roshni ki taraf mudi.*`
  },
  {
    genre: 'THRILLER', scene_position: 'MIDPOINT',
    script: `*Darwaza khula tha. Woh roz darwaza band karti thi. Woh roz darwaza band karti thi.*
*Woh darwaaze ke frame mein khadi thi, chaabiyan abhi haath mein. Andar flat bilkul waisaa tha jaise chhoda tha. Pankha band. Parda parhaa hua. Chappalen shoe rack ke paas, thodi seedhi wali taraf jaise woh rakhti hai. Kitchen ka tap nahi tapak raha tha. Sab kuch bilkul waisa tha.*
*Sivaay darwaaze ke.*
*Andar nahi gayi. Peeche corridor mein aa gayi. Corridor ki sasti safed tube light bhanat baat karti thi — aaj awaz thodi tez lagi.*
*Usne call ki.*
You okay?
*Doosri taraf watchman ne kuch der baad jawaab diya.*
Madam, kuch hua kya?
Mera ghar ka darwaza khula tha.
*Ruk.*
Aap building mein ho?`
  },
  {
    genre: 'THRILLER', scene_position: 'CLIFFHANGER',
    script: `*Auto ki backseat thodi tight thi — ek side pe usne bag rakha tha, doosri taraf khud thi. Raat ke 11:45. Flyover ke neeche orange sodium light blinking karti thi.*
*Usne window se bahar dekha.*
*Peeche wali car teen signals se saath chal rahi thi. Same car. Woh seedha jaati rahi — car bhi. Woh left mudi — car bhi.*
*Driver ne mirror mein dekha.*
Madam, koi tha kya aapke saath ghar par aaj?
*Nahi bola kuch usne. Bahar dekha. Car abhi bhi thi.*
*Phir car ka left indicator jala. Aur car left mudi. Alag raste pe chali gayi.*
*Usne ek baar peechhe dekha. Phir dobara.*
*Nahin thi.*
*Us raat woh sone se pehle teen baar darwaza lock check kiya. Chautha check karte waqt usne dekha — darwaze ke neeche se roshni thi. Woh roshni usne khud band ki thi.*`
  },
  {
    genre: 'ROMANCE', scene_position: 'OPENER',
    script: `*Plate haath se chhoot gayi. Daal uski safed kurte par giri — hem ke paas ek bhaura daag phailta gaya. Aas-paas plates ki khadakhat, koi band. Lawn ke uss taraf se kisi aunty ki hassi — zaroorat se zyaada tez. Kurte ki manchette pe dhab the, zyaada dhulaai ke. Uska haath kaamp raha tha jab usne napkins aage badhaye — thoda zyaada, zaroorat se zyaada.*
Yaar I'm so sorry.
*Haath nahi laga.*
It's fine.
No it's not fine, this is khaadi na? It's gonna stain.
*Napkin le liye. Ungliyaan nahi chhueen. Lawn ke uss taraf DJ 2014 ka kuch baja raha tha. Woh hila nahi.*
You don't know me.
Plate twenty-two. You signed before me.
*Ek pal rukaav. Woh padh rahi thi use — shoes kurte se match nahi karte the, ghadi karti thi.*
You read the seating chart?
I was bored.
Okay. I'm Maya.
*Sar hilaaya, apna naam nahi bola. Buffet ki line peechhe khiski. Andar se koi bola — ek naam jo usne pakad nahi paaya. Ek baar dekha. Chala gaya. Uski plate abhi bhi khaali thi.*`
  },
  {
    genre: 'ROMANCE', scene_position: 'CLIFFHANGER',
    script: `*Terminal 2. Departures. Raat ke 4:18. Wi-Fi teesri baar reconnect maang raha tha. Koi bench nahi bachi thi — woh apne trolley pe baithi thi. Woh security ke uss taraf tha, kahin. Woh theek se nahi jaanti thi kahan.*
*Message do baar type kiya. Dono baar delete kiya. Teesra chhota tha.*
tum ruk jao
*Teen shabd. Woh unhe aise dekh rahi thi jaise shayad rearrange ho jaayein. Aas-paas announcement teen zubaanon mein. Ek ladka rona band nahi kar raha tha kyunki maa chocolate nahi de rahi thi. Bahar aasman woh karne laga tha jo woh sunrise se pehle karta hai — ek rang chhod ke doosra hone ki koshish.*
*Usne upar dekha. Woh security exit par khada tha, boarding pass abhi bhi haath mein, usse dekh raha tha.*
*Andar nahi gaya tha.*
*Usne phone nahi rakha. Woh aage nahi badha. Cursor blink hua. Cursor blink hua. Cursor blink hua.*`
  },
  {
    genre: 'MYTHOLOGY', scene_position: 'OPENER',
    script: `*Goregaon building ki chhat, baarahvaan maal, shaam ke 6:42. Woh cigarette pee raha tha jo use nahi peeni chahiye thi. Neeche Western Express Highway par traffic waisaa tha jaisaa iss waqt hota hai. Chhabbees saal ka, ek job, ek girlfriend — kaha jaata tha ki theek tha woh.*
*Pehle kauwe aaye.*
*Woh wali tarah nahi jis tarah kauwe aate hain — ek ek karke, kuch chugne. Ek saath uttre. Chaalees, shayad pachaas. Muunde par, paani ki tank par, seedhiyaan ke railings par. Aakar baithe aur phir hile nahi. Kaanw nahi kiya. Baithe rahe aur use dekhte rahe.*
*Ek baar hansa — aur kya karna tha — aur hassi galat nikli.*
*Seedhiyaan par banda achanak tha. Ek second pehle nahi tha. Grey kurta pehne tha, purane pathar wale rang ka. Kisi jaisa bhi lag sakta tha — uncle jaisa, building secretary jaisa, koi bhi.*
Ashish.
*Usne apna naam nahi bataya tha is banda ko.*
Sir aap kaun ho?
*Banda kuch nahi bola. Kauwo ko dekha. Kauwe use dekhte rahe.*
Bahut waqt ho gaya. Tumhe yaad nahi hoga.
Sir mera naam Ashish nahi hai. Aap kisi aur ko —
*Muda. Aankhen wali jo bhuri hain aur purani dhool rakhe hain.*
Tumhara naam Ashish nahi hai. Tumhara naam Ashish iss janam mein hai.`
  },
  {
    genre: 'MYTHOLOGY', scene_position: 'MIDPOINT',
    script: `*Kashi Vishwanath temple ka basement, purana Varanasi. Zameen se saintaalis seedhiyan neeche. Deewaren geeli thi — koi wajah nahi, koi leak nahi, bas ek halki sili. Torch baar baar jhapkti thi. Pandit jo yahaan tak laaya tha woh neeche nahi aaya.*
*Peeche ki deewaar par likhaavat thi. Sanskrit, zyaadatar. Kuch symbols Sanskrit nahi the.*
*Usne apni sleeve peechhe kheenchi.*
*Baayein kaalaai ka nishaan — jise maa ne birthmark bola tha, jise laser se do baar hataya aur do baar wapas aaya — woh deewaar par tha. Pathar mein toda gaya. Bilkul usi shape. Bilkul usi orientation.*
*Thandi zameen par baith gayi. Pehle ghutne diye. Baithi rahi aur deewaar dekti rahi.*
Mummy ne kaha tha yeh nothing hai.
*Kisi se nahi bol rahi thi.*
Doctor ne kaha tha yeh nothing hai.
*Torch phir jhapki. Andheron ke us ek second mein, kuch peeche hila. Qadam nahi. Saans.*
*Torch waapas aayi. Likhaavat badal chuki thi. Ek aur symbol. Neeche. Taza toda gaya. Abhi bhi garam.*`
  },
];

function selectGoldenExamples(genre, epNum) {
  const posMap = { 1: ['OPENER', 'MIDPOINT'], 6: ['CLIFFHANGER', 'MIDPOINT'] };
  const positions = posMap[epNum] || ['MIDPOINT', 'CLIFFHANGER'];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  return positions.map(pos => {
    const exact = GOLDEN_SCENES.filter(s => s.genre === genre && s.scene_position === pos);
    if (exact.length) return pick(exact);
    const fallback = GOLDEN_SCENES.filter(s => s.scene_position === pos);
    return fallback.length ? pick(fallback) : null;
  }).filter(Boolean);
}

// ─── Anti-pattern (injected into every scene prompt) ─────────────────────────
const ANTI_PATTERN = `ANTI-PATTERN — do NOT write like this:

Rahul was feeling very nervous. The room felt cold and tense. He said: "Priya, I am worried about this situation." Priya looked at him with concern in her eyes. She said: "I understand your feelings." There was a lot of tension between them.

WHY IT FAILS: generic sensory detail ("cold and tense"), attribution tags ("He said:", "She said:"), emotion stated not shown ("worried", "concern"), zero code-switching, no concrete objects, English narration register.`;

// ─── Stage 1: Architect ───────────────────────────────────────────────────────
async function stageArchitect(userPrompt) {
  const schema = `{
  "genre": "ROMANCE|THRILLER|MYTHOLOGY",
  "title": "string (2-4 words, conversational Hinglish or Hindi)",
  "city": "string (Indian city)",
  "secret": "string (specific past event — what happened, who was involved, what was concealed. NOT an interpretation or theme.)",
  "logline": "string (one sentence — protagonist, disruption, stakes)",
  "story_rules": [
    "string (visible falsifiable fact — something a reader would notice if contradicted)",
    "string (key plot constraint — action or fact that cannot be reversed)",
    "string (unique world or character detail — specific enough to be testable)"
  ],
  "protagonist": {
    "name": "string (first name, Indian)",
    "speech_tic": "string (Hinglish verbal habit — e.g. 'matlab', 'dekh', 'sach mein', 'haan toh', 'waise bhi', 'kya pata')",
    "voice_card": [
      "string (casual/relaxed — natural register, no crisis)",
      "string (uncertain/worried — different emotional register)",
      "string (under pressure/urgent — stressed, short sentences)"
    ]
  },
  "characters": [{"name": "string", "role": "string (relationship to protagonist + story function)"}],
  "episodes": [
    {
      "episode_number": 1,
      "title": "string (2-3 words, Hinglish)",
      "scene_objectives": ["string (Scene 1 — mid-action entry point)", "string (Scene 2 — complication or escalation)", "string (Scene 3 — revelation that recontextualises)"],
      "target_cliffhanger": "string (exact Hinglish sentence Scene 3 ends on — physical impossibility or external threat made visible, NOT internal reflection)",
      "choice_question": "string (Hinglish dilemma)",
      "choice_a": {"label": "string (3-5 words)", "subtext": "string (the VALUE this player sacrifices — survival, loyalty, truth, love, safety)"},
      "choice_b": {"label": "string (3-5 words)", "subtext": "string (the VALUE this player sacrifices — must be a DIFFERENT value from choice_a)"}
    }
  ]
}`;

  return oaiChat([
    { role: 'system', content: `You are the lead story architect for Katha, an Indian interactive fiction app. You take a brief user premise and structure a complete 6-episode branching story blueprint.

GENRE FRAMEWORK:
- ROMANCE: Modern Indian setting. Class, family, or generational tension is the dominant conflict. The romance is obstructed by social structure, not by personality.
- THRILLER: Paranoia, mystery, or high-stakes survival. The protagonist starts ordinary; the world they wake into is not.
- MYTHOLOGY: A modern character is disrupted by an ancient or cosmic force they did not believe in. The supernatural arrives through physical wrongness, never through music or vocabulary.

CORE PRINCIPLES:
1. The "secret" is a specific hidden past event — a concrete fact, not an interpretation. It must name what happened, who was involved, and what was concealed. WRONG: "The protagonist carries guilt from his past." RIGHT: "Seven years ago Ravi hit a cyclist with his car, filed a false police report blaming the cyclist, and the family never learned the truth."
2. story_rules must be VISIBLE and FALSIFIABLE. A rule is good if breaking it would be immediately obvious to any reader. WRONG: "The faceless man represents fear." RIGHT: "Ravi has never owned or driven a vehicle since age 19 — he takes autos everywhere." Each rule is a specific constraint on character, world, or plot.
3. target_cliffhanger is the exact Hinglish sentence Scene 3 ends on, word for word. It must be a physical impossibility or an external threat made visible — NOT internal reflection. WRONG: "Matlab, kya woh sab meri wajeh se tha?" (internal reflection). RIGHT: "Woh aadmi bina chehre ke, bina pair ki awaaz ke, seedha darwaze ke doosri taraf khada tha." (physical impossibility).
4. choice_a and choice_b encode a VALUE CONFLICT — not just opposite actions. Each choice sacrifices a different value: survival vs loyalty, truth vs safety, self vs others. The subtext names what the player gives up, not just what they do.
5. The 6 episodes must escalate. Ep1 establishes; Eps 2-5 complicate and branch; Ep6 resolves.

SPEECH TIC RULES (CRITICAL):
- speech_tic must be a Hinglish verbal habit: "matlab", "dekh", "sach mein", "haan toh", "waise bhi", "kya pata", "arre", "yaar sun", "bas aise hi".
- NEVER use English filler words as the tic: "you know", "I mean", "like", "basically", "literally".
- voice_card lines must be primarily Hinglish — Hindi syntax with English words only where an urban Indian would naturally use them.
- The tic appears NATURALLY — sometimes mid-sentence, sometimes at the start. It must NOT open every voice_card line. It is a habit, not a prefix.
- The 3 voice_card lines must show 3 DIFFERENT emotional registers: one casual/relaxed, one uncertain/worried, one under pressure/urgent.
- WRONG voice_card (tic prefix on every line): "Matlab, yeh sahi nahi hai." / "Matlab, kya kar raha hai woh?" / "Matlab, bhago yahan se!"
- RIGHT voice_card (tic appears naturally, different emotions): "Yaar sun, aaj office mein kuch ajeeb hua — matlab bilkul samajh nahi aaya." / "Woh ladka... kya pata uska kya irada tha." / "Ek kaam kar, phone mat rakh — main aa raha hoon abhi."

OUTPUT: A single valid JSON object. No markdown fences. Start with { end with }.` },
    { role: 'user', content: `User premise: "${userPrompt}"

Build the complete blueprint. Include all 6 episodes.
Episodes 1-5 have choice_question, choice_a, choice_b. Episode 6 omits those fields.
For episodes 2-6, also include "scene_objectives_a" and "scene_objectives_b". CRITICAL: scene_objectives_a[0] MUST describe the specific physical situation the player enters as a direct consequence of choosing choice_a from the previous episode. scene_objectives_b[0] MUST describe the specific physical situation from choosing choice_b. These are causally tied to the choice label — not generic story beats. Example: if choice_a was "Bhaago wahan se" then scene_objectives_a[0] = "Scene 1 — protagonist mid-run, faceless man visible in auto mirror still chasing". If choice_b was "Rukne ko kaho" then scene_objectives_b[0] = "Scene 1 — auto has stopped, protagonist now face-to-face with the faceless man on a silent road".

Schema:
${schema}` }
  ], 'gpt-4o');
}

// ─── Stage 2: Screenwriter ────────────────────────────────────────────────────
async function stageScenesV3({ blueprint, episodeNumber, prev_last_sentence, choice_label, branch, banned_lines, examples }) {
  const epPlan = blueprint.episodes[episodeNumber - 1];
  const sceneObjectives = branch === 'b'
    ? (epPlan.scene_objectives_b || epPlan.scene_objectives || [])
    : branch === 'a'
    ? (epPlan.scene_objectives_a || epPlan.scene_objectives || [])
    : (epPlan.scene_objectives || []);
  const [obj1, obj2, obj3] = [
    sceneObjectives[0] || 'Open mid-action, establish situation immediately',
    sceneObjectives[1] || 'Escalate the conflict, raise the stakes',
    sceneObjectives[2] || 'Land the target cliffhanger sentence exactly'
  ];

  const prevBlock = prev_last_sentence
    ? `Previous episode's last sentence: "${prev_last_sentence}" — Scene 1 must transition from this.`
    : 'This is Episode 1 — open mid-action, zero backstory or exposition.';

  const choiceBlock = choice_label
    ? `BRANCH PATH (non-negotiable): The player chose "${choice_label}". Scene 1 MUST open with the direct physical consequence of this choice already in motion. If the choice was to stop something, Scene 1 opens with it stopped or stopping. If the choice was to run, Scene 1 opens mid-run. The first sentence of Scene 1 must make this choice consequence unmistakable. Do not write a Scene 1 that could belong to the other branch.`
    : '';

  const bannedBlock = banned_lines?.length
    ? `BANNED PHRASES (do NOT repeat or paraphrase any of these):\n${banned_lines.slice(-24).join('\n')}`
    : '';

  const examplesBlock = examples?.length
    ? examples.map((ex, i) => `REFERENCE SCENE ${i+1} (${ex.genre} — ${ex.scene_position})\nMatch the cadence, sensory specificity, and Hinglish code-switching pattern. DO NOT copy content.\n\n${ex.script}`).join('\n\n---\n\n')
    : '';

  return oaiChat([
    { role: 'system', content: `You write one episode of three scenes for Katha, an Indian interactive fiction app.

OUTPUT FORMAT (CRITICAL):
- Each scene is a single string in the "script" field. No nested arrays.
- Action/setting goes inside *asterisks*. Dialogue goes outside asterisks, on its own line.
- NO quotation marks. NO attribution tags ("Rahul said:", "Meera:", etc.). Never nest asterisks.
- SCENE STRUCTURE: ONE opening *action block* (2-3 SHORT sentences — place, time, one physical anchor) followed by 3-5 dialogue exchanges. Between dialogue lines, brief *action beats* of 1-2 sentences ONLY. Action and dialogue interleave — do NOT batch all action first, then all dialogue.
- WRONG: *Office mein sab log the. Tension tha. Rohan nervous tha. Uski palms paseeni thi.* / Kab aaya? / Abhi.
- RIGHT: *Office ki tenth floor. Shaam ke 6:41. AC band tha — sweat ki mehak.* / Rohan, kab aaya? / *Woh ruk gaya, jawaab dene se pehle.* / Abhi hi.

LANGUAGE RULES (CRITICAL — applies to EVERY *action beat*, not just the opening):
- Every single *asterisk block* anywhere in the scene is Hindi-dominant Hinglish. No exceptions.
- The code-switch happens AT the emotionally loaded word, not at random.
- The NARRATOR (inside *asterisks*) is Hindi-dominant. Primary language is Hindi. English enters ONLY where an urban Indian person would naturally use it — "phone", "auto", "office", "deadline", "okay". NOT as narration style.
- WRONG narrator: *She felt a chill run down her spine.*
- RIGHT narrator: *Reedh ki haddi mein ek jhurjhuri si gayi.*
- Concrete object similes over adjective declarations. "Haath kaanch ki tarah tha — ek jhatkay mein toot jaata" not "haath kaanp raha tha".
- Repetition with one altered element does emotional work. "Ek baar dekha. Do baar dekha. Teesri baar dekha aur phone rakha nahi."
- The shortest sentence in a scene is the heaviest. Land scenes on a short final sentence.
- One Sanskrit or Urdu loanword per scene maximum. The supernatural is more frightening when it is grammatical, not ornamental.
- Direct address by name, title, or relation ("beta", "yaar", "sir", "bhaiya", "arre") is the load-bearing texture of Indian dialogue.

CRAFT RULES:
- Scene 1 of every episode must open with a hook — a line that creates an unanswered question in the reader's mind within the first 10 words. WRONG: *Rahul office pahuncha.* RIGHT: *Rahul ne phone uthaya — tera call nahi tha.*
- Open all scenes mid-action. No backstory exposition, no character introduction.
- When grounding a place: use ONE specific physical detail (a smell, a sound, a texture) — not generic atmosphere. Specific ("chai ki jagah cigarette ka dhuaan") beats generic ("room was tense") every time.
- Show emotion through action, never through statement. "Meera ne teen baar phone uthaya, teen baar rakha" > "Meera was scared."
- Scene 3 MUST end with the exact target_cliffhanger sentence from the blueprint, word for word. No paraphrase. No translation. No alteration.
- Branch divergence: if a choice trajectory is provided, its consequence must be visible in Scene 1.

${ANTI_PATTERN}

STORY CONTEXT:
Genre: ${blueprint.genre} | City: ${blueprint.city}
Story rules: ${(blueprint.story_rules || []).join(' | ')}
Secret (drives subtext — NEVER name it directly): ${blueprint.secret || ''}
Protagonist: ${blueprint.protagonist?.name} | Speech tic: "${blueprint.protagonist?.speech_tic}" — use naturally, not in every line.
Characters: ${(blueprint.characters || []).map(c => `${c.name} (${c.role})`).join(', ')}

PROTAGONIST VOICE CARD — the protagonist speaks like this:
${(blueprint.protagonist?.voice_card || []).map((l, i) => `${i+1}. ${l}`).join('\n')}

${prevBlock}
${choiceBlock}
${bannedBlock}

${examplesBlock}

OUTPUT: Single valid JSON object, no markdown fences.` },
    { role: 'user', content: `Write Episode ${episodeNumber} of "${blueprint.title}" (${blueprint.genre}).

Scene objectives:
1. ${obj1}
2. ${obj2}
3. ${obj3}

Scene 3 MUST end with this exact sentence, word for word — copy it verbatim:
"${epPlan.target_cliffhanger || ''}"

Output:
{
  "scenes": [
    {"scene_number": 1, "script": "..."},
    {"scene_number": 2, "script": "..."},
    {"scene_number": 3, "script": "... ends on the exact cliffhanger above"}
  ]
}` }
  ], 'gpt-5.4-mini', { max_tokens: 2000 });
}

// ─── Stage 3: Validator (ep1 only) ───────────────────────────────────────────
async function stageValidate(ep1Result, blueprint) {
  const scriptsText = (ep1Result?.scenes || []).map((s, i) => `Scene ${i+1}:\n${s.script}`).join('\n\n---\n\n');
  return oaiChat([
    { role: 'system', content: `You audit Episode 1 of an interactive fiction story before it ships to the player.

CHECKS:
1. Does Scene 3 end on the exact target_cliffhanger sentence?
2. Does each scene open mid-action — and does Scene 1 open with a hook that creates an unanswered question?
3. Are any physical details specific (not generic) where they appear?
4. Are emotions shown through action, not stated?
5. Does dialogue avoid attribution tags ("Rahul said:", "Meera:")?
6. Do action beats between dialogue lines stay at 1-2 sentences (not paragraphs)?
7. Does code-switching happen at the emotionally loaded word, not randomly?
8. Does any scene contradict the story rules?
9. Does any phrase echo or paraphrase the banned-lines cache?
8. Is the narrator (inside *asterisks*) Hindi-dominant, not English?
9. Are any story rules contradicted?

If everything passes: {"pass": true, "issues": [], "target_node": null, "revised_script": null}
If any check fails: {"pass": false, "issues": ["specific check that failed"], "target_node": 1|2|3, "revised_script": "corrected script for that ONE scene only"}

Output raw JSON only, no markdown fences.` },
    { role: 'user', content: `Story: "${blueprint.title}" (${blueprint.genre})
Protagonist: ${blueprint.protagonist?.name}, speech tic: "${blueprint.protagonist?.speech_tic}"
Secret: "${blueprint.secret}"
Target cliffhanger: "${blueprint.episodes[0]?.target_cliffhanger}"

Episode 1 scenes:
${scriptsText}` }
  ], 'gpt-5.4-mini');
}

// ─── Story State ─────────────────────────────────────────────────────────────
async function stageStoryState(epResult, blueprint, episodeNumber, branch) {
  const scenes = branch ? (epResult[branch]?.scenes || []) : (epResult?.scenes || []);
  const scriptsText = scenes.map((s, i) => `Scene ${i + 1}:\n${s.script}`).join('\n\n---\n\n');
  return oaiChat([
    { role: 'system', content: `Extract a compact story state from these scenes. Output raw JSON only, no markdown fences.
{"relationships":[{"pair":"string","state":"string"}],"active_mysteries":["string"],"emotional_state":"string","objects":["string"],"character_goals":["string"]}
Keep each string under 20 words. Total output must be under 150 tokens.` },
    { role: 'user', content: `Story: "${blueprint.title}" — Episode ${episodeNumber}${branch ? ` (Branch ${branch.toUpperCase()})` : ''}
Characters: ${(blueprint.characters || []).map(c => c.name).join(', ')}

Scenes:
${scriptsText}` }
  ], 'gpt-5.4-mini', { max_tokens: 200 });
}

// ─── Story utils ──────────────────────────────────────────────────────────────
function extractBannedLines(epResult) {
  const lines = [];
  for (const s of (epResult?.scenes || [])) {
    if (!s.script) continue;
    s.script.replace(/\*[^*]+\*/g, '').split(/[.!?।]+/).map(x => x.trim()).filter(x => x.length > 12).forEach(x => lines.push(x));
  }
  return lines;
}

function extractLastSentence(epResult) {
  const scenes = epResult?.scenes || [];
  if (!scenes.length) return '';
  const last = scenes[scenes.length - 1];
  if (!last?.script) return '';
  const text = last.script.replace(/\*/g, '').trim();
  const parts = text.split(/[.!?।]+/).map(s => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || '';
}

// ─── Markdown output ──────────────────────────────────────────────────────────
function scenesToMd(scenes) {
  return (scenes || []).map((s, i) => `#### Scene ${i+1}\n\n${s.script || ''}`).join('\n\n');
}

function storyToMarkdown(blueprint, ep1Result, episodeResults, episodeImages, coverPath, ep1ImgPath) {
  const lines = [];
  lines.push(`# ${blueprint.title}`);
  lines.push(`**Genre:** ${blueprint.genre} | **City:** ${blueprint.city}`);
  lines.push(`**Logline:** ${blueprint.logline}`);
  lines.push(`**Secret:** ${blueprint.secret}`);
  lines.push(`**Story rules:**`);
  blueprint.story_rules?.forEach(r => lines.push(`- ${r}`));
  lines.push(`\n**Protagonist:** ${blueprint.protagonist?.name} — tic: "${blueprint.protagonist?.speech_tic}"`);
  lines.push(`**Voice card:**`);
  blueprint.protagonist?.voice_card?.forEach((l, i) => lines.push(`${i+1}. ${l}`));
  lines.push(`\n**Cover image:** ${coverPath || '(none)'}`);
  lines.push('');

  const ep1Plan = blueprint.episodes[0];
  lines.push(`---\n## Episode 1: ${ep1Plan?.title}`);
  lines.push(`**Image:** ${ep1ImgPath || '(none)'}`);
  lines.push(`**Target cliffhanger:** "${ep1Plan?.target_cliffhanger}"`);
  lines.push('');
  lines.push(scenesToMd(ep1Result?.scenes));
  lines.push(`\n**Choice:** ${ep1Plan?.choice_question}`);
  lines.push(`- **A:** ${ep1Plan?.choice_a?.label} — *${ep1Plan?.choice_a?.subtext}*`);
  lines.push(`- **B:** ${ep1Plan?.choice_b?.label} — *${ep1Plan?.choice_b?.subtext}*`);

  for (let n = 2; n <= 6; n++) {
    const epPlan = blueprint.episodes[n - 1];
    const epData = episodeResults[n - 2];
    // Fix: episodeImages index — [0]=unused, [1]=ep1, [2]=ep2, ..., [n]=epN
    const epImg = episodeImages[n];
    lines.push(`\n---\n## Episode ${n}: ${epPlan?.title}`);
    lines.push(`**Pollinations image:** ${epImg || '(none)'}`);
    lines.push(`**Target cliffhanger:** "${epPlan?.target_cliffhanger}"`);
    lines.push(`\n### Branch A (player chose: ${blueprint.episodes[n-2]?.choice_a?.label || 'A'})`);
    lines.push(scenesToMd(epData?.A?.scenes));
    lines.push(`\n### Branch B (player chose: ${blueprint.episodes[n-2]?.choice_b?.label || 'B'})`);
    lines.push(scenesToMd(epData?.B?.scenes));
    if (epPlan?.choice_question) {
      lines.push(`\n**Choice:** ${epPlan.choice_question}`);
      lines.push(`- **A:** ${epPlan?.choice_a?.label} — *${epPlan?.choice_a?.subtext}*`);
      lines.push(`- **B:** ${epPlan?.choice_b?.label} — *${epPlan?.choice_b?.subtext}*`);
    }
  }
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log(`\nOutput folder: ${OUT_DIR}`);
  console.log(`\nPrompt: "${USER_PROMPT}"\n`);

  // ── Step 1: Architect (gpt-4o) ──────────────────────────────────────────────
  console.log('▶ Step 1/6 — Architect (gpt-4o)...');
  const t1 = Date.now();
  const blueprint = await stageArchitect(USER_PROMPT);
  while (blueprint.episodes.length < 6) {
    const n = blueprint.episodes.length + 1;
    blueprint.episodes.push({
      episode_number: n, title: `Episode ${n}`,
      scene_objectives: ['Open mid-action', 'Escalate', 'End on cliffhanger'],
      scene_objectives_a: ['Open mid-action', 'Escalate', 'End on cliffhanger'],
      scene_objectives_b: ['Open mid-action', 'Escalate', 'End on cliffhanger'],
      target_cliffhanger: '...', choice_question: 'Aage kya?',
      choice_a: { label: 'Option A', subtext: '' }, choice_b: { label: 'Option B', subtext: '' }
    });
  }
  writeJson('blueprint.json', blueprint);
  console.log(`  Done in ${((Date.now()-t1)/1000).toFixed(1)}s`);
  console.log(`  Title:      ${blueprint.title}`);
  console.log(`  Genre:      ${blueprint.genre}`);
  console.log(`  City:       ${blueprint.city}`);
  console.log(`  Secret:     ${blueprint.secret}`);
  console.log(`  Logline:    ${blueprint.logline}`);
  console.log(`  Protagonist: ${blueprint.protagonist?.name} — tic: "${blueprint.protagonist?.speech_tic}"`);
  blueprint.protagonist?.voice_card?.forEach((l, i) => console.log(`  voice[${i+1}]: ${l}`));
  console.log(`  Characters: ${blueprint.characters?.map(c => c.name).join(', ')}`);
  blueprint.episodes.slice(0, 3).forEach((ep, i) => {
    console.log(`  Ep${i+1}: "${ep.title}" → "${ep.target_cliffhanger}"`);
  });

  // ── Step 2: Episode 1 scenes + Cover image (parallel) ───────────────────────
  console.log('\n▶ Step 2/6 — Episode 1 scenes + Cover image (parallel)...');
  const t2 = Date.now();
  const ep1Examples = selectGoldenExamples(blueprint.genre, 1);
  console.log(`  Golden examples: ${ep1Examples.map(e => `${e.genre}/${e.scene_position}`).join(', ')}`);
  const [ep1Result, coverPath] = await Promise.all([
    stageScenesV3({ blueprint, episodeNumber: 1, prev_last_sentence: null, choice_label: null, banned_lines: [], examples: ep1Examples }),
    gptImage(buildCoverPrompt(blueprint), 'cover', 'cover.png').catch(e => { console.warn(`  ⚠ Cover failed: ${e.message}`); return null; })
  ]);
  if (!ep1Result?.scenes?.length) throw new Error('Episode 1 returned no scenes');
  console.log(`  Done in ${((Date.now()-t2)/1000).toFixed(1)}s | cover: ${coverPath ? '✓ saved' : '✗ failed'}`);

  // ── Step 3: Validate ep1 + Ep1 image (parallel) ─────────────────────────────
  console.log('\n▶ Step 3/6 — Validate ep1 + Ep1 image (parallel)...');
  const t3 = Date.now();
  const [validation, ep1ImgPath] = await Promise.all([
    stageValidate(ep1Result, blueprint).catch(e => { console.warn(`  ⚠ Validator error: ${e.message}`); return null; }),
    gptImage(buildEpImagePrompt(blueprint, 1), 'ep1', 'ep1-image.png').catch(e => { console.warn(`  ⚠ Ep1 image failed: ${e.message}`); return null; })
  ]);
  if (validation) {
    if (!validation.pass && validation.target_node && validation.revised_script) {
      const idx = validation.target_node - 1;
      if (ep1Result.scenes[idx]) ep1Result.scenes[idx].script = validation.revised_script;
      console.log(`  Validator: FIXED scene ${validation.target_node} — ${validation.issues?.[0] || ''}`);
    } else {
      console.log(`  Validator: PASS`);
    }
  }
  console.log(`  Done in ${((Date.now()-t3)/1000).toFixed(1)}s | ep1 image: ${ep1ImgPath ? '✓ saved' : '✗ failed'}`);

  // ── Step 4: Episodes 2-6 dual branch + Pollinations URLs ────────────────────
  console.log('\n▶ Step 4/6 — Episodes 2-6 (dual branch A+B, Pollinations images)...');
  let banned_lines = extractBannedLines(ep1Result);
  // Track separate continuity sentences per branch so Branch B opens from Branch B's actual ending
  let prev_last_sentence_a = extractLastSentence(ep1Result);
  let prev_last_sentence_b = prev_last_sentence_a; // ep1 has no branches — both start from same ep1 ending
  const episodeResults = []; // [{A, B}] for eps 2-6 (0-indexed: [0]=ep2, [4]=ep6)
  // episodeImages: [0]=unused, [1]=ep1ImgPath, [2]=ep2URL, ..., [6]=ep6URL
  const episodeImages = ['', ep1ImgPath || ''];

  // Compute story_state from ep1 so ep2 has genuine episode memory
  let story_state_a = await stageStoryState(ep1Result, blueprint, 1, null).catch(() => null);
  let story_state_b = story_state_a;

  for (let n = 2; n <= 6; n++) {
    const tn = Date.now();
    process.stdout.write(`  Ep${n} A+B parallel...`);
    const prevEpPlan = blueprint.episodes[n - 2];
    const examples = selectGoldenExamples(blueprint.genre, n);
    const currentBanned = [...banned_lines];
    const prevChoiceA = prevEpPlan?.choice_a?.label || '';
    const prevChoiceB = prevEpPlan?.choice_b?.label || '';

    let branchA, branchB, epErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
        [branchA, branchB] = await Promise.all([
          stageScenesV3({ blueprint, episodeNumber: n, story_state: story_state_a, prev_last_sentence: prev_last_sentence_a, choice_label: prevChoiceA, branch: 'a', banned_lines: currentBanned, examples }),
          stageScenesV3({ blueprint, episodeNumber: n, story_state: story_state_b, prev_last_sentence: prev_last_sentence_b, choice_label: prevChoiceB, branch: 'b', banned_lines: currentBanned, examples })
        ]);
        if (branchA?.scenes?.length && branchB?.scenes?.length) { epErr = null; break; }
        epErr = new Error(`Episode ${n} returned no scenes`);
      } catch(e) {
        epErr = e;
        process.stdout.write(` [retry ${attempt+1}]`);
      }
    }
    if (epErr) throw epErr;
    if (!branchA?.scenes?.length || !branchB?.scenes?.length) throw new Error(`Episode ${n} returned no scenes`);
    episodeResults.push({ A: branchA, B: branchB });
    // index n = correct Pollinations URL for ep n
    episodeImages.push(pollinationsUrl(buildEpImagePrompt(blueprint, n)));

    banned_lines.push(...extractBannedLines(branchA), ...extractBannedLines(branchB));
    if (banned_lines.length > 72) banned_lines.splice(0, banned_lines.length - 72);
    prev_last_sentence_a = extractLastSentence(branchA);
    prev_last_sentence_b = extractLastSentence(branchB);
    // Update story_state per branch for next episode
    [story_state_a, story_state_b] = await Promise.all([
      stageStoryState({ A: branchA, B: branchB }, blueprint, n, 'a').catch(() => story_state_a),
      stageStoryState({ A: branchA, B: branchB }, blueprint, n, 'b').catch(() => story_state_b)
    ]);
    console.log(` done ${((Date.now()-tn)/1000).toFixed(1)}s`);
  }

  // ── Step 5: Download Pollinations images + assemble outputs ─────────────────
  console.log('\n▶ Step 5/6 — Downloading Pollinations images for eps 2-6...');
  // episodeImages[n] = Pollinations URL for episode n (n=2..6)
  // Download each and replace URL with local file path
  const epImagePaths = ['', ep1ImgPath || '']; // index 0 unused, 1 = ep1
  for (let n = 2; n <= 6; n++) {
    const pollUrl = episodeImages[n];
    const filename = `ep${n}-image.png`;
    try {
      process.stdout.write(`  ep${n} Pollinations...`);
      const saved = await downloadUrlToFile(pollUrl, path.join(OUT_DIR, filename));
      epImagePaths.push(saved);
      console.log(` ✓ ${filename}`);
    } catch(e) {
      console.warn(` ✗ failed (${e.message}) — keeping URL`);
      epImagePaths.push(pollUrl); // fallback: keep URL if download fails
    }
  }

  console.log('\n▶ Step 5b/6 — Assembling story JSON...');
  const storyJson = {
    title: blueprint.title,
    genre: blueprint.genre,
    city: blueprint.city,
    cover_img: coverPath ? `file://${coverPath}` : '',
    version: 'v4',
    episodes: [
      {
        title: blueprint.episodes[0].title,
        scenes: ep1Result.scenes,
        image: ep1ImgPath ? `file://${ep1ImgPath}` : '',
        choice: {
          q: blueprint.episodes[0].choice_question,
          A: { text: blueprint.episodes[0].choice_a?.label, sub: blueprint.episodes[0].choice_a?.subtext },
          B: { text: blueprint.episodes[0].choice_b?.label, sub: blueprint.episodes[0].choice_b?.subtext }
        }
      },
      ...episodeResults.map((r, i) => {
        const epPlan = blueprint.episodes[i + 1];
        const isLast = i === 4;
        const imgPath = epImagePaths[i + 2]; // i=0→ep2=index2
        const ep = {
          title: epPlan.title,
          scenesA: r.A.scenes,
          scenesB: r.B.scenes,
          image: imgPath ? (imgPath.startsWith('/') ? `file://${imgPath}` : imgPath) : ''
        };
        if (!isLast) {
          ep.choice = {
            q: epPlan.choice_question,
            A: { text: epPlan.choice_a?.label, sub: epPlan.choice_a?.subtext },
            B: { text: epPlan.choice_b?.label, sub: epPlan.choice_b?.subtext }
          };
        }
        return ep;
      })
    ]
  };
  writeJson('story.json', storyJson);

  const imageIndex = {
    cover: coverPath || null,
    ep1_image: ep1ImgPath || null,
    ep2_image: epImagePaths[2] || null,
    ep3_image: epImagePaths[3] || null,
    ep4_image: epImagePaths[4] || null,
    ep5_image: epImagePaths[5] || null,
    ep6_image: epImagePaths[6] || null,
  };
  writeJson('image-urls.json', imageIndex);

  // ── Step 6: Markdown ─────────────────────────────────────────────────────────
  console.log('▶ Step 6/6 — Writing story.md...');
  const md = storyToMarkdown(blueprint, ep1Result, episodeResults, epImagePaths, coverPath, ep1ImgPath);
  writeText('story.md', md);

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✓ DONE in ${totalSec}s`);
  console.log(`Output: ${OUT_DIR}/`);
  console.log(`  blueprint.json   — architect output`);
  console.log(`  story.json       — assembled story (v4 format)`);
  console.log(`  story.md         — all scenes, both branches, readable`);
  console.log(`  cover.png        — gpt-image-1 cover image`);
  console.log(`  ep1-image.png    — gpt-image-1 ep1 image`);
  console.log(`  image-urls.json  — all image paths + Pollinations URLs for eps 2-6`);
  console.log('═'.repeat(60));

  // Print ep1 inline so you can read it immediately
  console.log('\n' + '─'.repeat(60));
  console.log(`EPISODE 1 — ${blueprint.episodes[0].title}`);
  console.log('─'.repeat(60));
  for (const s of (ep1Result?.scenes || [])) {
    console.log(`\n[Scene ${s.scene_number}]\n${s.script}`);
  }
  console.log('\n' + '─'.repeat(60));
  console.log(`Choice: ${blueprint.episodes[0].choice_question}`);
  console.log(`  A: ${blueprint.episodes[0].choice_a?.label} — ${blueprint.episodes[0].choice_a?.subtext}`);
  console.log(`  B: ${blueprint.episodes[0].choice_b?.label} — ${blueprint.episodes[0].choice_b?.subtext}`);
}

main().catch(e => { console.error('\nFATAL:', e.message, '\n', e.stack); process.exit(1); });
