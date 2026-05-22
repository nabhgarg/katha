# Katha Content Engine — Production Specification

**Current version:** v4.2
**Status:** Live in `index.html` (main branch). Spec last synced with code: 2026-05-22.

---

## 0. Changelog

### v4.2 (2026-05-22)
- **User prompt fidelity** — Architect must preserve every specific element the user mentioned (profession, setting, named events, traits) exactly. No generalising or substituting.
- **Choice subtext removed** — `choice_a.subtext` / `choice_b.subtext` fields dropped from schema and UI. Displaying the value conflict as text under the button was preachy. Value-conflict principle preserved as architect reasoning; label alone now does the work.
- **Protagonist enriched** — added `story_goal`, `motivation`, `nature`, `past` to protagonist schema. All four passed into screenwriter STORY CONTEXT so character reactions are grounded, not inferred from voice alone.
- **Physical-detail tic removed** — "use ONE specific physical detail (smell, sound, texture)" was creating formulaic scene openings. Removed. ANTI-PATTERN block still teaches the principle by example.
- **Speech tic frequency cap** — at most once per scene, never on consecutive dialogue lines, never opens more than one line per episode.
- **Story rules wording** — "VISIBLE and FALSIFIABLE" → "CONCRETE and CHECKABLE." Same constraint, less jargon.

### v4.1 (2026-05-22)
- **Story state tracking** (`stageStoryState`) — after each episode, compact JSON state extracted (relationships, mysteries, emotional state, objects, goals) and passed to next screenwriter call.
- **Episode image persistence** — all images uploaded to Supabase Storage before DB save.
- **Scene structure tightened** — opening action block: 2 sentences max. Exactly 2 dialogue exchanges with 1 action beat between them.
- **Architect tightening** — `secret` must name event, people, concealment. `story_rules` falsifiable. `target_cliffhanger` physical/external. Voice card: 3 emotional registers; tic not a prefix.
- **Validator checks expanded** — checks 8 (story rule contradiction) and 9 (banned-lines echo) added.
- **Scene 1 hook rule** — must create an unanswered question in the first 10 words.
- **Sanskrit/Urdu guardrail** — one loanword per scene maximum.
- **Branch selection bug fix** — `epResult[branch.toUpperCase()]` fix so lowercase `'a'`/`'b'` correctly accesses uppercase keys.
- **BRANCH PATH upgraded** — "non-negotiable / first sentence makes consequence unmistakable."
- **Player hard split** — image top 45vh, solid `#08080F` text panel below. No overlay.
- **ETA updated** — "5–7 minutes."

### v4 (2026-05-21)
- Dual-branch generation (eps 2–6, `Promise.all`)
- Upfront full generation before single atomic DB save
- `scene_objectives_a` + `scene_objectives_b` per episode
- Separate `prev_last_sentence_a/b` continuity per branch
- Retry logic: 3× with 2s/4s backoff

### v3 (2026-05-20)
- Hinglish narrator, SCENE_CONTEXT rendering, golden scenes dataset, parallel cover+ep1, ep6 validator

---

## 1. Architecture

```
[User Prompt]
      │
      ▼
┌─────────────────────────────────────┐
│  Stage 1: The Architect             │  gpt-5.4, single call
│  → Full blueprint: all 6 episodes   │  Returns: title, genre, city, secret,
│  → scene_objectives_a + _b per ep   │  story_rules, protagonist (enriched),
│  → target_cliffhanger per ep        │  characters, episodes[6]
│  → choice_a + choice_b per ep       │
└──────────────────┬──────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  Episode 1       │  │  Cover Image     │
│  (no branch)     │  │  gpt-image-1     │
│  gpt-5.4-mini   │  │  (DALL-E)        │
└────────┬────────┘  └─────────────────┘
         │
    ┌────┴──────────────────┐
    ▼                       ▼
┌────────────────┐  ┌────────────────────┐
│  Validator     │  │  Ep1 Image          │
│  (ep1 only)    │  │  gpt-image-1        │
│  gpt-5.4-mini  │  └────────────────────┘
└────────┬───────┘
         │  stageStoryState → story_state_a = story_state_b (ep1)
         ▼
┌──────────────────────────────────────────────────────────┐
│  Episodes 2–6 loop (sequential episodes, parallel branches)│
│                                                          │
│  For each episode n (2..6):                             │
│    Branch A ──┐                                         │
│               ├── Promise.all ──► both results          │
│    Branch B ──┘                                         │
│                                                          │
│  Branch A uses: scene_objectives_a, prevChoiceA label,  │
│                 prev_last_sentence_a, story_state_a      │
│  Branch B uses: scene_objectives_b, prevChoiceB label,  │
│                 prev_last_sentence_b, story_state_b      │
│                                                          │
│  After each episode:                                    │
│    update prev_last_sentence_a/b                        │
│    stageStoryState → story_state_a/b (awaited)          │
│  Episode images: Pollinations URLs (instant, free)      │
│  Retry: up to 3× with 2s/4s backoff on failure         │
└──────────────────────────┬───────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────────────┐
              │  Image Upload                         │
              │  _uploadEpisodeImagesToStorage()      │
              │  All episode images → Supabase        │
              │  Storage before DB save               │
              └──────────────────┬───────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────┐
              │  Single DB Save         │
              │  assembleStoryV3()      │
              │  saveGeneratedStory()   │
              └─────────────────────────┘
```

**Images:**
- Cover + Episode 1: `gpt-image-1` (b64_json, uploaded to Supabase Storage `covers` bucket)
- Episodes 2–6: Pollinations URL constructed at generation time, then fetched and uploaded to Supabase Storage before DB save. All stored stories have durable Storage URLs.

---

## 2. Schemas

### 2.1 Architect Blueprint

```json
{
  "genre": "ROMANCE | THRILLER | MYTHOLOGY",
  "title": "string (2-4 words, conversational Hinglish or Hindi — NOT a tagline)",
  "city": "string (Indian city)",
  "secret": "string (specific past event — names what happened, who was involved, what was concealed)",
  "logline": "string (one sentence — protagonist, disruption, stakes)",
  "story_rules": [
    "string (concrete and checkable — if broken, any reader would immediately notice)",
    "string (plot constraint no episode can contradict)",
    "string (local/cultural constraint that shapes choices)"
  ],
  "protagonist": {
    "name": "string (first name)",
    "story_goal": "string (the concrete thing they want by episode 6 — a person, answer, escape, confession)",
    "motivation": "string (one sentence — why this matters to them personally)",
    "nature": "string (1-2 word disposition — impulsive / guarded / observant / loyal-to-a-fault)",
    "past": "string (one specific prior event that shapes reactions — different from secret; this one they remember)",
    "speech_tic": "string (Hinglish verbal habit — used naturally mid-sentence, not as prefix)",
    "voice_card": [
      "string (casual/relaxed register)",
      "string (uncertain/worried register)",
      "string (under pressure/urgent register)"
    ]
  },
  "characters": [
    { "name": "string", "role": "string (relationship to protagonist + plot function)" }
  ],
  "episodes": [
    {
      "episode_number": 1,
      "title": "string",
      "scene_objectives": [
        "string (Scene 1 — mid-action entry point)",
        "string (Scene 2 — complication or escalation)",
        "string (Scene 3 — revelation that recontextualizes)"
      ],
      "target_cliffhanger": "string (exact Hinglish sentence Scene 3 ends on — physical impossibility or external threat, NOT internal reflection)",
      "choice_question": "string (Hinglish dilemma)",
      "choice_a": { "label": "string (3-5 words — what the player does)" },
      "choice_b": { "label": "string (3-5 words — what the player does)" }
    }
    // eps 2-5: same shape, plus scene_objectives_a and scene_objectives_b
    // ep 6: omits choice_question, choice_a, choice_b (no choice — it resolves)
  ]
}
```

**Notes:**
- `secret` vs `past`: `secret` is hidden from the protagonist or other characters. `past` is something the protagonist remembers and carries — it shapes reactions but isn't a mystery.
- `choice_a/b` only has `label` — no `subtext` field. The value conflict lives in the causal consequence of the choice (what `scene_objectives_a[0]` describes), not in displayed text.
- `story_rules` examples: WRONG: "trust is fragile" (uncheckable). RIGHT: "Ravi has never owned or driven a vehicle since age 19 — he takes autos everywhere" (immediately obvious if broken).

### 2.2 Scene Output (per branch)

```json
{
  "scenes": [
    {
      "scene_number": 1,
      "script": "*Place. Time. Physical anchor.* SPEAKER: Dialogue one. *Action beat.* SPEAKER: Dialogue two."
    },
    { "scene_number": 2, "script": "..." },
    {
      "scene_number": 3,
      "script": "... *Action beat.* SPEAKER: Exact cliffhanger sentence."
    }
  ]
}
```

Every dialogue line starts with ALL-CAPS speaker name + colon. Opening action block: 2 sentences max. Exactly 2 dialogue exchanges with 1 action beat between them.

---

## 3. Stage Prompts

### 3.1 The Architect (Stage 1)

- **Model:** `gpt-5.4`
- **Response format:** `json_object`

**System prompt:**

```
You are the lead story architect for Katha, an Indian interactive fiction app. You take a brief user premise and structure a complete 6-episode branching story blueprint.

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

SPEECH TIC RULES (critical):
- speech_tic must be a Hinglish verbal habit: something like "matlab", "dekh", "sach mein", "haan toh", "kyun nahi", "bas aise hi", "waise bhi", "kya pata".
- NEVER use English filler words: "you know", "y'know", "I mean", "like", "basically", "literally".
- The tic must be a word or phrase an Indian would actually use mid-conversation.
- voice_card lines must be primarily Hinglish — Hindi syntax with natural English words only.
- The tic appears NATURALLY — sometimes mid-sentence, sometimes at the start. It must NOT open every voice_card line. It is a habit, not a prefix.
- FREQUENCY CAP (critical): in any given episode the speech_tic appears AT MOST once per scene, NEVER in consecutive dialogue lines, and NEVER opens more than one line in the whole episode. If unsure, leave it out — silence beats a forced tic.
- The 3 voice_card lines must show 3 DIFFERENT emotional registers: one casual/relaxed, one uncertain/worried, one under pressure/urgent.
- WRONG voice_card (tic prefix on every line): "Matlab, yeh sahi nahi hai." / "Matlab, kya kar raha hai woh?" / "Matlab, bhago yahan se!"
- RIGHT voice_card (tic appears naturally, different emotions): "Yaar sun, aaj office mein kuch ajeeb hua — matlab bilkul samajh nahi aaya." / "Woh ladka... kya pata uska kya irada tha." / "Ek kaam kar, phone mat rakh — main aa raha hoon abhi."

OUTPUT: A single valid JSON object. No markdown fences. Start with { and end with }.
```

**User prompt:**

```
User premise: "<USER_PROMPT>"

FIDELITY (non-negotiable): every specific element the user mentioned — character traits, profession, age, setting details, named events, relationships, named objects — MUST appear in the blueprint exactly as described. Do not generalize, substitute, or "improve" them. If the user said "UPSC aspirant in Lucknow", the protagonist is a UPSC aspirant in Lucknow, not an engineering student in Delhi. The user's specifics anchor the story; you invent the rest around them.

Build the complete blueprint. Include all 6 episodes. Episodes 1-5 have choice_question, choice_a, choice_b. Episode 6 omits those fields (no choice, it resolves).

For episodes 2-6, also include "scene_objectives_a" and "scene_objectives_b". CRITICAL: scene_objectives_a[0] MUST describe the specific physical situation the player enters as a direct consequence of choosing choice_a from the previous episode. scene_objectives_b[0] MUST describe the specific physical situation from choosing choice_b. These are causally tied to the choice label — not generic story beats. Example: if choice_a was "Bhaago wahan se" then scene_objectives_a[0] = "Scene 1 — protagonist mid-run, faceless man visible in auto mirror still chasing". If choice_b was "Rukne ko kaho" then scene_objectives_b[0] = "Scene 1 — auto has stopped, protagonist now face-to-face with the faceless man on a silent road".

Schema:
<INLINE SCHEMA FROM SECTION 2.1>
```

---

### 3.2 The Screenwriter (Stages 2 + 4)

- **Model:** `gpt-5.4-mini`
- **Response format:** `json_object`
- **max_tokens:** 2000

**System prompt:**

```
You write one episode of three scenes for Katha, an Indian interactive fiction app.

OUTPUT FORMAT (CRITICAL):
- Each scene is a single string in the "script" field.
- Action/setting goes inside *asterisks*. Dialogue goes outside asterisks, on its own line.
- EVERY dialogue line MUST start with the speaker's name in ALL-CAPS followed by a colon: "RIYA: Yaar sun..." — no exceptions. No quotation marks. Never nest asterisks.
- SCENE STRUCTURE: ONE opening *action block* (2 SHORT sentences max — place, time, one physical anchor) followed by EXACTLY 2 dialogue exchanges (2 lines of dialogue total — no more). Between dialogue lines, ONE *action beat* of 1 sentence. Total scene: opening block + 2 dialogue lines + 1 action beat between them. Keep it tight.
- WRONG: *Office mein sab log the. Tension tha.* / Kab aaya? / Abhi.
- RIGHT: *Office ki tenth floor. Shaam ke 6:41. AC band tha — sweat ki mehak.* / ROHAN: Kab aaya? / *Woh ruk gaya, jawaab dene se pehle.* / ARJUN: Abhi hi.

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
- Scene 3 MUST end with this exact sentence word for word: "<TARGET_CLIFFHANGER>"

STORY CONTEXT:
Genre: <GENRE> | City: <CITY>
Story rules: <STORY_RULES>
Secret (drives subtext — never name it directly): <SECRET>
Protagonist: <NAME>. Speech tic: <SPEECH_TIC>
Protagonist nature: <NATURE>
Protagonist's story goal: <STORY_GOAL>
Why it matters to them: <MOTIVATION>
Past event that shapes their reactions (surface in subtext, never explain): <PAST>
Characters: <CHARACTERS_LIST>

PROTAGONIST VOICE CARD:
1. <VOICE_CARD_LINE_1>
2. <VOICE_CARD_LINE_2>
3. <VOICE_CARD_LINE_3>

<STORY_STATE_BLOCK>       ← "STORY STATE (maintain continuity):" + JSON, or omitted
<PREV_SENTENCE_BLOCK>     ← "Previous episode's last sentence: '...' — Scene 1 must flow from this." (or ep1 note)
<CHOICE_BLOCK>            ← "BRANCH PATH (non-negotiable): The player chose '...'. Scene 1 MUST open with the direct physical consequence..." (or omitted for ep1)
<BANNED_LINES_BLOCK>      ← "BANNED PHRASES (do NOT repeat or paraphrase):\n..." (or omitted)

<REFERENCE_SCENES>        ← 2 golden scene examples matching (genre, scene_position)

ANTI-PATTERN (do NOT write like this):
Rahul was feeling very nervous. The room felt cold and tense. He said: "Priya, I am worried about this situation." Priya looked at him with concern in her eyes. She said: "I understand your feelings." There was a lot of tension between them.

OUTPUT: Single valid JSON object, no markdown fences.
```

**User prompt:**

```
Write Episode <N> of "<TITLE>".

Scene objectives:
1. <OBJ_1>
2. <OBJ_2>
3. <OBJ_3>

CLIFFHANGER REQUIREMENT: Scene 3 must end with this sentence copied word for word — do not paraphrase, do not translate, do not alter a single word:
"<TARGET_CLIFFHANGER>"

Output:
{
  "scenes": [
    {"scene_number": 1, "script": "..."},
    {"scene_number": 2, "script": "..."},
    {"scene_number": 3, "script": "... ends with the exact cliffhanger sentence above"}
  ]
}
```

---

### 3.3 The Validator (Stage 3 — ep1 only)

- **Model:** `gpt-5.4-mini`
- **Purpose:** Audits ep1 and surgically rewrites the single worst-failing scene.

**System prompt:**

```
You audit one episode of three scenes for structural quality before it ships to players.

CHECKS:
1. Does Scene 3 end on the exact target_cliffhanger sentence?
2. Does each scene open mid-action with no exposition — and does Scene 1 open with a hook that creates an unanswered question?
3. Are any physical details specific (not generic) where they appear?
4. Are emotions shown through action, not stated?
5. Does every dialogue line start with an ALL-CAPS speaker name followed by a colon?
6. Does each scene have EXACTLY 2 dialogue exchanges?
7. Does code-switching happen at the emotionally loaded word?
8. Does any scene contradict the story rules?
9. Does any phrase echo or paraphrase the banned-lines cache?

If all checks pass: set pass true.
If any check fails: set pass false, identify the single worst-failing scene (target_node 1/2/3), and produce a corrected revised_script for THAT SCENE ONLY.

Output raw JSON only, no markdown fences:
{"pass": true|false, "issues": ["..."], "target_node": 1|2|3|null, "revised_script": "..."|null}
```

---

## 4. Branch Logic

Episode 1 has no branching — `scene_objectives` (not `_a`/`_b`) is used directly.

For episodes 2–6:

```
Branch A call:
  scene_objectives   = blueprint.episodes[n-1].scene_objectives_a
  choice_label       = blueprint.episodes[n-2].choice_a.label
  prev_last_sentence = prev_last_sentence_a
  story_state        = story_state_a

Branch B call:
  scene_objectives   = blueprint.episodes[n-1].scene_objectives_b
  choice_label       = blueprint.episodes[n-2].choice_b.label
  prev_last_sentence = prev_last_sentence_b
  story_state        = story_state_b
```

Both calls run in `Promise.all`. After each episode:
```
prev_last_sentence_a = extractLastSentenceV3(branchA)
prev_last_sentence_b = extractLastSentenceV3(branchB)
story_state_a = await stageStoryState(epResult, blueprint, n, 'a')
story_state_b = await stageStoryState(epResult, blueprint, n, 'b')
```

**BRANCH PATH block (injected into screenwriter system prompt):**
```
BRANCH PATH (non-negotiable): The player chose "<CHOICE_LABEL>". Scene 1 MUST open
with the direct physical consequence of this choice already in motion. If the choice
was to stop something, Scene 1 opens with it stopped or stopping. If the choice was
to run, Scene 1 opens mid-run. The first sentence of Scene 1 must make this choice
consequence unmistakable. Do not write a Scene 1 that could belong to the other branch.
```

---

## 5. Retry Logic

Episode generation wraps the `Promise.all([branchA, branchB])` in a 3-attempt retry loop:

```
for attempt in 0..2:
  if attempt > 0: wait (2s × attempt)
  try:
    [branchA, branchB] = await Promise.all([...])
    if both have scenes: break
  catch:
    continue
if still failed: throw error
```

---

## 6. Client-Side Parsing

`parseScriptStringToUiNodes(scriptString)` splits the `script` field into typed nodes:

| Pattern | Node type | CSS class | Rendered as |
|---|---|---|---|
| `*...*` | `SCENE_CONTEXT` or `ACTION_PROSE` | `.v3-scene-ctx` | Grey, small, italic |
| `NAME: text` | `CHARACTER_DIALOGUE` | `.v3-dialogue` | White, bold, large |

The first `*action*` block becomes `SCENE_CONTEXT`; subsequent ones become `ACTION_PROSE`. Lines starting with `NAME:` become `CHARACTER_DIALOGUE`.

---

## 7. Image Pipeline

| Episode | Provider | Method | Storage |
|---|---|---|---|
| Cover | `gpt-image-1` | `b64_json` response | Supabase Storage `covers` bucket |
| Episode 1 | `gpt-image-1` | `b64_json` response | Supabase Storage `covers` bucket |
| Episodes 2–6 | Pollinations | URL constructed from prompt string | Fetched + uploaded to Supabase Storage before DB save |

All episode images are uploaded to Supabase Storage `covers` bucket before the DB save. The stored story always has durable Storage URLs — no dependency on Pollinations CDN availability.

---

## 8. Story State (stageStoryState)

After each episode, a compact story state is extracted and passed to the next episode's screenwriter. Prevents later episodes from ignoring earlier developments.

**Function:** `stageStoryState(epResult, blueprint, episodeNumber, branch)`

**Model:** `gpt-5.4-mini`, `max_tokens: 200`. Fire-and-forget on failure — previous state preserved.

**Output schema:**
```json
{
  "relationships": [{"pair": "string", "state": "string"}],
  "active_mysteries": ["string"],
  "emotional_state": "string",
  "objects": ["string"],
  "character_goals": ["string"]
}
```
Each string under 20 words. Total output under 150 tokens.

**How it flows:**
- Episode 1 (no branch): single call initialises both `story_state_a` and `story_state_b` from the same ep1 result
- Episodes 2–6: two calls per episode (`branch: 'a'` and `branch: 'b'`), awaited before starting the next episode

**In the screenwriter prompt:** injected as:
```
STORY STATE (maintain continuity from previous episode):
{"relationships":[...],"active_mysteries":[...],...}
```

---

## 9. Quality Improvements Summary

| Area | v3 | v4 | v4.1 | v4.2 |
|---|---|---|---|---|
| Cliffhangers | Any sentence | Physical/external only | Enforced in validator | — |
| Secret | Vague "hidden truth" | Named event + character | Must name event, people, concealment | — |
| Story rules | Any description | Visible + falsifiable | Wrong/right examples in prompt | Rewording: "concrete and checkable" |
| Choice design | Action description | Value conflict in subtext | — | Subtext field removed; conflict lives in consequences, not text |
| Branch divergence | scene_objectives only | scene_objectives_a + _b | scene_objectives_a[0] = exact physical situation post-choice | — |
| Scene format | Interleaved | ONE action block + dialogue | 2-sentence max opening, 2 exchanges, 1 action beat | — |
| Voice card tic | Could prefix every line | Natural mid-sentence use | Must NOT open every line; 3 emotional registers | Frequency cap: ≤1 per scene, no consecutive lines |
| Continuity | None | prev_last_sentence per branch | + story_state JSON per branch | — |
| Protagonist depth | Name + tic + voice card | Same | Same | + story_goal, motivation, nature, past |
| User prompt fidelity | Not enforced | Not enforced | Not enforced | Non-negotiable: user specifics preserved exactly |
| Physical-detail rule | None | Explicit sensory rule | Same | Removed (was creating formulaic tics) |
| Image persistence | Pollinations URLs in DB | Cover + ep1 in Storage | All episodes in Storage | — |
| Scene 1 hook | None | None | Unanswered question in first 10 words | — |
| Loanword guardrail | None | None | Max 1 Sanskrit/Urdu per scene | — |
| Validator checks | 7 | 7 | 9 (story rule + banned-lines) | — |
| Player UI | Semi-transparent overlay | Same | Hard split: image 45vh, solid panel below | — |

---

## 10. North-Star Metric

**70% of users who start Episode 1 must finish Episode 2.**

If below 70%, story quality takes priority over everything else. All pipeline changes are measured against this number.
