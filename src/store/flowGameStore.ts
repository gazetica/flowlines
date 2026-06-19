// flowGameStore.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 5 / Sprint 2 Day 11
//
// Zustand store for Flow Lines in-game state. Kept SEPARATE from Numtap's
// legacy src/store/gameStore.ts (still used by 12 Numtap modules) to avoid
// breaking that store's consumers and tests. When the Numtap screens are
// removed in Sprint 3, this becomes the canonical gameStore.
//
// Exports `useFlowGameStore`. No Phaser, no React beyond Zustand.

import { create } from 'zustand';
import type { Cell, Colour, DotPair, Grid } from '../game/engine/GridEngine';
import {
  calcScore,
  calcStars,
  getScoreBreakdown,
  type ScoreBreakdown,
  type ScoreParams,
  type GameMode,
} from '../game/engine/ScoreEngine';
import { useFlowSettingsStore } from './flowSettingsStore';

export type GameStatus = 'idle' | 'playing' | 'complete' | 'failed' | 'abandoned';

export interface FlowGameState {
  // Grid state
  levelId: string;
  grid: Grid;
  dots: DotPair[];

  // Path state — current drawn path per colour
  paths: Record<string, Cell[]>;

  // Progress
  coverage: number;   // 0–100
  moveCount: number;  // cell-step counter (used by GameScene) — unchanged
  hintsUsed: number;  // 0–3 per level
  optimalMoves: number;

  // FL-UX-D-004 mode layer
  gameMode: GameMode;
  timeElapsed: number;          // seconds since level start (counts up)
  timeLimitSeconds: number;     // level JSON timeLimit (0 = no ceiling)
  classicMoveLimitTotal: number; // level JSON classicMoveLimit (0 = no limit)
  movesRemaining: number;        // classicMoveLimitTotal - gestureCount
  gestureCount: number;          // one complete colour path per drag gesture
  retryCount: number;            // Daily retries (0–2), preserved across initLevel

  // FL-UX-D-008L per-level assist flags (reset in initLevel)
  clueUsed: boolean;             // GET A CLUE used this level
  extensionUsed: boolean;        // TIME/MOVE extension used this level
  watchAdUsed: boolean;          // WATCH AD (+1 gem) used this level

  // FL-UX-D-019 per-level rescue counters (reset in initLevel). `rescuesUsed` is
  // the total across all four rescue types → ScoreEngine deducts −100 each.
  cluesUsed: number;             // GET A CLUE
  timeExtsUsed: number;          // TIME EXT +30s
  moveExtsUsed: number;          // MOVE EXT +5
  rescuesUsed: number;           // hintsUsed + cluesUsed + timeExtsUsed + moveExtsUsed

  // Status / result
  status: GameStatus;
  score: number;
  stars: 0 | 1 | 2 | 3;
  scoreBreakdown: ScoreBreakdown | null;

  // FL-UX-D-018: hard pause (timer frozen, board non-interactive) used by the
  // WATCH AD rewarded flow — game stays paused after the ad until the player taps
  // TAP TO RESUME. Distinct from the transient during-ad freeze (adInFlightRef).
  isPaused: boolean;

  // Actions
  setLevelId: (id: string) => void;
  setCoverage: (pct: number) => void;
  setMoveCount: (n: number) => void;
  setStatus: (s: GameStatus) => void;
  setScore: (n: number) => void;
  pauseGame: () => void;    // FL-UX-D-018
  resumeGame: () => void;   // FL-UX-D-018
  setPath: (colour: Colour, cells: Cell[]) => void;
  clearPath: (colour: Colour) => void;
  useHint: () => void;
  triggerWin: (optimalMoves: number) => void;
  triggerAbandon: () => void;
  resetGame: () => void;

  // FL-UX-D-004 mode actions
  setGameMode: (mode: GameMode) => void;
  setTimeElapsed: (seconds: number) => void;
  initLevel: (params: { levelId: string; mode: GameMode; timeLimit: number; classicMoveLimit: number }) => void;
  onGestureComplete: () => void;
  incrementRetry: () => void;
  resetRetry: () => void;

  // FL-UX-D-008L assist actions
  markClueUsed: () => void;
  markWatchAdUsed: () => void;
  applyTimeExtension: () => void;   // Campaign: +30s (subtract from elapsed)
  applyMoveExtension: () => void;   // Classic: +5 to budget & remaining
}

export const useFlowGameStore = create<FlowGameState>((set, get) => ({
  levelId: '',
  grid: [],
  dots: [],
  paths: {},
  coverage: 0,
  moveCount: 0,
  hintsUsed: 0,
  optimalMoves: 0,
  gameMode: 'campaign',
  timeElapsed: 0,
  timeLimitSeconds: 0,
  classicMoveLimitTotal: 0,
  movesRemaining: 0,
  gestureCount: 0,
  retryCount: 0,
  clueUsed: false,
  extensionUsed: false,
  watchAdUsed: false,
  cluesUsed: 0,
  timeExtsUsed: 0,
  moveExtsUsed: 0,
  rescuesUsed: 0,
  status: 'idle',
  score: 0,
  stars: 0,
  scoreBreakdown: null,
  isPaused: false,

  setLevelId: (id) => set({ levelId: id }),
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  setCoverage: (pct) => set({ coverage: pct }),
  setMoveCount: (n) => set({ moveCount: n }),
  setStatus: (s) => set({ status: s }),
  setScore: (n) => set({ score: n }),
  setPath: (colour, cells) =>
    set((state) => ({ paths: { ...state.paths, [colour]: cells } })),
  clearPath: (colour) =>
    set((state) => {
      const paths = { ...state.paths };
      delete paths[colour];
      return { paths };
    }),
  useHint: () => set((state) => ({ hintsUsed: state.hintsUsed + 1, rescuesUsed: state.rescuesUsed + 1 })),

  // Win: set status complete and compute score/stars/breakdown via ScoreEngine.
  // (ScoreEngine takes a ScoreParams object — Flow Lines is not Timed Mode here.)
  triggerWin: (optimalMoves) =>
    set((state) => {
      const params: ScoreParams = {
        optimalMoves,
        actualMoves: state.moveCount,
        hintsUsed: state.hintsUsed,
        timeRemaining: 0,
        isTimedMode: false,
      };
      const score = calcScore(params);
      const stars = calcStars(optimalMoves, state.moveCount);
      const scoreBreakdown = getScoreBreakdown(params);

      // Persist stars for real pack levels ("p1_001" → pack 1). Skipped for the
      // unnamed TEST_LEVEL (empty levelId) until real level loading lands.
      const match = /^p(\d+)_/.exec(state.levelId);
      if (match) {
        useFlowSettingsStore.getState().saveStars(state.levelId, Number(match[1]), stars);
      }

      return { status: 'complete', score, stars, scoreBreakdown, optimalMoves };
    }),

  triggerAbandon: () => set({ status: 'abandoned' }),

  resetGame: () =>
    set({
      paths: {},
      coverage: 0,
      moveCount: 0,
      hintsUsed: 0,
      optimalMoves: 0,
      status: 'idle',
      score: 0,
      stars: 0,
      scoreBreakdown: null,
      cluesUsed: 0,
      timeExtsUsed: 0,
      moveExtsUsed: 0,
      rescuesUsed: 0,
      isPaused: false,
    }),

  // ─── FL-UX-D-004 mode layer ────────────────────────────────────────────────

  setGameMode: (mode) => set({ gameMode: mode }),

  setTimeElapsed: (seconds) => set({ timeElapsed: seconds }),

  // Reset all in-game state for a fresh level start. retryCount is preserved
  // (Daily mode tracks retries across reloads).
  initLevel: (params) =>
    set({
      levelId: params.levelId,
      gameMode: params.mode,
      status: 'playing',
      score: 0,
      stars: 0,
      hintsUsed: 0,
      moveCount: 0,
      gestureCount: 0,
      timeElapsed: 0,
      timeLimitSeconds: params.timeLimit,
      classicMoveLimitTotal: params.classicMoveLimit,
      movesRemaining: params.classicMoveLimit,
      paths: {},
      coverage: 0,
      scoreBreakdown: null,
      retryCount: get().retryCount,
      clueUsed: false,
      extensionUsed: false,
      watchAdUsed: false,
      cluesUsed: 0,
      timeExtsUsed: 0,
      moveExtsUsed: 0,
      rescuesUsed: 0,
      isPaused: false,
    }),

  // Called on pointerup when a colour path changed since pointerdown. gestureCount
  // increments in ALL modes (it feeds the ScoreEngine gesture bonus — FL-UX-D-010c
  // Bug 3). Only Classic touches the move budget; exhausting it fails the level.
  onGestureComplete: () =>
    set((state) => {
      const gestureCount = state.gestureCount + 1;
      const isClassic = state.gameMode === 'classic' || state.gameMode === 'daily_classic';
      // FL-UX-D-012: Zen with a move limit decrements too, but never fails.
      const zenBudget = state.gameMode === 'zen' && state.classicMoveLimitTotal > 0;
      if (!isClassic && !zenBudget) return { gestureCount };
      const movesRemaining = Math.max(0, state.classicMoveLimitTotal - gestureCount);
      const failed = isClassic && movesRemaining === 0 && state.status === 'playing';
      return { gestureCount, movesRemaining, status: failed ? 'failed' : state.status };
    }),

  incrementRetry: () => set((state) => ({ retryCount: Math.min(2, state.retryCount + 1) })),
  resetRetry: () => set({ retryCount: 0 }),

  // ─── FL-UX-D-008L assist actions ───────────────────────────────────────────
  // FL-UX-D-019: each rescue also bumps its own counter + the rescuesUsed total
  // (ScoreEngine deducts −100 per rescue).
  markClueUsed: () => set((state) => ({ clueUsed: true, cluesUsed: state.cluesUsed + 1, rescuesUsed: state.rescuesUsed + 1 })),
  markWatchAdUsed: () => set({ watchAdUsed: true }),

  // Time extension — subtract 30s from elapsed (adds 30s to the countdown).
  applyTimeExtension: () =>
    set((state) => ({
      timeElapsed: Math.max(0, state.timeElapsed - 30),
      extensionUsed: true,
      timeExtsUsed: state.timeExtsUsed + 1,
      rescuesUsed: state.rescuesUsed + 1,
    })),

  // Move extension — +5 to the Classic budget and remaining.
  applyMoveExtension: () =>
    set((state) => ({
      classicMoveLimitTotal: state.classicMoveLimitTotal + 5,
      movesRemaining: state.movesRemaining + 5,
      extensionUsed: true,
      moveExtsUsed: state.moveExtsUsed + 1,
      rescuesUsed: state.rescuesUsed + 1,
    })),
}));
