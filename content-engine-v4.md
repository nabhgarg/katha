# Katha Content Engine v4 — Production Specification

**Status:** Live in `index.html` (main branch). Spec last synced with code: 2026-05-22.
**Promoted from v3:** Full v3 pipeline preserved. v4 adds dual-branch generation, tighter architect quality controls, and minimal scene format.

---

## 0. What changed vs v3

**Kept from v3:**
- `stageArchitect` (gpt-5.4) → single blueprint call with all 6 episodes
- `stageScenesV3` (gpt-5.4-mini) → screenwriter, `{scene_number, script}` output
- `stageValidate` — quality validator, ep1 only
- `parseScriptStringToUiNodes()` — client-side `*action*` / dialogue parser
- Golden scene few-shot injection
- Anti-pattern example block
- Banned lines cache (72-line rolling window)

**Added in v4:**
- **Dual-branch generation** — eps 2-6 generate Branch A and Branch B in parallel. Each branch uses its own `scene_objectives_a` / `scene_objectives_b` from the blueprint, its own `prev_last_sentence` continuity tracking, and the corresponding player choice label.
- **Upfront full generation** — all 6 episodes + 7 images generated before any DB save. Single atomic write at end.
- **BRANCH PATH block** in screenwriter system prompt — non-negotiable instruction that Scene 1 must open with the direct physical consequence of the player's choice.
- **Strengthened architect quality rules** — 5 tightened CORE PRINCIPLES, plus 4 new QUALITY CHECKS (cliffhanger physicality, story_rules falsifiability, choice value-conflict, secret specificity).
- **Minimal scene format** — ONE opening action block (3-4 short sentences: place, time, one physical detail), then 2-3 dialogue lines. No second action block. No interleaving.
- **Retry logic** — episode generation retries up to 3× with 2s/4s backoff on timeout or empty response.
- **Separate continuity per branch** — `prev_last_sentence_a` and `prev_last_sentence_b` tracked independently so Branch B episodes never inherit Branch A's ending.

**Added in v4.2 (2026-05-22, second pass):**
- **User prompt fidelity constraint** — Architect user prompt now contains a non-negotiable rule: every specific element the user mentioned (traits, profession, setting, named events, relationships) must appear in the blueprint exactly as described. Prevents the Architect from generalizing or substituting user-provided specifics.
- **Choice subtext removed from UI and schema** — `choice_a.subtext` / `choice_b.subtext` fields removed. They were rendered under the choice buttons and made decisions feel preachy by spelling out the moral. The value-conflict principle is preserved in the Architect prompt; the label alone now does the work on screen.
- **Protagonist enriched** — added `story_goal`, `motivation`, `nature`, `past` fields. Screenwriter receives them in STORY CONTEXT so character reactions feel grounded across all 6 episodes instead of being inferred from voice alone. `past` is what the protagonist remembers; `secret` remains what is hidden.
- **Physical-detail rule removed from screenwriter** — the line "use ONE specific physical detail (smell, sound, texture)" was creating a tic (every scene opened with a sensory noun). Principle preserved through the ANTI-PATTERN example block.
- **Speech tic frequency cap** — explicit limit added: at most once per scene, never on consecutive dialogue lines, never opens more than one line per episode. Prevents the tic from becoming a stammer.
- **Story rules wording softened** — "VISIBLE and FALSIFIABLE" → "CONCRETE and CHECKABLE." Same constraint, less jargon, easier for the model to follow.

**Added in v4.1 (2026-05-22):**
- **Story state tracking** (`stageStoryState`) — after each episode, a compact JSON state is extracted (relationships, active mysteries, emotional state, objects, character goals) and passed to the next episode's screenwriter. Prevents later episodes from ignoring earlier story developments. Uses `gpt-5.4-mini`, max 200 tokens, fire-and-forget on failure (non-fatal).
- **Episode image persistence** — all episode images (both `gpt-image-1` base64 and Pollinations CDN URLs) are uploaded to Supabase Storage before DB save. The stored story always has durable image URLs.
- **Scene structure: interleaved action beats** — opening action block is 2 SHORT sentences max, followed by EXACTLY 2 dialogue exchanges with ONE action beat between them. Kept tight for the 30% text panel — more than 2 dialogue lines causes panel overflow.
- **Architect prompt quality tightening** — `secret` must be a specific past event naming what happened, who was involved, and what was concealed. `story_rules` must each be a falsifiable visible fact. `target_cliffhanger` must be a physical impossibility or external threat (not internal reflection). `choice subtext` encodes a value conflict. `voice_card` must show 3 different emotional registers; speech tic must NOT open every line.
- **Validator checks expanded** — checks 8 (story rule contradiction) and 9 (banned-lines echo) added.
- **Scene 1 hook rule** — Scene 1 of every episode must open with a line that creates an unanswered question within the first 10 words.
- **Sanskrit/Urdu loanword guardrail** — one maximum per scene to prevent ornate pile-up.
- **Branch selection bug fix** — old code used `choice_label` presence to pick scene objectives, meaning both branches were silently getting Branch A objectives. Fixed to use explicit `branch: 'a'` / `branch: 'b'` parameter.
- **BRANCH PATH block upgraded** — from soft instruction to "non-negotiable / first sentence must make consequence unmistakable."
- **Player UI: hard split layout** — scene image takes top 45vh, pure `#08080F` text panel takes bottom. No more semi-transparent overlay. Tapping either image or text area advances the scene.
- **ETA string** — updated from "4–5 minutes" to "5–7 minutes" to account for story state extraction calls.

**Removed / deferred:**
- Checkpoint saves after each episode (v4 does single save at end)
- Stream ep1 to player mid-generation (deferred — single save model means wait until all 6 are done)

---

## 1. Architecture

```
[User Prompt]
      │
      ▼
┌─────────────────────────────────────┐
│  Stage 1: The Architect             │  gpt-5.4, single call
│  → Full blueprint: all 6 episodes   │  Returns: title, genre, city, secret,
│  → scene_objectives_a + _b per ep   │  story_rules, protagonist, characters,
│  → target_cliffhanger per ep        │  voice_card, episodes[6]
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
│  (ep1 only)    │  │  gpt-image-1 (DALL-E│
│  gpt-5.4-mini  │  └────────────────────┘
└────────┬───────┘
         │  (if fail: patch the one bad scene)
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
│                 prev_last_sentence_a                     │
│  Branch B uses: scene_objectives_b, prevChoiceB label,  │
│                 prev_last_sentence_b                     │
│                                                          │
│  After each episode:                                    │
│    update prev_last_sentence_a/b                        │
│    extract story_state_a/b (stageStoryState, awaited)   │
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
- Cover + Episode 1: `gpt-image-1` (b64_json, uploaded to Supabase Storage `covers` bucket at generation time)
- Episodes 2–6: Pollinations URL constructed at generation time, then fetched and uploaded to Supabase Storage `covers` bucket before DB save. Stored story always has durable Storage URLs.

---

## 2. Schemas

### 2.1 Architect Blueprint

```json
{
  "genre": "ROMANCE" | "THRILLER" | "MYTHOLOGY",
  "title": "string (2-4 words, conversational Hinglish or Hindi — NOT a tagline)",
  "city": "string (Indian city)",
  "secret": "string (specific past event involving a named character — not 'hidden truth', a concrete incident)",
  "logline": "string (one sentence — protagonist, disruption, stakes)",
  "story_rules": [
    "string (permanent visible fact — must be falsifiable; 'Arjun works night shifts alone' not 'trust is fragile')",
    "string (plot-anchor that cannot be contradicted by any episode)",
    "string (local/cultural constraint that shapes choices)"
  ],
  "protagonist": {
    "name": "string (first name)",
    "speech_tic": "string (their conversational verbal habit — used naturally mid-sentence, not as prefix)",
    "voice_card": [
      "string (sample dialogue — characteristic phrasing, casual register)",
      "string (sample dialogue — different emotional register: anger or urgency)",
      "string (sample dialogue — under maximum stress or fear)"
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
      "scene_objectives_a": ["string", "string", "string"],
      "scene_objectives_b": ["string", "string", "string"],
      "target_cliffhanger": "string (exact sentence Scene 3 must end on — must be physical impossibility or external threat, NOT internal reflection)",
      "choice_question": "string (Hinglish dilemma)",
      "choice_a": {
        "label": "string (3-5 words)",
        "subtext": "string (the VALUE CONFLICT driving this choice — e.g. 'survival vs loyalty', not description of action)"
      },
      "choice_b": {
        "label": "string (3-5 words)",
        "subtext": "string (the VALUE CONFLICT driving this choice)"
      }
    }
    // eps 2-5: same shape with scene_objectives_a + _b
    // ep 6: omits choice_question, choice_a, choice_b
  ]
}
```

**Key v4 additions vs v3 schema:**
- `scene_objectives_a` + `scene_objectives_b` per episode (drives branch divergence)
- `choice_a.subtext` / `choice_b.subtext` now require a value conflict, not an action description
- `target_cliffhanger` must be physical/external (not internal reflection)
- `secret` must be a specific past event with a named character
- `story_rules` must be VISIBLE and FALSIFIABLE

### 2.2 Scene Output (per branch)

```json
{
  "scenes": [
    {
      "scene_number": 1,
      "script": "*Place. Time. One physical detail.* Dialogue line one. Dialogue line two."
    },
    { "scene_number": 2, "script": "..." },
    {
      "scene_number": 3,
      "script": "*Place. Time. One physical detail.* Dialogue line. Exact cliffhanger sentence."
    }
  ]
}
```

---

## 3. Stage Prompts

### 3.1 The Architect (Stage 1)

- **Model:** `gpt-5.4`
- **Response format:** `json_object`

**System prompt:**

```
You are the lead story architect for Katha, an Indian interactive fiction app. You take a brief user premise and structure a complete 6-episode branching story blueprint.

GENRE FRAMEWORK:
- ROMANCE: Modern Indian setting. Class, family, or generational tension is the dominant conflict. The romance is obstructed by social structure, not personality.
- THRILLER: Paranoia, mystery, or high-stakes survival. The protagonist starts ordinary; the world they wake into is not.
- MYTHOLOGY: A modern character is disrupted by an ancient or cosmic force. The supernatural arrives through physical wrongness, never through music or vocabulary.

CORE PRINCIPLES:
1. The `secret` is a specific hidden past event — a concrete fact, not an interpretation. It must name what happened, who was involved, and what was concealed. WRONG: "The protagonist carries guilt from his past." RIGHT: "Seven years ago Ravi hit a cyclist with his car, filed a false police report blaming the cyclist, and the family never learned the truth."
2. `story_rules` must be VISIBLE and FALSIFIABLE. A rule is good if breaking it would be immediately obvious to any reader. WRONG: "The faceless man represents fear." RIGHT: "Ravi has never owned or driven a vehicle since age 19 — he takes autos everywhere."
3. `target_cliffhanger` is the exact Hinglish sentence Scene 3 ends on, word for word. It must be a physical impossibility or an external threat made visible — NOT internal reflection. WRONG: "Matlab, kya woh sab meri wajeh se tha?" (internal reflection). RIGHT: "Woh aadmi bina chehre ke, bina pair ki awaaz ke, seedha darwaze ke doosri taraf khada tha." (physical impossibility).
4. `choice_a` and `choice_b` encode a VALUE CONFLICT — not just opposite actions. Each choice sacrifices a different value: survival vs loyalty, truth vs safety, self vs others. The subtext names what the player is giving up, not just what they're doing. WRONG subtext: "Risky navigation through bends." RIGHT subtext: "You survive — but abandon someone who trusted you."
5. Episodes must escalate. Ep1 establishes; eps 2-5 complicate and branch; ep6 resolves.

SPEECH TIC RULES (critical):
- `speech_tic` must be a Hinglish verbal habit: something like "matlab", "dekh", "sach mein", "haan toh", "kyun nahi", "bas aise hi", "waise bhi", "kya pata".
- NEVER use English filler words: "you know", "y'know", "I mean", "like", "basically", "literally".
- The tic must be a word or phrase an Indian would actually use mid-conversation.
- `voice_card` lines must be primarily Hinglish — Hindi syntax with natural English words only.
- The tic appears NATURALLY — sometimes mid-sentence, sometimes at the start. It must NOT open every voice_card line. It is a habit, not a prefix.
- The 3 voice_card lines must show 3 DIFFERENT emotional registers: one casual/relaxed, one uncertain/worried, one under pressure/urgent.
- WRONG voice_card (tic prefix on every line): "Matlab, yeh sahi nahi hai." / "Matlab, kya kar raha hai woh?" / "Matlab, bhago yahan se!"
- RIGHT voice_card (tic appears naturally, different emotions): "Yaar sun, aaj office mein kuch ajeeb hua — matlab bilkul samajh nahi aaya." / "Woh ladka... kya pata uska kya irada tha." / "Ek kaam kar, phone mat rakh — main aa raha hoon abhi."

OUTPUT: A single valid JSON object. No markdown fences. Start with { and end with }.
```

**User prompt:**

```
User premise: "<USER_PROMPT>"

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
- No quotation marks. No attribution tags ("Rahul said:" is forbidden). Never nest asterisks.
- SCENE STRUCTURE: ONE opening *action block* (2 SHORT sentences max — place, time, one physical anchor) followed by EXACTLY 2 dialogue exchanges (2 lines of dialogue total — no more). Between dialogue lines, ONE *action beat* of 1 sentence. Total scene: opening block + 2 dialogue lines + 1 action beat between them. Keep it tight.
- WRONG: *Office mein sab log the. Tension tha. Rohan nervous tha. Uski palms paseeni thi.* / Kab aaya? / Abhi.
- RIGHT: *Office ki tenth floor. Shaam ke 6:41. AC band tha — sweat ki mehak.* / Rohan, kab aaya? / *Woh ruk gaya, jawaab dene se pehle.* / Abhi hi.

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
- When grounding a place: use ONE specific physical detail (smell, sound, texture) — generic atmosphere ("the room was tense") is forbidden.
- Show emotion through action, never through statement.
- Scene 3 MUST end with this exact sentence word for word: "<TARGET_CLIFFHANGER>"

STORY CONTEXT:
Genre: <GENRE> | City: <CITY>
Story rules: <STORY_RULES>
Secret (drives subtext — never name it directly): <SECRET>
Protagonist: <NAME>. Speech tic: <SPEECH_TIC>
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
5. Does dialogue avoid attribution tags?
6. Do action beats between dialogue lines stay at 1-2 sentences (not paragraphs)?
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

Episode 1 has no branching — `scene_objectives` is used directly.

For episodes 2–6:

```
Branch A call:
  scene_objectives = blueprint.episodes[n-1].scene_objectives_a
  choice_label     = blueprint.episodes[n-2].choice_a.label
  prev_last_sentence = prev_last_sentence_a

Branch B call:
  scene_objectives = blueprint.episodes[n-1].scene_objectives_b
  choice_label     = blueprint.episodes[n-2].choice_b.label
  prev_last_sentence = prev_last_sentence_b
```

Both calls run in `Promise.all`. After each episode:
```
prev_last_sentence_a = extractLastSentenceV3(branchA)
prev_last_sentence_b = extractLastSentenceV3(branchB)
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
| bare text line | `CHARACTER_DIALOGUE` | `.v3-dialogue` | White, bold, large |

The first `*action*` block becomes `SCENE_CONTEXT`; subsequent ones become `ACTION_PROSE`. Dialogue lines become `CHARACTER_DIALOGUE`.

---

## 7. Image Pipeline

| Episode | Provider | Method | Storage |
|---|---|---|---|
| Cover | `gpt-image-1` | `b64_json` response | Supabase Storage `covers` bucket |
| Episode 1 | `gpt-image-1` | `b64_json` response | Supabase Storage `covers` bucket |
| Episodes 2–6 | Pollinations | URL constructed from prompt string | CDN (permanent, `immutable` cache) |

Pollinations URLs are built from `buildEpisodeImagePrompt(blueprint, n)` and are not fetched at generation time — the browser fetches them on display.

---

## 8. Quality Improvements vs v3

| Area | v3 | v4 | v4.1 |
|---|---|---|---|
| Cliffhangers | Any sentence | Must be physical/external | Same, now enforced in validator too |
| Secret | "Hidden truth" | Specific past event + named character | Prompt now demands named event + what was concealed |
| Story rules | Any description | Must be visible and falsifiable | Prompt includes wrong/right examples |
| Choice subtext | Action description | Value conflict | Subtext now names the sacrificed value explicitly |
| Branch divergence | scene_objectives only | scene_objectives_a + _b | scene_objectives_a[0] must describe exact physical situation from the choice consequence |
| Scene format | Interleaved | ONE action block then dialogue | Interleaved restored: 2-3 sentence opening, then dialogue with 1-2 sentence action beats between lines |
| Voice card tic | Could prefix every line | Mid-sentence natural use | Must NOT open every line; 3 named emotional registers required |
| Continuity | None | prev_last_sentence per branch | + story_state JSON (relationships, mysteries, emotional state) per branch |
| Image persistence | Pollinations URLs in DB | Cover + ep1 in Storage | All episodes uploaded to Storage before save |
| Scene 1 hook | None | None | Must create unanswered question in first 10 words |
| Loanword guardrail | None | None | Max 1 Sanskrit/Urdu loanword per scene |
| Validator checks | 7 | 7 | 9 (added: story rule contradiction, banned-lines echo) |
| Retry | None | 3× with 2s/4s backoff | Same |
| Player UI | Semi-transparent overlay | Same | Hard split: image top 45vh, solid dark text panel below |

## 9. Story State (stageStoryState)

After each episode, a compact story state is extracted and passed forward to the next episode's screenwriter. This prevents later episodes from ignoring earlier story developments.

**Function:** `stageStoryState(epResult, blueprint, episodeNumber, branch)`

**Model:** `gpt-5.4-mini`, `max_tokens: 200`

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
- Episode 1 (no branch): `stageStoryState(ep1Result, blueprint, 1, null)` → initialises both `story_state_a` and `story_state_b` from the same ep1
- Episodes 2–6: two calls per episode (`branch: 'a'` and `branch: 'b'`), awaited before starting the next episode. On failure, the previous episode's state is preserved (`.catch(() => story_state_a)`)

**In the screenwriter prompt:** injected as:
```
STORY STATE (maintain continuity from previous episode):
{"relationships":[...],"active_mysteries":[...],...}
```
