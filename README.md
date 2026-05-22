# Katha — Interactive Story Platform

A mobile-first interactive story app for Hinglish-speaking Tier 2/3 India. Players scroll a TikTok-style feed, tap into AI-generated 6-episode branching stories, and choose what happens at each episode end. Creators type a two-sentence idea and get a complete story in ~5–7 minutes.

**Live demo:** [https://nabhgarg.github.io/katha/](https://nabhgarg.github.io/katha/)

---

## Running locally

No build step. Open `index.html` in Chrome or Safari:

```bash
open index.html
# or serve it to avoid audio restrictions:
npx serve .
```

GitHub Pages auto-deploys within ~1 minute of each push to `main`.

---

## What's in this repo

| File / Folder | What it is |
|---|---|
| `index.html` | **The entire app.** Single-file SPA — feed, player, choice screen, create, generating, profile, onboarding. All AI pipeline logic lives here. |
| `content-engine-v4.md` | **Content engine spec (current).** Full documentation of the AI pipeline: stage prompts, schemas, branch logic, image pipeline, quality improvements vs v3. Start here if you're touching the generation code. |
| `product-design-doc.md` | Product design spec v1.2 — design principles, visual tokens, 10 screen specs, API surface, analytics events. |
| `project-recap.md` | Narrative overview of the full project — what Katha is, how the design evolved, every file explained. Good first read for someone new to the repo. |
| `figma-design-prompts.md` | Per-screen Figma prompts for all 10 screens. |
| `katha-idea-writeup.md` | Investor/pitch writeup — problem, insight, MVP scope, north-star metric. |
| `content-engine-v3.md` | Previous engine spec (archived). v4 supersedes it but v3 docs are preserved for diff context. |
| `bollywood-voice-references-v1.md` | Curated Hinglish dialogue examples used to calibrate the screenwriter prompt. |
| `golden-scenes-v1.md` | 16 hand-written golden scenes (Romance × 6, Thriller × 6, Mythology × 4) injected as few-shot examples into every screenwriter call. |
| `test-full-v4.mjs` | Node.js test script — calls the full v4 pipeline end-to-end and writes output to `test-output-*/`. Requires `OPENAI_API_KEY` env var. |
| `images/` | AI-generated scene images for the seed mythology story "Kashi Ka Khazana". |
| `audio/` | Background score for the mythology story. |

---

## Architecture overview

```
[User prompt]
      │
      ▼
Stage 1 — Architect (gpt-4o)
  Full 6-episode blueprint: genre, title, characters, scene objectives,
  cliffhangers, branching choices, story rules, protagonist voice.
      │
      ├── Episode 1 + cover image (parallel)
      │     Stage 2a — Screenwriter (gpt-4.1-mini) → 3 scenes
      │     Stage 2b — Cover image (gpt-image-1, DALL-E)
      │
      ├── Validate ep1 + ep1 image (parallel)
      │     Stage 3  — Validator (gpt-4.1-mini) → patches 1 bad scene if needed
      │     Stage 3b — Episode 1 image (gpt-image-1, DALL-E)
      │
      └── Episodes 2–6 loop (sequential, branches in parallel)
            For each episode:
              Branch A ─┐
                         ├── Promise.all → both results, retry up to 3×
              Branch B ─┘
            After each episode:
              Story state extracted (gpt-5.4-mini) → passed forward for continuity
              Episode image URL (Pollinations CDN, instant)
      │
      ▼
All 6 episodes + 7 images uploaded to Supabase Storage → single atomic DB save
```

**Models used:**
| Stage | Model | Why |
|---|---|---|
| Architect | `gpt-4o` | Needs full blueprint coherence across 6 episodes |
| Screenwriter | `gpt-4.1-mini` | Fast, cheap, good at following format constraints |
| Validator | `gpt-4.1-mini` | Surgical scene rewriter |
| Story state | `gpt-5.4-mini` | Compact JSON extraction, 200 tokens max |
| Cover + ep1 images | `gpt-image-1` | Best quality for the two visible-upfront images |
| Episodes 2–6 images | Pollinations CDN | Free, instant URL, good enough for mid-story |

---

## Key design decisions

**Single atomic save.** All 6 episodes generate before anything is written to the DB. No partial stories in the feed. Tradeoff: if generation fails at episode 5, the user sees an error and nothing is saved. Retry logic (3× per episode) mitigates this.

**Dual-branch generation.** From episode 2 onward, Branch A and Branch B generate in parallel. Each branch uses its own scene objectives, its own continuity sentence, and the player's specific choice label as a "BRANCH PATH" constraint. This ensures branch divergence is visible from Scene 1, not just at the choice point.

**Story state tracking.** After each episode, a compact JSON story state (relationships, mysteries, emotional state, character goals) is extracted and passed to the next episode's screenwriter. This prevents episode 4 from ignoring what happened in episode 2.

**Upfront image upload.** Before DB save, all episode images (both gpt-image-1 base64 and Pollinations CDN URLs) are uploaded to Supabase Storage. The stored story always has persistent image URLs — no broken images if Pollinations CDN changes.

**Genre-specific quality rules.** The Architect prompt enforces: cliffhangers must be physical/external (not internal reflection), story rules must be falsifiable, choice subtext must name a value conflict (not describe an action), secrets must be specific past events with named characters.

---

## North-star metric

**70% of users who start Episode 1 must finish Episode 2.** If below 70%, fix story quality before everything else. The content engine exists for this number.

---

## Content engine changelog

See `content-engine-v4.md` for the full spec. Major versions:

| Version | Date | What changed |
|---|---|---|
| v1 | 2026-05-16 | Original 8-stage pipeline spec (RTX 4090 / open-source models) |
| v2 | 2026-05-18 | Collapsed to 4 stages, OpenAI via Supabase proxy, 5 genres |
| v3 | 2026-05-20 | Hinglish narrator, SCENE_CONTEXT rendering, parallel cover+ep1, ep6 validator, golden scenes dataset |
| v4 | 2026-05-21 | Dual-branch generation, upfront full generation, branch divergence fix, story state tracking, image persistence, tightened architect prompts |
| v4.1 | 2026-05-22 | Screenwriter prompt interleaving fix, validator checks 8+9 (story rules + banned lines), ETA string updated, player UI hard split |

---

*Katha — 2026*
