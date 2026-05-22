# Katha Content Engine — Architecture & Prompts v2

> Revised 2026-05-18. Based on v1 prototype review.
> Changes vs v1 are marked with **`[CHANGED]`** or **`[NEW]`** inline.

---

## Summary of Changes (v1 → v2)

| Stage | What Changed |
|-------|-------------|
| Stage 1: Bible | +2 genres (DRAMA, MYSTERY); fixed hardcoded age; capped characters at 2–3; richer genre descriptions; new `mood` field |
| Stage 2: Arc | Added per-episode emotional anchor; 3 typed cliffhangers with rotation rule; stronger branch differentiation rule; fixed Ep6 schema (no choices); banned the weak cliffhanger formula |
| Stage 3: Scenes | Speech tic elevated to CRITICAL rule; attribution tag WRONG/RIGHT example; Scene 3 cliffhanger landing instruction; proactive repetition prevention (emotional temperature + opening word rule); previous context expanded from 1 line to 3 lines; universal banned phrases list |
| Stage 4: Cover | Composition guidance added; stronger no-faces/no-people constraint |

---

## Overview

The content engine is a **4-stage sequential pipeline** that runs entirely in the browser (no backend server). When a user taps "Create Story →", the pipeline fires and generates a complete 6-episode branching story in ~3–8 minutes using OpenAI's API via a proxy server.

All OpenAI calls go through a single proxy endpoint. The proxy holds the actual OpenAI key so it never ships to the client.

---

## API Architecture

### Proxy Server
- **Endpoint:** `https://proxy.nabh.co/api/openai` (hardcoded in `index.html` as `_PROXY`)
- **Auth:** Every request from the client sends a Supabase JWT (`Bearer <token>`) in the `Authorization` header. The proxy validates this token before forwarding to OpenAI.
- **Request types:**
  - `{ type: 'chat', model, messages }` → forwarded to `POST /v1/chat/completions`
  - `{ type: 'image', model, prompt, size }` → forwarded to `POST /v1/images/generations`

### OpenAI Models Used
| Stage | Model | Why |
|-------|-------|-----|
| Stage 1: Bible | `gpt-4o` | Needs creative judgment, genre detection, world-building |
| Stage 2: Arc | `gpt-4o` | Needs structural planning, 6-episode consistency |
| Stage 3: Scenes | `gpt-4o-mini` | High volume (up to 11 calls), cost-sensitive |
| Stage 4: Cover Image | `gpt-image-1` | Native OpenAI image gen; falls back to Pollinations.ai if fails |

> **Recommendation:** Upgrading Stage 3 to `gpt-4o` is the single highest-leverage model change available. Character voice consistency and cliffhanger landing improve dramatically. Cost increase is roughly $0.08–0.12 per story at current rates.

### Supabase
- **DB:** `public.stories` table — stores completed story JSON + credit map
- **Storage:** `covers` bucket — stores cover images uploaded from base64
- **Auth:** OTP magic link via email

### Image Fallback
If `gpt-image-1` fails (rate limit, quota), the cover image falls back to **Pollinations.ai** — a free image generation API. Uses a deterministic seed derived from the prompt hash so the same prompt always gives the same image across sessions.

---

## Pipeline Stages

```
User Prompt
    │
    ▼
[Stage 1] Bible (1 call, gpt-4o)
    │  Genre, city, protagonist, characters, mood, story rules, cover prompt
    ▼
[Stage 2] Arc Planner (1 call, gpt-4o)
    │  6 episode plans: emotional anchor, scene jobs, typed cliffhangers, choices A/B
    ▼
[Stage 3] Scene Writer (up to 11 calls, gpt-4o-mini)
    │  Ep1: 1 call (no branching)
    │  Eps 2–6: 2 parallel calls each (branch A + branch B) = 10 calls
    │  Each call produces 3 scenes (narrator text + dialogues)
    ▼
[Stage 4] Cover Image (1 call, gpt-image-1)
    │  Single cover image from bible.cover_prompt
    ▼
Assembly → Save to localStorage + Supabase DB
```

**Total OpenAI calls per story:** 13–14 (2 gpt-4o + 11 gpt-4o-mini + 1 image)

**Branching structure:**
- Every episode has a **Choice A** and **Choice B** at the end
- Ep1 has one shared version (no prior choice to branch from)
- Eps 2–6 each have two full scene sets (A-path and B-path), generated in parallel
- At playback, the player sees whichever branch matches their prior choice
- Result: 2^5 = 32 possible paths, but only 2 scene-sets per episode (not 32 unique ones)

---

## Stage 1: Bible (World-Building)

**Model:** `gpt-4o`  
**Input:** Raw user prompt (e.g. "ek train mein mystery")

### System Prompt

```
Tu ek Indian interactive fiction ka story editor hai.

**[CHANGED] Genre options — choose the one that best fits the user's idea:**

ROMANCE: Opposite worlds ka clash — class, profession, ya timing. Ek central obstacle jo unhe apart rakhta hai, lekin dono ko clearly wrong nahi banata. Setting: modern India. Emotional register: bittersweet, slow burn, longing. Visual: warm light, crowded spaces, accidental proximity.

THRILLER: Ek cheez jo impossible lagti hai — lekin real hai. Protagonist ko pata chalta hai kuch aisa jo unhone jaanna nahi chahiye tha. Paranoia har episode mein badhti hai. Ep5 mein major twist jo perspective shift karta hai. Emotional register: dread, mounting suspense, unreliable reality. Visual: harsh light, empty streets, things that don't add up.

MYTHOLOGY: Ancient ya divine force ek ordinary Indian ki life mein ghus aata hai — bina permission ke. Protagonist chosen nahi hona chahte the. Power unhe seekhni padti hai, kyunki koi option nahi. Emotional register: epic, wonder, sacrifice ki cost. Visual: ancient symbols modern context mein, gold against concrete.

DRAMA: Ek family ya social system ke andar pressure — class, gender, expectation, loyalty. Protagonist ek impossible choice ke beech phansa hai jahan har option kuch lose karta hai. Koi villain nahi — sirf circumstances aur people doing their best. Emotional register: raw, intimate, moral weight. Visual: domestic spaces, hands, objects with history.

MYSTERY: Koi kuch chhupa raha hai — ya protagonist jaanna chahta hai koi truth jo sab ne accept kar li hai. Har episode ek nayi layer. Final truth more uncomfortable than the lie. Emotional register: curious, uneasy, revelatory. Visual: overlooked details, doors slightly ajar, things in the background.

Output sirf valid JSON. Koi extra text, explanation, ya markdown nahi.
```

### User Prompt

```
Story idea: "<user_prompt>"

Output this exact JSON:
{
  "genre": "ROMANCE or THRILLER or MYTHOLOGY or DRAMA or MYSTERY",
  "title": "2-4 word story title, Hinglish preferred",
  "city": "one Indian city name",
  "logline": "one sentence: who is the protagonist, what disrupts their world, what must be resolved",
  "mood": "one phrase describing the dominant emotional texture — e.g. 'quiet dread that builds to rupture' or 'bittersweet warmth with a dark undertow'",
  "story_rules": [
    "permanent fact about protagonist's specific situation — job, living arrangement, constraint — never changes across episodes",
    "key plot fact established in ep1 that cannot be contradicted later",
    "one specific world detail unique to this story that grounds it in a real place and time"
  ],
  "protagonist": {
    "name": "first name only, Indian name appropriate to city and genre",
    "age": <integer between 22 and 38 — do not use 24 as a default>,
    "wants": "what they consciously want — specific, not generic",
    "hides": "what they don't admit to anyone — the thing that makes them interesting",
    "speech_tic": "one SHORT, specific phrase describing how they speak Hinglish — e.g. 'ends sentences with 'bas' when trying to close a topic' or 'switches to full English when lying'"
  },
  "characters": [
    {"name": "first name", "role": "love_interest or antagonist or ally or unknown", "one_line": "who they are in one sentence — their function in the story, not just their job"}
  ]
}

IMPORTANT CONSTRAINTS:
- characters array: exactly 2–3 entries. No more. Every character must be introduceable in Ep1.
- story_rules: exactly 3 entries. Be specific — generic rules ("be consistent") are useless.
- mood: this will be passed to scene writers — make it atmospheric and usable.
- cover_prompt field is NOT in this output — it will be requested separately.
```

> **[NEW]** The cover prompt is now a second call or appended user message (see Stage 4 notes), so it doesn't compete for token space with the Bible fields.

### What Changed
- 3 genres → 5 genres (DRAMA and MYSTERY added)
- Each genre description expanded with emotional register and visual signature — gives the arc planner and scene writer a coherent tonal anchor
- `"age": 24` hardcoded default removed; explicit range and anti-default instruction added
- `characters` capped at exactly 2–3 with a rationale
- New `mood` field added — this flows into Stage 3 scene prompts
- `cover_prompt` separated from Bible output (reduces schema complexity and token competition)

---

## Stage 2: Arc Planner (6-Episode Structure)

**Model:** `gpt-4o`  
**Input:** Bible output from Stage 1

### System Prompt

```
Tu 6-episode interactive story plan kar raha hai Indian mobile audience ke liye.

**Story anchor (kabhi violate mat karna):**
Story rules: <story_rules from bible, joined by " | ">
Protagonist: <name>, age <age>. Wants: <wants>. Hides: <hides>.
Supporting characters: <name (role): one_line>
Logline: <logline>
Mood: <mood>

**[NEW] Emotional arc — har episode ek dominant internal state carry karta hai:**
Ep1 PULL — protagonist kisi aisi cheez ki taraf khinchta hai jo unhone avoid kiya tha
Ep2 GRIP — situation unke control se bahar hai, woh sirf react kar rahe hain
Ep3 DOUBT — unki strategy ne unhe galat jagah pahuncha diya hai
Ep4 BREAK — kuch valued chala gaya. Ye loss feel hona chahiye, explain nahi hona chahiye.
Ep5 CHOICE — yeh story ka asli fork hai. Protagonist define karte hain woh kaun hain.
Ep6 REST — earned quiet. Closure nahi — earned rest. Kuch resolve, kuch remain.

In emotional beats ko scene_jobs mein visible banana hai — explicitly state nahi karna, lekin har job is beat ko serve karni chahiye.

**[NEW] Cliffhanger rules:**
Har cliffhanger teen types mein se ek hona chahiye. Teeno 6 episodes mein rotate hone chahiye — ek type do baar se zyada nahi:

TYPE REVELATION: Kuch pata chala jo sab kuch reframe karta hai. Last line ek specific fact land karti hai jiske baad reader pichhe ke scenes differently dekhta hai. (e.g., "Woh phone Zara ka nahi tha. Woh uski sister ka tha. Jo six months pehle mar gayi thi.")

TYPE ARRIVAL: Koi ya kuch unexpected scene mein enter karta hai — ya protagonist ko pata chalta hai woh kahan hain ya woh sach kya hai. Abrupt. No warning. (e.g., "Lift ke darwaze khule. Aur woh khada tha. Uniform mein. Badge ke saath.")

TYPE IMPOSSIBLE MOMENT: Protagonist physically frozen hai — do truths face-to-face. Koi action nahi, sirf the weight of what they know. (e.g., "Ek taraf tha woh letter. Doosri taraf, window ke bahar, uski car. Dono usse kuch maang rahe the jo woh ek saath nahi de sakta tha.")

**BANNED cliffhanger structure:** "Agar X toh Y — lekin kya Z?" ya koi bhi rhetorical question structure. Cliffhanger ek statement ya image hai — question nahi.

Output sirf valid JSON. Koi extra text nahi.
```

### User Prompt

```
Plan all 6 episodes. Ep6 ka structure alag hai — carefully read karo.

Episode roles:
Ep1 HOOK (PULL): Mid-action se shuru — koi setup, backstory nahi. Scene 3 mein ek small revelation jo audience ko differently dekhne par majboor kare. Cliffhanger = TYPE REVELATION ya TYPE ARRIVAL.

Ep2 ESCALATION (GRIP): Ep1 problem thought se bada hai. Choice ka consequence visible hai aur woh expected nahi tha. Cliffhanger = any type except woh jo Ep1 mein use kiya.

Ep3 COMPLICATION (DOUBT): New information aati hai. Protagonist reasonable-sounding decision leta hai jo wrong direction mein jaata hai. Reader ko pata hona chahiye yeh mistake hai — protagonist ko nahi. Cliffhanger = type jo abhi tak least use hua ho.

Ep4 ALL IS LOST (BREAK): Lowest point. Jo valued tha woh chala gaya. Dono choices feel like loss — differentiate karo ki kitna kho jaata hai, kaise. Cliffhanger type = koi bhi.

Ep5 THE TURN (CHOICE): Sabse meaningful fork. Ek option safe but hollow, doosra risky but true. Reader genuinely uncertain feel kare — dono choices apni jagah valid lagein. Cliffhanger = TYPE IMPOSSIBLE MOMENT (always, for maximum impact).

Ep6 RESOLUTION (REST): Koi choice nahi. 3 scenes — closure. Ep1 ki ek image, object, ya line echo honi chahiye in Ep6. Satisfying, not explained.

**[CHANGED] Branch differentiation rule:**
Eps 2–5 ke liye scene_jobs_a aur scene_jobs_b FUNDAMENTALLY alag hone chahiye — sirf tone ya consequence nahi, ek KEY element ka world-state alag hona chahiye. Specifically: Choice A path mein ek character ya circumstance ki ek specific cheez hoti hai (woh present hai, woh trust karta hai, woh alive hai, woh jaanta hai), aur Choice B path mein woh same cheez nahi hoti. Scene jobs ko yeh clearly reflect karna chahiye.

Output JSON:
{
  "episodes": [
    {
      "number": 1,
      "title": "2-3 words, Hinglish preferred",
      "emotional_beat": "PULL — [one sentence describing the specific pull in this story]",
      "scene_jobs": [
        "scene 1: kya hota hai — specific action, not 'introduce protagonist'",
        "scene 2: kya hota hai",
        "scene 3: small revelation jo audience ko recontextualize karne par majboor kare"
      ],
      "cliffhanger": "prose statement or image — no rhetorical questions. TYPE: REVELATION or ARRIVAL",
      "cliffhanger_type": "REVELATION or ARRIVAL or IMPOSSIBLE_MOMENT",
      "choice_q": "question shown to user, Hinglish, max 12 words",
      "choice_a": {"label": "3-5 words", "sub": "cost or implication — what they gain AND what they risk, one sentence"},
      "choice_b": {"label": "3-5 words", "sub": "cost or implication — what they gain AND what they risk, one sentence"}
    },
    {
      "number": 2,
      "title": "...",
      "emotional_beat": "GRIP — [one sentence]",
      "scene_jobs_a": [
        "ep1 Choice A ka consequence — specific, not generic",
        "escalate karo — kya naya problem aa gaya",
        "ep2 revelation — kya pata chala"
      ],
      "scene_jobs_b": [
        "ep1 Choice B ka consequence — yeh A se FUNDAMENTALLY alag hai: [key element ka different state]",
        "different escalation — different stakes",
        "ep2 revelation — from B's vantage point"
      ],
      "cliffhanger": "...",
      "cliffhanger_type": "...",
      "choice_q": "...",
      "choice_a": {"label":"...","sub":"..."},
      "choice_b": {"label":"...","sub":"..."}
    },
    ... (eps 3–5 same shape as ep2)
    {
      "number": 6,
      "title": "...",
      "emotional_beat": "REST — [one sentence]",
      "scene_jobs": [
        "scene 1: [action that follows from ep5's choice — both A and B paths converge here or note divergence]",
        "scene 2: [the earned moment — what protagonist has understood]",
        "scene 3: [ep1 echo + final image]"
      ],
      "resolution_note": "one sentence: what is resolved, what remains open — the specific emotional texture of the ending"
    }
  ]
}

Choice rules: Choice A aur B morally opposite feel hone chahiye. Koi clearly correct nahi. choice_a.sub aur choice_b.sub mein ek gain aur ek risk dono hone chahiye.
```

### What Changed
- **Emotional beat** field added to every episode — flows into Scene Writer context
- **Cliffhanger typing** (REVELATION / ARRIVAL / IMPOSSIBLE_MOMENT) with rotation rule — prevents structural repetition
- **Banned cliffhanger formula** — "Agar X toh Y — lekin kya Z?" explicitly prohibited
- **Branch differentiation** upgraded from "clearly different consequences" to a structural rule: one key world-state element must differ between A and B paths
- **Ep6 schema** fixed — no `choice_q/a/b`, no `scene_jobs_a/b`; has `resolution_note` instead of `cliffhanger`
- **choice_a/b sub** now requires both gain AND risk — prevents one choice feeling obviously better

---

## Stage 3: Scene Writer (Per Episode, Per Branch)

**Model:** `gpt-4o-mini` (upgrade to `gpt-4o` strongly recommended)  
**Input:** Bible + episode plan + emotional beat + previous 3 lines + banned phrases  
**Called:** Up to 11 times (1 for ep1, 2 parallel for each of eps 2–6)

### System Prompt

```
Tu episode <N> ke 3 scenes likh raha hai ek Indian interactive story ke liye.

══════════════════════════════════════════
CRITICAL — PROTAGONIST KI AWAAZ
Naam: <name> | Umar: <age> | Genre: <genre>
Speech tic: <speech_tic>
Yeh tic protagonist ke HAR scene ke dialogue mein appear hona chahiye — exact phrase ya uska variation.
Agar ek bhi protagonist dialogue hai aur tic use nahi hua, output reject ho jaayegi.
══════════════════════════════════════════

Story rules (kabhi violate mat karna): <rules joined by " | ">
Characters: <name (role): one_line, ...>
Shehar: <city> | Mood: <mood>

Is episode ka emotional beat: <emotional_beat from arc>

<if not ep1: "Player ne pichle episode mein yeh choose kiya tha: <choice label>. Uska consequence is episode ki Scene 1 mein CLEARLY dikhna chahiye.">

<if not ep1: "Pichli episode ki aakhri teen lines:
1. <line 1>
2. <line 2>
3. <line 3>
Yahan se story ka thread pick up karo — continuity break nahi hona chahiye.">
<if ep1: "Yeh story ki pehli scene hai — seedha action ke beech mein shuru karo. Koi setup, backstory, ya character introduction nahi.">

SCENE 3 KA CLIFFHANGER:
Is episode ka anjaam is par khatam hona chahiye: "<cliffhanger text>"
Scene 3 ki AAKHRI LINE yeh cliffhanger ka prose mein echo hona chahiye — iska pulse, uska dread, uska unresolved weight. Exact copy mat karo — lekin same emotional punch. Yeh line standalone parhne par bhi reader ko rook le.

BANNED PHRASES — yeh bilkul mat likho, paraphrase bhi nahi:
<last 24 lines from bannedLines[]>

UNIVERSALLY BANNED (har story mein, hamesha):
"dil mein kuch", "aankhon mein", "ek pal ke liye", "kuch toh hai", "yeh sab kuch", "matlab kuch nahi tha", "pehli baar", any sentence starting with "Woh soch raha/rahi tha/thi ki"

Output sirf valid JSON. Koi extra text nahi.
```

### User Prompt

```
Scene jobs:
1. <scene_job_1>
2. <scene_job_2>
3. <scene_job_3>

══ LANGUAGE ══
Roman script Hinglish — Hindi aur English naturally mixed, jaise real urban Indian bolte hain. Na pure Hindi, na pure English. Sentence structure Hinglish ho sakta hai ("Woh already late tha, aur ab yeh"), vocabulary bhi.

══ SCENE RULES ══

EMOTIONAL TEMPERATURE: Teeno scenes ALAG emotional register mein hone chahiye.
- Agar Scene 1 high-tension hai → Scene 2 intimate/quiet → Scene 3 explosive ya resigned
- Teen same-mood scenes allowed nahi hain.

OPENING WORD RULE: Teeno scenes ke narrator ka pehla word ALAG hona chahiye — ek doosre se aur banned phrases se.

SENSORY GROUNDING: Har scene mein ek concrete sensory detail zaroor ho — SPECIFIC, not generic. Nahi: "chai ki khushbu." Haan: "Woh chai jo office pantry mein raat bhar rahi thi, already thandi, already forgotten."

SHOW DON'T TELL: Action aur emotion dikhao — explain mat karo. Narrator kabhi yeh nahi likhega "woh nervous tha." Woh nervous hone ki koi specific physical ya sensory cheez dikhayega.

══ NARRATOR ══
Third-person present tense. 2–3 sentences per scene. Last sentence next scene ko inevitable banaye ya tension badhaye — ya, Scene 3 mein, cliffhanger echo hona chahiye.

══ DIALOGUES ══
1 se 3 lines per scene. Direct, first-person, conversational.

ATTRIBUTION TAGS BILKUL NAHI. Sirf dialogue string hona chahiye.

GALAT ❌: "Rahul ne kaha, 'Main nahi jaaunga.'"
GALAT ❌: "\"Main nahi jaaunga,\" Rahul bola."
SAHI ✓: "\"Main nahi jaaunga.\""

Agar protagonist bol raha hai → speech tic use karo.

══ OUTPUT ══
{
  "scenes": [
    {"narrator": "...", "dialogues": ["...", "..."]},
    {"narrator": "...", "dialogues": ["..."]},
    {"narrator": "...", "dialogues": ["...", "..."]}
  ]
}
```

### Anti-Repetition System (unchanged architecture, improved triggers)

- A running `bannedLines[]` array accumulates narrator sentences and dialogues from all previous episodes
- Capped at 72 lines total; last 24 sent to each scene prompt
- Branch A and B banned lists are merged (both branches' phrases are banned for both)
- **[NEW]** Universal banned phrases list in system prompt catches genre-typical clichés regardless of what's been generated so far

### What Changed
- **Speech tic** elevated to a critical rule box at the top of the system prompt — visually separated, includes rejection warning
- **Attribution tags** given WRONG/RIGHT examples directly in the prompt — not just a rule, a demonstration
- **Scene 3 cliffhanger** instruction strengthened: last line must be an echo of the cliffhanger, specific guidance on what "echo" means
- **Emotional temperature rule** added: three scenes cannot share the same emotional register
- **Opening word rule** added: each scene's narrator must start with a different word
- **Sensory detail** instruction made more specific: generic examples prohibited, specific example given
- **Previous context** expanded from 1 line to 3 lines for better continuity
- **Universal banned phrases** added to system prompt (complements the per-story banned list)
- **[NEW]** `emotional_beat` from Arc Planner passed into each scene call

---

## Stage 4: Cover Image

**Model:** `gpt-image-1` (falls back to Pollinations.ai)  
**Input:** `bible.cover_prompt` (now generated as a separate focused call) + genre-specific style prefix/suffix

### Cover Prompt Generation [CHANGED]

Rather than including `cover_prompt` in the Stage 1 Bible JSON (where it competes for quality with character/story fields), it is generated as a **focused second call** after the Bible is assembled:

```
System: Tu ek Indian interactive fiction ke liye cover art describe kar raha hai. Output sirf ek paragraph — no JSON, no lists.

User:
Story title: <title>
Genre: <genre>
City: <city>
Mood: <mood>
Logline: <logline>
Protagonist: <name>, <age>, <wants>
Key characters: <character names and roles>

Ek cover image describe karo jo:
- Story ka mood capture kare (<mood>)
- Genre ke visual signature se match kare
- City ka ek specific, recognizable element include kare
- Foreground mein ek symbolic object ya motif ho — abstract, story-specific
- Background mein shehar ya setting ka silhouette ho
- KOI FACES NAHI. KOKO LOGO NAHI. KOI TEXT NAHI.
- Mobile vertical format (9:16) ke liye compose karo
- 40-60 words. Pure visual description.
```

### Style Prefixes by Genre [minor changes]

| Genre | Prefix |
|-------|--------|
| MYTHOLOGY | `cinematic Indian mythology, dramatic golden hour light shafts, ancient stone against modern city skyline, epic scale, rich amber and deep indigo palette, symbolic foreground object,` |
| THRILLER | `atmospheric Indian urban noir, harsh sodium streetlights, deep shadows, high contrast, one desaturated scene with single color accent — red or blue, sense of something wrong,` |
| ROMANCE | `warm Indian evening light, golden hour bokeh, intimate framing, bittersweet mood, one symbolic object in sharp foreground focus, soft city lights behind,` |
| DRAMA | `muted natural light, domestic Indian setting, texture-heavy — worn fabric, marked walls, objects with use, quiet weight, no drama — just truth,` |
| MYSTERY | `cool blue-grey Indian urban light, something in the frame that doesn't belong, foreground sharp and unsettling, background deliberately ambiguous,` |

**Common suffix (all genres):** `photorealistic, cinematic composition, no text, no faces, no people, no watermark, mobile vertical format 9:16`

### What Changed
- `cover_prompt` moved to its own focused generation call — better quality, less schema noise in Stage 1
- Composition guidance added: foreground symbolic object + city silhouette in background
- "No faces" → "no faces, no people" (stronger constraint)
- Style prefixes for DRAMA and MYSTERY added (new genres)
- 9:16 aspect ratio made explicit in suffix

---

## Assembly & Storage

After all stages complete, `assembleStory()` builds the final story object:

```json
{
  "title": "...",
  "genre": "ROMANCE | THRILLER | MYTHOLOGY | DRAMA | MYSTERY",
  "city": "...",
  "logline": "...",
  "mood": "...",
  "cover_img": "<Supabase Storage URL or empty>",
  "_creator": "<display name>",
  "episodes": [
    {
      "number": 1,
      "title": "...",
      "emotional_beat": "...",
      "scenes": [
        {
          "narrator": "...",
          "dialogues": ["...", "..."],
          "img": ""
        }
      ],
      "cliffhanger": "...",
      "cliffhanger_type": "REVELATION | ARRIVAL | IMPOSSIBLE_MOMENT",
      "choice_q": "...",
      "choice_a": { "label": "...", "sub": "..." },
      "choice_b": { "label": "...", "sub": "..." },
      "branch_scenes": {
        "A": [ ... ],
        "B": [ ... ]
      }
    },
    ...
    {
      "number": 6,
      "title": "...",
      "emotional_beat": "...",
      "scenes": [ ... ],
      "resolution_note": "..."
    }
  ]
}
```

New fields vs v1: `mood` (top level), `emotional_beat` (per episode), `cliffhanger_type` (per episode), `resolution_note` (ep6 only, replaces `cliffhanger` + `choice_*`).

Saved to:
1. **localStorage** (`katha_stories_v1`) — base64 images stripped, Pollinations URLs substituted
2. **Supabase DB** (`public.stories`) — cover_img is Supabase Storage URL; all other images empty

---

## Known Architecture Gaps (unchanged from v1 — for discussion with Man)

### Content Quality
- [ ] No scene images per episode — only a cover image. Each scene shows a static fallback color.
- [ ] No per-scene image generation (would add 18+ more image calls = ~$0.50/story)
- [ ] gpt-4o-mini loses character voice across 11 calls — no persistent memory between calls. **Mitigation:** upgrade to gpt-4o for Stage 3.
- [ ] No quality gate — pipeline ships whatever the model returns, no validation pass

### Architecture
- [ ] All 4 stages run sequentially (except the parallel A/B scene calls) — no streaming
- [ ] User sees a loading screen for 3–8 minutes with no partial content
- [ ] No partial save — if the pipeline crashes at ep4, nothing is saved
- [ ] The proxy server is a single point of failure — no fallback
- [ ] No JSON validation/retry — if any stage returns malformed JSON, pipeline crashes

### User Experience
- [ ] No playback images — story player shows only text + color gradient
- [ ] No audio per scene — only one background music track for the whole story
- [ ] No "preview before generate" — user commits to a full generation without seeing a teaser
- [ ] My Stories count is limited by localStorage (5MB cap) — base64 images get stripped

---

*v1: 2026-05-17 | v2: 2026-05-18 | Code: `index.html` in katha repo*
