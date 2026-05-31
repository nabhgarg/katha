# How Story Generation Works in v8

This document explains the full story generation pipeline end to end —
not what changed from v7, but how the system works today.

Last validated: 2026-05-31

---

## The Shape of a Story

Every story in Katha has the same structure:

```
Episode 1 — single branch (3 scenes)
Episode 2 — single branch (3 scenes) + ONE choice at the end
Episode 3 — Branch A (3 scenes)  and  Branch B (3 scenes)
Episode 4 — Branch A (3 scenes)  and  Branch B (3 scenes)
Episode 5 — Branch A (3 scenes)  and  Branch B (3 scenes)
Episode 6 — Branch A finale      and  Branch B finale
```

Total: 18 scenes generated. A player reads 12 of them — episodes 1 and 2 (shared),
then one full branch (4 episodes × 3 scenes) based on their choice.

The choice happens exactly once, at the end of Episode 2. There are no other choices.
Both branches always reach a resolution in Episode 6.

---

## The Four Stages

### Stage 1: Architect

**Model:** `claude-opus-4-7`

The architect takes a one-sentence premise and builds a full blueprint JSON. This is planning, not writing.

The blueprint contains:
- Story metadata: genre, title, city, logline, secret
- Protagonist profile: name, goal, motivation, past, voice card, nature
- 3 supporting characters, each with a story function (not a label — what they do to the protagonist's situation when they appear)
- All 6 episode plans: titles, scene objectives (branched for ep3–6), target cliffhangers
- The ONE choice at episode 2, with both option labels

**Key rule — cliffhangers for ep3–6:**
Each branched episode has `target_cliffhanger_a` and `target_cliffhanger_b`. Not one shared
cliffhanger. The two branches are in different physical situations and end differently.

**Key rule — character casting:**
The architect derives characters from what the story needs, not from a template.
For mythology genre, characters are cast from the original mythology's relationship web.
A Durga story casts from Durga's specific wound and relationships — the guide, the enemy, the loyal companion — and maps those dynamics onto modern Mumbai figures.
Modern characters don't know they're reincarnations. The mythology is subtext the player discovers.

**Key rule — the choice:**
Must be a concrete action dilemma rooted in what just happened. Not a moral statement.
`"Asha ke saath temple mein ruko ya Kabir ke paas Bandra jao"` — not `"Sachhai batao ya chhupaao"`.
The first opening scene of each branch (`scene_objectives_a[0]`, `scene_objectives_b[0]`)
must describe the direct physical situation after choosing that path.

---

### Stage 2: Screenwriter

**Model:** `claude-haiku-4-5-20251001`
**Called:** 10 times total (ep1, ep2, then ep3A+3B through ep6A+6B as parallel pairs)

The screenwriter writes one episode at a time. It receives a system prompt (story context +
all writing rules) and a user message (episode number, scene objectives, cliffhanger, hard limits).

For episodes 3–6, it also receives:
- Branch origin: which choice the player made at the end of episode 2
- Story state from the previous episode of this branch (compact JSON)
- Previous episode's last line (for scene continuity)
- Banned phrases: the last 24 dialogue lines from all prior episodes (prevents repetition)

**Output format:** Three scenes, each as a single string:
- `*action block*` — narrator lines, inside asterisks, in spoken Hindi
- `NAME: dialogue` — dialogue lines, ALL-CAPS speaker name followed by colon

---

### The Writing Rules (what the screenwriter is told)

**Complete sentences in action blocks.**
Every sentence inside `*asterisks*` must have a subject and a verb. No noun-phrase
fragments. No em-dash shortcuts in place of a verb.

WRONG: `*Rudra — aam insaan ab, handcuffed.*`
RIGHT: `*Rudra jo ki ab ek aam insaan tha, usko handcuffed kiya tha.*`

WRONG: `*Mahalaxmi mandir ke bahar. Police van ruki hui.*`
RIGHT: `*Mahalaxmi mandir ke bahar police van ruki hui thi.*`

**Spoken Hindi only in action blocks.**
Not literary narration. Not English with Hindi sprinkled. English is only allowed where
people use it naturally in daily life ("school", "phone", "exam", "office").
Concrete physical actions only — what moved, what stopped, what made a sound.
No feelings stated, no atmosphere described.

**Hard limits:**
- Every scene total: under 140 words
- Max 5 dialogue lines per scene
- No same character speaking twice in a row

**Short reactions go inside asterisks, not as dialogue.**
When a character says only `Kya...` or `Matlab?` or `Haan.` in reaction to something
physical, that is an action beat, not a dialogue line. Put it inside `*asterisks*`.
Treating short reactions as dialogue causes the double-speaker validator failure.

**Scene-to-scene continuity.**
No invisible gaps. If no time has passed, Scene 2 opens exactly where Scene 1 ended.
If time has passed, the first line names it explicitly (`*Ek ghante baad.*`).
If location changed, Scene 2's first action block shows the movement
(`*Woh bhaagi. Auto pakda, Bandra bol diya.*`).
The reader must never wonder "how did we get here?"

**Cliffhanger placement.**
Scene 3 must end with the target cliffhanger word for word, inside `*asterisks*`, as the
absolute final line. Not dialogue. The cliffhanger is given to the model verbatim — it copies
it exactly.

**"Aunty" not "aunt".**
In Indian Hinglish, the word is always "Aunty". The prompt explicitly bans "aunt".

**Direct address.**
Beta, yaar, sir, bhaiya, aunty — these are the texture of Indian dialogue. The model is
instructed to use them.

---

### Stage 3: Validator

**No LLM — pure JavaScript**

After each episode is written, 5 structural checks run:

1. Scene 3's last line is exactly `*{target_cliffhanger}*`
2. No character speaks twice in a row
3. Every non-action line has an ALL-CAPS speaker label
4. No scene over 140 total words
5. No scene with more than 5 dialogue lines

If any check fails, the episode is logged with the specific issue and retried.
**Up to 3 retries.** If still failing after 3 attempts, the episode is marked `degraded: true`
and the issues are logged alongside it. The story generation continues — a degraded episode
is a quality flag, not a hard stop. The story is still playable.

Language quality (Hindi vs English, sentence completeness) is not validated mechanically.
That is the prompt's job. The validator checks only structure.

---

### Stage 4: Story State Extractor

**Model:** `claude-haiku-4-5-20251001`

After each episode is written and passes (or is marked degraded), a compact story state
JSON is extracted. It contains relationships, active mysteries, emotional state, significant
objects, and character goals.

This state is passed to the screenwriter for the next episode. It gives the model memory of
what happened without passing full episode text — which would overflow the context window
across 10 episodes.

**State branching:**
Episodes 1 and 2 are single-branch. After episode 2, the base state is used for both
Branch A and Branch B of episode 3. From episode 3 onward, each branch produces its own
separate state. Episode 4A gets state from 3A. Episode 4B gets state from 3B. They never cross.

---

## Generation Order and Parallelism

```
Episode 1 (single)           — written, validated, state extracted
Episode 2 (single)           — written, validated, state extracted
                               ↓ choice defined here
Episodes 3A + 3B             — written in parallel (Promise.all), validated, states extracted
Episodes 4A + 4B             — written in parallel, validated, states extracted
Episodes 5A + 5B             — written in parallel, validated, states extracted
Episodes 6A + 6B             — written in parallel, validated
```

Total LLM calls per story:

| Call | Model | Count |
|---|---|---|
| Architect | claude-opus-4-7 | 1 |
| Screenwriter | claude-haiku-4-5-20251001 | 10 |
| Story state | claude-haiku-4-5-20251001 | 9 (after each episode except the last pair) |

Plus up to 3 retries per failed validator check.

---

## What the App Receives

A story JSON with this structure:

```json
{
  "version": "v8",
  "title": "Durga Ki Beti",
  "genre": "MYTHOLOGY",
  "episodes": [
    {
      "title": "Garam Haath",
      "scenes": [
        {"scene_number": 1, "script": "..."},
        {"scene_number": 2, "script": "..."},
        {"scene_number": 3, "script": "..."}
      ],
      "choice": null
    },
    {
      "title": "Trishul Ki Awaaz",
      "scenes": [...],
      "choice": {
        "q": "Asha kehti hai turant temple ke andar reh ke ritual shuru karo...",
        "A": {"text": "Temple mein Asha ke saath ruko"},
        "B": {"text": "Kabir ke paas Bandra jao"}
      }
    },
    {
      "title": "Do Raaste",
      "scenesA": [...],
      "scenesB": [...]
    }
    // episodes 4–6: same as episode 3
  ]
}
```

The app reads `scenes` for episodes 1–2, displays the choice UI at the end of episode 2,
then reads `scenesA` or `scenesB` for episodes 3–6 based on the player's choice.

---

## The API

All LLM calls go directly to the Anthropic API:

```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: {ANTHROPIC_API_KEY}
  anthropic-version: 2023-06-01
  Content-Type: application/json
Body: { "model": "...", "max_tokens": ..., "system": "...", "messages": [...] }
```

- Architect calls: `model: "claude-opus-4-7"`, `max_tokens: 8000`
- Screenwriter calls: `model: "claude-haiku-4-5-20251001"`, `max_tokens: 2000`
- Story state calls: `model: "claude-haiku-4-5-20251001"`, `max_tokens: 500`

The Supabase proxy is not used for story generation — it requires a user session JWT,
not an API key, and does not forward max_tokens.

---

## North Star Metrics

**70% of users who start Episode 1 must finish Episode 2.**

This is the primary metric. Every writing rule serves this number — the cliffhangers,
the scene limits, the language law, the continuity rules.

**60% of users who reach the choice must play both endings.**

This only happens if the two branches feel genuinely different. Branch A and Branch B must
open in different physical situations. The choice must be consequential, not cosmetic.
A player who finishes Branch A and immediately wants to know what happened in Branch B —
that is the goal.
