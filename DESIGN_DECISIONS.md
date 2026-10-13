# SIDELINE — Design Decisions & Inspiration Analysis

This document explains how the three reference applications (Ref A, Ref B, and Ref C) guided the visual and experiential architecture of **SIDELINE**, what principles were adopted, and what was intentionally changed or harmonized to avoid stylistic conflict.

---

## 1. Reference A: Dark Live-Score App

### What We Took
- **Near-Black Canvas with Electric Lime Punch**: The near-black foundation (`#0B0F0C`) with a subtle deep emerald undertone evokes "stadium floodlights at night". Lime (`#C8FF2E`) is used with discipline (occupying ≤10% of standard screens) so its presence commands instant focal authority for CTAs, live clocks, and active states.
- **The Signature Lime Notch Card**: The hero "Top Events" card is flooded in solid electric lime with dark ink text. Crucially, its bottom edge features a smooth concave arch notch, visually locking into and "tucking" the subsequent dark live match card below it.
- **Tabular Figures & Clocks**: Large tabular numbers for scores (`tabular-nums`) and elapsed minutes (`HT 58'`) ensure numbers never jitter during score updates.
- **Live Stream Player with Frosted Scrubber Sheet**: Full-bleed portrait broadcast preview paired with a frosted glass bottom sheet (`backdrop-blur-24px`), an electric lime thumb scrubber, and quick-action pills.

### What Was Intentionally Changed
- **Gambling to Free Fan Predictions**: Instead of real-money gambling mechanics or betting odds, we introduced free-to-play predictive polls where fans wager and win Playmaker XP points to level up their squad rank. This preserves high-stakes fan engagement while remaining safe, social, and community-friendly.

---

## 2. Reference B: "Pitchup" Community App

### What Was Took
- **Flat Poster-Style Vector Illustrations**: Flat, graphic vector scenes built entirely with clean geometric paths (stadium stands under floodlights, goalposts on clay, basketball dusk, tennis aerial, runner silhouette) in a strict palette of deep forest green (`#0F2A22`), clay red (`#C8432B`), electric lime (`#C8FF2E`), soft pink (`#FF8FC7`), and off-white.
- **Two Big Colorful Action Tiles**: The community hub hero features two prominent, thumb-friendly 112px action tiles: **"create match"** flooded in lime, and **"join match"** flooded in soft pink, each featuring circular line icons.
- **Roster Capacity & Urgency Signifiers**: Match list cards feature clean sport tiles, title, schedule, and immediate roster density indicators (`8/10 joined` with avatar stacks and high-urgency pink pills `2 spots left!`).
- **Playmaker Level & Stat Archetypes**: The profile embraces gamification with a Level 18 "Playmaker" badge, circular XP progress ring, and 4 clean stat tiles (Matches, Wins, Goals, Assists).

### What Was Intentionally Changed
- **Stylistic Containment**: Rather than having flat illustrations dominate entire interactive screens (which can feel juvenile or distract from data density), illustrations are strictly reserved for hero banner headers, empty states, and celebratory wizard success states. Dark UI cards remain clean and content-focused.

---

## 3. Reference C: "Tennis Zone" Booking App

### What Was Took
- **Light-Surface Venue Cards on Dark Canvas**: Distinctive `#F5F7F2` light-surface cards with `#0B0F0C` ink text and high-resolution sports photography. When placed against the dark background, these cards pop forward with premium retail presence, instantly signaling bookable real-world physical spaces.
- **Circular Date Chips & Pill CTA with Trailing Arrow**: The reservation flow uses circular date chips that turn solid lime when selected, paired with a full-width pill CTA button containing a high-contrast circular black trailing arrow button inside.
- **Floating Pill Bottom Navigation**: A 5-slot floating glass pill bar (`backdrop-blur-2xl`) where the active tab dynamically expands with a lime pill fill and readable label.
- **Showcase Presentation Canvas**: The `/showcase` route adopts the Dribbble/Behance presentation method with soft dark-to-olive ambient gradients and faded, blurred "ghost" screen rows above and below the hero interactive row.

### What Was Intentionally Changed
- **Overcoming Photo Fatigue**: Rather than relying exclusively on macro photography everywhere (which can make an app feel like an uncurated directory), photography is used only for real physical venues and live video streams. Illustrations and clean UI tokens handle community and score features.

---

## 4. Harmonization Matrix: How the Three Worlds Coexist

| Dimension | Live Scores (Ref A) | Community & Pickup (Ref B) | Venue Booking (Ref C) | SIDELINE Synthesis |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas** | Near-black `#0B0F0C` | Forest green `#0F2A22` | Light card `#F5F7F2` | Dark canvas base; forest headers for social; light cards for venues |
| **Accent Primary** | Electric Lime `#C8FF2E` | Lime & Forest | Lime & Black | Lime is universal primary CTA & live highlight (≤10%) |
| **Accent Secondary**| Subtle stroke | Soft Pink `#FF8FC7` | Frosted White | Pink is exclusive to community, social invites, and urgency |
| **Art Style** | Tabular numbers & data | Flat graphic poster art | Macro photography | Illustrations in headers/empty states; photos in venues/video |
| **Typography** | Technical tabular | Bold poster titles | Clean sans & Serif | Sora (600/700) + Inter Tight + Instrument Serif italic accent |

---

## 5. Accessibility & Engineering Quality Standards

1. **Touch Targets**: All interactive buttons, chips, and icons maintain strict minimum touch targets of 44×44px with active tactile scale compression (`press-scale`: `transform: scale(0.97)`).
2. **Contrast Standards**: All text passes WCAG AA contrast (4.5:1 for body, 3:1 for large display). All text over electric lime uses pure dark ink `#0B0F0C` (contrast ratio 15.8:1).
3. **Motion & Performance**: Hardware-accelerated CSS transforms and opacity; reduced motion compatibility.
4. **Decoupled Architecture**: 100% typed models in `/src/mock/`, reusable components in `/src/design-system/components/`, and instant app renaming via `APP_CONFIG`.
