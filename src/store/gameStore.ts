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
import * as analytics from '../services/analytics';

export type GameMode = 'campaign' | 'daily' | 'endless' | 'speed' | 'freeplay';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'complete' | 'failed';

// F-008: handle for the 3-2-1 resume-countdown interval. Module-level (not React
// state) so it survives store updates and can be cleared from several actions; only
// the visible number (resumeCountdown) lives in the store.
let resumeIntervalId: ReturnType<typeof setInterval> | null = null;
function clearResumeInterval(): void {
  if (resumeIntervalId !== null) {
    clearInterval(resumeIntervalId);
    resumeIntervalId = null;
  }
}

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
  // F-005-FIX: authoritative remaining seconds, written from the TimerComponent tick
  // (the countdown is React-driven, not in the locked Phaser GameScene). Reset to the
  // level's timeLimit on each (re)start. The rescue threshold reads this directly.
  timeRemaining: number;

  // F-008: 3-2-1 resume countdown shown after a rewarded ad (rescue/gem) closes,
  // before the timer resumes. null = not counting; 3/2/1 = active. The round stays
  // 'paused' (timer frozen) for the whole ad + countdown so a short level can't
  // expire while the player is in the ad / reading the reward.
  resumeCountdown: number | null;

  // Hint
  hintUsed: boolean;
  hintActive: boolean;

  // F-005 Rescue Flash — a SEPARATE system from the cyan hint above. Amber tiles
  // revealed after watching a rescue ad. rescueTileIds holds the tile VALUES to
  // reveal (the next N untapped, in tap-sequence order). All reset on each attempt.
  rescueFlashActive: boolean;
  rescueTileIds: number[];
  // F-009: per-attempt one-use flags for the three rewarded ads (reset on (re)start).
  // cluePillUsed → GET A CLUE pill (amber reveal); timePillUsed → LOW ON TIME pill
  // (+15s); gemAdUsed → the WATCH AD gem button. Each ad is usable once per attempt.
  cluePillUsed: boolean;
  timePillUsed: boolean;
  gemAdUsed: boolean;

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
  setTimeRemaining: (t: number) => void; // F-005-FIX: real countdown value from TimerComponent
  pauseGame: () => void;
  resumeGame: () => void;
  // F-008: pause/resume the live countdown around rewarded ads. pauseTimer mirrors
  // pauseGame (status → paused freezes TimerComponent). startResumeCountdown runs the
  // visible 3→2→1 and calls resumeTimer at 0; resumeTimer is the single terminal
  // resume (clears the countdown interval and returns a paused round to 'playing').
  pauseTimer: () => void;
  resumeTimer: () => void;
  startResumeCountdown: () => void;
  useHint: () => void;
  deactivateHint: () => void;
  // F-005: mark the rescue banner as shown for this attempt (one per attempt).
  // F-009: mark each rewarded ad as used for this attempt (one use each).
  markCluePillUsed: () => void;
  markTimePillUsed: () => void;
  markGemAdUsed: () => void;
  // F-005: reveal the next `tileCount` untapped tiles (in tap-sequence order) as amber.
  activateRescueFlash: (tileCount: number) => void;
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
  timeRemaining: 0,
  resumeCountdown: null,
  hintUsed: false,
  hintActive: false,
  rescueFlashActive: false,
  rescueTileIds: [],
  cluePillUsed: false,
  timePillUsed: false,
  gemAdUsed: false,
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
      timeRemaining: level.timeLimit,
      resumeCountdown: null,
      hintUsed: false,
      hintActive: false,
      rescueFlashActive: false,
      rescueTileIds: [],
      cluePillUsed: false,
      timePillUsed: false,
      gemAdUsed: false,
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
      timeRemaining: dailyLevel.timeLimit,
      resumeCountdown: null,
      hintUsed: false,
      hintActive: false,
      rescueFlashActive: false,
      rescueTileIds: [],
      cluePillUsed: false,
      timePillUsed: false,
      gemAdUsed: false,
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
      timeRemaining: synthLevel.timeLimit,
      resumeCountdown: null,
      hintUsed: false,
      hintActive: false,
      rescueFlashActive: false,
      rescueTileIds: [],
      cluePillUsed: false,
      timePillUsed: false,
      gemAdUsed: false,
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
      // T-020: tap originates in the (read-only) GameScene → tapCell; this store
      // action is the existing scene→state bridge, so the tap events fire here.
      analytics.tapCorrect({ levelId: get().currentLevelId, tapCount: newTimestamps.length });
      // Check completion
      if (engine.isComplete()) {
        get().endGame('complete');
      }
    } else if (result === 'WRONG') {
      // T-000: −100 per wrong tap, applied immediately to the live score (which
      // may go negative). Score is floored at 0 for display on the ResultScreen.
      const newWrong = wrongTaps + 1;
      set({ wrongTaps: newWrong, score: tapTimestamps.length * 100 - newWrong * 100 });
      analytics.tapWrong({ levelId: get().currentLevelId });
    }
    return result;
  },

  tickTimer: (elapsed) => {
    set({ timeElapsed: elapsed });
  },

  setTimeRemaining: (t) => {
    set({ timeRemaining: t });
  },

  pauseGame: () => {
    const { status } = get();
    if (status === 'playing') set({ status: 'paused' });
  },

  resumeGame: () => {
    const { status } = get();
    if (status === 'paused') set({ status: 'playing' });
  },

  // F-008 FIX 1 Part A: freeze the live countdown before a rewarded ad shows. Same
  // mechanism the pause modal uses (status → paused makes TimerComponent clear its
  // interval), so the clock cannot tick — or expire — while the ad is on screen.
  pauseTimer: () => {
    const { status } = get();
    if (status === 'playing') set({ status: 'paused' });
  },

  // F-008 FIX 1: the single terminal resume. Clears any running countdown interval,
  // hides the overlay, and un-pauses a paused round. It deliberately does NOT revive
  // a round that ended (complete/failed) — only resumeCountdown is cleared then.
  resumeTimer: () => {
    clearResumeInterval();
    const { status } = get();
    if (status === 'paused') set({ status: 'playing', resumeCountdown: null });
    else set({ resumeCountdown: null });
  },

  // F-008 FIX 1 Part B/C: after an ad closes, run the 3→2→1 overlay then resume.
  // Idempotent — a countdown already in flight is never restarted or extended (guards
  // against a double-invocation leaving two intervals running, the FIX 2 freeze class).
  startResumeCountdown: () => {
    if (get().resumeCountdown !== null) return;
    clearResumeInterval();
    set({ resumeCountdown: 3 });
    resumeIntervalId = setInterval(() => {
      const current = get().resumeCountdown;
      if (current === null) {
        clearResumeInterval();
        return;
      }
      if (current <= 1) {
        clearResumeInterval();
        get().resumeTimer(); // → resumeCountdown null + status back to playing
      } else {
        set({ resumeCountdown: current - 1 });
      }
    }, 1000);
  },

  useHint: () => {
    set({ hintUsed: true, hintActive: true });
  },

  deactivateHint: () => {
    set({ hintActive: false });
  },

  markCluePillUsed: () => {
    set({ cluePillUsed: true });
  },
  markTimePillUsed: () => {
    set({ timePillUsed: true });
  },
  markGemAdUsed: () => {
    set({ gemAdUsed: true });
  },

  // F-005: reveal the next `tileCount` untapped tiles in tap-sequence order. Works
  // for all difficulties via engine.getSequence() (easy=asc, pro=desc, expert=random).
  activateRescueFlash: (tileCount) => {
    const { engine, grid } = get();
    if (!engine) return;
    const tappedByValue = new Map<number, boolean>();
    for (const row of grid) for (const cell of row) tappedByValue.set(cell.value, cell.tapped);
    const untappedInOrder = engine.getSequence().filter((v) => tappedByValue.get(v) === false);
    set({ rescueTileIds: untappedInOrder.slice(0, Math.max(0, tileCount)), rescueFlashActive: true });
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
    clearResumeInterval();
    set({
      status: 'idle',
      engine: null,
      grid: [],
      score: 0,
      tapTimestamps: [],
      wrongTaps: 0,
      timeElapsed: 0,
      timeRemaining: 0,
      resumeCountdown: null,
      difficulty: 'easy',
      timed: true,
      currentChallengeIndex: null,
      hintUsed: false,
      hintActive: false,
      rescueFlashActive: false,
      rescueTileIds: [],
      cluePillUsed: false,
      timePillUsed: false,
      gemAdUsed: false,
    });
  },
}));
