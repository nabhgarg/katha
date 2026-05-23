# Katha — Interactive Story Platform

A mobile-first interactive story app for Hinglish-speaking Tier 2/3 India. Players scroll a TikTok-style feed, tap into AI-generated 6-episode branching stories, and choose what happens at each episode end. Creators type a two-sentence idea and get a complete story in ~5–7 minutes.

**Live demo:** [https://nabhgarg.github.io/katha/](https://nabhgarg.github.io/katha/)

---

## Getting started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase project (for auth, database, storage)
- OpenAI API key configured in a Supabase Edge Function (`openai-proxy`)

### Running locally

```bash
# Install dependencies
pnpm install

# Create your env file
cp .env.example .env.local
# Edit .env.local with your Supabase URL, anon key, and redirect URL

# Start dev server
pnpm dev
```

Opens at `http://localhost:5173/katha/`. Hot-reloads on save.

### Building for production

```bash
pnpm build    # Output in dist/
pnpm preview  # Preview the production build locally
```

### Deploying

Push to `main` → GitHub Actions builds and deploys to GitHub Pages automatically. The workflow uses GitHub Secrets for API keys (see `.github/workflows/deploy.yml`).

---

## How the app works

### For players (guests or signed-in)

1. **Explore** — Browse a TikTok-style feed of AI-generated stories, organized by genre (Mythology, Romance, Thriller). No sign-in required.
2. **Tap to play** — Stories have 6 episodes with 3 scenes each, rendered as a visual novel with character dialogue, scene descriptions, and AI-generated images.
3. **Make choices** — At the end of each episode, pick between two story-branching choices. Your pick shapes the next episode's plot, characters, and conflicts.
4. **Six endings** — Depending on your choices, each story has 32 possible path combinations leading to different narrative outcomes.

### For creators (sign-in required)

1. **Create** — Type a 2-sentence story idea (or tap a suggestion). The AI generates a complete 6-episode branching story with cover art.
2. **Generation takes ~5–7 min** — You can browse other stories while yours generates. Progress is shown in real time.
3. **Auto-saved** — Stories are optimistically saved to local storage instantly, then synced to the cloud database in the background with all images uploaded to persistent storage.

### Authentication

- Email OTP (one-time password) via Supabase Auth — no passwords to remember.
- Guest browsing fully supported: explore, play, and read stories without signing in.
- Sign-in required only for: creating stories, saving play history, and profile/settings access.

---

## Project structure

```
katha/
├── index.html              # Minimal HTML shell with all screens/sections
├── src/
│   ├── main.js             # App entry point, global setup, auth init
│   ├── config.js            # Environment variable access
│   ├── lib/
│   │   ├── supabase.js      # Supabase client, auth (OTP), session management
│   │   ├── router.js        # Screen navigation, auth gating
│   │   ├── storage.js       # Local storage, DB sync, optimistic save, image upload
│   │   ├── openai.js        # OpenAI proxy calls, Pollinations fallback (lazy-loaded)
│   │   ├── pipeline.js      # AI story generation pipeline (lazy-loaded)
│   │   ├── script-parser.js # Lightweight script → UI node parser
│   │   ├── state.js         # Global app state (current story, episode, choices)
│   │   └── toast.js         # Toast notifications
│   ├── screens/
│   │   ├── feed.js          # Feed + Explore grid (public story browsing)
│   │   ├── player.js        # Story player (scenes, choices, branching)
│   │   ├── create.js        # Story creation + generation pipeline runner
│   │   ├── profile.js       # User profile, saved/played stories
│   │   └── onboarding.js    # Sign-in (email OTP), name setup, sign-out
│   ├── data/
│   │   └── seed-story.js    # Built-in sample story
│   └── styles/
│       ├── base.css         # Typography, colors, layout primitives
│       ├── screens.css      # Screen-specific styles
│       └── components.css   # Buttons, cards, modals, toast
├── schema.sql               # Supabase database schema + RLS policies
├── vite.config.js            # Vite build configuration
├── .env.example              # Template for environment variables
├── .github/workflows/
│   └── deploy.yml            # CI/CD: build + deploy to GitHub Pages
└── docs/
    ├── content-engine-v4.md  # Full AI pipeline spec (current)
    ├── product-design-doc.md # Product design spec
    ├── project-recap.md      # Project overview for newcomers
    └── ...                   # Additional design docs
```

---

## Architecture overview

### AI generation pipeline (content engine v4)

```
[User prompt]
      │
      ▼
Stage 1 — Architect (gpt-5.4)
  Full 6-episode blueprint: genre, title, characters, scene objectives,
  cliffhangers, branching choices, story rules, protagonist voice.
      │
      ├── Episode 1 + cover image (parallel)
      │     Stage 2a — Screenwriter (gpt-5.4-mini) → 3 scenes
      │     Stage 2b — Cover image (gpt-image-1, DALL-E)
      │
      ├── Validate ep1 + ep1 image (parallel)
      │     Stage 3  — Validator (gpt-5.4-mini) → patches 1 bad scene if needed
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
Optimistic save to localStorage → background sync (image uploads + DB write)
```

**Models used:**
| Stage | Model | Why |
|---|---|---|
| Architect | `gpt-5.4` | Needs full blueprint coherence across 6 episodes |
| Screenwriter | `gpt-5.4-mini` | Fast, cheap, good at following format constraints |
| Validator | `gpt-5.4-mini` | Surgical scene rewriter |
| Story state | `gpt-5.4-mini` | Compact JSON extraction, 200 tokens max |
| Cover + ep1 images | `gpt-image-1` | Best quality for the two visible-upfront images |
| Episodes 2–6 images | Pollinations CDN | Free, instant URL, good enough for mid-story |

### Backend (Supabase)

- **Auth**: Email OTP via Supabase Auth. No passwords.
- **Database**: PostgreSQL with a `stories` table. RLS policies allow public reads (for the feed) and owner-only writes.
- **Storage**: `covers` bucket for uploaded story images.
- **Edge Functions**: `openai-proxy` — server-side proxy to OpenAI so the API key never touches the browser.

### Performance optimizations

- **Code splitting**: The AI pipeline (~40 KB) and OpenAI module are lazy-loaded via dynamic `import()` — only fetched when a user actually creates a story.
- **Optimistic saves**: Story saves to localStorage instantly; image uploads and DB writes happen in the background. Users see their story in the player immediately.
- **Parallel image uploads**: Cover + all episode images upload concurrently via `Promise.all`.
- **Session-level caching**: Public feed data is cached in `sessionStorage` with a 30-second TTL to avoid redundant network calls.

---

## Database setup

### Fresh setup

If setting up a new Supabase project, run `schema.sql` in **Supabase Dashboard → SQL Editor → New query → Paste → Run**. This creates the `stories` table and all RLS policies.

### Migrating from the old schema

If you already have a running instance with the old single-policy schema (`users_own_stories`), you need to run a migration. This is **safe** — no data is modified, only access policies change.

Run this in **Supabase Dashboard → SQL Editor**:

```sql
-- Step 1: Drop the old blanket policy
drop policy if exists "users_own_stories" on public.stories;

-- Step 2: Add granular policies
-- Public read: guests can browse the feed without signing in
create policy "public_read_stories" on public.stories
  for select to anon, authenticated using (true);

-- Owner-only write policies
create policy "users_insert_own" on public.stories
  for insert to authenticated with check (auth.uid() = user_id);

create policy "users_update_own" on public.stories
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_delete_own" on public.stories
  for delete to authenticated using (auth.uid() = user_id);
```

**What this changes:**
- Before: only signed-in users could read stories, and only their own
- After: anyone can **read** all stories (needed for the public feed/explore), but only owners can **write/update/delete** their own

**Impact on your live GitHub Pages instance:**
- Zero downtime — this is a Supabase-side change, not a code deploy
- Existing stories and user accounts are untouched
- The frontend code already handles both cases (it just silently fails to load the feed for guests under the old policy)
- After running the migration, guest browsing on your live site will start working immediately

### Schema overview

- `stories` table: `id`, `user_id`, `story_data` (JSONB), `credit_map` (JSONB), `created_at`
- RLS policies:
  - **Public read**: Anyone (including guests) can read stories for the feed
  - **Owner insert/update/delete**: Only authenticated users can modify their own stories
- User accounts are managed by Supabase Auth (auto-created on first OTP verification)

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable anon key |
| `VITE_REDIRECT_URL` | OAuth/OTP redirect (e.g., `https://nabhgarg.github.io/katha/`) |

For production deployments via GitHub Actions, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository Secrets, and `VITE_REDIRECT_URL` as a repository Variable.

---

## Key design decisions

**Guest-first experience.** The feed, explore grid, and story player all work without sign-in. Auth is only required for creating stories and accessing profile features. This maximizes engagement before asking for commitment.

**Optimistic save.** After generation, the story saves to localStorage immediately and the user can start playing within seconds. Heavy tasks (image uploads, DB write) happen in the background. If the background sync fails, the user gets a toast notification and the story is still available locally.

**Dual-branch generation.** From episode 2 onward, Branch A and Branch B generate in parallel. Each branch uses its own scene objectives, continuity sentence, and choice label. This ensures branch divergence is visible from Scene 1, not just at the choice point.

**Story state tracking.** After each episode, a compact JSON story state (relationships, mysteries, emotional state, character goals) is extracted and passed to the next episode's screenwriter. This prevents episode 4 from ignoring what happened in episode 2.

**Image persistence.** Before DB save, all episode images (both gpt-image-1 base64 and Pollinations CDN URLs) are uploaded to Supabase Storage. The stored story always has persistent image URLs — no broken images if Pollinations CDN changes.

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
| v4.2 | 2026-05-22 | Model upgrades: architect gpt-5.4 (was gpt-4o), screenwriter + validator gpt-5.4-mini (already in code, docs corrected) |

---

## North-star metric

**70% of users who start Episode 1 must finish Episode 2.** If below 70%, fix story quality before everything else. The content engine exists for this number.

---

*Katha — 2026*
