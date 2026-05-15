# Katha — Interactive Story Platform

A mobile-first interactive story prototype for Hinglish-speaking Tier 2/3 India.

## What's in this repo

| File / Folder | What it is |
|---|---|
| `index.html` | **Main prototype** — open this in any browser |
| `Katha Wireframes.html` | Lo-fi wireframe pitch deck (10 screens, safe + bold variants) |
| `images/` | AI-generated scene images for the mythology story |
| `audio/` | Background score for the mythology story |
| `katha-idea-writeup.md` | Full product concept & investor writeup |
| `product-design-doc.md` | Detailed product spec v1.2 |
| `figma-design-prompts.md` | Figma prompts for all 10 screens |
| `tweaks-panel.jsx` | React component used in the wireframe deck |
| `prototype.html` | Earlier iteration (kept for reference) |

## How to run locally

No build step needed. Just open `index.html` in Chrome or Safari:

```bash
open index.html
```

Or serve it locally (avoids any browser audio restrictions):

```bash
npx serve .
# then open http://localhost:3000
```

## Live demo

[https://nabhgarg.github.io/katha/](https://nabhgarg.github.io/katha/)

## Story in the prototype

**Kashi Ka Khazana** — Mythology  
A 10th-generation Bangalore resident inherits a dream from a Kashi king. 6 episodes, 5 choice points, branching ending. All scenes use AI-generated images + a background score.

## To make changes and push

```bash
# edit index.html, then:
git add -A
git commit -m "your change description"
git push
```

GitHub Pages auto-deploys within ~1 minute of each push.

---

*Katha — 2026 · PM + Manavi (Design) + Dev (Engineering)*
