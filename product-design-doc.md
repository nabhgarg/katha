# Katha — Product Design Document
**Version:** 1.2 | **Date:** 2026-05-14 | **Owner:** PM
**Status:** DRAFT — for review by Manavi (product) and Dev (engineering)

---

## Scope of this Document

This document covers **what to serve and how to serve it** — product design, UX flows, content structure, API surface, and experience principles. It does **not** cover AI engine internals (model selection, fine-tuning, training data). That is Dev's domain. This document gives Dev and Manavi clear contracts and constraints to build against.

---

## 1. Product North Star

**One sentence:** Katha is the first interactive story platform built for the way Tier 2/3 India actually speaks — Hinglish, episodic, full-screen, with choices that matter.

**What success feels like for the user:**
- Friday night, they open Katha, scroll into a story, and forget to stop. They make a choice. They need to know what happens next.
- They share a story on WhatsApp and their friend asks "where is this app?"
- They write two sentences, wait 5 minutes, and something they made is now in the feed for others to play.

**The one metric that matters:** 70%+ of users who start Episode 1 finish Episode 2. If below 70%, story quality is the problem. Fix the engine before anything else.

---

## 2. Design Principles

### P1 — Cinema First
Every screen feels like an immersive cinematic experience. Full bleed, dark backgrounds, genre color used as light, not paint.

### P2 — Frictionless to First Hook
A new user is inside a story within 3 taps from launch. No onboarding carousel. No signup wall before content.

### P3 — Language is a Design Element
**Structural UI** (tab names, section headers, core button labels): **English**. Clear and universal.
**Emotional/conversational copy** (placeholders, toasts, prompts, error messages): **Hinglish** — the way Tier 2/3 India actually speaks.

Examples:
- Tabs: "Home · Create · Profile" (English)
- Prompt placeholder: "Koi bhi ek idea likho..." (Hinglish)
- Error: "Network nahi hai" (Hinglish)
- CTA: "Create Story" (English) or "Kahani Banao" (Hinglish for emotional moments — both acceptable)

### P4 — Every Episode Ends at the Worst Moment
The cliffhanger rule is enforced by content quality, not by UI. Both choice options are visible, both feel consequential, neither feels like a coin flip.

### P5 — Creation is a Gift, Not a Job
One text field, one button, 5 minutes. No genre selection. No configuration.

### P6 — Subtraction Default
If a UI element doesn't earn its pixels, cut it. No feature explanations, no empty dashboards, no onboarding carousels.

---

## 3. Visual Design Language

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#08080F` | All screens, always dark |
| Surface | `#12121C` | Cards, sheets, modals |
| Surface raised | `#1A1A2E` | Elevated components |
| Romance | `#FF2D78` | Genre accent |
| Thriller | `#00C9C8` | Genre accent |
| Mythology | `#FFB020` | Genre accent |
| Text primary | `#FFFFFF` | Headlines, body |
| Text secondary | `#A0A0B8` | Captions, metadata |
| Font | Poppins | All text |
| Font weights | 400 body / 600 labels / 700 headlines |
| Border radius | 12px cards / 24px sheets / 100px pills |
| Base screen | 375 × 812px (iPhone SE minimum) |
| Safe zones | 44px top / 34px bottom |

**Genre color rule:** Genre color only appears inside a story (player, choice, generating screen). Never on the feed card background. Default accent when no story is active: `#FF2D78` (Romance).

**Loading skeleton:** Shimmer `#1A1A2E` → `#252540` → `#1A1A2E`, 1.2s cycle. Feed: full-screen placeholder with title and badge shapes. Player: image placeholder + 2-line text placeholder at bottom third.

---

## 4. Information Architecture

```
Katha
├── Home (Feed)
│   └── Story Card → Story Player → Choice Screen → Next Episode → Story End
│
├── Create
│   └── Prompt → Generating Screen → Feed (notify when ready)
│
└── Profile
    ├── My Stories
    └── Played
```

Three tabs only. No explore, no notifications tab. Settings live in a bottom sheet from Profile.

---

## 5. Navigation System

### Tab Bar

Bottom fixed. Three items:
- **Home** — home icon; active: white + `#FF2D78` dot below
- **Create** — plus icon, slightly elevated pill shape; always white
- **Profile** — person icon; active: white

Background: `#08080F` with 1px `#1A1A2E` top border. Height: 56px + safe area inset.

### Behavior

| Action | Where | Result |
|--------|-------|--------|
| Tap card | Feed | Opens player |
| Swipe up | Player scene | Next scene |
| Tap `×` | Player (any point) | "Leave story?" overlay → Leave/Stay |
| Tap image | Player | Toggle audio |
| Swipe down | Choice screen | Blocked — must choose |
| Tap choice | Choice screen | Next episode |

**Player escape:** Semi-transparent `×` button, top-left corner, 20×20px, 60% opacity, always visible at every scene and episode. Tap → confirm overlay:

```
  Bahar jaana?              ← Hinglish, Poppins 700 20px, centered
  Your progress is saved.   ← English, secondary text
  [Leave]      [Stay]       ← Leave: ghost; Stay: genre-color fill
```

"Leave" → returns to Feed, episode/scene position saved locally.
"Stay" → dismisses overlay, resumes from same scene.
This is the ONLY exit from the player — no swipe-down escape, no back gesture.

---

## 6. Screen Specifications

### 6.1 Home / Feed

**Purpose:** Discovery. One story per full screen. Scroll = next story.

**Story Card:**

```
┌─────────────────────────────┐
│  ×  [Story Title]           │  ← X top-left; title top-left, Poppins 700
│     [Genre badge pill]      │  ← genre color, below title
│                             │
│  [Scene image — full bleed] │  ← Ken Burns: 1.0 → 1.05, 6s, ease-in-out, then holds at 1.05 until card scrolls away
│                             │
│  [Story hook — 2 lines]     │  ← bottom-left, Poppins 400, text shadow
│  [Author · N Episodes]      │  ← bottom-left, secondary text
│                             │
│  ♡  Share               │  ← right side, vertical, 44px tap targets
└─────────────────────────────┘
```

**Feed autoplay:** At 70%+ viewport, audio starts at 20% volume. At full viewport, ramps to 60% max. On device silent: no audio.

**Feed ordering (v1, simple):**
1. 3 hero stories for new users (hand-curated)
2. Unseen stories, recency descending
3. User's most-played genre (derived from server-side aggregation of `story_opened` events by genre per device token). **Fallback for new users with no play history:** Romance (`#FF2D78`) as default genre preference — it's the broadest appeal genre for the target audience.

**Loading skeleton:** Full-screen shimmer card.

**Empty state (fallback only):** "Kahaniyaan server se aa rahi hain..." with shimmer loader.

---

### 6.2 Story Player

**Purpose:** Immersive scene-by-scene experience.

```
┌─────────────────────────────┐
│  ×   Episode 2/6  ● ● ○ ○ ○ │  ← X top-left; episode dots top-center
│  ████████░░░                │  ← scene progress bar (3 segments), genre color
│                             │
│  [Full-screen scene image]  │  ← Ken Burns: 1.0 → 1.02, 8s, ease-in-out
│                             │
│  ┌────────────────────────┐ │
│  │ [Narration line]       │ │  ← full-line glow: genre color text + underline
│  └────────────────────────┘ │    + 0.15 opacity bg tint while audio plays
│  [Body text 2-3 lines]      │  ← Poppins 400, secondary color
│                             │
│  ♪ ♪ ♪                     │  ← 3 audio bars, genre color, animate when active
│                             │
│                  [Next →]   │  ← appears after narration ends, 0.3s fade-in
└─────────────────────────────┘
```

**Narration highlight:** The entire narration block glows in genre color while audio plays. Glow fades 0.5s after audio ends. No word-level sync in v1.

**"Next →" button:** Appears only after narration ends. If audio fails, appears after 4 seconds with silent mode auto-activated.

**Swipe up before narration ends:** Swipe gesture is always live — if user swipes before narration finishes, the scene advances and narration audio stops immediately. The "Next →" button gate does not block the swipe gesture. This matches how users actually consume content; blocking swipe creates frustration.

**Episode dots:** Filled = seen. Empty = upcoming. Current = genre-color dot with 1.2s pulse.

**Scene progress bar:** 3 segments. Genre color fills current segment as scene plays.

---

### 6.3 Choice Screen (Episode End)

```
┌─────────────────────────────┐
│  ×                          │
│                             │
│  [Last scene — blurred 60%] │  ← darkened + genre-mood overlay
│                             │
│  "What happens next?"       │  ← English or Hinglish per story content
│                             │
│  ┌─────────────────────┐    │
│  │  Option A           │    │  ← 4px genre-color left border, 12px radius
│  │  [2-line choice]    │    │    Poppins 500 16px
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │  Option B           │    │  ← 2px white border
│  │  [2-line choice]    │    │
│  └─────────────────────┘    │
│                             │
│  [1,247 played this story]  │  ← uses Story.total_plays from the story object already in memory (client has it from feed load). Do NOT use episode.total_play_count — that's a different number.
└─────────────────────────────┘
```

**Choice tap:** scale 1.0→1.03→1.0 (100ms) → selected card gets 15% genre-color bg fill → other dims to 40% → 0.8s pause → next episode.

**Social proof:** Total story play count, embedded in episode object at generation time. Shows story popularity, not per-choice split. (Per-choice stats: v2.)

**Dead end:** "This branch is still being written — check back soon" + Back to Feed CTA.

---

### 6.4 Create Screen

```
┌─────────────────────────────┐
│  Create a Story             │  ← English title, Poppins 700 22px
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │  ← autofocus on enter; 3 visible lines
│  │ [Placeholder...]    │    │
│  │                     │    │
│  └─────────────────────┘    │
│  [0/200]                    │  ← character count
│                             │
│  Need ideas?                │  ← English
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ Idea │ │ Idea │ │ Idea │ │  ← 3 cols × 2 rows = 6 chips
│  └──────┘ └──────┘ └──────┘ │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ Idea │ │ Idea │ │ Idea │ │
│  └──────┘ └──────┘ └──────┘ │
│                             │
│  [Create Story →]           │  ← gradient button; disabled < 10 chars
└─────────────────────────────┘
```

**Placeholder (Hinglish):** "Koi bhi ek idea likho — jaise: 'Raat ko phone aaya, number tera tha, tu saath mein tha'"

**Prompt chips (6, tapping fills field — does not submit):**

| Chip text |
|-----------|
| "Raat ko phone aaya, number tera tha, tu saath mein tha" |
| "Ladki rich, ladka middle class, college ke pehle din" |
| "Hanuman ji ne Lanka jaate waqt ek ajeeb cheez dekhi" |
| "Ghar mein ek darwaza tha jo hamesha band rehta tha" |
| "Do yaar, ek ladki, ek train ka safar" |
| "Raja ko sapne mein aaya — yeh sab ek pariksha hai" |

**Button states:** < 10 chars → grey disabled. ≥ 10 chars → `#FF2D78` → `#00C9C8` gradient. Submitting → spinner inline + "Creating..." text.

**Offline:** "Connect to internet to create stories" toast. Does not submit.

---

### 6.5 Generating Screen

```
┌─────────────────────────────┐
│                             │
│     [Cinematic loader]      │  ← genre-themed animation (spec below)
│                             │
│  Your story is being born   │  ← English, Poppins 700
│                             │
│  ┌──────────────────────┐   │
│  │  ✓ Romance detected! │   │  ← pops in after genre classified (~20s)
│  └──────────────────────┘   │    spring animation: 0.5→1.1→1.0, 300ms
│  [Change genre?]            │  ← appears 0.5s after badge
│                             │
│  ✓ Prompt analyzed          │
│  ✓ Genre classified         │
│  ○ Writing the story...     │  ← current step: pulsing grey circle
│  ○ Generating images        │
│  ○ Adding narration         │
│  ○ Final touches            │
│                             │
│  ~4 minutes remaining       │  ← from eta_seconds in status response
│  Queue: 2nd in line         │  ← only if queue_position > 1
│                             │
│  [Browse stories meanwhile] │  ← ghost button, returns to feed
└─────────────────────────────┘
```

**Cinematic loaders by genre:**
- **Pre-classification (first ~20s):** Three dots pulsing in `#FF2D78`→`#00C9C8` gradient
- **Romance:** Soft pink particles rising like embers, slow, warm
- **Thriller/Horror:** Horizontal scan lines flickering — like a corrupted signal on dark
- **Mythology:** Golden mandala slowly rotating and expanding outward

**"Change genre?" bottom sheet:**

```
┌─────────────────────────────┐
│  Genre              ——      │  ← drag handle
│                             │
│  ● Romance      (current)   │  ← radio, genre-color dot
│  ○ Thriller / Horror        │
│  ○ Mythology                │
│                             │
│  [Confirm]  [Cancel]        │
└─────────────────────────────┘
```

On confirm: toast "Genre changed — redoing your story..." **Full restart:** server cancels the current job and creates a new job with the updated genre. Server returns a new `job_id` in the confirm response. Client discards the old `job_id` and begins polling the new `job_id`. The cinematic loader changes to the new genre's animation. Progress tracker resets to step 1. Reason: images are genre-specific — a partial restart produces inconsistent scenes.

**API for genre change:** `POST /generate/{job_id}/change-genre` body: `{genre}` → response: `{new_job_id}`. Client switches to polling the new job.

**Polling:** Client polls `/generate/{job_id}/status` every 5 seconds (long-poll, no WebSocket in v1). If a step takes >45s over estimate: step label shows "Thoda time lag raha hai..." in grey italics.

**On "Browse stories":** Returns to feed. Story continues in background. Push notification on completion: "Your story is ready!" with deep link. If push off: badge dot on Create tab + story at top of feed on next open.

**Failure states:**
- > 15 minutes, no completion: "Something went wrong — want to try again?" + Retry button (requeues same prompt)
- Second failure: "Server is busy — try again in a bit" + Back to Feed CTA
- Never show a technical error message

---

### 6.6 Profile

```
┌─────────────────────────────┐
│                         ⚙   │  ← settings, top-right
│  ┌───┐                      │
│  │ A │  [Username]          │  ← avatar: initials, genre-color bg
│  └───┘  Member since May '26│
│                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  12  │ │  47  │ │ 1.2K │ │  ← Created | Played | Views
│  └──────┘ └──────┘ └──────┘ │
│                             │
│  MY STORIES                 │  ← English, uppercase, Poppins 600
│  [2-col story grid]         │
│  [empty state if none]      │
│                             │
│  PLAYED                     │
│  [2-col story grid]         │
│  [empty state if none]      │
└─────────────────────────────┘
```

**Avatar:** User's first initial. Background = genre color of most-created genre; default `#FF2D78`.

**Story grid cards:** 9:16 thumbnails. Genre-color thin border. Title overlay. Tap → opens player.

**Empty states:**
- My Stories: "No stories yet — create your first!" + Create button
- Played: "Explore stories on the feed!" + Home button

**Settings bottom sheet:**

```
┌─────────────────────────────┐
│  Settings           ——      │  ← drag handle
│                             │
│  Notifications   [ON  ●]    │  ← story-ready push notifications
│  Autoplay audio  [ON  ●]    │  ← auto-play narration preview in feed
│                             │
│  Account         ────────── │
│  Phone: +91 98765 43210     │  ← if linked; else "Link phone number →"
│                             │
│  About                      │
│  Katha v1.0               │
│                             │
│  [Close]                    │
└─────────────────────────────┘
```

---

### 6.7 Onboarding (First Run)

```
App launch (first time)
    │
    ├─ 1s Splash: "Katha" wordmark fade in on black
    │   Tagline: "Your story. Your choice."
    │
    └─ Open directly into a hero story (Episode 1, Scene 1)
       No feed shown first. User is IN a story immediately.

After Episode 1 ends (non-blocking bottom sheet):
    "What should we call you?"
    [Name field]  [Skip for now]  [Save]
    → If saved: creates device-linked profile
    → If skipped: device-ID profile, shown as "Guest"
```

**Return detection:** Local storage token — no server call needed.

**Hero story selection:** Time-of-day heuristic. Evening/night → Thriller. Afternoon → Romance. Morning → Mythology.

---

### 6.8 Story End Screen

```
┌─────────────────────────────┐
│                             │
│  [Last scene — dimmed 70%]  │
│                             │
│  Story Complete!            │  ← English, Poppins 700
│  [Story title]              │
│                             │
│  Your path:                 │
│  "Riya trusted → Veer left  │  ← client-side branch choices, joined with →
│   → They met again"         │    truncated after 3 choices if needed
│                             │
│  [Try different choices]    │  ← replay from Episode 1 (no choice_id)
│  [Share]                    │  ← native share sheet
│  [Back to Feed]             │  ← auto after 5s
└─────────────────────────────┘
```

**Celebration:** Single 0.5s genre-color particle burst on screen entry. Subtle — the ending is emotional, not a party.

**Completion share card (v1 — accepted):** "Share your ending" button generates a static 1080×1920px image on-device using canvas rendering:
- Full scene image as background (last scene, slightly brightened vs the dimmed Story End view)
- Story title top-left, Poppins 700 white
- User's branch path text bottom-left: "Your ending: Riya trusted → Veer left → They met again" (truncated to 3 steps if longer), Poppins 500 white with text shadow
- "Katha" wordmark + "Play on katha.app" bottom-right, small
- Genre-color gradient overlay at bottom 30%

Opens native share sheet with this image pre-attached. WhatsApp shown first. This is the primary viral distribution mechanism.

**Dev note:** Render the card using React Native's `react-native-view-shot` or equivalent canvas capture. No server involved — pure client-side composition. The branch path string is already computed client-side for the "Your path" display.

**"Try different choices" behavior:** Client clears local branch state (choice path stored in device storage) and calls Episode 1 with no `choice_id`. Creates a new analytics session (new `story_opened` event). "Your path" tracker starts fresh. The `story_completed` event from the first playthrough is preserved — this is a new session, not a correction.

**"Resume where you left off?" (crash recovery):** On restart after crash, if local state shows mid-episode position, show non-blocking banner at top of Feed: "Resume [Story Title]?" with Resume/Dismiss. Tapping Resume opens player at last saved scene. Tapping Dismiss clears local state.

---

### 6.9 Registration / Phone Recovery Screen

**Trigger:** 3 seconds after first story submission lands on Generating screen.

```
Bottom sheet slides up (non-blocking, dismissible):

  Save your stories
  "Link your phone — if you reinstall or change phones,
  your stories are safe."

  [+91 ___________]
  [Get OTP]    [Skip]

→ OTP entry sheet:
   [_ _ _ _ _ _]              ← 6-digit auto-advance input
   Resend in 0:30             ← 30s countdown; Resend tappable after timer
   Wrong code: "Code galat hai — dobara try karo" (red below input)
   Expired: "Code expire hua — naya lelo" + Resend shown immediately
   3 wrong attempts: rate-limited 10 minutes
→ On verify: "Phone linked!" toast; profile saved
→ On skip: device-ID only (linkable later from Profile > Settings)
```

**Rules:** Never blocks story creation. Sheet can be dismissed at any time. User can link phone later from Profile > Settings.

---

### 6.10 Error States

| Scenario | What user sees | Behavior |
|---------|----------------|---------|
| No internet on Feed | "No connection — showing saved stories" | Cached seed stories shown; audio disabled |
| Lost internet mid-episode | "Connection lost" banner | Current scene continues; Next button disabled until reconnect |
| Story image fails | Genre-color gradient placeholder + story title | Audio and narration still play |
| Audio fails | Silent mode auto-activates; text highlights on timer | "Audio unavailable" toast, once per session |
| Generation > 15 min | "Something went wrong — try again?" | Retry requeues; second fail → busy message |
| Story branch missing | "This path is still being written" | Back to Feed; story labeled "Coming Soon" |
| App crash mid-story | On restart: "Resume where you left off?" | Yes → resume from last scene via local state |
| First launch, no stories | "Stories loading..." shimmer | Should not happen; 40-50 seed stories pre-loaded |

---

## 7. Content Serving Strategy

### 7.1 Story Object

```json
{
  "id": "uuid",
  "title": "Raat Ka Rahasya",
  "genre": "thriller",
  "hook": "Raat ke 2 baje phone aaya. Number tera tha. Tu mere paas so raha tha.",
  "author": { "id": "uuid", "name": "Rahul K" },
  "episode_count": 6,  // always 6 in v1 — seed stories AND user-generated stories. Engine always produces exactly 6 episodes. No variable length in v1.
  "total_plays": 1247,
  "created_at": "iso8601",
  "cover_image_url": "https://...",
  "status": "ready | generating | failed",
  "is_seed": true
}
```

### 7.2 Episode Object

```json
{
  "id": "uuid",
  "story_id": "uuid",
  "number": 1,
  "title": "Pahli Raat",
  "scenes": [],
  "choices": [
    {
      "id": "uuid",
      "text": "Call your friend",
      "next_episode_id": "uuid",
      "choice_count": 1247
    },
    {
      "id": "uuid",
      "text": "Go outside alone",
      "next_episode_id": "uuid",
      "choice_count": 831
    }
  ],
  "cliffhanger_text": "The door opened by itself.",
  "total_play_count": 2078
}
```

`choice_count` on individual choices is tracked for future per-choice analytics (v2). The feed card social proof line uses `Story.total_plays` — the cleaner number, from Section 7.1.

### 7.3 Scene Object

```json
{
  "id": "uuid",
  "episode_id": "uuid",
  "number": 1,
  "image_url": "https://...",
  "body_text": "The house was dark except for one light...",
  "narration": {
    "text": "Ek awaaz aai — ghar mein koi hai.",
    "audio_url": "https://..."
  },
  "background_score_track": "thriller_tension_1"
}
```

### 7.4 Pre-fetch Strategy

When user enters Episode N:
- **Pre-fetch:** Metadata only (title, choices, cliffhanger_text) for both branches of Episode N+1
- **Do NOT pre-fetch:** Scene images or audio for the next episode — progressive load only

This prevents instant transitions from requiring a full episode's assets upfront, which would be expensive on Tier 2/3 India 4G. Scene image of the next scene loads while user is reading the current scene.

**Feed card pre-load:** When a story card is 50%+ visible in the feed, pre-load the cover image (already in the story object) AND the Episode 1 Scene 1 image URL. This is what enables the "< 2 seconds, tap to Episode 1" performance target — without pre-loading the first scene image at the feed level, that target is not achievable on 4G.

### 7.5 Offline Seed Story Caching (v1 — accepted)

On first launch, after the splash screen, silently download the 3 hero stories (one per genre) to device storage before showing the feed. Target: complete download before user finishes Episode 1 of the hero story shown during onboarding.

**What to cache:** All scene images + audio files for all 6 episodes of each hero story = ~30-50MB total. Cached in device storage. Subsequent opens use cached assets; cache invalidated if story is updated.

**UX:** Fully silent — no progress bar unless user navigates to the Feed before download completes. If interrupted: resume on next launch. If storage < 50MB free: skip caching, stream normally, show no error.

**Dev note:** Implement as a background download job starting 3 seconds after onboarding begins. Does not block UI thread.

---

## 8. API Surface

| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/feed` | GET | Paginated story list (cursor-based, 10/page) |
| `/stories/{id}` | GET | Story metadata |
| `/stories/{id}/episodes/{ep_id}` | GET | Episode + scenes; `?choice_id=` for branching |
| `/stories/{id}/episodes/{ep_id}/choice` | POST | Record user choice; returns `next_episode_id` |
| `/generate` | POST | Submit prompt; returns `job_id` |
| `/generate/{job_id}/status` | GET | Poll: status, step, genre, eta_seconds, queue_position |
| `/events` | POST | Batch analytics event logging |
| `/users/profile` | GET | Profile: stats + story lists |
| `/users/register` | POST | Create username + issue device token |
| `/users/link-phone` | POST | Initiate OTP for phone recovery |
| `/users/verify-otp` | POST | Verify OTP, link phone to device token |
| `/users/push-token` | POST | Register FCM device token for push notifications |

**Push notification setup (Dev):** Requires Firebase Cloud Messaging (FCM) setup. Android only in v1. Client registers FCM token on first launch and sends it via `/users/push-token`. Server triggers "Your story is ready!" notification when generation job completes. FCM credentials must be provisioned before testing generation flow.

**Auth:** Device token issued on first launch, stored locally. All requests use this token. Phone verification links phone to the device token for account recovery — does not change the auth model.

**Polling:** Long-poll only in v1. Client polls `/generate/{job_id}/status` every 5 seconds. No WebSocket.

---

## 9. Audio Experience

### 9.1 Narration

- 1-2 Hinglish lines per scene
- Plays automatically on scene load (respects system silent mode)
- Genre-matched TTS voice: Romance = warm female; Thriller = measured male; Mythology = resonant, theatrical
- Narration highlight: **full-line glow** while audio plays (genre-color text + underline + 0.15 opacity background tint). Glow fades 0.5s after audio ends. No word-level sync in v1.
- Seed story audio files pre-generated and cached locally after first play
- **Background score track assignment for user-created stories:** AI engine's domain (Dev). The engine assigns `background_score_track` IDs per scene during generation, using genre + scene emotional beat as signals. This doc defines the available track tags (Section 9.2) — the AI assigns from that set. PM reviews track assignments during seed story QA.

### 9.2 Background Score

Minimum viable library for launch: **6-10 tracks** from royalty-free sources (Artlist / Epidemic Sound). Expand to 30-50 post-launch.

| Tag | Character |
|-----|-----------|
| `romance_longing` | Slow strings, piano |
| `romance_peak` | Building swell |
| `thriller_dread` | Low drone, heartbeat |
| `thriller_reveal` | Sudden silence + sting |
| `mythology_epic` | Percussion, brass |
| `mythology_divine` | Sitar, pads |

**Production risk:** Licensing/commissioning tracks is outside Dev's scope. PM must confirm track procurement before seed story production begins.

Track cross-fade: 0.5s fade out → 0.5s fade in between scenes.

### 9.3 Audio Layering

Two streams: background score (30%) + narration TTS (100%).

**Android risk (React Native):** Simultaneous stream volume control has known cross-platform issues. **Graceful degradation in v1:** background score fades to 0% while narration plays, returns to 30% when narration ends. Eliminates ducking complexity while preserving design intent.

Feed preview audio cap: 60% max (never reaches in-player narration level).

---

## 10. Sharing & Deep Links

**Story URL format:** `Kathaapp/s/{story_id}`

Share button (feed right-side + story end screen): opens native share sheet.
Pre-filled text: "[Story title] — play it on Katha: Kathaapp/s/{id}"
WhatsApp shown first if installed.

**Deep link behavior:**
- App installed → opens Episode 1 of that story directly
- App not installed → Play Store listing page

**Mobile web player:** Out of scope for v1.

---

## 11. Performance Targets

| Target | Threshold |
|--------|---------|
| Feed: time to first story visible | < 1.5s on 4G |
| Story open: tap to Episode 1 Scene 1 | < 2 seconds |
| Scene transition: swipe to next scene | < 300ms |
| Episode branch metadata pre-fetch | Complete before user reaches Choice screen |
| Audio start after image load | < 500ms |
| Genre classification shown on Generating | < 30 seconds |
| Status poll interval | 5 seconds |

---

## 12. Analytics Events

Server-side structured JSON logs. No third-party analytics in v1.

| Event | Key Properties |
|-------|---------------|
| `story_opened` | story_id, genre, source (feed/share/deeplink) |
| `scene_viewed` | story_id, ep_num, scene_num, duration_ms |
| `narration_completed` | story_id, ep_num, scene_num |
| `choice_made` | story_id, ep_num, choice_id, option (A/B) |
| `episode_completed` | story_id, ep_num |
| `story_completed` | story_id, total_time_ms, branch_path |
| `story_abandoned` | story_id, ep_num, scene_num |
| `story_shared` | story_id, platform |
| `prompt_submitted` | genre_detected, prompt_length |
| `generation_completed` | job_id, duration_ms, genre |
| `generation_failed` | job_id, failure_reason |
| `phone_linked` | (no user PII — only confirmation event) |

**Launch query:**
```sql
SELECT story_id,
  COUNT(DISTINCT CASE WHEN ep_num = 1 THEN user_id END) ep1_starts,
  COUNT(DISTINCT CASE WHEN ep_num >= 2 THEN user_id END) ep2_reaches,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ep_num >= 2 THEN user_id END) /
        NULLIF(COUNT(DISTINCT CASE WHEN ep_num = 1 THEN user_id END), 0), 1) pct
FROM scene_viewed_events
GROUP BY story_id
ORDER BY ep1_starts DESC
```
Target: 70%+ per story. Stories below 50%: investigate content quality immediately.

---

## 13. Explicitly Out of v1

| Feature | When |
|---------|------|
| Creator monetization | v2 |
| Comments, likes from others | v2 |
| Scene sharing as image card | v2 |
| Algorithmic feed personalization | v2 |
| Genre filter on feed | v2 |
| iOS | v2 |
| Video per scene | v2 |
| Creator analytics dashboard | v2 |
| WebSocket (vs long-poll) | v2 |
| Mobile web player (deep link fallback) | v2 |
| Per-choice social proof stats | v2 |
| Referral tracking | v2 |
| Bookmark / Save stories | v2 |
| Episode 7 "coming soon" tease | v2 |

---

## 14. Seed Story Production (Pre-Launch Sprint)

**Owner:** PM (quality) + Dev (generation)
**Requirement:** Must be complete before any user testing begins
**Target:** 40-50 stories — 15 Romance, 15 Thriller/Horror, 15 Mythology, 5 crossover

**Hero stories (3 per genre = 9 total):** PM-reviewed, exceptional quality. Used for:
- Onboarding (first story every new user sees)
- App screenshots and demo videos

**Per-story checklist:**
- [ ] All 6 episodes generated (episode_count = 6 is the fixed v1 spec)
- [ ] Both branches for each episode playable (full tree)
- [ ] Scene images reviewed (character consistency)
- [ ] TTS narration reviewed (pronunciation, naturalness)
- [ ] Background score assigned per scene
- [ ] Story hook reviewed: would you want Episode 2?
- [ ] EP1→EP2 playtested by PM manually

**Timeline:** 2-week production sprint. Not a single checklist line — it is a workstream.

---

## 15. Handoff Checklist

### For Manavi (Product Design)

- [ ] All 10 screens to Figma fidelity: Home/Feed, Player, Choice, Create, Generating, Profile, Onboarding, Story End, Phone Registration, Error states
- [ ] Genre badge component: all 3 genre variants + pre-classification (gradient) state
- [ ] Cinematic loader animations per genre (specs in 6.5)
- [ ] All error states from Section 6.10
- [ ] Loading skeletons: Feed card + Player (shimmer spec in Section 3)
- [ ] Empty states: Profile > My Stories + Profile > Played
- [ ] Settings bottom sheet (spec in 6.6)
- [ ] "Change genre?" bottom sheet (spec in 6.5)
- [ ] Player exit: `×` button + "Leave story?" confirm overlay
- [ ] Animation specs: Ken Burns Feed (1.0→1.05, 6s), Player (1.0→1.02, 8s); choice interaction; narration glow; genre badge spring pop-in (0.5→1.1→1.0, 300ms)
- [ ] Figma variables for all design tokens (Section 3)
- [ ] Katha wordmark + app icon

### For Dev (Engineering)

- [ ] Story, Episode, Scene data models (Section 7)
- [ ] All API endpoints (Section 8)
- [ ] Long-poll generation status (5s interval); no WebSocket
- [ ] Episode branch metadata pre-fetch (metadata only) + progressive scene asset loading
- [ ] Audio: separate narration + background score streams; Android graceful degradation (Section 9.3)
- [ ] Device-ID token auth + optional phone OTP recovery (Sections 6.9 + 8)
- [ ] Analytics event batch logging (Section 12)
- [ ] Deep link handling: `Kathaapp/s/{id}`
- [ ] Push notification: "Your story is ready!" with deep link
- [ ] Generation queue: 3-4 concurrent job cap, async
- [ ] Firebase Cloud Messaging (FCM) setup: provision FCM credentials, implement `/users/push-token` endpoint, trigger push on job completion
- [ ] Add `/generate/{job_id}/change-genre` endpoint (returns new_job_id, cancels old job)
- [ ] Pre-generate all 40-50 seed stories + verify all branches playable

---

*Katha v1.0 Product Design Document — v1.2*
*PM | Designer: Manavi | Engineer: Dev*
*Next: Manavi produces Figma screens from this spec*
