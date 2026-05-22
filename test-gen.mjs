// test-gen.mjs — run: node test-gen.mjs "your prompt here"
// Tests stageArchitect + stageScenesV3 (ep1) + stageValidate via the Supabase proxy

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const TOKEN = process.env.OPENAI_API_KEY || '';

const USER_PROMPT = process.argv[2] || 'Ram returns to modern India, sees everything broken, and decides to fight. Everyone around him is a Ravana.';

// ─── helpers ────────────────────────────────────────────────────────────────

function safeJsonParse(raw) {
  const s = (raw || '').trim();
  const fenced = s.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return JSON.parse(fenced ? fenced[1].trim() : s);
}

async function oaiChat(messages, model = 'gpt-4o-mini', extra = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  let res;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, ...extra }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || 'API error ' + res.status);
  }
  const d = await res.json();
  if (!d.choices?.[0]?.message?.content) throw new Error('Empty response from model');
  const raw = d.choices[0].message.content;
  try {
    return safeJsonParse(raw);
  } catch(e) {
    console.error('\n[RAW response that failed to parse]:\n', raw.slice(0, 800));
    throw e;
  }
}

// ─── golden scenes (2 per genre for ep1 injection) ──────────────────────────

const GOLDEN_SCENES = [
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
    genre: 'MYTHOLOGY', scene_position: 'MIDPOINT',
    script: `*Kashi Vishwanath temple ka basement, purana Varanasi. Zameen se saintaalis seedhiyan neeche. Deewaren geeli thi — koi wajah nahi, koi leak nahi, bas ek halki sili. Torch baar baar jhapkti thi. Pandit jo yahaan tak laaya tha woh neeche nahi aaya — kahin upar intezaar kar raha tha.*
*Peeche ki deewaar par likhaavat thi. Sanskrit, zyaadatar. Kuch symbols Sanskrit nahi the.*
*Usne apni sleeve peechhe kheenchi.*
*Baayein kaalaai ka nishaan — jise maa ne birthmark bola tha, jise laser se do baar hataya aur do baar wapas aaya — woh deewaar par tha. Pathar mein toda gaya. Bilkul usi shape. Bilkul usi orientation.*
*Thandi zameen par baith gayi. Pehle ghutne diye. Baithi rahi aur deewaar dekti rahi. Roya nahi — rona baad mein hota hai, safe jagah mein, jaani-pehchani roshni mein.*
Mummy ne kaha tha yeh nothing hai.
*Kisi se nahi bol rahi thi.*
Doctor ne kaha tha yeh nothing hai.
*Torch phir jhapki. Andheron ke us ek second mein, kuch peeche hila. Qadam nahi. Saans.*
*Torch waapas aayi. Likhaavat badal chuki thi. Ek aur symbol. Neeche. Taza toda gaya. Abhi bhi garam.*`
  },
];

function selectGoldenExamples(genre, episodeNumber) {
  const positionMap = { 1: ['OPENER', 'MIDPOINT'], 6: ['CLIFFHANGER', 'MIDPOINT'] };
  const positions = positionMap[episodeNumber] || ['MIDPOINT', 'CLIFFHANGER'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return positions.map(pos => {
    const exact = GOLDEN_SCENES.filter(s => s.genre === genre && s.scene_position === pos);
    if (exact.length) return pick(exact);
    const fallback = GOLDEN_SCENES.filter(s => s.scene_position === pos);
    return fallback.length ? pick(fallback) : null;
  }).filter(Boolean);
}

// ─── stages ─────────────────────────────────────────────────────────────────

async function stageArchitect(userPrompt) {
  const schema = `{
  "genre": "ROMANCE|THRILLER|MYTHOLOGY",
  "title": "2-4 word Hinglish title",
  "city": "Indian city",
  "secret": "one sentence hidden truth driving subtext across all 6 episodes",
  "logline": "one sentence: protagonist, disruption, stakes",
  "story_rules": ["permanent fact about protagonist", "key plot fact", "unique world detail"],
  "protagonist": {
    "name": "first name",
    "speech_tic": "their verbal habit in one phrase",
    "voice_card": ["sample dialogue line 1", "sample dialogue line 2 — different emotion", "sample dialogue line 3 — under stress"]
  },
  "characters": [{"name": "first name", "role": "relationship to protagonist and story function"}],
  "episodes": [
    {
      "episode_number": 1,
      "title": "2-3 words Hinglish",
      "scene_objectives": ["Scene 1 objective", "Scene 2 objective", "Scene 3 objective"],
      "target_cliffhanger": "exact sentence Scene 3 must end on",
      "choice_question": "Hinglish dilemma question",
      "choice_a": {"label": "3-5 words", "subtext": "hidden cost"},
      "choice_b": {"label": "3-5 words", "subtext": "hidden cost"}
    }
  ]
}`;

  return oaiChat([
    { role: 'system', content: `You are the lead story architect for Katha, an Indian interactive fiction app.

GENRE FRAMEWORK:
- ROMANCE: Modern Indian setting. Class, family, or generational tension is the dominant conflict.
- THRILLER: Paranoia or high-stakes survival. Protagonist starts ordinary; the world they wake into is not.
- MYTHOLOGY: A modern character is disrupted by an ancient force they did not believe in. The supernatural arrives through physical wrongness, never through music or vocabulary.

CORE PRINCIPLES:
1. The "secret" drives subtext in every scene even when never named directly.
2. The protagonist's voice_card (3 sample lines) must show their natural register and verbal habit.
3. story_rules are permanent — no later episode can contradict them.
4. Episodes must escalate. Ep1 establishes; eps 2-5 complicate and branch; ep6 resolves.
5. target_cliffhanger for each episode is the exact sentence Scene 3 must end on.
6. choice_a and choice_b must feel morally opposite — no clearly correct answer.

SPEECH TIC RULES (critical):
- speech_tic must be a Hinglish verbal habit: something like "matlab", "dekh", "sach mein", "haan toh", "kyun nahi", "bas aise hi", "waise bhi", "kya pata".
- NEVER use English filler words: "you know", "y'know", "I mean", "like", "basically", "literally".
- The tic must be a word or phrase an Indian would actually use mid-conversation.
- voice_card lines must be primarily Hinglish — Hindi syntax with natural English words only. NEVER write an English sentence with a tic tacked on.
- WRONG voice_card line: "Matlab, this isn't the Delhi I remember."
- RIGHT voice_card line: "Matlab yaar, yeh wala Delhi mujhe yaad nahi tha bilkul."

OUTPUT: A single valid JSON object. No markdown fences. Start with { and end with }.` },
    { role: 'user', content: `User premise: "${userPrompt}"

Build the complete blueprint. Include all 6 episodes. Episodes 1-5 have choice_question, choice_a, choice_b. Episode 6 omits those fields.
For episodes 2-6, also include "scene_objectives_a" and "scene_objectives_b".

Schema:
${schema}` }
  ], 'gpt-4o');
}

async function stageScenesV3({ blueprint, episodeNumber, story_state, prev_last_sentence, choice_label, banned_lines, examples }) {
  const epPlan = blueprint.episodes[episodeNumber - 1];
  const sceneObjectives = choice_label
    ? (epPlan.scene_objectives_a || epPlan.scene_objectives || [])
    : (epPlan.scene_objectives_b || epPlan.scene_objectives || epPlan.scene_objectives_a || []);
  const obj1 = sceneObjectives[0] || 'Open mid-action';
  const obj2 = sceneObjectives[1] || 'Escalate the conflict';
  const obj3 = sceneObjectives[2] || 'End on the target cliffhanger';

  const stateBlock = story_state
    ? `STORY STATE (maintain continuity):\n${JSON.stringify(story_state)}`
    : '';
  const prevBlock = prev_last_sentence
    ? `Previous episode's last sentence: "${prev_last_sentence}" — Scene 1 must flow from this.`
    : 'This is Episode 1 — open mid-action, zero backstory or exposition.';
  const bannedBlock = (banned_lines && banned_lines.length)
    ? `BANNED PHRASES (do NOT repeat or paraphrase):\n${banned_lines.slice(-24).join('\n')}`
    : '';
  const examplesBlock = examples && examples.length
    ? examples.map((ex, i) =>
        `REFERENCE SCENE ${i + 1} (${ex.genre} ${ex.scene_position} — match cadence and sensory specificity, do NOT copy content):\n${ex.script}`
      ).join('\n\n')
    : '';
  const antiPattern = `ANTI-PATTERN (do NOT write like this):
Rahul was feeling very nervous. The room felt cold and tense. He said: "Priya, I am worried about this situation." Priya looked at him with concern in her eyes. She said: "I understand your feelings." There was a lot of tension between them.`;

  return oaiChat([
    { role: 'system', content: `You write one episode of three scenes for Katha, an Indian interactive fiction app.

OUTPUT FORMAT (CRITICAL):
- Each scene is a single string in the "script" field.
- Action/setting/internal state goes inside *asterisks*. ONE continuous *action block* opens each scene — do not open a new *action block* before you have closed the previous one. Never nest asterisks.
- Character dialogue goes outside asterisks, on its own line. No quotation marks. No attribution tags ("Rahul said:" is forbidden).
- Structure per scene: *opening action block (3-6 lines, establishes place/mood)* then dialogue lines, with brief *one-line action beats* between dialogue lines only.

NARRATOR LANGUAGE (CRITICAL):
- The narrator (everything inside *asterisks*) is Hindi-dominant Hinglish. Primary language is Hindi in Roman script.
- English enters ONLY where an urban Indian person would naturally use it — "exit", "meeting", "phone", "deadline". Not as narration style.
- NO literary English constructions inside asterisks: no "she felt a chill", no "the atmosphere was tense", no "he couldn't help but notice".
- WRONG: *She felt nervous as she entered the crowded room.*
- RIGHT: *Haath kaamp raha tha. Andar se awaaz aa rahi thi — bahut log the, bahut shor.*

LANGUAGE:
- Roman-script Hinglish — Hindi-English code-switching the way urban Indian 18-30 year olds actually speak.
- Code-switch AT the emotionally loaded word, not at random.
- Concrete object similes over adjective declarations.
- Shortest sentence in a scene is the heaviest.

CRAFT:
- Open scenes mid-action. No backstory or exposition.
- One concrete sensory detail per beat.
- Show emotion through action, never through statement.
- Scene 3 MUST end with this exact sentence word for word: "${epPlan.target_cliffhanger || ''}"

STORY CONTEXT:
Genre: ${blueprint.genre} | City: ${blueprint.city}
Story rules: ${(blueprint.story_rules || []).join(' | ')}
Secret (drives subtext — never name it directly): ${blueprint.secret || ''}
Protagonist: ${blueprint.protagonist?.name}. Speech tic: ${blueprint.protagonist?.speech_tic}
Characters: ${(blueprint.characters || []).map(c => `${c.name} (${c.role})`).join(', ')}

PROTAGONIST VOICE CARD:
${(blueprint.protagonist?.voice_card || []).map((l, i) => `${i + 1}. ${l}`).join('\n')}

${stateBlock}
${prevBlock}

${examplesBlock}

${antiPattern}

OUTPUT: Single valid JSON object, no markdown fences.` },
    { role: 'user', content: `Write Episode ${episodeNumber} of "${blueprint.title}".

Scene objectives:
1. ${obj1}
2. ${obj2}
3. ${obj3}

CLIFFHANGER REQUIREMENT: Scene 3 must end with this sentence copied word for word — do not paraphrase, do not translate, do not alter a single word:
"${epPlan.target_cliffhanger || ''}"

Output:
{
  "scenes": [
    {"scene_number": 1, "script": "..."},
    {"scene_number": 2, "script": "..."},
    {"scene_number": 3, "script": "... ends with the exact cliffhanger sentence above"}
  ]
}` }
  ], undefined, { max_tokens: 2000 });
}

// ─── main ────────────────────────────────────────────────────────────────────

function printScene(n, script) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`SCENE ${n}`);
  console.log('─'.repeat(60));
  console.log(script);
}

async function main() {
  console.log(`\nPrompt: "${USER_PROMPT}"\n`);

  console.log('▶ Stage 1: Architect (gpt-4o)...');
  const t0 = Date.now();
  const blueprint = await stageArchitect(USER_PROMPT);
  console.log(`  Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`\n  Title:   ${blueprint.title}`);
  console.log(`  Genre:   ${blueprint.genre}`);
  console.log(`  City:    ${blueprint.city}`);
  console.log(`  Secret:  ${blueprint.secret}`);
  console.log(`  Logline: ${blueprint.logline}`);
  console.log(`  Protagonist: ${blueprint.protagonist?.name} — "${blueprint.protagonist?.speech_tic}"`);
  console.log(`  Voice card:`);
  (blueprint.protagonist?.voice_card || []).forEach((l, i) => console.log(`    ${i+1}. ${l}`));
  console.log(`  Story rules:`);
  (blueprint.story_rules || []).forEach((r, i) => console.log(`    ${i+1}. ${r}`));
  console.log(`\n  Episode 1: "${blueprint.episodes?.[0]?.title}"`);
  console.log(`  Cliffhanger: "${blueprint.episodes?.[0]?.target_cliffhanger}"`);
  console.log(`  Choice A: "${blueprint.episodes?.[0]?.choice_a?.label}" — ${blueprint.episodes?.[0]?.choice_a?.subtext}`);
  console.log(`  Choice B: "${blueprint.episodes?.[0]?.choice_b?.label}" — ${blueprint.episodes?.[0]?.choice_b?.subtext}`);

  console.log('\n▶ Stage 2: Episode 1 scenes (gpt-4o-mini)...');
  const t1 = Date.now();
  const examples = selectGoldenExamples(blueprint.genre, 1);
  console.log(`  Using golden examples: ${examples.map(e => `${e.genre} ${e.scene_position}`).join(', ')}`);
  const ep1 = await stageScenesV3({
    blueprint,
    episodeNumber: 1,
    story_state: null,
    prev_last_sentence: null,
    choice_label: null,
    banned_lines: [],
    examples,
  });
  console.log(`  Done in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

  for (const s of (ep1.scenes || [])) {
    printScene(s.scene_number, s.script);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('DONE — Episode 1 complete');
  console.log(`Total time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
