# API Contracts
**Numtap | Gazetica Studio | Last updated: Sprint 2 Day 1**

All public interfaces between modules. Claude Code must follow these exactly.
Do not change a contract without updating this document.

---

## GridEngine

```typescript
// src/game/GridEngine.ts

export interface Cell {
  row: number;
  col: number;
  value: number;           // actual number (1 to N²)
  display: number;         // what renders — same as value unless modifier changes it
  tapped: boolean;
  revealed: boolean;       // fog modifier: true = visible
  revealedAt: number | null; // fog: timestamp when revealed (ms)
}

export type TapResult = 'CORRECT' | 'WRONG' | 'ALREADY_TAPPED';
export type Modifier = 'none' | 'shuffle' | 'fog' | 'mirror' | 'countdown';
export type Direction = 'ascending' | 'descending';

export class GridEngine {
  constructor(n: number, modifier: Modifier, direction: Direction)

  // Returns full NxN grid, shuffled, ready to render
  generateGrid(): Cell[][]

  // Returns current grid state (call after any mutation)
  getGrid(): Cell[][]

  // Returns the number the player must tap next
  getExpectedNext(): number

  // Returns true if all cells are tapped
  isComplete(): boolean

  // Validates and processes a tap. Mutates grid state if CORRECT.
  validateTap(row: number, col: number): TapResult

  // SHUFFLE modifier: call every frame with elapsed ms. Returns true if reshuffle occurred.
  onShuffleTick(elapsedMs: number): boolean

  // FOG modifier: call on pointer move. Reveals cells within 1-cell radius.
  onPointerMove(pointerRow: number, pointerCol: number): void

  // COUNTDOWN modifier: call every frame. Hides cells revealed > 3s ago. Returns array of newly hidden cells.
  onCountdownTick(elapsedMs: number): Cell[]

  // Returns display value for a cell (mirror modifier flips digits)
  getDisplayValue(cell: Cell): number

  // Resets engine to initial state (for restart)
  reset(): void
}
```

---

## ScoreEngine

```typescript
// src/game/ScoreEngine.ts

export interface ScoreParams {
  gridSize: number;         // N (3–7)
  tapCount: number;         // number of correct taps (= N²)
  timeLimit: number;        // level time limit in seconds
  timeElapsed: number;      // actual time used in seconds
  tapTimestamps: number[];  // ms timestamps of each correct tap
  dailyStreak: number;      // consecutive daily challenge days (0 = no streak)
}

export interface ScoreResult {
  baseScore: number;
  timeBonus: number;
  speedBonus: number;
  streakMultiplier: number;
  gridMultiplier: number;
  totalScore: number;
  breakdown: string;        // human-readable e.g. "2500 + 380 + 200 × 1.1 × 2.0"
}

export class ScoreEngine {
  // Pure function — no side effects, no state
  static calculate(params: ScoreParams): ScoreResult
}
```

---

## LevelManager

```typescript
// src/game/LevelManager.ts

export interface LevelConfig {
  id: number;
  pack: 1 | 2 | 3;
  grid: 3 | 4 | 5 | 6 | 7;
  modifier: Modifier;
  direction: Direction;
  timeLimit: number;          // seconds
  stars: [number, number, number]; // [3★ secs, 2★ secs, 1★ secs]
}

export class LevelManager {
  // Returns config for a specific level ID
  static getLevel(id: number): LevelConfig

  // Returns all levels in a pack
  static getPack(pack: 1 | 2 | 3): LevelConfig[]

  // Returns total number of levels
  static getTotalLevels(): number

  // Returns star count (0–3) for a given completion time
  static getStars(level: LevelConfig, timeElapsed: number): 0 | 1 | 2 | 3

  // Returns true if pack is unlocked (all previous pack levels have ≥1 star)
  static isPackUnlocked(pack: 2 | 3, completedLevels: Record<number, number>): boolean
}
```

---

## TimerComponent

```typescript
// src/components/TimerComponent.tsx

interface TimerProps {
  durationSeconds: number;
  onTick: (remaining: number) => void;   // fires every second
  onExpire: () => void;                   // fires when hits 0
  paused: boolean;
}

// Renders: large countdown number
// Turns danger red (#E05050) when remaining ≤ 10
// Controlled externally via paused prop
```

---

## gameStore (Zustand)

```typescript
// src/store/gameStore.ts

// Actions available to GameScene and React components:
useGameStore.getState().startLevel(levelId: number, mode: GameMode)
useGameStore.getState().tapCell(row: number, col: number): TapResult
useGameStore.getState().pauseGame()
useGameStore.getState().resumeGame()
useGameStore.getState().useHint()
useGameStore.getState().endGame(reason: 'complete' | 'expired')
useGameStore.getState().resetGame()
```

---

## Change Log

| Date | Change | Reason |
|---|---|---|
| 02 Jun 2026 | Initial contracts defined | Sprint 2 Day 1 |
