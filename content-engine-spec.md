# Katha Content AI Engine — Spec v1.0

> This document covers the full pipeline for generating a Katha interactive story: text, images, and audio. It is written for MVP. Every decision is annotated with why it is the minimum viable choice.

---

## Architecture Overview

```
USER PROMPT (2 sentences)
        │
        ▼
┌───────────────────┐
│  1. GENRE ENGINE  │  Classify genre, expand premise, extract story rules
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  2. STORY BIBLE   │  Characters, world facts, speech patterns
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  3. ARC PLANNER   │  6-episode structure, cliffhangers defined before scenes
└────────┬──────────┘
         │
    ┌────┴─────────────────────────────┐
    │  runs in parallel per episode    │
    ▼                                  ▼
┌──────────────┐              ┌──────────────────────┐
│  4. SCENE    │              │  5. IMAGE PROMPT     │
│  WRITER      │─────────────▶│  GENERATOR           │
│  (text)      │              │  (from scene text)   │
└──────────────┘              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │  6. IMAGE GENERATOR  │
                              │  (FLUX.1 local)      │
                              └──────────┬───────────┘
                                         │
         ┌───────────────────────────────┘
         │
         ▼
┌───────────────────┐
│  7. AUDIO         │  BGM selection (MVP) + TTS narration (Phase 2)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  8. QUALITY GATE  │  Cliffhanger check + global coherence
└────────┬──────────┘
         │
         ▼
    STORY PUBLISHED TO FEED
```

**Generation time target:** 3–8 minutes on RTX 4090
**Failure mode:** If any stage fails, retry once. If still failing, fall back to a curated seed story.

---

## Stage 1: Genre Engine

**Input:** Raw user prompt (up to 280 characters)
**Output:** JSON with genre, expanded logline, 3 story rules, 5 characters

### What it does

The genre engine is the first gate. It decides what kind of story is about to be told and extracts the permanent facts that all later stages must respect.

**Story rules** are the most important output. They are a hard contract passed into every downstream prompt. Example rules for "Kashi Ka Khazana":
- "Vikram is 24 years old, lives alone in Koramangala, Bangalore"
- "The coin under his pillow appeared on the night of Diwali"
- "His father died before he was born — he never knew him"

Without story rules, character age changes between episodes, locations teleport, dead characters reappear.

### Prompt

```
SYSTEM:
You are a story development editor for Indian vernacular fiction.

Genre definitions:
- ROMANCE: Class tension or distance, longing, one central obstacle. 
  Set in recognizable modern India (college, mohalla, metro, office).
  Emotional register: bittersweet, slow burn.
- THRILLER: One impossible thing that is completely real. Paranoia escalates 
  every episode. Twist in episode 5 changes everything. 
  Emotional register: dread, suspense, dark.
- MYTHOLOGY: An ancient or divine force disrupts a modern character's life. 
  Protagonist is ordinary and reluctant. The supernatural is matter-of-fact, 
  not explained. Emotional register: epic, moral, wonder.

USER PROMPT: {user_input}

Output JSON exactly:
{
  "genre": "ROMANCE" | "THRILLER" | "MYTHOLOGY",
  "confidence": 0.0–1.0,
  "logline": {
    "setup": "one sentence — who is the protagonist and what is their ordinary world",
    "inciting_incident": "one sentence — what disrupts everything",
    "central_question": "one sentence — what must be resolved by episode 6"
  },
  "story_rules": [
    "permanent fact 1 — character age, location, relationship status",
    "permanent fact 2 — a key plot fact that cannot change",
    "permanent fact 3 — a world detail specific to this story"
  ],
  "characters": [
    {
      "name": "string",
      "age": number,
      "role": "protagonist | love_interest | antagonist | ally | unknown",
      "one_line": "who they are in one sentence",
      "flaw": "one word or short phrase"
    }
  ]
}
```

---

## Stage 2: Story Bible

**Input:** Stage 1 output
**Output:** Full character bible — passed verbatim into every scene prompt

The character bible prevents personality drift. Without it, a cautious character becomes reckless in episode 4 because the scene prompt didn't mention they were cautious.

### Per-character output

```
{
  "name": "Vikram",
  "wants": "to understand where the coin came from",
  "needs": "to accept that some things are not meant to be explained",
  "hides": "he's been having the same dream for 10 years but told no one",
  "speech": {
    "hinglish_ratio": 0.6,
    "tic": "uses 'matlab' as a filler when nervous",
    "register": "educated but informal, never formal Hindi"
  }
}
```

**The speech profile is used for the HL (highlighted line) in each scene.** It ensures a Vikram scene sounds different from a Shekhar scene — even though the same model writes both.

---

## Stage 3: Episode Arc Planner

**Input:** Story bible + story rules + logline
**Output:** 6-episode structure with pre-defined cliffhangers and choice descriptions

### Why the cliffhanger is defined first

The scene writer (Stage 4) works toward a destination, not away from a starting point. Every scene in an episode must escalate toward the episode-ending cliffhanger. If the cliffhanger is written after the scenes, it becomes an afterthought. If it is written first, the scenes are shaped by it.

**This is the single most important architectural decision in this pipeline.** The 70% ep1→ep2 continuation metric is determined almost entirely by how the first episode ends.

### Episode structure

```
Episode 1: HOOK
  - Opens in the middle of something wrong. No backstory in the first scene.
  - By scene 3: a revelation, not an action. Something the user didn't see coming 
    that recontextualizes everything they just read.
  - Cliffhanger: a QUESTION, not an event. "Whose voice was it?" beats "The building 
    fell." The user must have an unanswered question burning when they choose.

Episode 2: ESCALATION  
  - The problem from ep 1 is bigger than it looked.
  - One thing the user thought was safe is now dangerous.
  - The choice at the end of ep 1 has a visible consequence here.

Episode 3: COMPLICATION
  - A new character or new piece of information changes everything.
  - The protagonist makes a reasonable decision that turns out to be wrong.

Episode 4: ALL IS LOST
  - The lowest point. Something the protagonist valued is gone or corrupted.
  - The choice here is the hardest — both options feel like a loss.

Episode 5: THE TURN
  - The most meaningful fork. Both paths feel real and costly.
  - One path is emotionally "safe" but hollow. The other is risky but true.
  - The user should feel genuine uncertainty.

Episode 6: RESOLUTION
  - No choice. 3 scenes to close the story.
  - The ending must reference something from episode 1 (an image, a line, an object).
  - Earned, not explained. The audience should feel it, not be told it.
```

### Prompt

```
SYSTEM:
You are planning a 6-episode interactive story for Indian mobile audiences.
Story rules: {rules}
Character bible: {bible}
Logline: {logline}

For each of the 6 episodes, output:
{
  "episode_number": 1–6,
  "title": "2–3 words, can be Hindi or English",
  "scene_summaries": [
    "Scene 1: one sentence — what happens and what the user sees",
    "Scene 2: one sentence",
    "Scene 3: one sentence"
  ],
  "cliffhanger": "one sentence — exactly what the user reads when the episode ends. 
                  Must be a question or an impossible juxtaposition, never just an event.",
  "choice": {
    "question": "the question shown to the user",
    "option_a": {
      "label": "3–5 words",
      "sub": "what this choice costs or implies",
      "emotional_register": "safe | brave | cold | desperate | kind"
    },
    "option_b": {
      "label": "3–5 words",
      "sub": "what this choice costs or implies",
      "emotional_register": "safe | brave | cold | desperate | kind"
    }
  }
}

Rules:
- Option A and Option B must have opposite emotional registers.
- Neither option is obviously "correct." If one option is clearly better, rewrite.
- Episode 6 has no choice field.
- The cliffhanger for Episode 1 must be the strongest in the story — write it last,
  after you know the shape of all 6 episodes.
```

---

## Stage 4: Scene Writer (Text)

**Input:** Episode arc plan + character bible + story rules + previous scene's last line
**Output:** `hl` (Hinglish highlighted line) + `body` (English narration, 2–4 sentences)

### The two-field format

**HL (Highlighted Line):** The emotional peak of the scene. Displayed prominently in the UI with a gold left-border. Read aloud by the narrator. 10–15 words. Must sound natural spoken, not written.

**Body:** The narrative prose. Sets location, action, sensory detail. Displayed below the HL in the subtitle stripe. 2–4 sentences. English only. Last sentence always sets up the next scene or sharpens the dread/longing.

### Prompt

```
SYSTEM:
You are writing one scene of an Indian interactive story.

Story rules (do not violate these): {rules}
Character bible: {bible}
This scene's job: {scene_summary}
Previous scene ended with: "{prev_last_sentence}"  [OMIT for scene 1 of episode 1]
This episode must end with: "{cliffhanger}"

Write:

HL (Hinglish, 10–15 words):
- The emotional peak of this scene, not a summary
- Natural spoken Hinglish as a 22-year-old in {city} would say it
- Mix Hindi and English — not transliteration of pure English phrases
- No exposition. This is feeling or revelation, not information.
- If this scene belongs to character "{name}", use their speech pattern: {speech_tic}

BODY (English, 2–4 sentences):
- Sentence 1: ground us — where we are, what we see first
- Middle: what happens, or what is noticed for the first time
- Last sentence: either escalates toward the episode cliffhanger, 
  OR ends on a detail that makes the next scene inevitable
- Use one concrete sensory detail per scene (smell, sound, texture, temperature)
- No adverbs. Show don't tell.

Output JSON: {"hl": "...", "body": "..."}
```

### Continuity mechanism

Every scene prompt receives `prev_last_sentence` — the final sentence of the previous scene's body. This creates a daisy-chain that prevents cold cuts. The scene writer cannot ignore where the story just was.

---

## Stage 5: Image Prompt Generator

**Input:** Scene text (hl + body) + genre + story world description
**Output:** A FLUX.1-ready image generation prompt

This stage converts narrative prose into a visual brief. It runs after the scene writer, so the image prompt is grounded in the actual text, not the abstract arc plan.

### Prompt

```
SYSTEM:
You are a visual director creating image prompts for an Indian interactive story app.
The image will be displayed full-screen behind subtitle text on a mobile phone.
Style requirements: {style_prefix}
Genre: {genre}

Scene text:
HL: "{hl}"
Body: "{body}"

Write a single image generation prompt:
- Lead with the most cinematic visual element of this scene
- Include: lighting quality, time of day, mood, one key foreground element
- Include: "Indian setting", specific location if named in the scene
- Do NOT include character faces — the image shows world, not close-up portraits
- End with the style suffix: {style_suffix}
- Max 60 words

Output: plain string (the prompt itself, no JSON wrapper)
```

### Style system (world consistency without LoRA)

Character face consistency across 18 scenes is hard to achieve on FLUX.1 without a custom LoRA. The MVP solution: maintain **world** consistency, not **face** consistency. Each story gets a fixed style prefix and suffix applied to every image prompt.

```python
STYLE_PREFIXES = {
  "MYTHOLOGY": "cinematic Indian mythology, dramatic golden hour light shafts, 
                ancient stone and modern city contrast, epic scale, 
                rich amber and deep shadow palette",
  
  "THRILLER": "atmospheric Indian urban noir, harsh sodium streetlights, 
               deep shadows, high contrast, sense of dread, 
               desaturated with one color accent",
  
  "ROMANCE": "warm Indian light, golden hour, soft bokeh backgrounds, 
              intimate close framing, bittersweet mood, 
              Bollywood-adjacent but grounded and real"
}

STYLE_SUFFIX = "photorealistic, cinematic composition, no text, no watermark, 
                4:3 aspect ratio optimized for mobile full-screen"
```

This means all 18 images in a story feel like they came from the same film. The characters look different in each shot — this is acceptable for MVP. Readers understand visual storytelling conventions.

**Phase 2 upgrade:** Train a lightweight LoRA on the first character image in each story to maintain approximate character consistency.

---

## Stage 6: Image Generator

**Hardware:** RTX 4090 (24 GB VRAM)
**Model:** FLUX.1-schnell (local, no API cost) or FLUX.1-dev for higher quality
**Resolution:** 832×1216 (portrait, mobile-first)
**Steps:** 4 (schnell) or 20 (dev)
**Time per image:** ~8–15 seconds on RTX 4090

**Per story:** 18 scenes × 1 image + 2 branch images (ep6) = 20 images total
**Total image generation time:** ~4–5 minutes (run sequentially, or parallelize 2–4 at once)

### Queue management

Stories go into an async queue. The RTX 4090 handles 40–50 concurrent users because:
- Text generation (LLM) takes ~60–90 seconds total
- Image generation takes ~4–5 minutes
- These run sequentially per story, but different users' stories interleave in the queue
- Seed stories are pre-generated at launch — new user arriving gets instant feed content

```
USER SUBMITS PROMPT
    → add to queue
    → show "Generating" screen with checklist (Stage 1–3 complete in ~60s, visible to user)
    → Stage 4–6 run in background (~4–5 min)
    → notify user when ready (if they left the screen)
    → story appears in their profile + public feed
```

---

## Stage 7: Audio

### MVP: BGM only (what we have now)

Three pre-composed background score tracks, one per genre. Selected automatically by the genre classifier output. Loops throughout the entire story. Volume: 0.2 (ambient, not foregrounded).

**This is sufficient for MVP.** The visual + text experience is the core product. Audio is atmosphere, not content.

| Genre | BGM character |
|---|---|
| Mythology | Sarangi + tabla, slow, building, ancient feel |
| Thriller | Drone + sparse percussion, tension, unpredictable |
| Romance | Acoustic guitar + soft piano, warm, melancholic |

### Narrator voice: the decision

**MVP choice: Single narrator voice, throughout every story.**

Reasoning:
- Character voice (first-person, per character) requires either per-character voice casting (expensive) or per-character TTS configuration (complex, quality unpredictable)
- Narrator voice is the PocketFM model — proven for Indian audiences at scale
- Our HL lines are already written in third-person narrator style ("Vikram raat ke teen baje neend se uth gaya" — not "Main raat ke teen baje neend se uth gaya")
- One consistent voice = one consistent emotional register throughout the story = stronger immersion

**The narrator reads the HL line only** — not the body text. The body text is read silently by the user. This is how the subtitle stripe is designed. The HL is the spoken, emotional beat. The body is the context.

### Phase 2: TTS narration

When ready to add narration audio:

**Option A — Coqui XTTS (local, free, Hindi-English):**
- Runs on RTX 4090
- Supports Hinglish text reasonably well
- Quality: 7/10, occasional mispronunciations on mixed script
- Adds ~30–45 seconds to generation time per story (18 HL lines)

**Option B — ElevenLabs (API, paid):**
- ~$0.30 per 1000 characters
- Per-story cost: ~$0.05–0.10 (18 HL lines × ~30 chars avg)
- Quality: 9/10, best Hinglish prosody available
- Adds API latency (~5–10 seconds total)

**Recommendation when ready:** Start with ElevenLabs for seed stories to establish the quality bar. Switch to XTTS local for user-generated stories to keep costs near zero.

**One voice for all stories across all genres.** The narrator's tone shifts slightly by genre — not by using a different voice, but by instructing the TTS on speaking rate and emphasis:
- Mythology: slower, deliberate, weight on every word
- Thriller: faster, clipped, barely controlled
- Romance: warm, slight pause before emotional words

---

## Stage 8: Quality Gate

Runs after all scenes and images are generated, before publishing.

### 8a: Cliffhanger Enforcer

Validates the final sentence of each episode body against the planned cliffhanger. Runs on episodes 1–5 (ep 6 has resolution, not cliffhanger).

```
SYSTEM:
You are a story editor reviewing an episode ending.

Planned cliffhanger: "{planned_cliffhanger}"
Actual episode ending (last sentence of scene 3 body): "{actual_ending}"

Score alignment 1–5:
5 = The actual ending delivers the planned cliffhanger exactly
4 = Close — the feeling is right, wording could be sharper  
3 = Related but weaker — the question is implied, not explicit
2 = Tangential — related content but misses the emotional hook
1 = Unrelated — fails to set up the next episode

If score < 4:
Rewrite ONLY the last 1–2 sentences of the scene 3 body to deliver the cliffhanger.
Do not touch the HL. Do not change scene 1 or 2.

Output JSON: {
  "score": 1–5,
  "rewrite_needed": true | false,
  "revised_ending": "..." | null
}
```

**Episode 1 cliffhanger gets double validation** — it runs the enforcer, then a second pass asking: "Would a user who read this episode start episode 2? Answer yes or no and explain in one sentence." If no, the arc planner regenerates episode 1 only.

### 8b: Global Coherence Check

```
SYSTEM:
Review this complete 6-episode story for consistency.
Story rules: {rules}
Character bible: {bible}
All scene bodies: {all_bodies}

Check for:
1. Any character violating their established traits or speech patterns
2. Any fact contradicting the story rules
3. Any location or time inconsistency
4. Whether the episode 6 resolution feels earned by what happened in episodes 1–5

Output JSON: {
  "issues": [{"episode": N, "scene": N, "description": "...", "severity": "minor|major"}],
  "verdict": "clean" | "minor_issues" | "major_issues"
}
```

- `clean` — publish immediately
- `minor_issues` — log and publish (not worth blocking)
- `major_issues` — regenerate affected episodes only, run coherence check again

---

## The Quality Stack (why it holds together)

```
Story rule violations      → prevented by: Stage 1 rules + Stage 4 context injection
Character drift            → prevented by: Stage 2 bible + Stage 4 speech profile
Cold cuts between scenes   → prevented by: prev_last_sentence in every Stage 4 prompt
Weak episode endings       → prevented by: Stage 3 cliffhanger-first + Stage 8a enforcer
World visual inconsistency → prevented by: Stage 5 style prefix per genre
Incoherent full story      → caught by: Stage 8b global coherence check
```

No single mechanism is foolproof. Together they create overlapping protection. Most stories that fail will fail at Stage 8 and trigger a partial regeneration, not a full retry.

---

## MVP Scope

### In scope (v1)

| Feature | Notes |
|---|---|
| Text generation (all 8 stages) | Core pipeline |
| Image generation (FLUX.1 local) | World-consistent per genre, no face consistency |
| BGM audio (3 pre-composed tracks) | Already built |
| Async generation queue | Checklist UI already built |
| 40–50 pre-generated seed stories | Must ship day 1 for feed to work |
| Genre auto-detection (no user selection) | The reveal is part of the magic |

### Out of scope (v1)

| Feature | Reason |
|---|---|
| TTS narration audio | Adds complexity + time; subtitle stripe covers the experience |
| Character face consistency (LoRA) | Hard, slow, not necessary for initial quality bar |
| Multiple narrator voices | One voice, one register — simpler and more consistent |
| Video scenes (motion) | Phase 2 — after static images prove the hook |
| User-facing genre selection | Auto-detect is the product moment; selection kills the magic |
| Per-story music composition | 3 tracks cover the emotional range for MVP |

---

## The One Metric

> 70% of users who start Episode 1 must finish Episode 2.

Every decision in this pipeline exists to serve that number. The arc planner, the cliffhanger enforcer, the episode 1 double validation — all of it is in service of one question: does the user tap "Play Episode 2"?

If that number isn't there after the first 100–200 users, nothing else matters. Improve the arc planner (Stage 3) and the cliffhanger enforcer (Stage 8a) first — not the image quality, not the audio, not the UI.

---

*Katha Content Engine — v1.0*
*2026 — for internal use*
