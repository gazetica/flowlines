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

  // Status / result
  status: GameStatus;
  score: number;
  stars: 0 | 1 | 2 | 3;
  scoreBreakdown: ScoreBreakdown | null;

  // Actions
  setLevelId: (id: string) => void;
  setCoverage: (pct: number) => void;
  setMoveCount: (n: number) => void;
  setStatus: (s: GameStatus) => void;
  setScore: (n: number) => void;
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
  status: 'idle',
  score: 0,
  stars: 0,
  scoreBreakdown: null,

  setLevelId: (id) => set({ levelId: id }),
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
  useHint: () => set((state) => ({ hintsUsed: Math.min(3, state.hintsUsed + 1) })),

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
    }),

  // Called on pointerup when a colour path changed since pointerdown. Decrements
  // the Classic move budget; exhausting it (Classic only) fails the level.
  onGestureComplete: () =>
    set((state) => {
      const gestureCount = state.gestureCount + 1;
      const movesRemaining = Math.max(0, state.classicMoveLimitTotal - gestureCount);
      const isClassic = state.gameMode === 'classic' || state.gameMode === 'daily_classic';
      const failed = isClassic && movesRemaining === 0 && state.status === 'playing';
      return { gestureCount, movesRemaining, status: failed ? 'failed' : state.status };
    }),

  incrementRetry: () => set((state) => ({ retryCount: Math.min(2, state.retryCount + 1) })),
  resetRetry: () => set({ retryCount: 0 }),
}));
