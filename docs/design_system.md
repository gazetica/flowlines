# Design System Reference
**Numtap | Gazetica Studio | VDD v1.1 Signed Off 02 June 2026**

---

## Colours

| Token | Hex | Usage |
|---|---|---|
| `--navy` | `#07111F` | Page background |
| `--navy-card` | `#0F2040` | Cards, tiles, surfaces |
| `--navy-border` | `#1A3558` | All borders |
| `--gold` | `#FFD700` | Primary CTA, next target tile, active states |
| `--gold-dim` | `#C8A800` | Gold gradient endpoint |
| `--blue` | `#1E8BC3` | Secondary, info, HUD border |
| `--blue-light` | `#4FAEE0` | Blue text on dark bg |
| `--white` | `#EEF4FF` | Body text |
| `--muted` | `#5E7A9C` | Labels, captions, placeholder |
| `--success` | `#2ECC71` | Correct tap, tapped tile |
| `--danger` | `#E05050` | Wrong tap, timer ≤10s |

---

## Typography

| Use case | Font | Size | Weight |
|---|---|---|---|
| App name, screen titles | Space Mono | 22–32px | 700 |
| HUD values, level numbers | Space Mono | 13–18px | 400 |
| Numbers in grid tiles | Space Mono | 12–16px | 400 |
| Body text, descriptions | DM Sans | 14–16px | 400 |
| Labels, captions, nav | DM Sans | 10–13px | 400 |
| Buttons | Space Mono | 9–11px | 700 |

---

## Tile States (apply in GameScene render)

| State | Background | Border | Text | Glow |
|---|---|---|---|---|
| Default | `gradient(145deg, #0F2A48, #0A1E38)` | `rgba(30,139,195,0.35)` | `#EEF4FF` | None |
| Next target | `gradient(145deg, #FFD700, #C8A800)` | `#FFD700` | `#07111F` bold | `0 0 14px rgba(255,215,0,0.45)` |
| Tapped | `gradient(145deg, #0d2a1a, #091f12)` | `rgba(46,204,113,0.5)` | `#2ECC71` ✓ | `0 0 8px rgba(46,204,113,0.15)` |
| Wrong (400ms) | `#2a0d0d` | `#E05050` | `#E05050` ✗ | None |
| Fog hidden | `gradient(145deg, #0A1628, #050D1A)` | `rgba(30,139,195,0.1)` | none | None |

---

## Background Skin (all screens)

```css
/* Base */
background: #07111F;

/* Dot pattern overlay */
background-image: radial-gradient(circle, rgba(30,139,195,0.12) 1px, transparent 1px);
background-size: 18px 18px;
opacity: 0.6;

/* Radial ambient glow (centred on play area) */
background: radial-gradient(ellipse, rgba(255,215,0,0.07) 0%, rgba(30,139,195,0.05) 40%, transparent 70%);

/* Floating particles */
/* Animated canvas: random numbers 1–49, Space Mono 10–16px, */
/* rgba(255,215,0,0.05–0.08) opacity, drifting upward ~0.2px/frame */
```

---

## Buttons

```css
/* Primary (gold) */
background: linear-gradient(135deg, #FFD700, #C8A800);
color: #07111F;
font: Space Mono 10–11px bold;
letter-spacing: 1.5px;
border-radius: 7px;
box-shadow: 0 0 16px rgba(255,215,0,0.35), 0 4px 12px rgba(0,0,0,0.4);

/* Secondary (outline) */
background: rgba(10,26,46,0.7);
border: 1px solid rgba(30,139,195,0.4);
color: #4FAEE0;
font: Space Mono 9px;
border-radius: 7px;
```

---

## App Icon Spec

- Size: 512×512px (Play Store), 192×192, 48×48 (launcher)
- Background: `#0F2040` (deep navy)
- Foreground: Bold "N" letterform in `#FFD700`
- Ring: Circular gold ring around the N, 2.5px stroke
- Border radius: 18dp (Play Store adaptive icon)
- No gradients on icon. Simple, readable at all sizes.

---

## Screen Inventory (12 screens — all signed off)

| ID | Screen | Notes |
|---|---|---|
| VD-01 | Splash | 2–3s, gold loading bar, preloads assets |
| VD-02 | Home | No ads. Gold PLAY NOW CTA. Streak display. |
| VD-03 | Active Game | No ads. Gold next-target tile pulses. |
| VD-04 | Paused | Overlay 85% opacity. 3 buttons only. |
| VD-05 | Result | Interstitial here (1/3min cap). Star rating. |
| VD-06 | Leaderboard | Anonymous. 3 tabs. |
| VD-07 | Settings | Toggles + language + IAP. |
| VD-08 | IAP | 2 products. Localised runtime prices. |
| VD-09 | GDPR Consent | EU first launch only. UMP SDK. |
| VD-10 | About / Legal | Links to gazetica.com/privacy and /terms. |
| VD-11 | How to Play | 3-page carousel. Interactive demo grid. |
| VD-12 | Language Selection | 6 languages. Auto-detect. First launch only. |

---

## Tailwind Class Conventions

```
bg-[#07111F]     → page background
bg-[#0F2040]     → card/surface
border-[#1A3558] → borders
text-[#FFD700]   → gold text
text-[#EEF4FF]   → body text
text-[#5E7A9C]   → muted text
font-mono        → Space Mono
```
