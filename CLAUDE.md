# CLAUDE.md — Flow Lines Project Brief
## Gazetica Studio | Voraky Retail LLP
**Game:** Flow Lines (Game 2 of 5) | **Bundle ID:** `com.gazetica.flowlines`
**Status:** Active Development | **Target Launch:** August 2026
**Last updated:** 11 June 2026

---

## 1. What You Are Building

Flow Lines is a colour connection puzzle game for Android. Players drag to draw
orthogonal paths between matching coloured dot pairs on an NxN grid.

**Win condition (dual — both required simultaneously):**
- ALL dot pairs connected by paths
- EVERY cell on the board occupied by a path (100% coverage)

A player who connects all dots but leaves any empty cell has NOT won.

**Core input rules:**
- Drag starts only from a dot endpoint cell
- Paths are orthogonal only — no diagonals
- Drawing over a different colour's path breaks that path at the intersection
- Drawing back over your own path retracts it to that point (undo-on-drag)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Game engine | Phaser.js 4.x |
| App shell | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 |
| Native bridge | Capacitor 6 |
| Ads | @capacitor-community/admob 5 |
| IAP | @capacitor/google-play |
| Analytics | Firebase 10 |
| Backend | Supabase (PostgreSQL) |
| Local storage | @capacitor/preferences |
| i18n | i18next 23 |

---

## 3. Accounts & IDs

### Google Accounts — NEVER MIX

| Account | Role |
|---|---|
| `vorakyretail1@gmail.com` | Play Console, AdMob, Google Payments |
| `gazetica99@gmail.com` | Firebase, GitHub, Supabase, Cloudflare |

### Registered IDs

| Service | ID |
|---|---|
| Bundle ID | `com.gazetica.flowlines` |
| Play Console App ID | `4974770655912378248` |
| AdMob App ID | `ca-app-pub-7932168293321470~6161449781` |
| AdMob Rewarded unit | `ca-app-pub-7932168293321470/8878598689` |
| AdMob Interstitial unit | `ca-app-pub-7932168293321470/1184455275` |
| Firebase App ID | `1:399062316492:android:d780b5591f24f60c2b9969` |
| Firebase Project ID | `gazetica` |
| Supabase Project ID | `nkfbuzlxavqljkqyihyo` (Mumbai ap-south-1) |
| AdMob Publisher ID | `pub-7932168293321470` |

### Test Device

| Field | Value |
|---|---|
| Device | Samsung SM-E146B |
| Serial | `RZCW30XB11X` |
| ADB path | `C:\Android\platform-tools\adb.exe` |

---

## 4. Project Paths

| Item | Path |
|---|---|
| Project root | `C:\Projects\Gazetica\flowlines\` |
| Build terminal | VS Code PowerShell |
| Gradle command | `.\gradlew` (Windows — never `./gradlew`) |
| Android dir | `C:\Projects\Gazetica\flowlines\android\` |

---

## 5. Design Tokens — src/skin.ts

```typescript
export const skin = {
  bgDeep:        '#0D0620',
  bgMid:         '#130830',
  bgCard:        '#1C0E42',
  bgRaised:      '#24145A',
  bgBorder:      '#2E1A70',
  purple:        '#7F77DD',
  purpleLight:   '#ADA7F0',
  purpleDim:     '#4A4399',
  gold:          '#FFD700',
  goldDim:       '#C8A800',
  white:         '#EDE8FF',
  muted:         '#6B5C99',
  muted2:        '#40306A',
  danger:        '#E05050',
  pathColors: {
    red:    '#E24B4A',
    blue:   '#378ADD',
    green:  '#639922',
    yellow: '#EF9F27',
    purple: '#7F77DD',
    orange: '#D85A30',
    teal:   '#1D9E75',
    pink:   '#D4537E',
  },
  glowColors: {
    red:    'rgba(226,75,74,0.35)',
    blue:   'rgba(55,138,221,0.35)',
    green:  'rgba(99,153,34,0.35)',
    yellow: 'rgba(239,159,39,0.35)',
    purple: 'rgba(127,119,221,0.35)',
    orange: 'rgba(216,90,48,0.35)',
    teal:   'rgba(29,158,117,0.35)',
    pink:   'rgba(212,83,126,0.35)',
  },
  fontDisplay: "'Space Mono', monospace",
  fontBody:    "'DM Sans', sans-serif",
} as const;
```

---

## 6. Zustand State Shape

```typescript
// gameStore.ts
interface GameState {
  levelId: string;
  grid: Cell[][];             // NxN — each cell: { colour | null, isEndpoint, isOccupied }
  paths: Record<Colour, Cell[]>;
  coverage: number;           // 0–100
  moveCount: number;
  hintsUsed: number;          // 0–3 per level
  status: 'playing' | 'complete' | 'abandoned';
  score: number;
}

// settingsStore.ts
interface SettingsState {
  alias: string;
  country: string;
  playerUid: string;          // NTxxxxxx format
  gemBalance: number;
  removeAdsPurchased: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  language: string;
  packProgress: Record<PackId, { solved: number; stars: Record<LevelId, 0|1|2|3> }>;
  dailyStreakFL: number;
  lastDailyDateFL: string;
}
```

---

## 7. Level JSON Schema

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

---

## 8. Pack Structure

| Pack | Grid | Colours | Levels | Unlock condition |
|---|---|---|---|---|
| Pack 1 | 6×6 | 5 | 50 | Default (free) |
| Pack 2 | 7×7 | 6 | 50 | 25 Pack 1 levels solved |
| Pack 3 | 8×8 | 7 | 50 | All 50 Pack 1 levels solved |
| Pack 4 | 9×9 | 8 | 50 | All 50 Pack 2 levels solved |

---

## 9. Monetisation Rules (All Locked — Never Change Without Explicit Instruction)

| Rule | Value |
|---|---|
| Rewarded ad placement | Hint button ONLY |
| Interstitial placement | ResultScreen ONLY — never during gameplay |
| Interstitial trigger | 5 level completions OR 3 minutes since last show |
| Max hints per level | 3 |
| Hint penalty | −30 points per hint used |
| `removeAdsPurchased` scope | Suppresses interstitials ONLY — rewarded hints always available |
| Ads in Zen Mode | No interstitials — rewarded hints only |
| Home / Game screen ads | None ever |
| ResultScreen bottom slot | GazeticaPromoCard only — never third-party |
| IAP Remove Ads | `flowlines_remove_ads` — non-consumable — $2.99 |
| IAP Hint Pack | `flowlines_hint_pack` — consumable — $0.99 — +5 gems |
| Gem economy | Uncapped — no ceiling |

---

## 10. File Lock Rules

### Locked After Sprint 2 Sign-Off (Never Unlock Without Explicit Scope)
```
src/scenes/GameScene.ts
```

### Locked Once Created (Unlock Per Brief Only)
```
src/game/GridEngine.ts
src/game/PathValidator.ts
src/game/CoverageCalc.ts
src/game/ScoreEngine.ts
src/game/DailyChallenge.ts
src/game/LevelManager.ts
src/styles/skin.ts
src/services/admob.ts          — LOCKED until T-015
src/services/billing.ts        — LOCKED after Sprint 4
src/services/campaignScores.ts
src/services/dailyScores.ts
android/app/build.gradle       — versionCode only increments, never decreases
.github/workflows/build.yml
```

### Never Commit (Ever)
```
.env
keystore.properties
gazetica-flowlines.jks
android/app/google-services.json
docs/HANDOVER.md
```

---

## 11. Workflow Rules

### Task brief → implement → report → validate → push

1. Main Claude thread issues a task brief as a `.md` file
2. Claude Code implements, runs tests, runs device check, generates Task Report
3. Mahendra shares the Task Report back to main thread
4. Main Claude thread validates: "Push approved" OR "Fix X before push"
5. Mahendra confirms push hash
6. Device verification on Samsung SM-E146B (`RZCW30XB11X`)

**Never commit or push without explicit push approval from the main Claude thread.**

### Commit Format
```
FL-TASK-ID: Short description (Sprint N)

- what was added/changed
- key behaviour
- test count
```

### versionCode Rule
Every Play Console upload (including failed ones) increments versionCode by 1.
Flow Lines starts at versionCode 1.
Always `.\gradlew clean` before `bundleRelease` when versionCode changes.

### T-015 Rule
`isTesting: true` must be explicitly removed from `admob.ts`, `rewardedAdService.ts`,
and `interstitialAdService.ts` before any production build.
Presence of live AdMob IDs alone is insufficient.
Verify with:
```powershell
Select-String -Path "src\services\*" -Pattern "isTesting"
# Must return zero results before production build
```

---

## 12. Grid Rendering Constants

| Constant | Value | Reason |
|---|---|---|
| Cell size formula | `(screenWidth - 16 - gap*(N-1)) / N` | Minimum 28px for finger accuracy |
| Gap (6×6, 7×7) | 3px | Balance finger accuracy vs density |
| Gap (8×8, 9×9) | 2px | Balance finger accuracy vs density |
| Path stroke width | 40% of cellSize, lineCap round | VDD spec |
| Dot endpoint size | 70% of cellSize | VDD spec |
| Coverage bar gradient | Purple `#7F77DD` → Gold `#FFD700` | VDD Section 3 |

---

## 13. Scoring System

| Component | Formula |
|---|---|
| Perfect Clear bonus | All dots connected + 100% coverage: +200 points |
| Move efficiency | −5 points per move above optimalMoves |
| Time bonus (Timed Mode only) | Remaining seconds × 15 points |
| Hint penalty | −30 points per hint used |

### Star Rating
| Stars | Condition |
|---|---|
| 3 stars | Completed in optimalMoves or fewer |
| 2 stars | Within 20% above optimalMoves |
| 1 star | Completed but inefficient (>20% above optimal) |

---

## 14. Supabase Tables (Already Created)

```
flowlines_scores        — campaign leaderboard scores
flowlines_daily_scores  — daily challenge scores
flowlines_pack_gate     — pack unlock thresholds (rows: 2→25, 3→50, 4→50)
```

RLS enabled. Anon SELECT + INSERT granted explicitly (Numtap 401 lesson).

---

## 15. Reference Documents

All four base documents are in the `docs/` folder:

| File | Purpose |
|---|---|
| `docs/FlowLines_Project_Report.md` | Authoritative design, architecture, all specs |
| `docs/FlowLines_VDD_v1_0.html` | All screen designs VD-01–VD-14, colours, animations |
| `docs/FlowLines_Sprint_Plan.md` | Day-by-day task breakdown across 6 sprints |
| `docs/Gazetica_Studio_Master_Document.docx` | Studio context, accounts, 5-game roadmap |

Read the relevant document before implementing any screen or feature.

---

*Gazetica Studio | Voraky Retail LLP | CLAUDE.md v1.0 | 11 June 2026*
*Game 2 of 5 | com.gazetica.flowlines | Target launch August 2026*
