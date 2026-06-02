// gameStore.ts
// Numtap | Gazetica Studio | Sprint 2 Day 3 | Task T-005
//
// Zustand store: single source of truth for game state.
// No Phaser. No React imports beyond Zustand.
//
// NOTE: imports are split into value vs `import type` to satisfy the project's
// `verbatimModuleSyntax` tsconfig setting (types must be imported with
// `import type`). The brief's combined imports would not type-check here.

import { create } from 'zustand';
import { GridEngine } from '../game/GridEngine';
import type { Cell, TapResult } from '../game/GridEngine';
import { LevelManager } from '../game/LevelManager';
import type { LevelConfig } from '../game/LevelManager';
import { ScoreEngine } from '../game/ScoreEngine';
import type { ScoreParams } from '../game/ScoreEngine';

export type GameMode = 'campaign' | 'daily' | 'endless' | 'speed';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'complete' | 'failed';

interface GameState {
  // Current session
  currentLevelId: number;
  currentLevel: LevelConfig | null;
  mode: GameMode;
  status: GameStatus;
  // Increments on every startLevel(). GameScreen uses it as the TimerComponent
  // `key` so the timer remounts (and resets `remaining`) on each (re)start —
  // even when the new level's timeLimit is unchanged. Without this, restarting
  // a same-duration level leaves the timer stuck at 0 and it instantly expires.
  runId: number;

  // Grid
  engine: GridEngine | null;
  grid: Cell[][];

  // Score tracking
  score: number;
  tapTimestamps: number[];

  // Timer
  timeElapsed: number;

  // Hint
  hintUsed: boolean;
  hintActive: boolean;

  // Actions
  startLevel: (levelId: number, mode: GameMode) => void;
  tapCell: (row: number, col: number) => TapResult | null;
  tickTimer: (elapsed: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  useHint: () => void;
  deactivateHint: () => void;
  endGame: (reason: 'complete' | 'expired') => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentLevelId: 1,
  currentLevel: null,
  mode: 'campaign',
  status: 'idle',
  runId: 0,
  engine: null,
  grid: [],
  score: 0,
  tapTimestamps: [],
  timeElapsed: 0,
  hintUsed: false,
  hintActive: false,

  startLevel: (levelId, mode) => {
    const level = LevelManager.getLevel(levelId);
    const engine = new GridEngine(level.grid, level.modifier, level.direction);
    const grid = engine.generateGrid();
    set({
      currentLevelId: levelId,
      currentLevel: level,
      mode,
      status: 'playing',
      runId: get().runId + 1,
      engine,
      grid,
      score: 0,
      tapTimestamps: [],
      timeElapsed: 0,
      hintUsed: false,
      hintActive: false,
    });
  },

  tapCell: (row, col) => {
    const { engine, status, tapTimestamps } = get();
    if (!engine || status !== 'playing') return null;
    const result = engine.validateTap(row, col);
    if (result === 'CORRECT') {
      const newTimestamps = [...tapTimestamps, Date.now()];
      const newGrid = engine.getGrid();
      const newScore = newTimestamps.length * 100; // live score preview
      set({ grid: newGrid, tapTimestamps: newTimestamps, score: newScore });
      // Check completion
      if (engine.isComplete()) {
        get().endGame('complete');
      }
    }
    return result;
  },

  tickTimer: (elapsed) => {
    set({ timeElapsed: elapsed });
  },

  pauseGame: () => {
    const { status } = get();
    if (status === 'playing') set({ status: 'paused' });
  },

  resumeGame: () => {
    const { status } = get();
    if (status === 'paused') set({ status: 'playing' });
  },

  useHint: () => {
    set({ hintUsed: true, hintActive: true });
  },

  deactivateHint: () => {
    set({ hintActive: false });
  },

  endGame: (reason) => {
    const { currentLevel, tapTimestamps, timeElapsed } = get();
    if (!currentLevel) return;
    if (reason === 'complete') {
      const params: ScoreParams = {
        gridSize: currentLevel.grid,
        tapCount: currentLevel.grid * currentLevel.grid,
        timeLimit: currentLevel.timeLimit,
        timeElapsed,
        tapTimestamps,
        dailyStreak: 0,
      };
      const result = ScoreEngine.calculate(params);
      set({ status: 'complete', score: result.totalScore });
    } else {
      set({ status: 'failed' });
    }
  },

  resetGame: () => {
    set({
      status: 'idle',
      engine: null,
      grid: [],
      score: 0,
      tapTimestamps: [],
      timeElapsed: 0,
      hintUsed: false,
      hintActive: false,
    });
  },
}));
