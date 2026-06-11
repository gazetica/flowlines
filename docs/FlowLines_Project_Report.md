# Flow Lines — Comprehensive Project Report
## Gazetica Studio | Voraky Retail LLP
**Version:** 1.0 | **Date:** 11 June 2026 | **Status:** Pre-Development | **Game 2 of 5**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business & Legal Context](#2-business--legal-context)
3. [Game Concept & Mechanics](#3-game-concept--mechanics)
4. [Level & Pack Design](#4-level--pack-design)
5. [Scoring System](#5-scoring-system)
6. [Level Generator — Technical Design](#6-level-generator--technical-design)
7. [Screen Inventory & Wireframes](#7-screen-inventory--wireframes)
8. [Architecture](#8-architecture)
9. [Repository Structure](#9-repository-structure)
10. [Tech Stack & Code Reuse from Numtap](#10-tech-stack--code-reuse-from-numtap)
11. [Visual Design System](#11-visual-design-system)
12. [Monetisation](#12-monetisation)
13. [Backend & Infrastructure](#13-backend--infrastructure)
14. [Localisation](#14-localisation)
15. [Analytics & Crash Reporting](#15-analytics--crash-reporting)
16. [App Store Optimisation (ASO)](#16-app-store-optimisation-aso)
17. [Business Intelligence](#17-business-intelligence)
18. [SWOT Analysis](#18-swot-analysis)
19. [Cross-Promotion Strategy](#19-cross-promotion-strategy)
20. [Development Sprint Plan](#20-development-sprint-plan)
21. [Risk Register](#21-risk-register)
22. [Success Metrics & KPIs](#22-success-metrics--kpis)
23. [Security](#23-security)
24. [CI/CD Pipeline](#24-cicd-pipeline)
25. [Known Constraints & Locked Decisions](#25-known-constraints--locked-decisions)
26. [Immediate Next Steps](#26-immediate-next-steps)
27. [Accounts & Infrastructure Reference](#27-accounts--infrastructure-reference)

---

## 1. Executive Summary

Flow Lines is Gazetica Studio's second Android game — a colour connection puzzle where players draw lines between matching coloured dots to fill the entire board. Built on the same React + Phaser + Capacitor stack as Numtap (Game 1), Flow Lines benefits from approximately 70% code reuse, dramatically reducing build time from the 5-sprint Numtap build to a targeted 5–6 week part-time effort.

The reference game Flow Free (Big Duck Games, 2012) has over 100 million downloads. Its aging design, lack of meta-progression, and absence of a daily challenge present a clear opportunity for a modern, well-designed successor. Flow Lines targets the same audience with superior visual design, a daily leaderboard, pack progression, and a procedural level generator capable of producing 500+ validated levels.

| Field | Detail |
|---|---|
| Project name | Flow Lines - Colour Connection Puzzle |
| Studio | Gazetica (Voraky Retail LLP) |
| Platform | Android (Google Play Store) |
| Bundle ID | `com.gazetica.flowlines` |
| Tech stack | Phaser.js + React + Vite + Tailwind + Capacitor + Firebase |
| Monetisation | AdMob Rewarded (primary) + Interstitial + IAP Remove Ads + Hint Pack |
| Genre | Logic Puzzle / Colour Connection / Casual Relaxing |
| Target audience | Adults 20–55, gender-neutral, puzzle enthusiasts, commuters |
| Primary markets | Germany, France, South Korea, UK, Brazil |
| Build duration | 5–6 weeks (part-time, 3–4 hrs/day with Claude Code assistance) |
| Launch target | August 2026 |
| Revenue model | Free-to-play with ads. IAP: Remove Ads ($2.99), Hint Pack ($0.99) |
| Min Android version | Android 7.0 (API 24) |
| IARC rating | PEGI 3 — suitable for all ages, zero violence |
| Reference game | Flow Free (Big Duck Games) — 100M+ downloads, launched 2012 |
| Differentiator | Modern visual design, meta progression, 500+ procedurally validated levels, daily leaderboard |

> Flow Lines is strategically positioned as the second Gazetica release. By its August 2026 launch date, Numtap will have established Play Store presence, reviews, and a player base that can be directly cross-promoted into Flow Lines.

---

## 2. Business & Legal Context

Flow Lines inherits all business infrastructure established for Numtap. No new legal entities, accounts, or registrations are required beyond app-level setup.

| Item | Detail | Status |
|---|---|---|
| Legal entity | Voraky Retail LLP — GST active | ✅ Inherited from Numtap |
| Play Console account | vorakyretail1@gmail.com — developer "Voraky" | ✅ Inherited |
| AdMob account | vorakyretail1@gmail.com — pub-7932168293321470 | ✅ Inherited |
| Firebase project | gazetica-numtap — add flowlines as second app | 🔲 New app in same project |
| Supabase project | nkfbuzlxavqljkqyihyo (Mumbai) — new tables only | 🔲 New tables |
| GitHub | gazetica org — new repo `gazetica/flowlines` | 🔲 Fork from Numtap |
| Keystore | New keystore for com.gazetica.flowlines | 🔲 Generate pre-Sprint 4 |
| Play Console app | Register com.gazetica.flowlines as new app | 🔲 Before Sprint 4 |
| Privacy Policy | gazetica.com/privacy-policy — already live | ✅ Inherited |
| Support email | support@gazetica.com — already configured | ✅ Inherited |
| Trademark | Gazetica + "Flow Lines" — Class 41, IP India | 🔲 Pending |

### Target Markets

Same target markets as Numtap, with identical rationale:

| Market | Rewarded CPM | Rationale |
|---|---|---|
| Germany | $8–$18 | 74% Android share, puzzle games culturally strong, German ASO boost |
| South Korea | $15–$29 | Highest CPM of all Android-majority markets, colour/logic puzzles popular |
| France | $7–$15 | 77% Android share, opens Belgium + Switzerland simultaneously |
| United Kingdom | $12–$22 | English-native, high CPM, strong casual puzzle culture |
| Brazil | $2–$5 | 81% Android share, 37M installs/month market, volume offsets lower CPM |

---

## 3. Game Concept & Mechanics

### 3.1 Core Gameplay Loop

Flow Lines presents an NxN grid with pairs of coloured dots placed at various positions. The player draws a continuous line (path) from one dot of a colour to its matching partner.

**Win condition (dual requirement):**
1. All dot pairs must be connected
2. The entire board must be covered by paths — no empty cells

This dual requirement is what creates the strategic depth. A player who connects all dots but leaves empty cells has not won. They must rethink the routing to achieve 100% coverage. This is the design innovation that made Flow Free addictive for over a decade — and Flow Lines replicates it with modern visual design.

### 3.2 Input Mechanic

Drag-to-draw: the player presses on a coloured dot and drags across cells. The path follows the drag. Releasing ends the path at the last cell touched. If the path reaches the matching dot, it locks in and glows. If the player starts a new path that crosses an existing one, the existing path breaks at the intersection.

Key input design rules:
- Paths can only move orthogonally (up/down/left/right) — no diagonals
- A cell can only be occupied by one path colour at a time
- Drawing over an existing path of a different colour erases it from that point
- Drawing over the player's own path retracts it to that point (undo-on-drag)
- Snap-to-grid with large hit targets — critical for small screen accuracy

### 3.3 Hint System

Hints reveal the correct next cell for the most efficient solution path. One hint covers one cell of one colour's optimal path. Cost: 1 gem (same gem economy as Numtap, shared currency).

- Max 3 hints per level
- Hints trigger a rewarded ad (same WATCH AD mechanic as Numtap)
- Using a hint deducts 30 points from the score but does not prevent completion or stars
- The solver (pre-computed at build time) provides the optimal path for each hint

---

## 4. Level & Pack Design

### 4.1 Pack Structure

| Pack | Grid | Colours | Levels | Unlock Condition | Difficulty |
|---|---|---|---|---|---|
| Pack 1 | 6×6 | 5 | 50 | Default (free) | Tutorial — introduces mechanics gently |
| Pack 2 | 7×7 | 6 | 50 | 25 Pack 1 levels solved | Moderate |
| Pack 3 | 8×8 | 7 | 50 | All 50 Pack 1 levels solved | Hard |
| Pack 4 | 9×9 | 8 | 50 | All 50 Pack 2 levels solved | Expert |
| Daily | 7×7 | 6 | 1/day | Default (free) | Seeded global puzzle |
| Zen Mode | Any | Player choice | Infinite | Default | No timer, no score, relaxed |
| Timed Mode | 6×6 | 5 | Endless | Default | Solve as many as possible in 3 minutes |

**Total levels at launch:** 200 pre-validated (Pack 1 + Pack 2). Pack 3 and Pack 4 levels generated and validated in Sprint 5.

### 4.2 Pack Unlock Flow

Pack 2 unlocks progressively at 25 levels solved in Pack 1 — this prevents players hitting a wall before they've built enough skill. Pack 3 and Pack 4 require full completion of the preceding pack — higher commitment threshold justified by the expert difficulty jump.

### 4.3 Daily Challenge Design

- One puzzle per day, globally seeded (same puzzle for all players worldwide)
- One attempt per day — enforced via `lastPlayedDate` in Capacitor Preferences
- Seeded with UTC date using mulberry32 PRNG (same algorithm as Numtap's Daily)
- Results auto-submit to `flowlines_daily_scores` Supabase table
- 7-day streak tracking on Daily Challenge screen
- Gem reward: +3 gems on daily completion (same economy as Numtap)

### 4.4 Colour Palette — Level Colours

| Colour | Hex | Name used in levels |
|---|---|---|
| Red | `#E24B4A` | red |
| Blue | `#378ADD` | blue |
| Green | `#639922` | green |
| Yellow | `#EF9F27` | yellow |
| Purple | `#7F77DD` | purple |
| Orange | `#D85A30` | orange |
| Teal | `#1D9E75` | teal |
| Pink | `#D4537E` | pink |

Pack 1 uses 5 colours (red/blue/green/yellow/purple). Pack 2 adds orange. Pack 3 adds teal. Pack 4 adds pink.

---

## 5. Scoring System

| Component | Formula |
|---|---|
| Perfect Clear bonus | All dots connected + 100% board coverage: +200 points |
| Move efficiency | Score decreases by 5 points per move above optimal move count |
| Time bonus (Timed Mode) | Remaining seconds × 15 points |
| Hint penalty | −30 points per hint used (does not prevent completion) |

### Star Rating

| Stars | Condition |
|---|---|
| 3 stars | Completed in optimal move count or fewer |
| 2 stars | Completed within 20% above optimal move count |
| 1 star | Completed but inefficient (>20% above optimal) |
| 0 stars | Incomplete / abandoned |

The optimal move count is pre-computed by the path solver at build time and stored per level in the level JSON. The game never needs to solve the puzzle at runtime — only look up the stored optimal.

---

## 6. Level Generator — Technical Design

This is the most technically complex component of Flow Lines and the area where Claude Code provides the most value. The generator runs at **build time only** — never at runtime. Players receive pre-validated JSON levels.

### 6.1 Generation Pipeline

```
PLACEMENT PHASE
  Place N colour dot pairs on NxN grid
  Enforce minimum distance between same-colour dots
  Randomise positions with seed for reproducibility

          ↓

SOLVE PHASE
  Run backtracking path-solver
  Find valid solution: all dots connected AND 100% board coverage
  Timeout: discard configuration if no solution in N ms

          ↓

VALIDATE PHASE
  Confirm solver found a valid solution
  If no solution → discard → PLACEMENT PHASE (retry)

          ↓

QUALITY CHECK
  If optimal path < 3 moves per colour → too trivial → discard
  If any colour path > 90% of board → too simple → discard
  Difficulty score must fall in target range for the pack

          ↓

STORE PHASE
  Store as compact JSON:
  { grid: NxN, dots: [{colour, r1, c1, r2, c2}], optimalMoves: N }
  No solution path stored — only dot positions and optimal move count

          ↓

REPEAT until 50 levels per pack validated
```

### 6.2 Path Solver Algorithm

Backtracking depth-first search with constraint propagation:

```typescript
// Conceptual — Claude Code generates the actual implementation
function solve(grid: Grid, colours: Colour[], pathsSoFar: Path[]): Solution | null {
  if (allDotsConnected(pathsSoFar) && coverage(grid, pathsSoFar) === 100) {
    return pathsSoFar;           // WIN: all connected + full coverage
  }
  const nextColour = pickUnfinishedColour(colours, pathsSoFar);
  const candidates = getValidNextCells(grid, nextColour, pathsSoFar);
  for (const cell of candidates) {
    const result = solve(grid, colours, [...pathsSoFar, extend(nextColour, cell)]);
    if (result) return result;   // Solution found — propagate up
  }
  return null;                   // Dead end — backtrack
}
```

Optimisations required for 9×9 grids:
- Connectivity pruning: if remaining empty cells become unreachable, backtrack immediately
- Iterative deepening DFS for memory efficiency
- Early exit: if current partial path cannot possibly reach full coverage, abort branch

### 6.3 Level JSON Schema

```json
{
  "id": "p1_001",
  "pack": 1,
  "grid": 6,
  "colours": 5,
  "optimalMoves": 28,
  "dots": [
    { "colour": "red",    "r1": 0, "c1": 0, "r2": 5, "c2": 3 },
    { "colour": "blue",   "r1": 0, "c1": 5, "r2": 4, "c2": 1 },
    { "colour": "green",  "r1": 2, "c1": 2, "r2": 3, "c2": 5 },
    { "colour": "yellow", "r1": 1, "c1": 4, "r2": 5, "c2": 0 },
    { "colour": "purple", "r1": 0, "c1": 2, "r2": 4, "c2": 4 }
  ]
}
```

### 6.4 Generation Script

```
scripts/generate-levels.ts
  Runs offline via: npx ts-node scripts/generate-levels.ts
  Output: src/levels/pack1.json, pack2.json, pack3.json, pack4.json
  Each file: array of 50 validated level objects
  Script never ships in the app bundle — build-time only
```

**Quality assurance rule:** Before shipping any pack, manually play a random sample of 10 levels and verify each is solvable, non-trivial, and enjoyable. This cannot be automated — human judgement is required for "interesting" vs "merely valid."

---

## 7. Screen Inventory & Wireframes

### Screen List

| ID | Screen | Route | Description |
|---|---|---|---|
| VD-01 | Splash | (boot) | Logo, loading state |
| VD-02 | Home | /home | Progress summary, mode selector, continue button, streak |
| VD-03 | Pack Select | /packs | 4 packs with progress, lock status, IAP hooks |
| VD-04 | Level Select | /levels/:packId | 5×10 grid of 50 levels with star ratings |
| VD-05 | Active Game | /game | Phaser grid + React HUD (moves, coverage, hint, undo) |
| VD-06 | Level Complete | /result | Stars, score breakdown, next level, interstitial ad |
| VD-07 | Daily Challenge | /daily | Today's puzzle, streak counter, post-completion leaderboard |
| VD-08 | Leaderboard | /leaderboard | Daily / Timed / All-Time tabs |
| VD-09 | Settings | /settings | Sound, music, language, remove ads, reset progress |
| VD-10 | IAP Store | /store | Remove Ads + Hint Pack purchase screen |
| VD-11 | GDPR Consent | (first launch EU) | UMP consent — reused from Numtap |
| VD-12 | How To Play | /tutorial | 4-step interactive tutorial |
| VD-13 | About / Legal | /about | Privacy, Terms, Ad Preferences |
| VD-14 | Language Select | /language | 6 language cards |

### First Launch Flow

Language Select → How To Play → Home

---

### Wireframe: VD-01 — Splash Screen

```
┌─────────────────────────────┐
│         9:41 AM             │  ← status bar
├─────────────────────────────┤
│                             │
│                             │
│     ╔═══════════════╗       │
│     ║  ╔═╗  ╔═╗    ║       │
│     ║  ║ ╚══╝ ║    ║       │
│     ║  ╚══════╝    ║       │  ← interlocking colour lines logo
│     ╚═══════════════╝       │
│                             │
│       FLOW LINES            │  ← gold text, large
│   Colour Connection Puzzle  │  ← subtitle, small muted
│                             │
│   ████████████░░░░░░░       │  ← loading bar (purple)
│     Loading puzzles...      │
│                             │
│                             │
│          by Gazetica         │  ← bottom attribution
└─────────────────────────────┘
```
**Visual notes:** Deep purple gradient background (`#1A0A3C` → `#2D1060`). Interlocking lines logo in 5 game colours. Gold `FLOW LINES` wordmark. Loading bar in accent purple. No ads on splash.

---

### Wireframe: VD-02 — Home Screen

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  FLOW LINES        💎 42    │  ← gem balance top-right
│  Solved: 84  │  Streak: 12  │  ← progress summary
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  ▶  CONTINUE          │  │  ← gold CTA, most prominent
│  │  Classic · Pack 2 · L32│  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  SELECT GAME MODE           │
│  ┌────────┐  ┌────────┐    │
│  │CLASSIC │  │ TIMED  │    │  ← mode cards, 2×2 grid
│  │Packs 1-4│  │3 min   │    │
│  └────────┘  └────────┘    │
│  ┌────────┐  ┌────────┐    │
│  │ DAILY  │  │  ZEN   │    │
│  │Today's │  │Relaxed │    │
│  └────────┘  └────────┘    │
├─────────────────────────────┤
│  ┌─────── DAILY STREAK ───┐ │
│  │  ✓  ✓  ✓  ✓  ✓  □  □ │ │  ← 7-day streak row
│  └───────────────────────┘  │
├─────────────────────────────┤
│  🏠    📦    🏆    ⚙️       │  ← bottom nav: Home/Packs/LB/Settings
└─────────────────────────────┘
```
**Visual notes:** Same glassmorphism card pattern as Numtap. Purple background. Gold CONTINUE button. Mode cards have coloured top border by mode type. Streak row shows checkmarks in gold for completed days.

---

### Wireframe: VD-03 — Pack Select Screen

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  ←  SELECT PACK             │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │ PACK 1  │  6×6        │  │  ← completed pack, gold border
│  │ ✓✓✓ 50/50 PERFECT     │  │
│  │ ★★★ All levels 3-star  │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ PACK 2  │  7×7        │  │  ← current pack, active
│  │ 31/50 solved · Level 32│  │
│  │ ████████████░░░░░░░░   │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ PACK 3  │  8×8  🔒    │  │  ← locked
│  │ Complete Pack 1 to unlock│ │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ PACK 4  │  9×9  🔒    │  │  ← locked
│  │ Complete Pack 2 to unlock│ │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │ 💎 HINT PACK  $0.99 │    │  ← IAP cards at bottom
│  │ 🚫 REMOVE ADS $2.99 │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  🏠    📦    🏆    ⚙️       │
└─────────────────────────────┘
```
**Visual notes:** Locked packs shown with reduced opacity and lock icon. Completed packs show gold star rating. Progress bar on current pack. IAP cards naturally visible without hard sell — contextually appropriate.

---

### Wireframe: VD-04 — Level Select Grid

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  ←  PACK 2  │  7×7 Grid    │
│  31/50 solved                │
├─────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │★★★│ │★★★│ │★★☆│ │★★☆│ │★☆☆│ │  ← completed levels with stars
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │
│  └──┘ └──┘ └──┘ └──┘ └──┘ │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │★★★│ │★★★│ │★★★│ │★☆☆│ │★☆☆│ │
│  │ 6 │ │ 7 │ │ 8 │ │ 9 │ │10 │ │
│  └──┘ └──┘ └──┘ └──┘ └──┘ │
│       . . . (rows 3–5) . . .│
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │ ▶ │ │ 🔒│ │ 🔒│ │ 🔒│ │ 🔒│ │  ← current + locked
│  │31 │ │32 │ │33 │ │34 │ │35 │ │
│  └──┘ └──┘ └──┘ └──┘ └──┘ │
│       . . . (rows 7–10) . . │
├─────────────────────────────┤
│  🏠    📦    🏆    ⚙️       │
└─────────────────────────────┘
```
**Visual notes:** 5-wide × 10-row grid. Completed levels show star icons (★/☆). Current level pulsing gold border. Locked levels greyed with lock icon. Tap any completed level to replay. Scroll vertically for all 50.

---

### Wireframe: VD-05 — Active Game Screen (6×6 example)

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  ←  Classic · Pack 2 · L 47 │
│  Moves: 14  │ Coverage: 80% │  ← HUD row 1
│  Best: 11 moves             │  ← HUD row 2 (personal best)
├─────────────────────────────┤
│                             │
│  ┌──┬──┬──┬──┬──┬──┐       │
│  │🔴│  │  │🟡│  │🔵│       │  ← dot endpoints (large, glowing)
│  ├──┼──┼──┼──┼──┼──┤       │
│  │  │🔴│  │  │🟡│  │       │  ← active red path drawn
│  ├──┼──┼──┼──┼──┼──┤       │
│  │  │  │🟢│  │  │  │       │
│  ├──┼──┼──┼──┼──┼──┤       │
│  │  │  │  │🟢│  │🔵│       │
│  ├──┼──┼──┼──┼──┼──┤       │
│  │🟣│  │  │  │  │  │       │
│  ├──┼──┼──┼──┼──┼──┤       │
│  │  │🟣│🔴│🟡│  │  │       │
│  └──┴──┴──┴──┴──┴──┘       │
│                             │
│  [████████████░░░░] 80%     │  ← coverage progress bar (purple)
│                             │
├─────────────────────────────┤
│  ↩ UNDO │ 💡 HINT(Watch Ad) │ 🔄 RESTART │
└─────────────────────────────┘
```
**Visual notes:** Grid cells are large (finger-friendly). Coloured dots glow with outer ring. Active path renders as thick rounded line in dot colour. Coverage bar shows real-time fill percentage. HINT button triggers rewarded ad. Completed paths lock with a subtle animation. No ads within the game screen.

**Colour legend shown below grid on first play:**
```
🔴 Red  🔵 Blue  🟢 Green  🟡 Yellow  🟣 Purple
```

---

### Wireframe: VD-06 — Level Complete Screen

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│                             │
│       LEVEL COMPLETE!       │  ← gold, large
│     Pack 2  ·  Level 47     │
├─────────────────────────────┤
│            ★ ★ ★            │  ← star animation (bounce in)
│    ✨ PERFECT CLEAR! ✨      │
├─────────────────────────────┤
│  Moves:   11   Best ever!   │
│  Coverage: 100% Board filled │
├─────────────────────────────┤
│  ┌─── SCORE BREAKDOWN ───┐  │
│  │ Perfect Clear     +200 │  │
│  │ Move Efficiency   +100 │  │
│  │ ─────────────────────  │  │
│  │ TOTAL             850  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───── YOUR RANK ────────┐ │
│  │ #12 🇩🇪 YourAlias  850 │ │  ← leaderboard snippet
│  └───────────────────────┘  │
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │  ▶  NEXT LEVEL      │    │  ← primary CTA (gold)
│  └─────────────────────┘    │
│   Replay  │  Pack Select    │
├─────────────────────────────┤
│  [ AdMob Interstitial shown here — frequency capped ] │
└─────────────────────────────┘
```
**Visual notes:** Score breakdown card uses glassmorphism. Stars animate in on enter. NEXT LEVEL is the primary gold CTA. Interstitial fires here, not during gameplay. ResultScreen cross-promo slot (bottom) shows GazeticaPromoCard for Numtap.

---

### Wireframe: VD-07 — Daily Challenge Screen

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  ←  DAILY CHALLENGE         │
│  Thursday 11 June 2026       │  ← today's date
│  Streak: 5 days 🔥           │
├─────────────────────────────┤
│  ┌──┬──┬──┬──┬──┬──┬──┐   │
│  │🔴│  │  │  │  │  │🔵│   │  ← 7×7 daily puzzle
│  ├──┼──┼──┼──┼──┼──┼──┤   │
│  │  │  │🟢│  │  │🟡│  │   │
│  ├──┼──┼──┼──┼──┼──┼──┤   │
│  │  │  │  │  │  │  │  │   │
│  ├──┼──┼──┼──┼──┼──┼──┤   │
│  │  │🟣│  │  │  │  │  │   │
│  ├──┼──┼──┼──┼──┼──┼──┤   │
│  │  │  │  │🟠│  │  │  │   │
│  ├──┼──┼──┼──┼──┼──┼──┤   │
│  │  │  │  │  │🟢│  │  │   │
│  ├──┼──┼──┼──┼──┼──┼──┤   │
│  │🔴│  │  │  │  │🔵│🟡│   │
│  └──┴──┴──┴──┴──┴──┴──┘   │
│                             │
│  Moves: 0  │  Coverage: 0%  │
│  ↩ UNDO    │  💡 HINT       │
├─────────────────────────────┤
│  One attempt per day         │  ← reminder label
└─────────────────────────────┘
```
**Visual notes:** After completion, screen transitions to show global leaderboard for today's challenge. Streak shown with fire emoji indicator. "One attempt per day" label reinforces scarcity and urgency.

---

### Wireframe: VD-08 — Leaderboard

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  LEADERBOARD                │
├─────────────────────────────┤
│  [ DAILY ] [ TIMED ] [ ALL ] │  ← tab selector
├─────────────────────────────┤
│  11 June 2026               │
│  ─────────────────────────  │
│  #1  NT8K2M  🇰🇷  Jisu   920 │
│  #2  NTA3X9  🇩🇪  Klaus  890 │
│  #3  NT7B4Q  🇬🇧  Emma   870 │
│   ·  ·  ·  ·  ·  ·  ·  ·  │
│ ► #12 NT2W5R 🇮🇳 You    740  │  ← highlighted row, pinned
│  ─────────────────────────  │
│  Moves  │  Score  │  Time   │  ← column headers
└─────────────────────────────┘
```
**Visual notes:** Three tabs: Daily (today's puzzle), Timed (3-min mode), All-Time (cumulative). Player UID shown between rank and flag (same pattern as Numtap). Own row highlighted and pinned when not in top 10. Score + moves visible.

---

### Wireframe: VD-09 — Settings

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  ←  SETTINGS                │
├─────────────────────────────┤
│  AUDIO                      │
│  Music          [  ●──  ]   │  ← toggle on
│  Sound Effects  [  ●──  ]   │
│  Haptics        [  ──●  ]   │  ← toggle off
│ ─────────────────────────── │
│  PLAYER                     │
│  Alias          [  YourName ]│  ← editable field
│  Country        🇮🇳 India    │
│  UID            NT2W5R 🔒    │  ← permanent, lock icon
│ ─────────────────────────── │
│  LANGUAGE                   │
│  [ EN ] [ DE ] [ FR ]       │
│  [ KO ] [ PT ] [ ES ]       │
│ ─────────────────────────── │
│  ACCOUNT                    │
│  🚫 Remove Ads    $2.99 →   │
│  Ad Preferences  (GDPR) →   │
│ ─────────────────────────── │
│  SUPPORT                    │
│  How To Play            →   │
│  Privacy Policy         →   │
│  Terms of Service       →   │
└─────────────────────────────┘
```

---

### Wireframe: VD-10 — IAP Store

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  ←  GET MORE                │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  🚫  REMOVE ADS        │  │  ← primary offer card
│  │                        │  │
│  │  • No more interstitials│  │
│  │  • Hint ads still free  │  │
│  │  • One-time purchase    │  │
│  │                        │  │
│  │  [ BUY FOR $2.99 ]     │  │  ← gold button
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  💎  HINT PACK         │  │  ← secondary offer card
│  │                        │  │
│  │  5 hints credited       │  │
│  │  Use when stuck on hard  │  │
│  │  levels (Pack 3 & 4)    │  │
│  │                        │  │
│  │  [ BUY FOR $0.99 ]     │  │
│  └───────────────────────┘  │
│  Restore purchases          │  ← for non-consumables
└─────────────────────────────┘
```

---

### Wireframe: VD-12 — How To Play (Tutorial)

```
┌─────────────────────────────┐
│         9:41 AM             │
├─────────────────────────────┤
│  HOW TO PLAY                │
│  Step 1 of 4  ● ○ ○ ○      │  ← step indicator
├─────────────────────────────┤
│                             │
│    ┌──┬──┬──┐               │
│    │🔴│  │  │               │  ← animated mini-grid
│    ├──┼──┼──┤               │  ← shows dots appearing
│    │  │  │  │               │
│    ├──┼──┼──┤               │
│    │  │  │🔴│               │
│    └──┴──┴──┘               │
│                             │
│  Connect matching colours   │  ← instruction text
│  Draw from dot to dot        │
│  in any direction            │
│                             │
├─────────────────────────────┤
│         [ NEXT → ]          │
└─────────────────────────────┘
```

**4 tutorial steps:**
- Step 1: Connect matching dots (tap and drag)
- Step 2: Fill the entire board (coverage requirement)
- Step 3: Hints are available (watch ad or use gems)
- Step 4: Daily challenge resets every day

---

## 8. Architecture

### 8.1 Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React App Shell                    │
│  (App.tsx, Router, Screens, HUD, Pack Select, etc.)  │
├─────────────────────────────────────────────────────┤
│              Zustand State Layer                     │
│       gameStore.ts | settingsStore.ts                │
│  (pathData, gridState, coverage, packProgress)       │
├──────────────────────┬──────────────────────────────┤
│   Phaser Game Engine │    React Service Layer        │
│   (GameScene.ts)     │  admob / billing / supabase   │
│   (GridEngine.ts)    │  firebase / consent / music   │
│   (CoverageCalc.ts)  │  scoreEngine / aliasService   │
│   (PathValidator.ts) │                              │
├──────────────────────┴──────────────────────────────┤
│              Capacitor Native Bridge                 │
│  @capacitor/preferences | @capacitor-community/admob │
│  BillingPlugin.java | google-services.json           │
├─────────────────────────────────────────────────────┤
│              Android (Capacitor 6.x)                 │
│         WebView → compiled AAB → Play Store          │
└─────────────────────────────────────────────────────┘
```

### 8.2 Key Architecture Differences vs Numtap

| Concern | Numtap | Flow Lines |
|---|---|---|
| Game input | Tap individual tiles | Drag to draw paths across cells |
| Level data | 300 levels hand-authored in JSON | 200+ levels procedurally generated at build time |
| Game engine files | GridEngine, ScoreEngine, LevelManager | GridEngine, PathValidator, CoverageCalc, ScoreEngine |
| Level generator | Not applicable | LevelGenerator.ts + PathSolver.ts (build-time scripts) |
| Game state | Tile tap state, timer, score | Path data per colour, coverage %, grid cell ownership |
| Timer | React TimerComponent (always present) | Only in Timed Mode — otherwise untimed |
| Modifier system | 5 modifiers (none/shuffle/mirror/fog/countdown) | No modifiers — complexity comes from grid size + colour count |
| Daily Challenge | 3 challenges per day | 1 puzzle per day (same mechanic, simpler structure) |
| Campaign structure | 3 active campaigns + 4th Coming Soon | 4 packs, progressive unlock |
| Rescue pills | 2 rescue ad types + 1 gem ad | Standard hint ad only (no rescue mechanic) |
| Level CDN | Not used | Cloudflare R2 — new level packs can push without app update |

### 8.3 Data Flow During a Game Session

```
Player selects level
     ↓
LevelManager reads level JSON from bundle (pre-generated, no network)
     ↓
GridEngine initialises NxN grid with dot positions
     ↓
GameScene.ts renders grid in Phaser (dots, cells, colour system)
     ↓
Player drags finger across cells
     ↓
Phaser pointermove → PathValidator checks validity (in-bounds, no conflict)
     ↓
Valid cell → extend path, render coloured line in Phaser
     ↓
CoverageCalc updates coverage % in real time → dispatches to gameStore
     ↓
Win check: allDotsConnected AND coverage === 100%
     ↓
Win → ScoreEngine calculates score → ResultScreen renders
     ↓
supabase.ts → upsert leaderboard row
Capacitor Preferences → save star rating for this level
interstitialAdService → check 3-min / 5-level trigger
```

### 8.4 Zustand State Shape

```typescript
// gameStore.ts (Flow Lines version)
interface GameState {
  levelId: string;
  grid: Cell[][];             // NxN grid, each cell: { colour | null, isEndpoint }
  paths: Record<Colour, Cell[]>; // current drawn path per colour
  coverage: number;           // 0-100 (percentage of cells filled)
  moveCount: number;
  hintsUsed: number;
  status: 'playing' | 'complete' | 'abandoned';
  score: number;
}

// settingsStore.ts (additions for Flow Lines)
interface SettingsAdditions {
  packProgress: Record<PackId, { solved: number; stars: Record<LevelId, 0|1|2|3> }>;
  dailyStreakFL: number;
  lastDailyDateFL: string;
}
```

---

## 9. Repository Structure

```
C:\Projects\Gazetica\flowlines\          (forked + modified from Numtap)
├── CLAUDE.md                            ← Project brief for Claude Code
├── capacitor.config.ts                  ← appId=com.gazetica.flowlines
├── .env                                 ← Supabase credentials — GITIGNORED
├── keystore.properties                  ← GITIGNORED
├── gazetica-flowlines.jks               ← GITIGNORED, backed up offline
│
├── android/                             ← Capacitor Android — LOCKED
│   └── app/
│       ├── build.gradle
│       ├── google-services.json         ← GITIGNORED
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── java/com/gazetica/flowlines/
│               ├── MainActivity.java
│               └── BillingPlugin.java   ← REUSED from Numtap
│
├── scripts/                             ← Build-time only — never ships
│   └── generate-levels.ts              ← Level generator + solver
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                          ← Routes: Home/Packs/LevelSelect/Game/etc
│   ├── i18n.ts                          ← REUSED from Numtap
│   │
│   ├── game/                            ← ALL LOCKED after Sprint 2 sign-off
│   │   ├── GridEngine.ts               ← NxN grid data structure, dot placement
│   │   ├── PathValidator.ts            ← Path validity check (bounds, no overlap)
│   │   ├── CoverageCalc.ts             ← Real-time board coverage calculation
│   │   ├── ScoreEngine.ts              ← Score formula (moves, coverage, hints)
│   │   └── DailyChallenge.ts           ← mulberry32 PRNG — REUSED from Numtap
│   │
│   ├── scenes/
│   │   └── GameScene.ts                ← Phaser scene — LOCKED after Sprint 2
│   │
│   ├── store/
│   │   ├── gameStore.ts                ← pathData, coverage, moveCount, status
│   │   └── settingsStore.ts            ← packProgress, stars, dailyStreak
│   │
│   ├── services/
│   │   ├── admob.ts                    ← LIVE AdMob IDs — LOCKED
│   │   ├── billing.ts                  ← REUSED from Numtap
│   │   ├── supabase.ts                 ← REUSED, points to FL tables
│   │   ├── preferences.ts              ← REUSED from Numtap
│   │   ├── consentService.ts           ← REUSED from Numtap
│   │   ├── rewardedAdService.ts        ← REUSED (hint ad)
│   │   ├── interstitialAdService.ts    ← REUSED (3 min / 5 levels trigger)
│   │   ├── analytics.ts                ← REUSED, FL-specific events
│   │   ├── crashlytics.ts              ← REUSED
│   │   ├── musicService.ts             ← REUSED
│   │   ├── soundService.ts             ← REUSED (new SFX: path draw, fill, complete)
│   │   ├── scoreService.ts             ← FL-specific: move efficiency calc
│   │   ├── campaignScores.ts           ← Pack leaderboard (adapted from Numtap)
│   │   └── dailyScores.ts              ← Daily leaderboard — REUSED pattern
│   │
│   ├── components/
│   │   ├── GameScreen.tsx              ← Phaser mount + React HUD (moves, coverage)
│   │   ├── HomeScreen.tsx              ← VD-02
│   │   ├── PackSelectScreen.tsx        ← VD-03
│   │   ├── LevelSelectScreen.tsx       ← VD-04 — 5×10 grid
│   │   ├── ResultScreen.tsx            ← VD-06
│   │   ├── DailyScreen.tsx             ← VD-07
│   │   ├── LeaderboardScreen.tsx       ← VD-08
│   │   ├── SettingsScreen.tsx          ← VD-09
│   │   ├── IAPScreen.tsx               ← VD-10
│   │   ├── HowToPlayScreen.tsx         ← VD-12
│   │   ├── AboutScreen.tsx             ← VD-13
│   │   ├── LanguageScreen.tsx          ← VD-14 — REUSED
│   │   ├── ParticleCanvas.tsx          ← REUSED (purple theme)
│   │   ├── TimerComponent.tsx          ← REUSED (Timed Mode only)
│   │   ├── BottomNav.tsx               ← REUSED pattern
│   │   ├── GazeticaPromoCard.tsx       ← UPDATED — promotes Numtap
│   │   └── CountrySelector.tsx         ← REUSED from Numtap
│   │
│   ├── levels/                          ← Pre-generated at build time
│   │   ├── pack1.json                  ← 50 validated 6×6 levels
│   │   ├── pack2.json                  ← 50 validated 7×7 levels
│   │   ├── pack3.json                  ← 50 validated 8×8 levels
│   │   └── pack4.json                  ← 50 validated 9×9 levels
│   │
│   └── locales/
│       ├── en.json
│       ├── de.json
│       ├── fr.json
│       ├── ko.json
│       ├── pt.json
│       └── es.json
│
└── .github/
    └── workflows/
        └── build.yml                   ← REUSED from Numtap — LOCKED
```

---

## 10. Tech Stack & Code Reuse from Numtap

### Full Stack

| Layer | Technology | Version | Reuse Status |
|---|---|---|---|
| Game Engine | Phaser.js | 4.x | New scenes, reuse Capacitor integration |
| App Shell | React + TypeScript | 18 | Full reuse pattern |
| Build Tool | Vite | 8.x | Full reuse |
| Styling | Tailwind CSS | 3.x | Full reuse, new purple/gold theme |
| Android Wrapper | Capacitor | 6.x | Full reuse, new bundle ID |
| State Management | Zustand | latest | Full reuse, new state shape |
| Local Storage | @capacitor/preferences | 8.0.1 | Full reuse |
| Ads | @capacitor-community/admob | 8.0.0 | Full reuse, new ad unit IDs |
| Billing | Google Play Billing Library | 6.2.1 | Full reuse, new product IDs |
| i18n | i18next + react-i18next | latest | Full reuse, new translation files |
| Analytics | Firebase Analytics | — | New app in same project |
| Crash Reporting | Firebase Crashlytics | — | New app in same project |
| Backend | Supabase PostgreSQL | — | New tables in same project |
| CI/CD | GitHub Actions | — | Full reuse, same workflow YAML |
| Hosting | Cloudflare Pages | — | Same gazetica.com |
| Level CDN | Cloudflare R2 | — | NEW — enables OTA level updates |

### Code Reuse Summary (~70%)

| Component | Reuse Level | Change Required |
|---|---|---|
| Capacitor config + Android setup | Full reuse | Bundle ID only → `com.gazetica.flowlines` |
| AdMob service | Full reuse | New ad unit IDs from AdMob dashboard |
| IAP billing (BillingPlugin.java + billing.ts) | Full reuse | New product IDs |
| Firebase (same project) | New app entry | Add flowlines app in Firebase Console |
| Supabase | New tables | Add `flowlines_scores`, `flowlines_daily_scores` |
| i18next infrastructure | Full reuse | New translation JSON files |
| React navigation patterns | Full reuse | Copy + restyle purple/gold |
| GitHub CI/CD workflow | Full reuse | New repo, same `build.yml` |
| GDPR UMP consent | Full reuse | Same consentService.ts |
| DailyChallenge.ts (mulberry32 PRNG) | Full reuse | New daily seed namespace |
| AdMob consent message | Full reuse | Already published in AdMob Console |
| Play Store process | Experience reuse | Second submission faster |
| GameScene.ts | New implementation | Different input model (drag vs tap) |
| GridEngine.ts | New implementation | Path data structure, not tap sequence |
| levels.json | New structure | Generated procedurally, not hand-authored |

---

## 11. Visual Design System

### Brand Identity — Flow Lines vs Numtap

| Token | Numtap | Flow Lines |
|---|---|---|
| Primary background | Navy `#0A0F2C` | Deep purple `#1A0A3C` |
| Accent | Electric blue `#00f5ff` | Gold `#FFD700` + vibrant colour paths |
| CTA colour | Gold `#FFD700` | Gold `#FFD700` (shared Gazetica language) |
| Secondary accent | Purple `#9B59B6` | Purple `#7F77DD` (primary, not secondary) |
| Card surface | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.08)` (same glassmorphism) |
| Studio mark | Gold N in navy square | Interlocking lines mandala in dark purple square |

### Game Colours (in-grid)

The 8 game path colours must be:
- Distinct at a glance even for colour-blind players (shape + brightness differentiation)
- Vibrant against the dark grid background
- Visually satisfying when drawn as thick rounded paths

| Colour | Primary Hex | Path Rendering | Dot Glow |
|---|---|---|---|
| Red | `#E24B4A` | 6px rounded stroke | Red outer glow ring |
| Blue | `#378ADD` | 6px rounded stroke | Blue outer glow ring |
| Green | `#639922` | 6px rounded stroke | Green outer glow ring |
| Yellow | `#EF9F27` | 6px rounded stroke | Amber outer glow ring |
| Purple | `#7F77DD` | 6px rounded stroke | Purple outer glow ring |
| Orange | `#D85A30` | 6px rounded stroke | Orange outer glow ring |
| Teal | `#1D9E75` | 6px rounded stroke | Teal outer glow ring |
| Pink | `#D4537E` | 6px rounded stroke | Pink outer glow ring |

### Tile / Cell States

| State | Visual |
|---|---|
| Empty | Dark cell `rgba(255,255,255,0.04)` with subtle grid lines |
| Dot endpoint | Coloured filled circle, outer glow ring, slightly larger than cell |
| Active path | Thick rounded line in path colour, filling cell center |
| Completed path | Same as active + subtle shimmer animation on lock-in |
| Hint cell | Pulsing white highlight on the optimal next cell |
| Win state | All cells flood with colour cascade animation |

### App Icon

Dark purple background. Stylised interlocking coloured lines forming a circular mandala pattern. Vibrant — 5 colours visible in the icon. Distinct from Numtap's gold-N design while sharing the same geometric minimal language.

### Feature Graphic (1024×500)

Partially solved 7×7 grid mid-play. Multiple vivid coloured paths visible in mid-draw. Text overlay: "Connect the Colours. Fill the Board." Dark purple background.

---

## 12. Monetisation

### AdMob Configuration

| Type | Status | Notes |
|---|---|---|
| App ID | 🔲 Create in AdMob | New app — new App ID |
| Rewarded ad unit | 🔲 Create in AdMob | For hint rewards |
| Interstitial ad unit | 🔲 Create in AdMob | Level complete screen |
| Publisher ID | pub-7932168293321470 | Inherited from Numtap account |

### Ad Rules

| Rule | Detail |
|---|---|
| Rewarded ad placement | Hint button only (HINT — Watch Ad) |
| Interstitial placement | Level Complete screen only |
| Interstitial trigger | 5 level completions OR 3 minutes since last show |
| Max hints per level | 3 |
| Ads in Zen Mode | No interstitials — rewarded hints only |
| `removeAdsPurchased` scope | Suppresses interstitials ONLY — rewarded hints always available |
| Home / Game screens | No ads ever |
| ResultScreen bottom slot | GazeticaPromoCard — Numtap cross-promotion |

### IAP Products

| Product ID | Type | Price | Effect |
|---|---|---|---|
| `flowlines_remove_ads` | Non-consumable | $2.99 | Suppresses all interstitials |
| `flowlines_hint_pack` | Consumable | $0.99 | +5 gems (hints cost 1 gem each) |

### Gem Economy (Shared with Numtap)

Flow Lines uses the same gem currency established in Numtap. If the player has gems from Numtap, they carry over to Flow Lines (cross-game gem wallet via Supabase player_uid). This creates a portfolio incentive: play more Gazetica games, accumulate more gems.

| Event | Gems Awarded |
|---|---|
| Daily puzzle completion | +3 gems |
| 7-day streak milestone | +7 gems |
| HINT (Watch Ad) | +0 gems (ad replaces gem cost for one hint) |
| Hint Pack IAP | +5 gems |

---

## 13. Backend & Infrastructure

### Supabase Tables (New)

All new tables are added to the existing `nkfbuzlxavqljkqyihyo` Supabase project.

| Table | Purpose | Key Columns |
|---|---|---|
| `flowlines_scores` | Global all-time leaderboard | alias, country, score, moves, pack_id, level_id, player_uid |
| `flowlines_daily_scores` | Daily challenge leaderboard | date, alias, country, score, moves, player_uid |
| `flowlines_pack_gate` | Pack unlock thresholds (server-side) | pack_id, required_level_count |

```sql
-- Migration SQL for Supabase
CREATE TABLE flowlines_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alias text NOT NULL,
  country text,
  score integer NOT NULL,
  moves integer,
  pack_id integer,
  level_id text,
  player_uid text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE flowlines_daily_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  alias text NOT NULL,
  country text,
  score integer NOT NULL,
  moves integer,
  player_uid text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE flowlines_pack_gate (
  pack_id integer PRIMARY KEY,
  required_level_count integer NOT NULL
);

INSERT INTO flowlines_pack_gate VALUES (2, 25), (3, 50), (4, 50);

-- RLS
ALTER TABLE flowlines_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowlines_daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon select flowlines_scores" ON flowlines_scores FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert flowlines_scores" ON flowlines_scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon select flowlines_daily" ON flowlines_daily_scores FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert flowlines_daily" ON flowlines_daily_scores FOR INSERT TO anon WITH CHECK (true);

-- Critical: anon role GRANT (separate from RLS)
GRANT SELECT, INSERT ON flowlines_scores TO anon;
GRANT SELECT, INSERT ON flowlines_daily_scores TO anon;
GRANT SELECT ON flowlines_pack_gate TO anon;
```

### Cloudflare R2 — Level CDN

Flow Lines uses Cloudflare R2 (free tier) to host pre-generated level JSON files. This enables:
- New packs (Pack 5+) to be pushed without a Play Store update
- A/B testing different level sets without code changes
- Emergency replacement of a buggy level without an app update

```
CDN URL pattern: https://cdn.gazetica.com/flowlines/pack{N}.json
Fallback: bundled pack1.json and pack2.json always present in app bundle
Packs 3+ can load from CDN with local fallback
```

### Firebase Analytics Events (Flow Lines)

| Event | Trigger | Parameters |
|---|---|---|
| `session_start` | App opens | — |
| `level_start` | Game begins | level_id, pack_id, grid_size, colour_count |
| `level_complete` | Win state | level_id, pack_id, moves, stars, score |
| `level_abandon` | Back button during play | level_id, coverage_pct |
| `hint_requested` | Hint button tapped | level_id, hints_used_this_level |
| `ad_impression` | Ad shown | ad_type (rewarded/interstitial) |
| `iap_purchase` | IAP complete | product_id, value |
| `pack_unlocked` | Pack gate passed | pack_id |

---

## 14. Localisation

Same 6-language infrastructure as Numtap. New translation files required for Flow Lines-specific strings.

| Language | Code | Status |
|---|---|---|
| English | en | 🔲 New file — estimated ~180 keys |
| German | de | 🔲 New file |
| French | fr | 🔲 New file |
| Korean | ko | 🔲 New file |
| Portuguese (BR) | pt | 🔲 New file |
| Spanish | es | 🔲 New file |

### Key Translation Scope (Flow Lines-specific)

- Pack names (Pack 1–4, Daily, Zen, Timed)
- Coverage percentage strings ("80% filled", "All cells covered!")
- Move counter labels ("Moves: 14", "Best: 11 moves")
- Hint system ("Watch ad for hint", "Hint reveals next cell")
- Win screen copy ("Perfect Clear!", "Board Complete!")
- Tutorial steps (4 steps)
- Lock/unlock messages ("Complete Pack 1 to unlock", "25 levels solved to unlock Pack 2")

### Localised Play Store Titles

| Language | Title | Subtitle |
|---|---|---|
| English | Flow Lines - Colour Puzzle Game | Connect colours. Fill the board. |
| German | Flow Lines - Farb Verbindung Rätsel | Verbinde Farben und fülle das Feld |
| French | Flow Lines - Jeu de Couleurs | Reliez les couleurs, remplissez la grille |
| Korean | Flow Lines - 컬러 퍼즐 | 색깔을 연결하고 보드를 채우세요 |
| Portuguese (BR) | Flow Lines - Puzzle de Cores | Conecte as cores, preencha o tabuleiro |
| Spanish | Flow Lines - Puzzle de Colores | Conecta los colores, llena el tablero |

---

## 15. Analytics & Crash Reporting

### Firebase

Flow Lines is registered as a second app in the existing `gazetica` Firebase project. A new `google-services.json` is downloaded after adding the app.

- **Analytics:** 8 custom events (see Section 13)
- **Crashlytics:** Live from first session
- **Key monitoring metric:** Zero reports of unsolvable levels — this is a 1-star review trigger. Monitor Play Store reviews daily in Month 1.

---

## 16. App Store Optimisation (ASO)

### Play Store Listing

| Element | Content |
|---|---|
| App title | Flow Lines - Colour Puzzle Game |
| Short description | Connect matching colours to fill the board. 500+ levels. Daily challenge! |
| Primary category | Games → Puzzle |
| Secondary category | Games → Brain Games |
| Icon | Dark purple background, interlocking colour lines mandala |
| Feature graphic | Partially solved 7×7 grid mid-play, "Connect the Colours. Fill the Board." |
| Screenshots | 1: Home/Pack Select, 2: Active 6×6, 3: Active 8×8, 4: Level Complete, 5: Daily leaderboard, 6: German locale |

### Keyword Strategy

| Keyword | Volume | Competition | Priority |
|---|---|---|---|
| colour connection puzzle | Medium | Low | Primary |
| flow puzzle game | High | Medium | Primary |
| connect colour lines game | Medium | Low | Primary |
| line drawing puzzle | Medium | Low | Primary (long-tail) |
| fill the board puzzle | Low | Very Low | Primary (long-tail) |
| colour path game | Medium | Low | Secondary |
| pipe connect puzzle free | High | Medium | Secondary |
| brain logic puzzle offline | High | Medium | Secondary |
| relaxing colour puzzle | Medium | Low | Secondary |
| daily colour puzzle challenge | Low | Very Low | Tertiary |

### ASO Advantage Over Flow Free

Flow Free was launched in 2012 and has not significantly updated its Play Store metadata since. Its screenshots show an older visual style. Flow Lines targets:
- Better metadata density and more long-tail keywords in description
- Modern screenshots showing procedural variety
- Higher initial rating baseline (target 4.2+) from cross-promoted Numtap players
- Daily challenge engagement hook absent from Flow Free

---

## 17. Business Intelligence

### Revenue Projections

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|---|---|---|---|---|
| Cumulative downloads | 400 | 2,000 | 7,000 | 18,000 |
| Daily active users | 90 | 350 | 800 | 2,000 |
| Avg session length | 8 min | 11 min | 13 min | 14 min |
| Levels played/DAU/day | 4–6 | 6–9 | 8–12 | 10–15 |
| Ad impressions/DAU/day | 3–5 | 5–7 | 5–7 | 5–8 |
| Rewarded CPM (target) | $8–15 | $10–18 | $12–20 | $12–22 |
| Est. monthly ad revenue | $20–50 | $100–220 | $260–480 | $550–1,000 |
| Remove Ads IAP | ~$15 | $60–120 | $180–300 | $420–660 |
| Hint Pack IAP | ~$6 | $30 | $90 | $210 |
| Day-1 retention target | 38% | 40% | 42% | 42%+ |
| Day-7 retention target | 18% | 20% | 22% | 22%+ |
| Day-30 retention target | 6% | 7% | 8% | 9% |
| Play Store rating target | 4.1+ | 4.2+ | 4.3+ | 4.4+ |

**Revenue advantage over Numtap:** Flow Lines session depth (8–14 min vs 6–10 min) generates more ad impressions per user per session. The pack progression system creates a natural paid unlock moment absent in Numtap. Revenue ceiling per user is higher.

---

## 18. SWOT Analysis

| Strengths | Weaknesses |
|---|---|
| Proven mechanic — Flow Free has 100M+ downloads | Flow Free brand recognition — direct comparison expected |
| Longer session times (8–14 min) than Numtap | Path solver is non-trivial — requires careful implementation |
| More ad impressions per session — higher revenue ceiling | Harder to differentiate visually in screenshots |
| Procedural generator = infinite content at zero marginal cost | Level quality at 500+ scale requires 100% solver accuracy |
| Pack progression = natural IAP unlock hook | Longer sessions = fewer natural ad break points |
| 70% code reuse = 5-6 week build vs Numtap's 5 sprints | Second game — Numtap track record needed for credibility |
| No art assets needed — colour + geometry only | — |
| Relaxing aesthetic attracts premium adult demographic (highest CPM) | — |

| Opportunities | Threats |
|---|---|
| Flow Free is aging (2012) — UI and UX feel outdated | Flow Free brand anchors player expectations |
| No dominant modern player in colour-connection niche | Pixel Flow! (Loom Games) growing rapidly Q4 2025 |
| Zen Mode targets anxiety/relaxation market — growing globally | Path solver bugs = unsolvable levels = 1-star reviews |
| Procedural generation enables OTA level updates | Google Play ranking favours established apps |
| Cross-promotion: Numtap players are ideal audience | Must compete on visual quality with no art budget |
| Web version = SEO discovery + Numtap cross-link | Generator must produce interesting puzzles, not just valid ones |
| Higher D30 retention than action games = better ASO signals | — |

---

## 19. Cross-Promotion Strategy

### Numtap ↔ Flow Lines Triggers

| Source | Trigger Event | Promotes | Message |
|---|---|---|---|
| Numtap | Level 20 complete | Flow Lines | "Master colours next — try Flow Lines" |
| Numtap | 7-day streak | Flow Lines | "Love daily challenges? Flow Lines has one too" |
| Flow Lines | Pack 1 complete | Numtap | "Sharp spatial logic — try Numtap speed puzzles" |
| Flow Lines | Level 30 complete | Numtap | "Like solving puzzles fast? Try Numtap" |

### Implementation

- GazeticaPromoCard component (already in Numtap) updated to include Flow Lines card
- Shown on ResultScreen bottom slot — never mid-game, never blocking
- Direct `market://` URI deep link to Play Store listing
- Shared player_uid across games enables cross-game gem wallet (future)

### Shared Play Store Developer Page

Both games visible under "Voraky" developer profile. Players of one game organically discover the other via the developer page. All Gazetica game icons use the same geometric dark-background design language.

---

## 20. Development Sprint Plan

Flow Lines is built on Numtap's proven infrastructure. Sprints 4 and 5 (monetisation, localisation) are significantly faster due to full service-layer reuse.

| Sprint | Week | Claude Code Tasks | Mahendra Tasks | Deliverable |
|---|---|---|---|---|
| S1 | Week 1 | Grid data structure + dot-pair placement logic. Phaser drag-to-draw path input. Basic coloured line rendering. | Register FL in Play Console + AdMob + Firebase. Fork Numtap repo. | Drawable grid — paths render on drag |
| S2 | Week 2 | PathSolver.ts (backtracking algorithm). LevelGenerator.ts. Validate 100 levels (Pack 1 + Pack 2). CoverageCalc.ts. Win detection. | Manually play 10 generated levels — verify solvable + interesting | Solvable level library + win/fail logic |
| S3 | Week 3 | Phaser visual polish: smooth line drawing, dot pulse, completion animation, undo animation. React screens: Home, Pack Select, Level Select. Purple/gold Tailwind theme. | Design icon + feature graphic. Write store listing copy. | Visually complete, polished game |
| S4 | Week 4 | AdMob integration (rewarded hint, interstitial). IAP: Remove Ads + Hint Pack. GDPR UMP (reuse). Supabase daily challenge. Pack progress save system. Firebase events. Keystore generation. | Upload AAB to Play Console internal testing. Test IAP paid path with license tester. | Fully monetised build |
| S5 | Week 5–6 | Generate Pack 3 (8×8) + Pack 4 (9×9) — 100 more levels. i18n 6 languages. Play Store screenshots. ASO copy all languages. R2 CDN setup. Sign AAB. Submit. | Manually verify 20 levels across all 4 packs. IARC questionnaire. | Live on Google Play |

**Critical path:** The level generator and solver (Sprint 2) must be completed and verified before Sprint 3 visual work begins. An unsolvable level shipped to production is a 1-star review and immediate hotfix requirement.

---

## 21. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Path solver produces unsolvable levels in production | Medium | Very High | Run solver validation at build time only. Never ship unvalidated level. Unit test solver with 200+ cases. Manual QA of random sample before each release. |
| Solver too slow for 9×9 grids (Pack 4) | Low | High | Iterative deepening DFS with connectivity pruning. Pre-generate offline — runtime is JSON lookup only. Claude Code optimises on request. |
| Players find puzzles too similar to Flow Free | Medium | High | Distinct visual identity. Add meta features Flow Free lacks: daily leaderboard, pack progression, streak rewards. |
| Pixel Flow! competitor improves rapidly | Medium | Medium | Monitor Play Store updates. Differentiate on daily challenge, meta, Numtap cross-promotion. |
| Drag input feels imprecise on small screens | Medium | High | Large tap targets (snap-to-grid, generous hit areas). Physical device testing on SM-E146B before launch. |
| Level quality at 500+ scale is inconsistent | Medium | Medium | Generator constraints: min path length per colour, no trivial solutions, difficulty scoring per pack. |
| BillDesk KYC not completed before launch | Low | High | Complete BillDesk verification before Sprint 4 IAP testing begins. IAP payments blocked until KYC done. |

---

## 22. Success Metrics & KPIs

### Month 1 (Launch Phase)

| KPI | Target | Tool |
|---|---|---|
| Total downloads | 250–500 | Play Console |
| Day-1 retention | ≥38% | Firebase Analytics |
| Day-7 retention | ≥18% | Firebase Analytics |
| Play Store rating | ≥4.1 stars | Play Console |
| Crash-free sessions | ≥99.5% | Crashlytics |
| Avg session length | ≥7 minutes | Firebase Analytics |
| AdMob fill rate | ≥85% | AdMob Dashboard |
| Monthly ad revenue | ≥$20 | AdMob Dashboard |
| Unsolvable level reports | 0 | Play Store reviews |

### Month 3–6 (Growth Phase)

| KPI | Target | Action if Missed |
|---|---|---|
| Cumulative downloads | 2,000+ | Review ASO metadata, add long-tail keywords |
| Daily active users | 250+ | Increase Numtap cross-promo frequency |
| Pack 1 completion rate | ≥50% of starters | Reduce difficulty or add hints to later Pack 1 levels |
| Rewarded ad watch rate | ≥65% of hint requests | Check hint button visibility |
| Monthly revenue | ≥$100 | Review interstitial frequency cap |
| Play Store rating | ≥4.2 stars | Zero tolerance for level bugs — hotfix immediately |

---

## 23. Security

### Keystore

| Item | Detail |
|---|---|
| Filename | `gazetica-flowlines.jks` |
| Location | Project root (gitignored) |
| Backup | Offline backup — separate from Numtap keystore |
| Config | `keystore.properties` (gitignored) |

**Rule:** Each Gazetica game has its own unique keystore. The Numtap keystore (`gazetica-numtap.jks`) is not used for Flow Lines. Loss of the Flow Lines keystore means the app cannot be updated on Play Store.

### .gitignore Critical Entries (same as Numtap)

```
.env
keystore.properties
gazetica-flowlines.jks
android/app/google-services.json
android/app/build/
dist/
node_modules/
```

---

## 24. CI/CD Pipeline

### GitHub Actions

Exact same workflow YAML as Numtap (`build.yml`). Triggers on push to `main`. Builds signed release AAB.

### Version Code Strategy

Start at versionCode 1 for Flow Lines. Follows same rule as Numtap: every Play Console upload (including failed ones) increments versionCode by 1.

### Build Commands

```powershell
# Standard build + sync
npm run build
npx cap sync android

# Release AAB (from android\ directory)
.\gradlew clean
.\gradlew bundleRelease

# Level generation (offline, before Sprint 5 submission)
npx ts-node scripts/generate-levels.ts --pack 3 --output src/levels/pack3.json
npx ts-node scripts/generate-levels.ts --pack 4 --output src/levels/pack4.json
```

---

## 25. Known Constraints & Locked Decisions

These decisions are locked by analogy from Numtap and should not be changed without explicit justification.

| Decision | Value | Reason |
|---|---|---|
| GameScene.ts | Locked after Sprint 2 sign-off | Same rule as Numtap |
| Level solver | Runs at build time only, never runtime | Runtime solver = unacceptable performance on low-end devices |
| `removeAdsPurchased` scope | Interstitials only — never hint ads | Same principle as Numtap |
| Gem economy | Uncapped accumulation | Same as Numtap |
| Interstitial placement | Level Complete screen only | Same as Numtap |
| Interstitial trigger | 5 levels OR 3 minutes | Same as Numtap |
| No ads during gameplay | Game screen never shows ads | Same as Numtap |
| GazeticaPromoCard | ResultScreen only — never third-party | Same as Numtap |
| Player UID format | NTxxxxxx (cross-game shared) | Shared identity across Gazetica portfolio |
| Supabase anon GRANT | Always `GRANT SELECT/INSERT` separate from RLS | Learned from Numtap 401 bug |
| `isTesting` removal | Explicitly removed before production build | Learned from Numtap — live IDs alone insufficient |
| Billing Library | 6.2.1 — do not downgrade | Learned from Numtap |
| versionCode rule | Increment by 1 per upload | Even failed uploads consume the code |
| Daily Challenge labels | "Daily Challenge" not difficulty labels | Competitive fairness |
| Leaderboard submission | Automatic, not manual | Same as Numtap |

---

## 26. Immediate Next Steps

Execute in order. Prerequisites: Numtap must be live and stable (2–4 weeks post-launch).

1. Register `com.gazetica.flowlines` as a new app in Google Play Console (same account: vorakyretail1@gmail.com)
2. Add Flow Lines as a new app in AdMob dashboard — generate Rewarded Video + Interstitial ad unit IDs
3. Add Flow Lines as a new app in Firebase Console (same `gazetica` project) — download updated `google-services.json`
4. Create Supabase tables: `flowlines_scores`, `flowlines_daily_scores`, `flowlines_pack_gate` (run migration SQL from Section 13)
5. Fork `gazetica/numtap` repo → rename to `gazetica/flowlines` — update bundle ID in `capacitor.config.ts`
6. Generate new keystore: `gazetica-flowlines.jks` — back up immediately
7. Sprint 1: build GridEngine + drag-path Phaser input (Claude Code)
8. Sprint 2: Claude Code writes PathSolver.ts + LevelGenerator.ts — run generation for Pack 1 + Pack 2 — Mahendra manually plays 10 levels to verify quality
9. Before submission: manually verify 20 random levels across all 4 packs are solvable and non-trivial

---

## 27. Accounts & Infrastructure Reference

### Inherited Accounts (No Change Required)

| Service | Account | Status |
|---|---|---|
| Google Play Console | vorakyretail1@gmail.com — Developer: Voraky | ✅ Inherited |
| AdMob | vorakyretail1@gmail.com — pub-7932168293321470 | ✅ Inherited |
| Firebase | gazetica99@gmail.com — project: gazetica-numtap | ✅ Add FL as second app |
| GitHub | gazetica org | ✅ New repo |
| Supabase | gazetica99@gmail.com — nkfbuzlxavqljkqyihyo (Mumbai) | ✅ New tables |
| Cloudflare | gazetica99@gmail.com — gazetica.com | ✅ Inherited |

### New IDs to Create (Sprint 1 Setup)

| ID | Where to Create | Needed By |
|---|---|---|
| Flow Lines App ID (AdMob) | AdMob Console → Apps → Add App | Sprint 4 |
| Rewarded ad unit ID | AdMob → Flow Lines app → Ad Units | Sprint 4 |
| Interstitial ad unit ID | AdMob → Flow Lines app → Ad Units | Sprint 4 |
| Play Console App ID | Play Console → Create app | Sprint 4 |
| Firebase App ID | Firebase Console → Add app to project | Sprint 1 |
| IAP product: `flowlines_remove_ads` | Play Console → In-app products | Sprint 4 |
| IAP product: `flowlines_hint_pack` | Play Console → In-app products | Sprint 4 |

### Test Device

| Field | Value |
|---|---|
| Device | Samsung SM-E146B (same as Numtap) |
| Serial | RZCW30XB11X |
| ADB path | C:\Android\platform-tools\adb.exe |

### Audio Assets Required

| Asset | Source | License | Notes |
|---|---|---|---|
| Background music | Freesound (CC0) — calm ambient loop | CC0 | Different feel to Numtap — relaxed, less percussive |
| Path draw SFX | Custom — soft whoosh | — | Plays as finger drags |
| Path lock SFX | Custom — gentle click | — | Plays when colour path completes |
| Win SFX | Custom — celebratory cascade | — | Board fill completion |
| Fail SFX | Custom — soft tone | — | Level abandoned |

---

*Gazetica Studio | Voraky Retail LLP | Flow Lines Comprehensive Project Report v1.0 | 11 June 2026*
*Based on: Gazetica_FlowLines_Project_Report.docx, Numtap_Project_Report.md, Studio Master Document*
*Game 2 of 5 | Launch Target: August 2026*
