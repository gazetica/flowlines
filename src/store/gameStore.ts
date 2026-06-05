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
import { ScoreEngine, DIFFICULTY_MULTIPLIER } from '../game/ScoreEngine';
import type { ScoreParams } from '../game/ScoreEngine';
import { submitScore } from '../services/supabase';
import { useSettingsStore } from './settingsStore';
import { getDailyChallenge, getDailyShuffledNumbers, getTodayDateString } from '../game/DailyChallenge';
import type { DailyChallengeIndex } from '../game/DailyChallenge';
import { setLocalDailyScore } from '../services/dailyScores';
import { padTileLabel } from '../utils/tileFormat';

export type GameMode = 'campaign' | 'daily' | 'endless' | 'speed' | 'freeplay';
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
  // T-005: which of the 3 daily challenges is active (null = not a daily round).
  currentChallengeIndex: DailyChallengeIndex | null;

  // T-004B: selected difficulty for the active round (drives sequence + score mult).
  difficulty: Difficulty;
  // T-004B P2: false = untimed Free Play (no timer HUD, base-taps-only scoring).
  timed: boolean;

  // Actions. `difficulty` is optional — when omitted, the level's own direction +
  // easy scoring are used (preserves CampaignScreen / play-again behaviour).
  startLevel: (levelId: number, mode: GameMode, difficulty?: Difficulty) => void;
  startDailyChallenge: (challengeIndex: DailyChallengeIndex) => void;
  // Free Play: arbitrary grid size + difficulty + optional timer (null = untimed).
  startFreePlay: (config: { gridSize: number; difficulty: Difficulty; timerSecs: number | null }) => void;
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
  currentChallengeIndex: null,
  difficulty: 'easy',
  timed: true,

  startLevel: (levelId, mode, difficulty) => {
    const level = LevelManager.getLevel(levelId);
    // A chosen difficulty overrides the level's configured direction
    // (easy=ascending, pro=descending, expert=random sequence). With no difficulty
    // passed (CampaignScreen taps, play-again), keep the level's own direction.
    const effectiveDir = difficulty === undefined ? level.direction : difficulty === 'pro' ? 'descending' : 'ascending';
    const diff: Difficulty = difficulty ?? 'easy';
    const engine = new GridEngine(level.grid, level.modifier, effectiveDir, diff);
    const grid = engine.generateGrid();
    // T-009b Fix 1: on mirror levels, render every tile as a fixed 2-char string
    // so the horizontal flip is symmetric. Tile text is drawn entirely in the
    // (locked) GameScene via String(engine.getDisplayValue(cell)), and getDisplayValue
    // lives on the (locked) GridEngine — so the only seam is to wrap this engine
    // instance's method here. Display-only: tap validation uses cell.value, untouched.
    if (level.modifier === 'mirror') {
      const baseDisplay = engine.getDisplayValue.bind(engine);
      (engine as unknown as { getDisplayValue: (c: Cell) => unknown }).getDisplayValue = (cell: Cell) =>
        padTileLabel(baseDisplay(cell));
    }
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
      timed: true,
    });
  },

  startDailyChallenge: (challengeIndex) => {
    // T-005: 3 challenges over the SAME seeded layout. The difficulty sets the tap
    // order (C1 ascending / C2 descending / C3 random); the grid positions are the
    // shared seeded layout for fair comparison.
    const config = getDailyChallenge(challengeIndex);
    const shuffled = getDailyShuffledNumbers();
    const n = config.gridSize;
    const dir = config.difficulty === 'pro' ? 'descending' : 'ascending';

    const dailyLevel: LevelConfig = {
      id: 0,
      pack: 1,
      grid: n as LevelConfig['grid'],
      modifier: 'none',
      direction: dir,
      timeLimit: 90,
      stars: [45, 68, 90],
    };

    // Build the engine at this difficulty (expert generates its own random tap
    // sequence over the values), then overwrite cell VALUES with the seeded layout.
    const engine = new GridEngine(n, 'none', dir, config.difficulty);
    engine.generateGrid();
    const internal = (engine as unknown as { grid: Cell[][] }).grid;
    let idx = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const value = shuffled[idx++];
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
      dailyDate: getTodayDateString(),
      currentChallengeIndex: challengeIndex,
      difficulty: config.difficulty,
      timed: true,
    });
  },

  startFreePlay: ({ gridSize, difficulty, timerSecs }) => {
    const dir = difficulty === 'pro' ? 'descending' : 'ascending';
    const engine = new GridEngine(gridSize, 'none', dir, difficulty);
    const grid = engine.generateGrid();
    // Synthetic level config (id -1 — not in levels.json). timeLimit is the chosen
    // duration, or 0 when untimed (the timer HUD is hidden either way for untimed).
    const synthLevel: LevelConfig = {
      id: -1,
      pack: 1,
      grid: gridSize as LevelConfig['grid'],
      modifier: 'none',
      direction: dir,
      timeLimit: timerSecs ?? 0,
      stars: [0, 0, 0],
    };
    set({
      currentLevelId: -1,
      currentLevel: synthLevel,
      mode: 'freeplay',
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
      difficulty,
      timed: timerSecs !== null,
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
    const { currentLevel, tapTimestamps, timeElapsed, mode, wrongTaps, difficulty, timed, currentChallengeIndex } = get();
    if (!currentLevel) return;
    if (reason === 'complete') {
      const mult = DIFFICULTY_MULTIPLIER[difficulty];
      let subtotal: number;
      if (mode === 'freeplay' && !timed) {
        // Untimed Free Play: base taps only (no time / speed bonus). 100 per tap.
        subtotal = currentLevel.grid * currentLevel.grid * 100;
      } else {
        const params: ScoreParams = {
          gridSize: currentLevel.grid,
          tapCount: currentLevel.grid * currentLevel.grid,
          timeLimit: currentLevel.timeLimit,
          timeElapsed,
          tapTimestamps,
          dailyStreak: 0,
          difficulty,
        };
        subtotal = ScoreEngine.calculate(params).totalScore;
      }
      // T-000 penalty THEN T-004B difficulty multiplier (the last operation, per
      // spec). May be negative (ResultScreen floors the displayed/recorded value).
      const finalScore = Math.round((subtotal - wrongTaps * 100) * mult);
      set({ status: 'complete', score: finalScore });

      // T-005: a daily challenge records its score LOCALLY only — the cumulative
      // C1+C2+C3 is submitted from the Daily Hub once all 3 are complete. Other
      // submitting modes (endless/speed) post live. Fire-and-forget throughout.
      if (mode === 'daily' && currentChallengeIndex) {
        setLocalDailyScore(currentChallengeIndex, Math.max(0, finalScore)).catch((err) =>
          console.warn('[gameStore] setLocalDailyScore:', err)
        );
      } else if (mode === 'endless' || mode === 'speed') {
        const { alias, country } = useSettingsStore.getState();
        submitScore({
          alias: alias || 'Player',
          score: Math.max(0, finalScore),
          mode,
          gridSize: currentLevel.grid,
          levelId: currentLevel.id,
          country: country || 'XX',
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
      timed: true,
      currentChallengeIndex: null,
      hintUsed: false,
      hintActive: false,
    });
  },
}));
