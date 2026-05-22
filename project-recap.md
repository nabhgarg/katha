# Katha — Project Recap

*A write-up of everything in the `interactive stories` folder, what each piece does, and how the design has evolved.*
*Compiled 2026-05-20.*

---

## 1. What Katha is

Katha is a mobile-first interactive story platform built for Hinglish-speaking Tier 2/3 India. The pitch: PocketFM hooked 200M Indians on linear audio stories; Reels gave them short-form hooks; nothing combines those two with **agency**. Katha is that — vertical, full-screen, episodic stories where the user picks what happens next, with AI-generated images, Hinglish narration, and music.

Two roles:

- **Player** — scrolls a TikTok-style feed; each story is 6 episodes with 3 scenes per episode and a branching choice at the end of every episode (except the last). Episode 1 is shared, Eps 2–6 each have an A-path and a B-path scene set.
- **Creator** — types a two-sentence idea, taps Create, waits ~3–8 minutes, and a complete 6-episode branching story is live in the feed.

North-star metric: **70% of users who start Episode 1 must finish Episode 2.** If that's true the hook works and the rest can be built; if not, fix story quality before anything else.

The starting genres are **Romance, Thriller/Horror, Mythology** (later expanded in the content engine v2 to also include **Drama** and **Mystery**).

---

## 2. The folder, file by file

| File / folder | Role |
|---|---|
| `README.md` | One-page repo orientation. Lists the running prototype, the wireframe deck, the spec docs, where the demo lives. |
| `katha-idea-writeup.md` | The pitch / investor narrative — problem, insight, MVP scope, end state, moat, the one metric that matters. |
| `product-design-doc.md` (v1.2, 2026-05-14) | The full product design spec — principles, design tokens, 10 screen specs, API surface, audio rules, analytics events, handoff checklists. |
| `content-engine-spec.md` (v1.0, 2026-05-16) | The original AI content pipeline spec — 8 stages from genre engine through quality gate. Written for an RTX 4090 / open-source-models world. |
| `Content Engine — Architecture & Prompts v2.md` (2026-05-18) | The revised content engine — collapsed to 4 stages, OpenAI via Supabase proxy, 5 genres, with a full change log against v1. |
| `figma-design-prompts.md` | Per-screen Figma prompts (Home, Player, Choice, Create, Generating, Profile, Onboarding, Story End, Phone Registration, Error states). |
| `prototype.html` | First working clickable prototype. Kept as reference. |
| `Katha Wireframes.html` | Lo-fi wireframe pitch deck — 10 screens shown side-by-side with "safe + bold" variants, plus a tweaks panel for live design adjustments. |
| `tweaks-panel.jsx` | The reusable React tweaks shell used by the wireframe deck (sliders, radios, color pickers — talks to the host via postMessage). |
| `index.html` | **The current live prototype.** 3,328 lines, single file, runs in a browser. Routes through a Supabase Edge Function to OpenAI. Falls back to Pollinations.ai for images. Saves stories to localStorage + Supabase. |
| `schema.sql` | Supabase DB schema: `public.stories` table with RLS so users only see their own rows. |
| `images/` | 18 AI-generated scene images for the seed mythology story "Kashi Ka Khazana" (Ep1–Ep6, including A/B branch variants for Ep6) + a `webp/` directory of optimised versions + `feedcard.png` for the feed cover. |
| `audio/bg-mythology.mp3` | Background score for the mythology story. |
| `design-audit-screenshots/` | Screenshots from the first design audit: feed (mobile/tablet/desktop/annotated), player, profile, create, explore, first-impression. |
| `design-audit-20260517/screenshots/` | Second design audit (May 17), focused on the player and choice screens: cover-as-background fix, multi-line narrator format, choice screens with and without cover, first impression revisited. |
| `.gitignore`, `.git/`, `.gstack/`, `.obsidian/`, `.claude/`, `.DS_Store` | Tooling/version control. |

Live demo: `https://nabhgarg.github.io/katha/` (GitHub Pages auto-deploys from this repo).

---

## 3. The product design (from `product-design-doc.md` v1.2)

### Principles
1. **Cinema first** — every screen is immersive, dark, full-bleed; genre color used as light, not paint.
2. **Frictionless to first hook** — new user is inside a story within 3 taps; no signup wall, no onboarding carousel.
3. **Language as a design element** — structural UI in English (`Home · Create · Profile`); emotional/conversational copy in Hinglish (placeholders, toasts, errors).
4. **Every episode ends at the worst moment** — cliffhanger rule enforced by content, both choices feel consequential.
5. **Creation is a gift, not a job** — one text field, one button, no genre selection, ~5 minutes.
6. **Subtraction default** — if a UI element doesn't earn its pixels, cut it.

### Visual language
- Background `#08080F` (always dark), surface `#12121C`, raised `#1A1A2E`.
- Genre accents: Romance `#FF2D78`, Thriller `#00C9C8`, Mythology `#FFB020`.
- Typography: Poppins 400 / 600 / 700.
- Radii: 12px cards / 24px sheets / 100px pills.
- Base screen 375 × 812, safe zones 44 top / 34 bottom.
- Loading shimmer: `#1A1A2E → #252540 → #1A1A2E`, 1.2s cycle.
- Genre color only appears *inside* a story (player, choice, generating). Never on feed card backgrounds.

### Information architecture
Three tabs only: **Home (feed), Create, Profile**. No explore tab, no notifications tab. Settings live in a bottom sheet from Profile.

### Screens specified
1. **Home / Feed** — one story per screen, vertical scroll, Ken Burns on cover (1.0 → 1.05 over 6s), feed autoplay (audio at 20% at 70% viewport, ramping to 60% at full viewport).
2. **Story Player** — top bar with `×`, episode dots (6), scene progress bar (3 segments), full-bleed image with slower Ken Burns (1.0 → 1.02 over 8s), narration block that glows in genre color while audio plays, "Next →" appears after narration, swipe-up always live.
3. **Choice screen** — last scene blurred 60% as background, "What happens next?", Option A with 4px genre-color left border, Option B with 2px white border, "1,247 played" line (uses `Story.total_plays`, not `episode.total_play_count`). Tap → scale bump → bg fill → 0.8s pause → next episode.
4. **Create** — single autofocused text field, 0/200 counter, 6 idea chips (tapping fills the field, doesn't submit), gradient button enabled at ≥10 chars, offline toast.
5. **Generating screen** — cinematic loader (gradient dots pre-classification, then genre-specific animation: romance embers / thriller scan lines / mythology mandala), "Romance detected!" spring pop-in, Change-genre bottom sheet (which kills the old job and starts a new `job_id`), 5-second long-poll, "Browse stories meanwhile" returns to feed with completion push.
6. **Profile** — avatar with genre-colored bg, three stats (Created / Played / Views), My Stories grid, Played grid, settings bottom sheet.
7. **Onboarding** — 1s splash, then drops directly into a hero story (time-of-day heuristic: evening = Thriller, afternoon = Romance, morning = Mythology). Name sheet appears non-blocking after Ep1.
8. **Story End** — last scene dimmed 70%, "Your path" trail of branch choices, "Try different choices" replay button, "Share" generates a 1080×1920 canvas image with branch path overlaid and opens native share sheet (WhatsApp first).
9. **Phone / OTP registration** — non-blocking bottom sheet 3s into the Generating screen; 6-digit input, 30s resend timer, rate-limit after 3 wrong attempts; skippable, linkable later.
10. **Error states** — explicit copy for 8 scenarios (no internet on feed, lost mid-episode, image fail, audio fail, gen >15min, missing branch, crash, no seed stories).

### Data model
`Story` (id, title, genre, hook, author, episode_count=6 fixed, total_plays, cover_image_url, status, is_seed) → `Episode` (number, title, scenes, choices, cliffhanger_text, total_play_count) → `Scene` (image_url, body_text, narration{text+audio_url}, background_score_track).

### API surface
11 endpoints — `/feed`, `/stories/{id}`, episode + branching by `?choice_id`, choice POST, `/generate`, `/generate/{id}/status`, `/generate/{id}/change-genre`, `/events`, `/users/profile`, `/users/register`, `/users/link-phone`, `/users/verify-otp`, `/users/push-token`. Auth = device token issued on first launch. Long-poll only in v1 (5s interval), no WebSocket. FCM for push.

### Pre-fetch strategy
On episode N: pre-fetch *metadata only* for both branches of N+1, never assets. When a feed card hits 50% visibility, pre-load its cover image *and* its Ep1 Scene 1 image — that's what makes the "<2s tap to Episode 1" target achievable on 4G.

### Hero story offline caching
On first launch, silently download the three hero stories (one per genre) — ~30–50MB total — to local storage. Resume on interrupt. Skip silently if <50MB free. Background job starting 3s after onboarding.

### Audio
Narration TTS (genre-matched voice: warm female for romance, measured male for thriller, resonant theatrical for mythology) + background score (6–10 royalty-free tracks at launch, expanding to 30–50). Cross-fade 0.5s between scenes. Cross-stream volume ducking has known Android quirks — graceful degradation: background fades to 0% while narration plays, back to 30% when narration ends.

### Performance targets
Feed first story visible <1.5s on 4G. Tap-to-Ep1-Scene-1 <2s. Scene transition <300ms. Audio start after image load <500ms. Genre classification visible <30s.

### Analytics events
12 events instrumented: `story_opened`, `scene_viewed`, `narration_completed`, `choice_made`, `episode_completed`, `story_completed`, `story_abandoned`, `story_shared`, `prompt_submitted`, `generation_completed`, `generation_failed`, `phone_linked`. Server-side JSON logs only, no third-party analytics in v1. Launch query computes Ep1→Ep2 % per story; stories under 50% get investigated immediately.

### Explicitly out of v1
Creator monetization, comments/likes, scene sharing as image card, algorithmic feed, genre filter, iOS, per-scene video, creator analytics, WebSocket, mobile web player, per-choice social proof, referrals, bookmarks, "Episode 7 coming soon" tease.

---

## 4. The content engine — what changed v1 → v2

The original spec (`content-engine-spec.md`, May 16) was built around an 8-stage pipeline on a local RTX 4090 (Llama + FLUX, 3–8 minute generation, 40–50 user queue cap). Two days later, v2 (`Content Engine — Architecture & Prompts v2.md`, May 18) replaced that with a leaner cloud architecture and a tighter prompt set after a v1 prototype review.

### Architecture shift
- 8 stages → **4 stages**: Bible → Arc Planner → Scene Writer → Cover Image. Quality gate and separate audio stage dropped from MVP.
- Local Llama/FLUX → **OpenAI via Supabase Edge Function proxy** (`https://proxy.nabh.co/api/openai`). JWT-authenticated; the OpenAI key never reaches the browser.
- Models: `gpt-4o` for Bible + Arc, `gpt-4o-mini` for Scene Writer (high volume, cost-sensitive), `gpt-image-1` for the cover. Total: **13–14 OpenAI calls per story** (2 gpt-4o + 11 gpt-4o-mini + 1 image).
- Image fallback: if `gpt-image-1` rate-limits or fails, the cover falls back to **Pollinations.ai** using a deterministic seed derived from the prompt hash (same prompt = same image across sessions).
- Branching: Ep1 has one shared scene set; Eps 2–6 each have two scene sets (A-path and B-path), generated in **parallel** = 10 scene calls. Net: 32 possible paths from 2^5, only 10 generated scene-sets.

### Per-stage changes
**Stage 1 (Bible):**
- 3 genres → **5 genres**: added DRAMA (family/system pressure, no villain) and MYSTERY (someone is hiding something; final truth uncomfortable).
- Each genre got a longer description with emotional register *and* visual signature so the arc/scene/cover stages share a tonal anchor.
- Hard-coded `"age": 24` removed; explicit 22–38 range with anti-default instruction.
- Characters capped at exactly 2–3.
- New `mood` field added (e.g. *"quiet dread that builds to rupture"*) — flows into scene prompts.
- `cover_prompt` pulled *out* of the Bible JSON into its own focused call (it was competing for quality with character/story fields).

**Stage 2 (Arc Planner):**
- Added a per-episode `emotional_anchor` field.
- Three typed cliffhangers (REVELATION / ARRIVAL / IMPOSSIBLE_MOMENT) with a rotation rule so all six episodes don't end the same way.
- Stronger branch-differentiation rule: A-path and B-path consequences must visibly diverge.
- Ep6 schema fixed — no choice fields, just `resolution_note`.
- Banned the weak "and then she heard a sound" cliffhanger formula.

**Stage 3 (Scene Writer):**
- Speech tic elevated to a CRITICAL rule (was advisory in v1).
- Attribution tags banned — explicit WRONG/RIGHT example: don't write *"Rahul ne kaha"*, just the dialogue.
- Scene 3 cliffhanger landing instruction made explicit.
- Proactive repetition prevention — emotional-temperature variation + opening-word rule across the three scenes.
- Previous-context window expanded from 1 line to 3 lines (better continuity).
- Universal banned-phrases list added to the system prompt.
- `emotional_beat` from Arc Planner now passed into each scene call.

**Stage 4 (Cover):**
- Cover prompt now a focused second call (see Stage 1).
- Composition guidance added: foreground symbolic object + city silhouette behind.
- "No faces" → **"no faces, no people"** (stronger constraint).
- Style prefixes added for DRAMA and MYSTERY.
- 9:16 aspect ratio made explicit.

### Storage
After all stages succeed, `assembleStory()` builds the final JSON: title, genre, city, logline, mood, cover_img, creator, plus 6 episodes each containing scenes (narrator + dialogues), branch_scenes {A,B}, cliffhanger, cliffhanger_type, choice_q, choice_a/b. Saved to **localStorage** (`katha_stories_v1`, base64 stripped) and **Supabase DB** (`public.stories`, RLS on `auth.uid()`).

### Known gaps (open as of v2)
- No per-scene images — only a cover. Each scene shows a static color fallback.
- gpt-4o-mini loses character voice across 11 calls (no persistent memory). Mitigation: upgrade Stage 3 to gpt-4o (~+$0.10/story).
- No quality gate, no JSON validation/retry, no partial save (if pipeline crashes at Ep4, nothing's persisted).
- User stares at a 3–8 minute loading screen with no partial content.
- Proxy server is a single point of failure.
- localStorage 5MB cap forces base64 image stripping.

---

## 5. What's actually live in the prototype (`index.html`)

The single-file prototype now runs the full v2 pipeline end-to-end. Inventory by section:

**Screens implemented** — Splash, Feed, Player, Choice, End, Create, Generating, Profile, Profile Settings sheet, Explore, Onboarding (sign-in), Name screen, Save-phone overlay.

**Story flow** — `startStory` → `renderScene` (with episode dots, scene progress bar, audio bars, narrator + dialogue layout) → `advanceScene` → `renderChoice` → `makeChoice` (A/B routes to `scenesA` / `scenesB`) → `renderEnd` with credit roll showing your branch path.

**Generation pipeline** (`stageBible`, `stageArc`, `stageScenes`, cover) — all routed through `oaiChat` / `oaiImage` against the Supabase Edge Function. Five-step checklist UI ("Building your story world", "Planning 6 episode arcs", "Writing all scenes", "Generating cover art", "Putting it all together") with per-item state (`active` / `done`).

**Auth + persistence** — `initSupabase`, OTP magic-link login (email → OTP → name), device-linked session, sign-out, `_uploadCoverToStorage` (base64 → Supabase Storage `covers/` bucket), `_saveStoryToDb`, `_loadStoriesFromDb`, `_syncFromDb`. Public feed fetched from Supabase via `_fetchStories`, cached locally.

**Feed + explore** — `loadPublicFeed`, `loadExploreGrid`, `playPublicStory`, played-stories tracking in localStorage.

**Sharing** — `shareEnding` builds a text card listing the user's branch choices.

**Image rendering** — every scene resolves via `_pollinationsUrl` (deterministic seed) if no model image present. Genre style prefixes/suffixes baked into the Pollinations prompt for visual consistency.

**Seed story** — "Kashi Ka Khazana" hard-coded in JS (`/* ===== EP 1 — Ek Sapna ===== */` through `/* ===== EP 6 — Varasat (branching) ===== */`), with images in `images/` (18 stills + cover) and `audio/bg-mythology.mp3`.

**Desktop frame** — at ≥500px viewport, the app shrinks into a 390×844 phone frame with a radial backdrop and a glow (`box-shadow: 0 0 80px rgba(255, 176, 32, 0.18)`) so the prototype looks like a device on desktop too.

---

## 6. Design audits

**First audit** (`design-audit-screenshots/`) — screenshots at three viewports (mobile / tablet / desktop), the feed annotated, plus the create/explore/player/profile screens and a "first-impression" hero.

**Second audit, 2026-05-17** (`design-audit-20260517/screenshots/`) — narrower scope focused on fixing two issues uncovered in the first audit:
- **Player scene image missing:** before/after of using the cover image as a background fallback when scene images don't exist. Verified fallback works.
- **Narrator format:** new multi-line layout (`player-new-format-s1.png`, `player-new-format-multiline.png`) — replaces the dense single-block format with a clearer narrator paragraph + dialogues stack.
- **Choice screen:** with vs without cover behind, picking the version that reads better.

---

## 7. Variants explored (the "every feature varied" list)

Across the docs, prototypes, and audits these are the design dimensions that have been *tried different ways* and ultimately settled on:

- **Genre count:** 3 (Romance/Thriller/Mythology) → 5 (added Drama, Mystery in engine v2).
- **Pipeline stages:** 8 (local stack) → 4 (cloud).
- **Models:** Local Llama + FLUX on RTX 4090 → OpenAI gpt-4o + gpt-4o-mini + gpt-image-1 with Pollinations fallback.
- **Cover prompt placement:** part of Bible JSON → separate focused call.
- **Character cap:** unlimited → exactly 2–3.
- **Protagonist age:** hardcoded 24 → 22–38 range, anti-default instruction.
- **Cliffhanger style:** single template → three typed variants with rotation.
- **Scene-writer model:** open question — `gpt-4o-mini` today, `gpt-4o` flagged as the highest-leverage upgrade.
- **Speech tic:** advisory → CRITICAL rule.
- **Dialogue attribution:** allowed → banned (no "X ne kaha").
- **Previous-context window:** 1 line → 3 lines.
- **Cover constraint:** "no faces" → "no faces, no people".
- **Player exit:** swipe-down + back gesture + × → × only.
- **Swipe-up gating:** blocked until narration ended → always live (advance interrupts audio).
- **Narration highlight:** word-level sync (v1 wish) → full-line glow with 0.5s fade (v1 reality).
- **Audio layering:** simultaneous ducking → graceful degradation on Android (background fades to 0% during narration).
- **Audio in feed:** off → autoplay at 70% viewport (20%) ramping to 60% at full.
- **Feed ordering:** algorithmic → simple (3 hero → unseen recency → most-played genre with Romance default).
- **Onboarding:** carousel → drop directly into a hero story; name sheet only after Ep1.
- **Hero story choice:** fixed → time-of-day heuristic.
- **Episode count:** variable → fixed at 6 in v1 (seed and user-generated).
- **Branch fan-out:** unique scenes per path (2^5 = 32) → two scene sets per episode (A and B), 10 generated scene-sets total.
- **Share card:** image-card render in v1 spec → text card in current prototype (image card deferred).
- **Genre change mid-generation:** partial restart → full restart with new `job_id` (images are genre-specific).
- **Status update:** WebSocket → 5s long-poll.
- **Auth model:** signup wall → device token, phone OTP optional and non-blocking. Current prototype uses Supabase email-OTP magic link.
- **Persistence:** localStorage only → localStorage + Supabase DB with RLS.
- **Image fallback:** none → Pollinations.ai with deterministic seed.
- **Player narrator layout:** dense single block → multi-line narrator paragraph + dialogues (fixed in 2026-05-17 audit).
- **Scene image fallback:** broken when missing → cover-as-background fallback (fixed in 2026-05-17 audit).
- **Desktop presentation:** raw mobile layout → 390×844 phone-frame with mythology-amber glow when viewport ≥500px.

---

## 8. Where the project stands today

Working in the prototype:
- End-to-end story creation via OpenAI, ~3–8 minutes per story.
- 5-genre Bible with structured branching across 6 episodes.
- Feed and Explore reading from Supabase, public stories shareable across users.
- Email-OTP auth, profile, my-stories, played-stories.
- A complete seed story ("Kashi Ka Khazana", mythology) with hand-curated images and music.
- Pollinations fallback so the app never shows a blank cover.

Still open (from the v2 gaps and the v1 doc's "out of v1" list):
- Per-scene images (would add ~18 image calls and ~$0.50/story).
- Real per-scene background audio (only the mythology seed story has its score wired up).
- Quality gate, JSON-validation retry, partial save.
- Image-card share render (canvas composition) — text-only today.
- iOS, video per scene, creator monetization, comments — all v2.

The one number that decides whether any of that matters is still **Ep1 → Ep2 continuation ≥ 70%**.
