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
import type { Cell, TapResult, Difficulty } from '../game/GridEngine';
import { LevelManager } from '../game/LevelManager';
import type { LevelConfig } from '../game/LevelManager';
import { ScoreEngine } from '../game/ScoreEngine';
import type { ScoreParams } from '../game/ScoreEngine';
import { submitScore } from '../services/supabase';
import { useSettingsStore } from './settingsStore';
import { getDailyChallenge } from '../game/DailyChallenge';

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
  // T-000: count of wrong taps this round. Each wrong tap deducts 100 from the
  // live score (which may go negative during play); the penalty also carries into
  // the final score. The live score is recomputed on every correct tap, so the
  // penalty must live here (a view-only deduction would be wiped on the next tap).
  wrongTaps: number;

  // Timer
  timeElapsed: number;

  // Hint
  hintUsed: boolean;
  hintActive: boolean;

  // Daily challenge
  dailyDate: string; // 'YYYY-MM-DD' of the active daily challenge

  // T-004B: selected difficulty for the active round (drives sequence + score mult).
  difficulty: Difficulty;

  // Actions. `difficulty` is optional — when omitted, the level's own direction +
  // easy scoring are used (preserves CampaignScreen / play-again behaviour).
  startLevel: (levelId: number, mode: GameMode, difficulty?: Difficulty) => void;
  startDailyChallenge: () => void;
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
  wrongTaps: 0,
  timeElapsed: 0,
  hintUsed: false,
  hintActive: false,
  dailyDate: '',
  difficulty: 'easy',

  startLevel: (levelId, mode, difficulty) => {
    const level = LevelManager.getLevel(levelId);
    // A chosen difficulty overrides the level's configured direction
    // (easy=ascending, pro=descending, expert=random sequence). With no difficulty
    // passed (CampaignScreen taps, play-again), keep the level's own direction.
    const effectiveDir = difficulty === undefined ? level.direction : difficulty === 'pro' ? 'descending' : 'ascending';
    const diff: Difficulty = difficulty ?? 'easy';
    const engine = new GridEngine(level.grid, level.modifier, effectiveDir, diff);
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
      wrongTaps: 0,
      timeElapsed: 0,
      hintUsed: false,
      hintActive: false,
      difficulty: diff,
    });
  },

  startDailyChallenge: () => {
    const daily = getDailyChallenge();
    const n = daily.gridSize;

    // Synthetic LevelConfig for the daily challenge (id 0 — not in levels.json).
    const dailyLevel: LevelConfig = {
      id: 0,
      pack: 1,
      grid: n,
      modifier: 'none',
      direction: 'ascending',
      timeLimit: 90,
      stars: [45, 68, 90],
    };

    // Build a 'none' 5x5 engine, then overwrite its cell values with the seeded
    // shuffle. GridEngine's private field is `grid` (verified in GridEngine.ts);
    // generateGrid() already set expectedNext=1 (ascending). We mutate the
    // engine's internal grid directly so getGrid()/validateTap stay consistent.
    const engine = new GridEngine(n, 'none', 'ascending');
    engine.generateGrid();
    const internal = (engine as unknown as { grid: Cell[][] }).grid;
    let idx = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const value = daily.shuffledNumbers[idx++];
        internal[r][c].value = value;
        internal[r][c].display = value; // 'none' modifier: display === value
      }
    }

    set({
      currentLevelId: 0,
      currentLevel: dailyLevel,
      mode: 'daily',
      status: 'playing',
      runId: get().runId + 1,
      engine,
      grid: engine.getGrid(),
      score: 0,
      tapTimestamps: [],
      wrongTaps: 0,
      timeElapsed: 0,
      hintUsed: false,
      hintActive: false,
      dailyDate: daily.date,
      difficulty: 'easy', // Daily is always Easy (shared seed must be comparable).
    });
  },

  tapCell: (row, col) => {
    const { engine, status, tapTimestamps, wrongTaps } = get();
    if (!engine || status !== 'playing') return null;
    const result = engine.validateTap(row, col);
    if (result === 'CORRECT') {
      const newTimestamps = [...tapTimestamps, Date.now()];
      const newGrid = engine.getGrid();
      // Live score preview: 100 per correct tap, less 100 per wrong tap so far.
      const newScore = newTimestamps.length * 100 - wrongTaps * 100;
      set({ grid: newGrid, tapTimestamps: newTimestamps, score: newScore });
      // Check completion
      if (engine.isComplete()) {
        get().endGame('complete');
      }
    } else if (result === 'WRONG') {
      // T-000: −100 per wrong tap, applied immediately to the live score (which
      // may go negative). Score is floored at 0 for display on the ResultScreen.
      const newWrong = wrongTaps + 1;
      set({ wrongTaps: newWrong, score: tapTimestamps.length * 100 - newWrong * 100 });
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
    const { currentLevel, tapTimestamps, timeElapsed, mode, wrongTaps, difficulty } = get();
    if (!currentLevel) return;
    if (reason === 'complete') {
      const params: ScoreParams = {
        gridSize: currentLevel.grid,
        tapCount: currentLevel.grid * currentLevel.grid,
        timeLimit: currentLevel.timeLimit,
        timeElapsed,
        tapTimestamps,
        dailyStreak: 0,
        difficulty,
      };
      const result = ScoreEngine.calculate(params);
      // T-000 penalty THEN T-004B difficulty multiplier (the last operation, per
      // spec). May be negative (ResultScreen floors the displayed/recorded value).
      const penalized = result.totalScore - wrongTaps * 100;
      const finalScore = Math.round(penalized * result.difficultyMultiplier);
      set({ status: 'complete', score: finalScore });

      // Submit to the leaderboard for eligible modes. Fire-and-forget —
      // a network failure must never block or break the game flow.
      if (mode === 'daily' || mode === 'endless' || mode === 'speed') {
        const { alias } = useSettingsStore.getState();
        submitScore({
          alias: alias || 'Player',
          score: Math.max(0, finalScore),
          mode,
          gridSize: currentLevel.grid,
          levelId: currentLevel.id,
          country: 'XX', // T-014 will detect country from device locale
        }).catch((err) => console.warn('[gameStore] submitScore failed:', err));
      }
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
      wrongTaps: 0,
      timeElapsed: 0,
      difficulty: 'easy',
      hintUsed: false,
      hintActive: false,
    });
  },
}));
