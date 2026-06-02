# Numtap — Claude Code Project Brief
**Gazetica Studio | Voraky Retail LLP | Game 1 of 5**
**Bundle ID:** com.gazetica.numtap
**Project path:** C:\Projects\Gazetica\numtap\

---

## 1. What This App Is

Numtap is an Android casual puzzle game. A grid of shuffled numbers appears on screen. The player taps them in ascending order (1, 2, 3… N²) before the timer runs out. Grids range from 3×3 (9 tiles) to 7×7 (49 tiles). There are 5 modifiers that change how numbers behave: shuffle, fog, mirror, countdown, none.

The game has 4 modes:
- **Campaign** — 100 defined levels, linear progression, 3-star rating per level
- **Daily Challenge** — 1 seeded 5×5 puzzle per day, global leaderboard
- **Endless** — fixed 5×5, score = rounds completed in 3 minutes
- **Speed** — fixed 4×4, timer halved, ×2 score multiplier

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Game engine | Phaser.js (installed) |
| App shell | React 18 + TypeScript + Vite |
| Android wrapper | Capacitor 6 |
| Styling | Tailwind CSS |
| State management | Zustand |
| Ads | @capacitor-community/admob |
| Storage | @capacitor/preferences |
| i18n | i18next + react-i18next (6 languages: EN, DE, FR, KO, PT-BR, ES) |
| Analytics | Firebase |
| Leaderboard | Supabase PostgreSQL |
| CI/CD | GitHub Actions (AAB build on push to main) |

**All packages already installed. Do not run npm install for these.**

---

## 3. Project Folder Structure

```
src/
  game/              ← ALL game logic lives here (pure TypeScript, no Phaser dependency)
    GridEngine.ts
    ScoreEngine.ts
    LevelManager.ts
    levels.json
    GridEngine.test.ts
    ScoreEngine.test.ts
  scenes/            ← Phaser scenes
    SplashScene.ts
    GameScene.ts
    UIScene.ts
  components/        ← React UI screens
    HomeScreen.tsx
    GameScreen.tsx
    ResultScreen.tsx
    LeaderboardScreen.tsx
    SettingsScreen.tsx
    LanguageScreen.tsx
    HowToPlayScreen.tsx
    AboutScreen.tsx
    IAPScreen.tsx
  store/             ← Zustand stores
    gameStore.ts
    settingsStore.ts
  services/          ← External integrations
    admob.ts         ← already exists, uses Google test IDs
    firebase.ts
    supabase.ts
    preferences.ts
  locales/           ← i18n JSON files
    en.json
    de.json
    fr.json
    ko.json
    pt.json
    es.json
  App.tsx
  main.tsx
docs/                ← Reference documents (read before coding each sprint)
  architecture.md
  level-configs.md
  design-system.md
  api-contracts.md
  sprint-log.md
android/             ← Capacitor generated, do not manually edit
```

---

## 4. Critical Architecture Rules

**READ BEFORE WRITING ANY CODE.**

### 4.1 Game logic is pure TypeScript — no Phaser
`src/game/` files must have zero Phaser imports. GridEngine, ScoreEngine, LevelManager are plain TypeScript classes. Phaser only lives in `src/scenes/`. This enables unit testing without a browser.

### 4.2 Grid size is a property of a level config — never hardcoded
```typescript
// ✅ CORRECT
const level = LevelManager.getLevel(47);
const gridSize = level.grid; // could be 3, 4, 5, 6, or 7

// ❌ WRONG — never do this
if (levelId <= 25) { gridSize = 3; }
if (levelId <= 60) { gridSize = 5; }
```

### 4.3 Level configs are data, not code
All 100 levels live in `src/game/levels.json`. Adding levels 101–200 in future = adding JSON records only. Zero code changes.

### 4.4 Modifier types
```typescript
export type Modifier = 'none' | 'shuffle' | 'fog' | 'mirror' | 'countdown';
```
- `none` — standard clean grid
- `shuffle` — grid reshuffles every 8 seconds
- `fog` — numbers hidden, reveal on hover within 1-cell radius
- `mirror` — numbers displayed horizontally mirrored
- `countdown` — each number disappears 3 seconds after first revealed

### 4.5 Direction type (for Descending mode)
```typescript
export type Direction = 'ascending' | 'descending';
// ascending = tap 1 → N² (default)
// descending = tap N² → 1 (unlocks at Campaign level 75)
```

### 4.6 No authentication anywhere
Zero auth in this app. No Google Sign-In. No email. No passwords. Leaderboard is anonymous. Alias set in Settings. Never add auth.

### 4.7 IAP — 2 products maximum
- `numtap_remove_ads` — non-consumable
- `numtap_hint_pack` — consumable (5 hints)
No subscriptions. No other products.

---

## 5. Design System (apply to all UI)

```
Background:      #07111F  (Deep Navy)
Surface/Card:    #0F2040
Border:          #1A3558
Gold (Primary):  #FFD700
Blue (Secondary):#1E8BC3
Text:            #EEF4FF
Muted:           #5E7A9C
Success:         #2ECC71
Danger:          #E05050

Display font:    Space Mono (monospace) — all numbers, headings, HUD values
Body font:       DM Sans — descriptions, labels, settings text
```

**Skin rule:** All backgrounds use animated floating number particles (5–8% opacity, Space Mono, drifting upward). Radial gold/blue ambient glow behind play area. Tiles use gradient fills with inner glow — never flat solid fills.

---

## 6. Level Config Schema

```typescript
interface LevelConfig {
  id: number;           // 1–100 (and beyond for future packs)
  pack: 1 | 2 | 3;     // 1=Learn(1-25), 2=Rise(26-60), 3=Master(61-100)
  grid: 3 | 4 | 5 | 6 | 7;  // NxN grid size
  modifier: Modifier;
  direction: Direction; // 'ascending' default; 'descending' from level 75
  timeLimit: number;    // seconds
  stars: [number, number, number]; // [3-star secs, 2-star secs, 1-star secs]
}
```

---

## 7. Scoring Formulas

```
Base score:         each correct tap = 100 pts
Time bonus:         remaining seconds × 20
Speed bonus:        if avg tap interval < 2s → +200 pts
Streak multiplier:  daily challenge streak N days → score × (1 + N × 0.05), max ×1.5
Grid multiplier:    3×3=×1.0 | 4×4=×1.5 | 5×5=×2.0 | 6×6=×2.8 | 7×7=×3.5

Final score = (baseScore + timeBonus + speedBonus) × streakMultiplier × gridMultiplier
```

---

## 8. Star Rating Logic

```
3 stars: completed in ≤ stars[0] seconds
2 stars: completed in ≤ stars[1] seconds
1 star:  completed at all (even if slow)
0 stars: time expired — no stars, level not passed
```
Stars are cosmetic only. 1 star always unlocks the next level. Never gate progression on 2 or 3 stars.

---

## 9. Ad Rules — Strict

| Trigger | Ad type |
|---|---|
| Result screen (level complete) | Interstitial — max 1 per 3 minutes |
| Hint button tapped | Rewarded video — player initiated only |
| Everywhere else | NO ADS |

Never show ads on: home screen, active game, paused screen, leaderboard, settings, about.

---

## 10. First-Launch Flow

```
Splash → Language Selection → GDPR Consent (EU only) → How to Play → Home
```
All flags stored in Capacitor Preferences. Returning users: Splash → Home directly.

---

## 11. Current Sprint Status

| Sprint | Status |
|---|---|
| Sprint 1 — Scaffolding | ✅ COMPLETE |
| Sprint 2 — Core game logic | 🔄 IN PROGRESS |

**Sprint 2 tasks in order:**
1. `src/game/GridEngine.ts` + unit tests
2. `src/game/ScoreEngine.ts` + unit tests
3. `src/game/LevelManager.ts` + `src/game/levels.json` (all 100 levels)
4. `src/components/TimerComponent.tsx`
5. Game loop wire-up in `src/scenes/GameScene.ts`
6. Modifier implementations (shuffle, fog, mirror, countdown)

**Current task: Step 1 — GridEngine.ts**

---

## 12. Verified Device

Samsung SM-E146B (serial: RZCW30XB11X) — USB debugging ON
ADB path: C:\Android\platform-tools\adb.exe
Android SDK: C:\Users\Mahendra\AppData\Local\Android\Sdk

---

## 13. Key Accounts (for config reference only)

| Service | Account |
|---|---|
| AdMob Publisher ID | pub-7932168293321470 |
| Numtap App ID (TEST — use during dev) | ca-app-pub-3940256099942544~3347511713 |
| Numtap App ID (LIVE — Sprint 4 only) | ca-app-pub-7932168293321470~5301760306 |
| Firebase project | gazetica-numtap |
| Supabase region | ap-south-1 (Mumbai) |
| GitHub repo | github.com/gazetica/numtap |

**CRITICAL: Never swap test AdMob IDs for live IDs until Sprint 4. Using live IDs during dev triggers invalid traffic detection.**

---

## 14. Docs Folder — Always Consult Before Coding

Before starting any task, read the relevant doc in `docs/`:

| File | Read before... |
|---|---|
| `docs/architecture.md` | Any new file or structural decision |
| `docs/level-configs.md` | Anything touching LevelManager or levels.json |
| `docs/design-system.md` | Any UI component or screen |
| `docs/api-contracts.md` | Any inter-module function call |
| `docs/sprint-log.md` | Starting or finishing any task |

**After completing each task, update `docs/sprint-log.md` with what was done, what was tested, and what is next.**

