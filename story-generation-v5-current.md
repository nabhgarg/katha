# Katha Story Generation Pipeline — v5 Current Spec

**Last updated:** 2026-05-31
**Status:** Production
**File:** `generate-stories.mjs`
**Output:** `stories-<timestamp>.json`

---

## What This Pipeline Does

Takes a one-sentence Hinglish premise and produces a complete interactive story: 33 scenes across 6 episodes, with one branching choice at the end of Episode 1. The reader reads 18 scenes depending on which branch they choose. Output is a JSON file that loads directly into the Katha app.

---

## Architecture

```
PREMISE (1 sentence)
  │
  ▼
ARCHITECT (gpt-5.4, ~8000 tokens)
  │  → blueprint: title, genre, city, secret, logline
  │    protagonist (name, story_goal, motivation, nature, past, voice_card)
  │    characters, episodes[1-6] (scene_objectives, target_cliffhanger, choices)
  ▼
EP1 SCREENWRITER (gpt-5.4-mini, ~2000 tokens) — starts cold, no prior state
  │  → 3 scenes, up to 140 words each, up to 5 dialogue lines each
  │  → Output: {scenes: [{scene_number, script}]}
  │  → Validator: hard failures retry up to 3×; soft failures logged as DEGRADED
  ▼
STORY STATE — EP1 (gpt-5.4-mini, ~300 tokens)
  │  → {relationships, active_mysteries, emotional_state, objects, character_goals}
  │  → Seeds BOTH EP2-A and EP2-B
  ▼
EP2–6: A + B IN PARALLEL (5 episodes × 2 branches = 10 screenwriter calls, ~2000 tokens each)
  │  Each call gets: branch objectives, same target_cliffhanger, story state
  │                  from same branch previous episode, banned lines (same branch),
  │                  prev last line (same branch)
  │  → Validator: same hard/soft policy as EP1
  ▼
STORY STATE per branch (10 calls, gpt-5.4-mini, ~300 tokens each)
  │  → null on failure, console.warn emitted with episode label
  ▼
JSON OUTPUT — app-ready, loads via loadGeneratedStory() in browser console
```

---

## Story Shape

| Episode | Branches | Scenes | Notes |
|---------|----------|--------|-------|
| EP1 | 1 | 3 | Single branch. Ends on cliffhanger + choice A/B. |
| EP2–6 | A + B | 3 each | Both branches end on the SAME target_cliffhanger. |
| **Total generated** | | **33** | |
| **Reader reads** | | **18** | EP1 (3 scenes) + one full branch of EP2–6 (15 scenes) |

---

## Architect Output Schema

```json
{
  "genre": "ROMANCE|THRILLER|MYTHOLOGY",
  "title": "2-4 word Hinglish title",
  "city": "Indian city",
  "secret": "specific past event — who, what happened, what was concealed",
  "logline": "protagonist, disruption, stakes",
  "protagonist": {
    "name": "first name only",
    "story_goal": "the concrete thing they want by EP6",
    "motivation": "why it matters personally",
    "nature": "1-2 word disposition",
    "past": "prior event that shapes reactions (not the secret)",
    "voice_card": [
      "casual register Hinglish line",
      "uncertain register Hinglish line",
      "under pressure register Hinglish line"
    ]
  },
  "characters": [
    {"name": "first name only", "role": "relationship + story function"}
  ],
  "episodes": [
    {
      "episode_number": 1,
      "scene_objectives": ["Scene 1 obj", "Scene 2 obj", "Scene 3 obj"],
      "target_cliffhanger": "exact Hinglish sentence",
      "choice_question": "Hinglish dilemma question",
      "choice_a": {"label": "3-5 word action label"},
      "choice_b": {"label": "3-5 word action label"}
    },
    {
      "episode_number": 2,
      "scene_objectives_a": ["direct consequence of choice_a", "...", "..."],
      "scene_objectives_b": ["direct consequence of choice_b", "...", "..."],
      "target_cliffhanger": "SAME exact sentence for both branches",
      "choice_question": "...",
      "choice_a": {"label": "..."},
      "choice_b": {"label": "..."}
    }
  ]
}
```

- Episodes 3–5: same structure as EP2 (scene_objectives_a/b, target_cliffhanger, choice fields)
- Episode 6: same but no choice_question, choice_a, choice_b — story ends here

**Character name rule:** Architect is instructed to avoid overused names: Rahul, Priya, Meera, Arjun, Kabir, Rhea, Rohan, Naina, Dev, Vikram, Riya, Ananya, Ishaan. Uses authentic but less common Indian names instead.

---

## Screenwriter Rules

**Scene limits (both soft — logged as DEGRADED if exceeded, no retry):**
- Max 140 words per scene (action blocks + dialogue combined)
- Max 5 dialogue lines per scene

**Format:**
- Action/setting inside `*asterisks*`
- Dialogue outside asterisks: `SPEAKER_NAME: line`
- Every speaker name in ALL-CAPS before the colon — no exceptions
- Never same speaker twice in a row

**Narrator language:**
- Every `*asterisk block*` is Hindi-dominant Hinglish — no exceptions
- English enters only where urban Indians naturally use it: "meeting", "deadline", "phone"
- No literary English: "she felt a chill", "the atmosphere was tense"
- Right: `*Haath kaamp raha tha. Andar se awaaz aa rahi thi.*`

**Craft rules:**
- Scene 1 of every episode: open with a hook — unanswered question within first 10 words
- All scenes: open mid-action, no backstory or exposition
- Emotion through action, never through statement
- Scene 3 MUST end with `target_cliffhanger` word-for-word inside `*asterisks*` as a narrator line — never as dialogue

---

## Continuity Mechanisms

**Story state** — compact JSON passed forward per branch between episodes:
```json
{
  "relationships": [{"pair": "Name-Name", "state": "under 20 words"}],
  "active_mysteries": ["..."],
  "emotional_state": {"CharacterName": "..."},
  "objects": ["..."],
  "character_goals": {"CharacterName": "..."}
}
```
EP1 state seeds both EP2-A and EP2-B. On generation failure: null passed forward, `console.warn` with episode label emitted.

**Banned lines** — up to 20 most recent dialogue lines from the same branch, accumulated FIFO, injected as "do NOT reuse." Each branch maintains its own independent list.

**Prev last line** — the final line of the previous episode in the same branch, injected so the new episode opens with continuity.

---

## Validation

### Hard failures — retry up to 3×, surface error if all fail
| Failure | Description |
|---------|-------------|
| Cliffhanger not on last scene | Scene 3 doesn't end with target_cliffhanger |
| Unknown speaker | Character not declared in Architect cast |
| Duplicate consecutive speaker | Same character speaks twice in a row |
| Missing ALL-CAPS label | Dialogue line without proper speaker format |
| 0 scenes parsed | JSON returned no scenes |

### Soft failures — log as DEGRADED, keep output, no retry
| Failure | Threshold |
|---------|-----------|
| Scene too long | > 140 words |
| Too many dialogue lines | > 5 lines |

---

## JSON Output Format (App-Ready)

The pipeline converts each episode's raw script into the Katha app's native format:

```json
[
  {
    "title": "Story Title",
    "genre": "THRILLER",
    "city": "Pune",
    "logline": "...",
    "episodes": [
      {
        "title": "Episode 1",
        "scenes": [
          {"hl": "First sentence of opening action block", "body": "Rest of the scene", "img": ""}
        ],
        "choice": {
          "q": "Hinglish dilemma question",
          "A": {"text": "Choice A label", "sub": "", "img": ""},
          "B": {"text": "Choice B label", "sub": "", "img": ""}
        }
      },
      {
        "title": "Episode 2",
        "scenesA": [{"hl": "...", "body": "...", "img": ""}],
        "scenesB": [{"hl": "...", "body": "...", "img": ""}],
        "choice": {"q": "...", "A": {...}, "B": {...}}
      },
      {
        "title": "Episode 6",
        "scenesA": [...],
        "scenesB": [...]
      }
    ]
  }
]
```

**Script → scene conversion:** First sentence of the first `*asterisk block*` becomes `hl` (headline). Everything else — remaining action text and all dialogue lines — becomes `body`. `img` is always empty (no DALL-E calls in this pipeline).

**Loading into the app:** Open browser console on `localhost:8765` and run:
```js
loadGeneratedStory('stories-2026-05-30T11-16-29.json', 0)  // thriller
loadGeneratedStory('stories-2026-05-30T11-16-29.json', 1)  // romance
```

---

## Version History

| Version | Key Changes |
|---------|-------------|
| v4 | Architect + per-scene story state + parallel generation |
| v5 | Direct prose from scene objectives. Story state between episodes. 80 words/scene. Same cliffhanger both branches. |
| v6 | Added "screenwriter craft rules" — quality degraded |
| v7 | Beat sheet layer (Architect → Beat Writer → Prose Writer), voice profiles, 140 words/scene — dialogue quality worsened |
| **v5-current** | Restored v5 base. Word limit 80→140, dialogue cap 4→5, story_rules removed, output changed from Excel to JSON, name diversity enforced |

---

## What Changed from v5 Original

| Setting | v5 Original | v5 Current |
|---------|-------------|------------|
| Word limit | 80 words/scene | 140 words/scene |
| Dialogue cap | 4 lines/scene | 5 lines/scene |
| `story_rules` field | 3 observable constraints, injected as single line | **Removed** — enforcement too weak, no validation |
| Output format | Excel (.xlsx) | JSON (.json), app-ready |
| Character names | Unrestricted | Banned list of 13 overused names |

---

## Known Risks

1. **No branch divergence check** — EP5/EP6 branches can silently converge. Mitigated by explicit `scene_objectives_a/b` in Architect.
2. **Architect has no try/catch** — malformed JSON crashes the full run with an unformatted stack trace.
3. **No reader validation** — 0 data points on whether any pipeline version achieves 70% EP2 completion. Highest-leverage next action.
4. **Story state token budget** — ~300 tokens may not hold complex state after 3+ episodes. Null failures are now logged.
5. **Rate-limit risk** — 10 concurrent LLM calls per story × 2 parallel stories = 20 simultaneous requests. Fine for single-user; revisit before multi-user deployment.

---

## Model Names

`gpt-5.4` (Architect) and `gpt-5.4-mini` (Screenwriter, Story State) are current working identifiers — not stable API names. May need updating if upstream naming changes.
