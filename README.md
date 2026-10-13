
## ⚡ Quick Start & Running Locally

The prototype runs on **Vite + React 19 + TypeScript + Tailwind CSS**:

```bash
# Start the SIDELINE Vite development server (port 5173)
npm run dev:vite

# Or build the production bundle
npm run build:vite
```


### Primary Showcase Routes
- **`/` or `/home`**: Single 390×844 hardware phone chassis mode with interactive screen switcher (instant jump to any of the 28 screens) and bottom navigation.
- **`/showcase`**: Dribbble & Behance master presentation canvas on a soft dark-to-olive gradient background showing live, interactive phone frames organized by flow with faded ghost screen reflections.
- **`/styleguide`**: Storybook-style interactive gallery documenting every design token, typographic scale, component primitive, and vector asset.


---

## 🎨 Design System & Token Reference

### 1. Color Palette Tokens

| Token Name | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `bg-base` | `#0B0F0C` | Near-black canvas with emerald stadium undertone |
| `bg-forest` | `#0F2A22` | Deep forest green for illustrated headers & community zones |
| `surface-1` | `#141A15` | Default elevated container & card surfaces |
| `surface-2` | `#1C241E` | Raised interactive surfaces, form inputs, secondary chips |
| `surface-3` | `#263028` | Hover, pressed states, borders, and dark dividers |
| `accent-lime` | `#C8FF2E` | Electric hero accent (CTAs, live highlights; ≤10% of screen) |
| `accent-lime-ink` | `#0B0F0C` | High-contrast dark ink text on all lime surfaces |
| `accent-pink` | `#FF8FC7` | Secondary vibrant accent (social actions, urgency badges, join) |
| `accent-clay` | `#C8432B` | Tennis clay, pitch illustrations, and tactical markers |
| `live-red` | `#FF3B30` | Pulsing LIVE badges and elapsed game indicators |
| `win-green` | `#3DDC84` | Positive delta, form guide 'W' |
| `loss-red` | `#FF5C5C` | Form guide 'L' |
| `draw-amber` | `#FFC247` | Form guide 'D' |
| `text-primary` | `#F4F7F0` | High-contrast off-white body and display text |
| `text-secondary` | `#A5B0A6` | Balanced muted green-gray supporting metadata |
| `text-tertiary` | `#6F7B71` | Micro timestamps, captions, and disabled icons |
| `light-surface` | `#F5F7F2` | Distinctive venue card background (Ref C) with `#0B0F0C` text |

*Light Mode Variant*: Toggleable via Settings screen (`/settings`), mapping to clean `#F3F5F1` canvas with consistent lime and pink accents.

### 2. Typography Hierarchy

- **Display & Headings**: `Sora` (Weights 600, 700, 800) with `-0.02em` tracking.
- **Editorial Emphasized Accent**: `Instrument Serif` Italic (used for exactly one focal phrase per hero header, e.g., *"Choose your Favorite game"*).
- **Body & UI**: `Inter Tight` (Weights 400, 500, 600).
- **Tabular Figures**: Numeric data, scores, clocks, and stats use `font-variant-numeric: tabular-nums`.

### 3. Geometry & Signature Shapes
- **Signature Notch Card**: An SVG concave cutout (arch radius 24px) at the bottom edge of the flooded lime hero card, tucking the next dark card in.
- **Radii**: Buttons/Pills `9999px`, Outer Containers `28px`, Inner Tiles `20px`, Inputs `16px`, Avatars `50%`.

---

## 📱 Component Usage Guide

All components live in [`src/design-system/components/`](file:///c:/Users/kriss/matchi/src/design-system/components):

### Primary & Pill CTA Buttons
```tsx
import { Button } from '@/design-system/components/Button';

// Primary Electric Lime Button
<Button variant="primary">Join Match Now</Button>

// Ref C Pill CTA with Trailing Black Arrow Circle
<Button variant="pill-arrow" onClick={handleBooking}>
  Booking Now • £54
</Button>
```

### Date Strips
```tsx
import { DateStrip } from '@/design-system/components/DateStrip';

// Ref A 7-Day Pill Strip with Lime Highlight Ring
<DateStrip selectedId="d2" onSelect={setDate} variant="pill-week" />

// Ref C Circular Date Chips for Court Booking
<DateStrip selectedId="d6" onSelect={setDate} variant="circular-booking" />
```

### Action Tiles (Ref B Community)
```tsx
import { ActionTiles } from '@/design-system/components/MatchCard';

<ActionTiles
  onCreate={() => navigateTo('create-match')}
  onJoin={() => navigateTo('find-games')}
/>
```

### Venue Card (Ref C Light Surface)
```tsx
import { VenueCard } from '@/design-system/components/VenueCard';

<VenueCard venue={venue} onClick={() => openVenue(venue)} />
```

### Digital Ticket Pass
```tsx
import { BookingPass } from '@/design-system/components/BookingPass';

<BookingPass
  venue={venue}
  courtName="Court 2 (Clay)"
  dateStr="Sat, 17 Oct"
  timeSlot="10:00 - 11:30 AM"
  totalPaid={54}
/>
```

---

## 🗺️ 28-Screen Architecture Map

| Flow | Screens Included |
| :--- | :--- |
| **1. Onboarding & Auth** | 01. Splash, 02. 3-Slide Carousel, 03. Sign In / Auth, 04. Personalization |
| **2. Home** | 05. Discover Feed & Lime Notch Hero |
| **3. Live & Scores** | 06. Live Scores Hub, 07. Match Center (Momentum & Lineups), 08. Live Broadcast & Predictions, 09. Standings Table, 10. Club & Player Profile |
| **4. Community** | 11. Social Hub, 12. 4-Step Match Wizard, 13. Find Games (Map/List), 14. Match Detail, 15. Group Chat & Poll, 16. Post-Match MVP & Story |
| **5. Venues & Booking** | 17. Light Venue Cards List, 18. Venue Specs & Parallax, 19. Booking Flow, 20. Payment Checkout, 21. Digital QR Ticket Pass, 22. My Reservations |
| **6. Profile & Utility** | 23. Player Profile & XP Ring, 24. 3-Tier Podium, 25. Notifications Center, 26. Global Search, 27. Settings & Theme, 28. System States |

---

## 📄 License & Attribution
Proprietary design architecture built for SIDELINE. Fictional club identities, original vector scenes, and token structures are fully modular and extensible.
