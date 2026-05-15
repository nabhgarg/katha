# Katha — Figma Design Prompts
**For use with Claude Design / Figma AI / Figma Make**
**Hand to designer with product-design-doc.md as the full spec reference**

---

## How to use these prompts

Each prompt below is for one screen. Paste into Claude Design (claude.ai/code or Figma Make). Add this context block before each prompt:

> **App:** Katha — interactive story platform for Tier 2/3 India (Hinglish)
> **Design language:** Dark cinematic. Background always `#08080F`. Font: Poppins. Genre accent colors: Romance `#FF2D78`, Thriller `#00C9C8`, Mythology `#FFB020`. No light mode. Mobile-first, 375×812px.

---

## Screen 1 — Home / Feed

**Prompt:**
Design a full-screen mobile story card for a dark cinematic app called Katha. This is a TikTok/Reels-style vertical scroll feed where each story fills the entire 375×812px screen.

The card has these layers from back to front:
1. A full-bleed AI-generated scene image (use a dramatic thriller/romance/mythology scene as placeholder)
2. A subtle dark gradient overlay at the bottom 40% (top: transparent → bottom: #08080F at 80%)
3. Top-left: small semi-transparent × button (20×20px, white, 60% opacity) for exiting a story
4. Top-left below ×: Story title in Poppins 700 white, 20px, with a genre badge pill below it (Romance: #FF2D78 background, "Romance" text in white Poppins 600 12px, 100px border radius)
5. Bottom-left: Story hook text — 2 lines of Poppins 400 white 16px with text-shadow. Below that: "By Priya M · 6 Episodes" in #A0A0B8 Poppins 400 13px
6. Right side: vertical stack of 3 icon buttons (heart, share arrow, with 44×44px tap targets, white icons, #1A1A2E circle backgrounds)

Background is #08080F for the screen. Show the full feed with this one story card filling the screen. Show the tab bar at the bottom: 3 tabs labeled "Home · Create · Profile" in white Poppins 600 14px, on #08080F with a 1px #1A1A2E top border.

---

## Screen 2 — Story Player (Scene View)

**Prompt:**
Design a full-screen mobile story player screen for a dark cinematic app called Katha. Background: #08080F. Screen size: 375×812px.

Layout from top to bottom:
1. **Top bar:** Left: small × button (20×20px, white 60% opacity). Center: episode progress dots — 6 small circles, first 2 filled in Romance pink #FF2D78 with a soft pulse glow on the current dot, remaining 4 empty white outline circles. Poppins 500 13px.
2. **Scene progress bar:** Full-width thin bar (4px height) below top bar. 3 segments separated by 2px gaps. First segment fully filled in #FF2D78. Second segment half-filled. Third empty. Shows 3 scenes per episode.
3. **Full-bleed scene image:** A dramatic, cinematic still of a South Asian woman standing in a dark hallway at night, film noir style, AI-generated aesthetic. Fills most of the screen.
4. **Bottom panel (bottom 30% of screen):** Semi-transparent #08080F background at 85% opacity. Contains:
   - Narration line: "Ek awaaz aai — ghar mein koi hai." in Poppins 600 18px, color #FF2D78 (genre color), with a subtle #FF2D78 10% opacity background tint on the text block and an underline. This is the "highlighted narration" state.
   - Below narration: 2 lines of body text in Poppins 400 15px #A0A0B8: "The house was silent except for the slow creak of the door at the end of the hall..."
   - Audio bars: 3 vertical bars, each 4px wide, animating in heights (#FF2D78 color), spaced evenly
   - Bottom-right: "Next →" button in Poppins 600 14px #FF2D78, appears after narration

Show no back button. The × in top-left is the only exit.

---

## Screen 3 — Choice Screen (Episode End / Cliffhanger)

**Prompt:**
Design a full-screen mobile cliffhanger/choice screen for Katha. This is the most emotionally intense screen in the app. Background: #08080F. Screen size: 375×812px.

1. **Background:** The last scene image from the episode, blurred (15px gaussian blur) and darkened with a 60% black overlay. Creates a dramatic, tense atmosphere.
2. **Gradient overlay:** Strong dark vignette from all edges.
3. **Center content (vertically centered):**
   - Question text: "What happens next?" in Poppins 700 22px white, centered
   - 24px gap
   - **Option A card:** Full-width card (#1A1A2E background, 12px border radius, 4px left border in #FF2D78). Inside: "Call your friend for help" in Poppins 500 16px white, with 16px padding. 60px tall.
   - 16px gap  
   - **Option B card:** Same dimensions as Option A but with 2px white #FFFFFF border (neutral, not selected state). "Go outside alone to investigate" in Poppins 500 16px white.
4. **Bottom:** "1,247 played this story" in Poppins 400 13px #A0A0B8, centered
5. **× button** at top-left, white 60% opacity

Show this as the default (no selection made yet) state. Option A has the genre-color left border accent. Option B has the white neutral border.

---

## Screen 4 — Create Screen

**Prompt:**
Design a clean, minimal mobile create/prompt screen for Katha. Background: #08080F. Screen size: 375×812px.

Layout top to bottom:
1. **Title:** "Create a Story" — Poppins 700 22px white, top area, with standard status bar above it
2. **Text input area:** Large rounded rectangle (#12121C background, 12px radius, 1px #1A1A2E border). 4 lines visible. Placeholder text in #A0A0B8 Poppins 400 15px: "Koi bhi ek idea likho — jaise: 'Raat ko phone aaya, number tera tha, tu saath mein tha'" (This is Hinglish — keep as-is). Character count "0/200" in bottom-right of the input box in #A0A0B8 13px.
3. **"Need ideas?" section:** Label in Poppins 600 15px white. Below it: a 3×2 grid of small chip buttons (#1A1A2E background, 100px border radius, Poppins 400 13px white text, ~16px padding). Each chip contains a short Hinglish story prompt snippet (e.g., "Raat ko phone aaya...", "Ladki rich, ladka...", "Hanuman ji ne..."). 6 chips total.
4. **Primary button:** "Create Story →" — full-width pill button (100px radius), gradient background left to right: #FF2D78 to #00C9C8, Poppins 600 16px white text. Fixed at bottom above tab bar.

Tab bar visible at bottom.

---

## Screen 5 — Generating Screen

**Prompt:**
Design a full-screen mobile "story generating" wait screen for Katha. Background: #08080F. Screen size: 375×812px. This screen manages a 3-8 minute AI generation wait — it should feel like anticipation, not delay.

Layout:
1. **Top area (centered):** A cinematic animation placeholder — design a circular mandala-like loader in Romance pink #FF2D78, geometric and elegant, approximately 120×120px. (For Thriller this would be flickering scan lines, for Mythology a gold mandala — show Romance variant.)
2. **Headline:** "Your story is being born" — Poppins 700 20px white, centered, below the loader
3. **Genre badge (revealed moment):** A pill badge — #FF2D78 background with "✓ Romance detected!" in Poppins 600 14px white, with a small checkmark icon. This appears after ~20 seconds and feels like a magical reveal. Small link text below: "Change genre?" in #A0A0B8 underlined Poppins 400 13px.
4. **Progress tracker:** Vertical list of steps, left-aligned, with 12px spacing:
   - "✓ Prompt analyzed" — #FF2D78 checkmark + Poppins 400 15px #A0A0B8 strikethrough text
   - "✓ Genre classified" — same
   - "○ Writing the story..." — pulsing grey circle + Poppins 400 15px white (current active step)
   - "○ Generating images" — grey circle + #A0A0B8 text
   - "○ Adding narration" — grey circle + #A0A0B8 text
   - "○ Final touches" — grey circle + #A0A0B8 text
5. **Time estimate:** "~4 minutes remaining" — Poppins 400 14px #A0A0B8, centered
6. **Secondary CTA:** "Browse stories meanwhile" — ghost button (transparent, 1px white border, 100px radius, Poppins 500 14px white), centered near bottom

---

## Screen 6 — Profile

**Prompt:**
Design a mobile profile screen for Katha. Background: #08080F. Screen size: 375×812px.

Layout:
1. **Top bar:** Gear icon (settings) at top-right, white
2. **Avatar row:** Circle avatar (48×48px) — shows the letter "P" in Poppins 700 white on a #FF2D78 background circle. Right of avatar: username "Priya M" in Poppins 700 18px white, and "Member since May '26" in Poppins 400 13px #A0A0B8
3. **Stats row:** Three stat boxes side by side (#12121C background, 12px radius), each showing:
   - Number in Poppins 700 22px white
   - Label in Poppins 400 13px #A0A0B8
   - Values: "12 / Created", "47 / Played", "1.2K / Views"
4. **"MY STORIES" section:** Section header in Poppins 600 13px #A0A0B8 uppercase with 8px tracking. Below: a 2-column grid of story thumbnail cards. Each card: 9:16 aspect ratio with a scene image, story title overlay at bottom in Poppins 500 13px white with a gradient, and a thin 2px Romance-pink border. Show 4 cards in 2 rows.
5. **"PLAYED" section:** Same format as above, showing 2-4 more story cards with mixed genre colors (one pink border = Romance, one teal = Thriller)

Tab bar visible at bottom with "Profile" tab active.

---

## Screen 7 — Onboarding / Splash

**Prompt:**
Design a mobile app splash/launch screen for Katha — a cinematic interactive story platform. Background: pure black #000000 (different from the app's #08080F for maximum drama).

Center of screen:
- The word "Katha" in Poppins 700 48px white — elegant, confident. A single period after it (stylized dot).
- Below it: "Your story. Your choice." — Poppins 400 16px #A0A0B8, center-aligned

That's it. No logo marks, no icons, no buttons. Just the wordmark and tagline on black. Very cinematic, like a film title card.

Show this in a phone frame.

---

## Screen 8 — Story End Screen

**Prompt:**
Design a mobile story completion screen for Katha. Background: #08080F. Screen size: 375×812px.

This shows after a user finishes all 6 episodes of a story. The tone should feel emotional and satisfying — like the end of a great film.

Layout:
1. **Background:** The last scene image dimmed to 70% opacity, covering the full screen. Dark vignette overlay.
2. **Center content:**
   - "Story Complete!" in Poppins 700 24px white, centered
   - Story title "Raat Ka Rahasya" in Poppins 600 18px #FF2D78, centered (genre color)
   - 24px gap
   - "Your path:" in Poppins 400 14px #A0A0B8, left-aligned
   - Branch path text: "Riya trusted → Veer left → They met again" in Poppins 500 16px white, with → arrows in #FF2D78
3. **Action buttons (stacked, centered):**
   - "Try different choices" — solid button, #1A1A2E background, 100px radius, Poppins 600 15px white
   - "Share your ending" — gradient button #FF2D78→#00C9C8, 100px radius, Poppins 600 15px white (the viral share card CTA)
   - "Back to Feed" — ghost button, 1px white border, 100px radius, Poppins 500 14px #A0A0B8
4. **Top:** Small genre-color particle burst effect (subtle, a few floating dots in Romance pink)

---

## Screen 9 — Error / Offline State

**Prompt:**
Design a mobile offline/error state for the feed screen in Katha. Background: #08080F. Screen size: 375×812px.

Show the Home/Feed screen but with a non-blocking banner at the very top (below the status bar): a narrow pill banner in #1A1A2E with a small wifi-off icon and "No connection — showing saved stories" in Poppins 400 13px #A0A0B8. The rest of the feed shows story cards with a slight opacity reduction (85%) and a small grey "offline" label overlaid on the audio bars (no audio indicator). Stories are still browsable.

The banner is the only indicator — the experience continues. This is not a full error screen — it is a graceful degradation.

---

## Screen 10 — Phone Recovery / Registration

**Prompt:**
Design a mobile bottom sheet overlay for Katha. This appears over the Generating screen 3 seconds after a user submits their first story prompt.

The bottom sheet slides up from the bottom: #12121C background, 24px top border radius, drag handle at top.

Content:
- Title: "Save your stories" — Poppins 700 18px white
- Subtext: "Link your phone — if you reinstall or change phones, your stories are safe." — Poppins 400 14px #A0A0B8
- Phone input field: #08080F background, 12px radius, "+91" prefix in Poppins 500 16px white, input for phone number, 1px #1A1A2E border
- "Get OTP" button: full-width, #FF2D78 to #00C9C8 gradient, 100px radius, Poppins 600 15px white
- Below button: "Skip" link in Poppins 400 14px #A0A0B8 underlined, centered

The Generating screen is visible behind the sheet (dimmed 50%). The sheet takes up roughly the bottom 45% of the screen.

---

## Design System Reference

**For Manavi:** Set up Figma variables for all these tokens before starting screens.

| Variable name | Value |
|---------------|-------|
| color/bg | #08080F |
| color/surface | #12121C |
| color/surface-raised | #1A1A2E |
| color/accent-romance | #FF2D78 |
| color/accent-thriller | #00C9C8 |
| color/accent-mythology | #FFB020 |
| color/text-primary | #FFFFFF |
| color/text-secondary | #A0A0B8 |
| font/family | Poppins |
| font/weight-body | 400 |
| font/weight-label | 600 |
| font/weight-headline | 700 |
| radius/card | 12px |
| radius/sheet | 24px |
| radius/pill | 100px |
| size/tap-target | 44px |

**Genre badge specs:**
- Romance: `#FF2D78` bg, white text, "Romance"
- Thriller: `#00C9C8` bg, white text, "Thriller"
- Mythology: `#FFB020` bg, dark text (#08080F for legibility), "Mythology"
- Pre-classification: gradient #FF2D78→#00C9C8 bg, white text, "Classifying..."

**Ken Burns animation specs:**
- Feed card: 1.0 → 1.05 scale, 6 seconds, ease-in-out, holds at 1.05 until card scrolls away
- Player: 1.0 → 1.02 scale, 8 seconds, ease-in-out (subtler in player)

---

*Katha — Figma Design Prompts v1.0 | 2026-05-14*
*Reference: product-design-doc.md v1.2 for full spec*
