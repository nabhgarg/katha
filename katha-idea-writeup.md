# Katha — The Idea

---

## The Problem

There are 500 million Hindi-English bilingual people in India. Most of them live in Tier 2 and Tier 3 cities — Lucknow, Indore, Patna, Bhopal. Their Friday night looks like this: Reels until 11, maybe PocketFM before bed.

Both of those products are doing something right. Reels gives them hooks — short, sharp, emotionally engaging. PocketFM gives them stories — episodic, immersive, Hinglish. But neither gives them both. And neither gives them agency.

Reels is passive. PocketFM is passive. Nothing in Indian entertainment right now lets you *choose what happens next* — in your language, in your cultural voice, with your kind of story.

That's the gap.

---

## The Insight

Interactive fiction is not a new idea. Episode and Chapters exist. But they are English-first, Western-genre, gamified with currency mechanics that feel extractive. They were not built for someone in Lucknow who speaks in a fluid mix of Hindi and English and wants a love story set in a college she recognizes.

PocketFM cracked the audio story format for India — ₹1000 crore in revenue, 200 million listeners. But PocketFM stories are linear. You listen. You don't choose.

The question Katha is asking: *What if PocketFM had choices?* What if you could shape the story? What if you could write the premise yourself and watch an AI turn it into a 6-episode branching narrative — with images, narration in a voice that sounds right, and music that matches the mood?

---

## What Katha Is

Katha is a mobile-first interactive story platform for Hinglish-speaking India.

**As a player:** You open the app and scroll into a story the way you scroll Reels — full screen, vertical, immersive. Each story is 6 episodes. Each episode is 3 scenes with an AI-generated image, Hinglish narration, and background music. Every episode ends at the worst possible moment for the protagonist. Then you choose what happens next. Your choice changes everything.

**As a creator:** You write two sentences — an idea, a premise, a "what if." The AI classifies the genre (Romance, Thriller, Mythology), generates all 6 episodes, creates the images, adds narration, and publishes your story to the feed. 5 minutes of effort. Your story lives in the world. Other people play it.

**As a platform:** Stories made by one user are discovered and played by others. The choices other players make create new branches. The feed is always fresh. The flywheel: more stories → more discovery → more prompts → more stories.

---

## The Three Genres (MVP)

We start with three pillars that cover the dominant emotional registers of Tier 2/3 India:

**Romance** — Bittersweet, class tension, longing. *"Ladki rich, ladka middle class, college ke pehle din."* The emotional territory of every Bollywood film that actually works.

**Thriller/Horror** — Paranoia, dread, twist endings. *"Raat ko phone aaya, number tera tha, tu saath mein tha."* The visceral hook of late-night content.

**Mythology** — Epic, moral, divine conflict. *"Hanuman ji ne Lanka jaate waqt ek ajeeb cheez dekhi."* Deeply culturally resonant. Nothing like it exists in interactive fiction.

Genre is detected automatically from the user's prompt. They don't select it — they write an idea, and Katha figures it out. The reveal is part of the magic.

---

## The MVP (What We're Building First)

The first version is deliberately constrained. We are not trying to build everything. We are trying to answer one question: *Do users finish Episode 1 and start Episode 2?*

If 70% of users who start Episode 1 continue to Episode 2, the hook is working. If not, nothing else matters — not the creation flow, not the feed, not the sharing. Story quality is everything.

**What's in the MVP:**
- Android app (Tier 2/3 India is Android-first)
- Full-screen vertical scroll feed — one story per screen, TikTok-style
- 40-50 hand-curated seed stories at launch (15 Romance, 15 Thriller/Horror, 15 Mythology) — these set the quality bar
- Prompt-to-story creation: type a premise, 5 minutes, your story is in the feed
- Story player: scene-by-scene, AI image + Hinglish narration + background score + your choices
- Branching: 2 meaningful choices per episode, different paths that actually diverge
- Onboarding: no signup wall — new users land directly inside a hero story

**What's NOT in v1:** Creator monetization, social graph, comments, iOS, video, algorithmic feed. We don't need any of that to answer the core question.

**The tech:** We run entirely on open-source local models — no frontier API costs. Dev has an RTX 4090 (₹4 lakh GPU) that handles 40-50 users on an async queue. Story generation takes 3-8 minutes. We pre-generate all seed stories so the feed always works. User-created stories go into a queue.

**The distribution:** WhatsApp is the primary channel. Every story has a shareable link. When a user finishes a story, they see a custom "your ending" image card — their branch choices overlaid on the story cover — that's built to be shared on WhatsApp. College campuses in Tier 2/3 cities (3-5 campus ambassadors). Not Delhi. Not Mumbai.

---

## The End State — What Katha Becomes

The MVP tests the hypothesis. If it works, here is what Katha becomes over 3-5 years.

### The Platform

Katha becomes the primary destination for interactive story entertainment in India — the way PocketFM owns passive audio and Reels owns short-form video. Our territory: *interactive, episodic, creator-made, Hinglish-native.*

The feed evolves from a curated set of seed stories into a live creator economy. Anyone can write a prompt. The best stories surface through plays, completions, and shares. Quality rises because the audience votes with attention.

### The Creator Economy

PocketFM pays out ₹300 crore to creators annually. Katha's creator economy starts smaller but has a structural advantage: interactive stories with branching choices generate more playtime per story than linear audio. More playtime means more opportunity for creator revenue.

Creators on Katha are not just writers — they are world-builders. A popular Katha story has multiple branching paths, each played by different users, each shareable. One story with 6 episodes × 2 branches per episode = 12 unique paths. Players share their specific path. It's inherently social.

Monetization paths:
- Subscription (read more, play more, no ads)
- Creator revenue share (tied to play completion, not clicks)
- Brand integrations in genre-specific stories (e.g., a brand's product appears naturally in a Romance story)
- IP licensing: the best Katha stories get adapted — audio series, short films, OTT content

### Language Expansion

We start with Hinglish because that's the cultural sweet spot for Tier 2/3 India. But the model applies directly to Tamil+English, Telugu+English, Bengali+Hindi. Each language community has the same gap: rich audio/video consumption, zero interactive fiction built for their voice.

Katha becomes a multi-language interactive story platform — not by translating Hindi content, but by generating stories natively in each language's bilingual register.

### Video

The MVP uses static AI-generated images. In v2, scenes become short video clips — 2-6 seconds of motion, AI-generated, matched to the scene's emotional beat. This is the difference between a graphic novel and a film. The story structure is identical; the immersion jumps dramatically.

Indian micro-drama (the format StoReel is trying to crack for the US market at $34M raised) has not been done for India natively. Katha is positioned to be that.

### The Moat

The moat is not the AI engine. Any competitor can run Llama or FLUX. The moat is:

1. **Cultural fit**: Hinglish narration, Tier 2/3 genre sensibility, the specific emotional register of Romance/Thriller/Mythology for this audience — this takes time to build and cannot be bought
2. **Flywheel data**: Every story created, every choice made, every completion event trains better genre classifiers, better narrative prompts, better quality signals. The more content on the platform, the harder it is to replicate
3. **Creator community**: Once creators are earning on Katha, they will not leave. PocketFM's creator lock-in proved this
4. **IP library**: Over time, Katha's best stories become owned IP that can be licensed, adapted, and expanded — a content moat that compounds

---

## The One Thing That Matters Right Now

Before any of the above — the creator economy, the IP, the video, the Tamil expansion — one thing must be true.

**70% of users who start Episode 1 must finish Episode 2.**

If that number is there, we have a hook. If the hook is there, everything else follows. If that number is not there, none of the rest matters.

That is the only thing we are trying to prove with the first 100-200 users.

---

*Katha — 2026*
*Founding team: [PM] · [Manavi, Design] · [Dev, Engineering]*
