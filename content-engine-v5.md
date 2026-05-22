# Katha Content Engine — Architecture & Prompts v3

> This document reflects the final state of the pipeline after live testing across a full 6-episode story ("Pyaar Ka Jung"). Every rule here was either validated by output or added to fix a real failure. Nothing is theoretical.

---

## Pipeline Overview

```
User Prompt
    ↓
[Stage 1] Architect       — builds full story blueprint (all 6 episodes)
    ↓
[Stage 2] Screenwriter    — writes 3 scenes per episode, per branch
    ↓
[Stage 3] Validator       — JS function, 6 mechanical checks, no LLM
    ↓ (regenerate if fail, max 3 retries)
[Stage 4] Story State     — compact JSON summary fed into next episode
    ↓
[Repeat 2–4 for episodes 2–6, branching at each choice]
```

Each episode after ep1 has two branches (A and B) based on the player's prior choice. Both branches always converge on the same cliffhanger sentence.

---

## Stage 1 — Architect

**Model:** `gpt-5.4` (not mini — blueprint is the foundation, quality matters here)

**What it produces:**

```json
{
  "genre": "ROMANCE|THRILLER|MYTHOLOGY",
  "title": "2-4 word Hinglish title",
  "city": "Indian city",
  "secret": "specific past event involving a named character that protagonist is hiding",
  "logline": "protagonist, disruption, stakes",
  "story_rules": ["concrete checkable constraint", "..."],
  "protagonist": {
    "name": "first name",
    "story_goal": "the concrete thing they want by episode 6",
    "motivation": "why this matters to them personally",
    "nature": "1-2 word disposition",
    "past": "prior event that shapes reactions (not the secret — this one they remember)",
    "voice_card": ["casual register", "uncertain register", "under pressure register"]
  },
  "characters": [{"name": "first name", "role": "relationship + story function"}],
  "episodes": [
    {
      "episode_number": 1,
      "scene_objectives": ["Scene 1", "Scene 2", "Scene 3"],
      "target_cliffhanger": "exact Hinglish sentence — physical threat or impossibility, NOT internal reflection",
      "choice_question": "Hinglish dilemma",
      "choice_a": {"label": "3-5 words"},
      "choice_b": {"label": "3-5 words"}
    },
    {
      "episode_number": 2,
      "scene_objectives_a": ["direct physical consequence of choice_a", "...","..."],
      "scene_objectives_b": ["direct physical consequence of choice_b", "...", "..."],
      "target_cliffhanger": "...",
      "choice_question": "...",
      "choice_a": {"label": "..."},
      "choice_b": {"label": "..."}
    }
    // episodes 3–5 same as ep2
    // episode 6: no choice fields, just scene_objectives_a and scene_objectives_b
  ]
}
```

**Key rules enforced in the architect prompt:**

- `secret` must name what happened, who was involved, what was concealed. WRONG: "carries guilt." RIGHT: "Seven years ago Ravi hit a cyclist, filed a false police report blaming the cyclist, family never knew."
- `story_rules` must be concrete and checkable. If broken mid-story, any reader would notice. WRONG: "protagonist values loyalty." RIGHT: "Ravi has never owned or driven a vehicle since age 19 — autos everywhere."
- `target_cliffhanger` is a physical impossibility or external threat made visible. NOT internal reflection. WRONG: "Matlab, kya woh sab meri wajeh se tha?" RIGHT: "Woh aadmi bina chehre ke seedha darwaze ke doosri taraf khada tha."
- `choice_a` / `choice_b` labels are concrete actions (what the player does), not moral statements. WRONG: "Sacrifice your honour." RIGHT: "Chup raho aur nikalo."
- `scene_objectives_a[0]` must describe the specific physical situation the player enters as direct consequence of choosing choice_a. It is causally tied to the label — not a generic beat.
- `voice_card` lines must be Hinglish, three different emotional registers, specific to this character — their rhythm, vocabulary, how they hold back or push.
- FIDELITY: every specific element the user mentioned (character traits, profession, city, relationships) must appear exactly as given. Never generalize or "improve" them.

---

## Stage 2 — Screenwriter

**Model:** `gpt-5.4-mini`  
**Tokens:** `max_completion_tokens: 2000`  
**Format:** `response_format: { type: 'json_object' }`

### Full System Prompt

```
You write one episode of three scenes for Katha, an Indian interactive fiction app.

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
- Use the simplest word that does the job. Never stack two adjectives onto one noun. If a description needs more than one modifier, rewrite it as an action beat instead. WRONG: *hara hua dhua sa register* RIGHT: *aadha jala register* or *register ke pages ki raakh ungliyon pe chipak gayi*
- Concrete object similes over adjective declarations: "like a glass placed too close to a table edge" > "scared."
- Repetition with one altered element does emotional work.
- Shortest sentence in a scene is the heaviest. Land scenes on short final sentences.
- One Sanskrit or Urdu loanword per scene maximum — when one appears, it lands with weight. Do not pile them.
- Direct address (beta, yaar, sir, bhaiya) is the load-bearing texture of Indian dialogue.

CRAFT:
- Scene 1 of every episode must open with a hook — a line that creates an unanswered question in the reader's mind within the first 10 words. WRONG: *Rahul office pahuncha.* RIGHT: *Rahul ne phone uthaya — tera call nahi tha.*
- Open all scenes mid-action. No backstory or exposition.
- Show emotion through action, never through statement.
- Use the simplest word that does the job. Never stack two adjectives onto one noun. If a description needs more than one modifier, rewrite it as an action beat instead.
- Scene 3 MUST end with the target_cliffhanger word for word, placed INSIDE asterisks as a narrator action line. It must NOT appear outside asterisks as a dialogue line.

STORY CONTEXT:
Genre: {genre} | City: {city}
Story rules: {story_rules joined by " | "}
Secret (drives subtext — never name it directly): {secret}
Protagonist: {name}
Protagonist nature: {nature}
Protagonist's story goal: {story_goal}
Why it matters to them: {motivation}
Past event that shapes their reactions (surface in subtext, never explain): {past}
Characters: {name (role), ...}

PROTAGONIST VOICE CARD:
1. {voice_card[0]}
2. {voice_card[1]}
3. {voice_card[2]}

{STORY STATE block — from previous episode}
{PREVIOUS EPISODE'S LAST SENTENCE — for continuity}
{CHOICE LABEL — which branch this is}
{BANNED LINES — phrases from previous episodes, do not reuse}

ANTI-PATTERN (do NOT write like this):
Rahul was feeling very nervous. The room felt cold and tense. He said: "Priya, I am worried about this situation." Priya looked at him with concern in her eyes. She said: "I understand your feelings." There was a lot of tension between them.
```

### User Message

```
Write Episode {N} of "{title}".

Scene objectives:
1. {obj1}
2. {obj2}
3. {obj3}

CLIFFHANGER REQUIREMENT: Scene 3 must end with this sentence copied word for word, wrapped in *asterisks* as a narrator line — do not paraphrase, do not translate, do not alter a single word, do not place it as dialogue outside asterisks:
*{target_cliffhanger}*

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
}
```

---

## Stage 3 — Validator (JS, no LLM)

The validator is a pure JavaScript function. It never patches output — it only reports. If it fails, the screenwriter regenerates from scratch (max 3 retries).

**Why no LLM validator:** An LLM validator introduced worse problems than it solved — it hallucinated new content, merged the cliffhanger into adjacent action blocks, and over-flagged clean episodes. Structural checks are deterministic; a JS function is the right tool.

```javascript
function stageValidate(epScenes, blueprint, episodeNumber) {
  const cliffhanger = blueprint.episodes[episodeNumber - 1].target_cliffhanger;
  const scenes = epScenes?.scenes || [];
  const issues = [];

  for (let i = 0; i < scenes.length; i++) {
    const script = scenes[i].script || '';
    const sceneNum = i + 1;

    // Check 1: cliffhanger is last line of Scene 3 as standalone *asterisk block*
    if (sceneNum === 3) {
      const lines = script.split('\n').map(l => l.trim()).filter(Boolean);
      const lastLine = lines[lines.length - 1];
      if (lastLine !== `*${cliffhanger}*`) {
        issues.push(`Scene 3: cliffhanger is not the final standalone *asterisk block*. Expected: *${cliffhanger}*`);
      }
    }

    // Check 2: same character speaking twice in a row
    const dialogueLines = script.split('\n').filter(l => /^[A-Z][A-Z\s]+:/.test(l.trim()));
    for (let j = 0; j < dialogueLines.length - 1; j++) {
      const s1 = dialogueLines[j].split(':')[0].trim();
      const s2 = dialogueLines[j + 1].split(':')[0].trim();
      if (s1 === s2) { issues.push(`Scene ${sceneNum}: ${s1} speaks twice in a row.`); break; }
    }

    // Check 3: action block over 35 words
    const actionBlocks = [...script.matchAll(/\*([^*]+)\*/g)].map(m => m[1]);
    for (const block of actionBlocks) {
      const wc = block.trim().split(/\s+/).length;
      if (wc > 35) issues.push(`Scene ${sceneNum}: action block ${wc} words (limit 35): "${block.trim().slice(0, 60)}..."`);
    }

    // Check 4: dialogue line missing ALL-CAPS speaker label
    const allLines = script.split('\n').filter(l => l.trim() && !l.trim().startsWith('*'));
    for (const line of allLines) {
      if (!/^[A-Z][A-Z\s]+:\s/.test(line.trim())) {
        issues.push(`Scene ${sceneNum}: dialogue line missing ALL-CAPS speaker label: "${line.trim().slice(0, 60)}"`);
      }
    }

    // Check 5: total scene over 80 words
    const totalWords = script.trim().split(/\s+/).length;
    if (totalWords > 80) issues.push(`Scene ${sceneNum}: ${totalWords} total words (limit 80).`);

    // Check 6: more than 4 dialogue lines
    if (dialogueLines.length > 4) issues.push(`Scene ${sceneNum}: ${dialogueLines.length} dialogue lines (limit 4).`);
  }

  return { pass: issues.length === 0, issues };
}
```

---

## Stage 4 — Story State

**Model:** `gpt-5.4-mini`  
**Tokens:** `max_completion_tokens: 200`

Produces a compact JSON object passed into the next episode's screenwriter prompt. Keeps continuity without ballooning context.

```json
{
  "relationships": [{"pair": "Name-Name", "state": "< 20 words"}],
  "active_mysteries": ["< 20 words each"],
  "emotional_state": "< 10 words",
  "objects": ["objects in play that carry story weight"],
  "character_goals": ["< 20 words each"]
}
```

**Important:** After generating, manually verify key relationships before passing forward. The LLM occasionally makes inference errors (e.g. labelling a friend as an enemy based on a misread scene). One review at the end of Episode 1 catches most persistent errors before they compound.

---

## Branching Logic

- Episode 1 has no branch — single output.
- Episodes 2–6 generate Branch A and Branch B in parallel.
- Both branches receive:
  - Their branch-specific scene objectives (`scene_objectives_a` or `scene_objectives_b`)
  - The previous episode's full script as context
  - The current story state
  - The choice label that led to this branch
- Both branches **always converge on the same `target_cliffhanger`** — this is by design. The divergence is in how they get there, not where they end.

---

## Scene Format on the App

Each scene renders as alternating blocks:

- `*asterisk text*` → `ACTION_PROSE` node — displayed as narrator text
- `NAME: dialogue` → `CHARACTER_DIALOGUE` node — displayed as character speech with the name as a label

No quotes are used. The ALL-CAPS name before the colon is the speaker identifier for the renderer.

---

## Hard Limits (enforced by both prompt and validator)

| Rule | Limit | Enforced by |
|---|---|---|
| Action block length | 35 words max | Prompt + Check 3 |
| Total scene length | 80 words max | Prompt + Check 5 |
| Dialogue lines per scene | 4 max (2 exchanges) | Prompt + Check 6 |
| Same speaker twice in a row | Not allowed | Prompt + Check 2 |
| Cliffhanger placement | Last line of Scene 3, inside `*asterisks*` | Prompt + Check 1 |
| Speaker label format | `ALL-CAPS NAME: ` | Prompt + Check 4 |

---

## What Not To Do (learned from failures)

**Do not inject golden/reference scenes into the screenwriter prompt.** An earlier version appended 2 handwritten "reference scenes" into the system prompt as cadence examples. These were tested in a parallel run against the prompt without them. The golden scenes produced no meaningful improvement in output quality, added token cost every call, and occasionally caused the model to echo the reference scene's specific sensory details (geeli mitti, thandi roshni) as defaults. Removed.

**Do not use a formula for action block openings.** An earlier version of the prompt said "ONE opening action block: place, time, one physical anchor." This produced assembly-line sensory output — every scene opened with geeli mitti, thandi roshni, tel ki smell. Removing the formula and letting the screenwriter choose its own anchor produced significantly better and more varied output.

**Do not use an LLM to patch failed scenes.** The LLM validator would silently change content — adding objects, removing dialogue, merging the cliffhanger into an adjacent action block. A validator that patches is a validator that introduces new errors. The JS validator reports only; the screenwriter regenerates clean.

**Do not stack adjectives.** `*hara hua dhua sa register*` — two modifiers on one noun produce weak, literary-sounding Hinglish. The rule: one modifier max, and if you need two, rewrite it as an action beat. `*register ke pages ki raakh ungliyon pe chipak gayi*` does the same emotional work with zero adjectives.

**Do not allow unbounded dialogue.** Without a cap, action scenes with two characters default to rapid tactical ping-pong — 8-10 dialogue lines per scene, total scene length over 150 words. The 4-line cap forces the screenwriter to put action work into action blocks instead.

**Do not use the cliffhanger as a dialogue line.** Earlier versions of the prompt allowed the cliffhanger to appear outside asterisks. The model would sometimes put it as spoken dialogue, which breaks the rendering format and the emotional weight. The rule is explicit: cliffhanger goes inside `*asterisks*` only, as a narrator line.

---

## North Star Metric

**70% of users who start Episode 1 must finish Episode 2.**

Every rule in this engine exists in service of that number. Scenes are short by design — the format is read in motion, not at a desk. The dialogue cap forces density. The scene length cap forces decisions about what earns its place. The cliffhanger rule exists because the last line is the only reason to tap "next episode."
