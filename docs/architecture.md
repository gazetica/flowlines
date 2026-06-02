# Architecture Reference
**Numtap | Gazetica Studio | Last updated: Sprint 2 Day 1**

---

## Layer Diagram

```
┌─────────────────────────────────────────────┐
│              React App Shell                │  ← HomeScreen, ResultScreen, etc.
│         (components/ + App.tsx)             │
├─────────────────────────────────────────────┤
│              Phaser Scenes                  │  ← GameScene, SplashScene, UIScene
│               (scenes/)                     │
├─────────────────────────────────────────────┤
│           Pure Game Logic (TS)              │  ← GridEngine, ScoreEngine, LevelManager
│               (game/)                       │  ← NO Phaser imports here
├─────────────────────────────────────────────┤
│              Zustand Stores                 │  ← gameStore, settingsStore
│               (store/)                      │
├─────────────────────────────────────────────┤
│           External Services                 │  ← AdMob, Firebase, Supabase, Preferences
│             (services/)                     │
├─────────────────────────────────────────────┤
│           Capacitor Android Layer           │  ← Native bridge
│              (android/)                     │
└─────────────────────────────────────────────┘
```

---

## Core Rule: Pure Game Logic = No Phaser

`src/game/` files are pure TypeScript with zero Phaser imports.
Reason: enables Vitest unit tests to run without a browser/canvas.

```
src/game/
  GridEngine.ts      ← Grid state, shuffle, tap validation, modifier logic
  ScoreEngine.ts     ← All score calculations, pure functions
  LevelManager.ts    ← Level config loader, pack management
  levels.json        ← All 100 level definitions
  GridEngine.test.ts ← Vitest unit tests
  ScoreEngine.test.ts
```

---

## Data Flow — One Complete Game Round

```
1. Player taps PLAY
   └─ LevelManager.getLevel(id) → LevelConfig

2. GameScene.create()
   └─ GridEngine.generateGrid(n, direction) → Cell[][]
   └─ GridEngine.applyModifier(modifier) → void
   └─ Phaser renders tiles from Cell[][] state

3. Player taps tile at (row, col)
   └─ GridEngine.validateTap(row, col) → TapResult
       ├─ CORRECT  → mark tapped, advance expected, trigger gold pulse animation
       ├─ WRONG    → trigger red shake animation, no state change
       └─ ALREADY_TAPPED → ignore

4. All N² numbers tapped
   └─ ScoreEngine.calculate(params) → ScoreResult
   └─ Zustand gameStore updated
   └─ React ResultScreen renders

5. Result screen shown
   └─ AdMob interstitial fired (if 3-min cap allows)
   └─ Supabase score upserted (if leaderboard-eligible mode)
   └─ Capacitor Preferences: best score, stars updated
```

---

## Modifier Architecture

Modifiers are applied by GridEngine after grid generation.
Each modifier is an independent behaviour added on top of the base grid.

```typescript
// GridEngine manages modifier state internally
// GameScene calls these hooks from its update() loop:

gridEngine.onShuffleTick(elapsedMs)    // shuffle: checks 8s interval
gridEngine.onPointerMove(row, col)     // fog: reveals nearby cells
gridEngine.onCountdownTick(elapsedMs) // countdown: hides old cells
// mirror: handled at render time — GameScene reads cell.mirroredDisplay
```

---

## Zustand Store Shape

```typescript
// gameStore.ts
interface GameState {
  currentLevelId: number;
  mode: 'campaign' | 'daily' | 'endless' | 'speed';
  grid: Cell[][];
  expectedNext: number;
  score: number;
  timeElapsed: number;
  tapTimestamps: number[];    // for speed bonus calculation
  hintUsed: boolean;
  hintActive: boolean;        // true for 5s after hint used
  gameStatus: 'idle' | 'playing' | 'paused' | 'complete' | 'failed';
}

// settingsStore.ts
interface SettingsState {
  language: 'en' | 'de' | 'fr' | 'ko' | 'pt' | 'es';
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  alias: string;
  removeAdsPurchased: boolean;
  hintPackCount: number;
  onboardingShown: boolean;
  languageSelected: boolean;
  dailyStreak: number;
  lastPlayedDate: string;
}
```

---

## File Creation Checklist

Before creating any new file, confirm:
- [ ] Does this file belong in `game/` (pure TS) or `scenes/` (Phaser) or `components/` (React)?
- [ ] Does it import from the correct layer only? (game/ must not import Phaser)
- [ ] Does it have a corresponding test file if it's in `game/`?
- [ ] Is it exported from an index.ts if other modules need it?
