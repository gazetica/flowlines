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
} from '../game/engine/ScoreEngine';
import { useFlowSettingsStore } from './flowSettingsStore';

export interface FlowGameState {
  // Grid state
  levelId: string;
  grid: Grid;
  dots: DotPair[];

  // Path state — current drawn path per colour
  paths: Record<string, Cell[]>;

  // Progress
  coverage: number;   // 0–100
  moveCount: number;
  hintsUsed: number;  // 0–3 per level
  optimalMoves: number;

  // Status / result
  status: 'idle' | 'playing' | 'complete' | 'abandoned';
  score: number;
  stars: 0 | 1 | 2 | 3;
  scoreBreakdown: ScoreBreakdown | null;

  // Actions
  setCoverage: (pct: number) => void;
  setMoveCount: (n: number) => void;
  setStatus: (s: FlowGameState['status']) => void;
  setScore: (n: number) => void;
  setPath: (colour: Colour, cells: Cell[]) => void;
  clearPath: (colour: Colour) => void;
  useHint: () => void;
  triggerWin: (optimalMoves: number) => void;
  triggerAbandon: () => void;
  resetGame: () => void;
}

export const useFlowGameStore = create<FlowGameState>((set) => ({
  levelId: '',
  grid: [],
  dots: [],
  paths: {},
  coverage: 0,
  moveCount: 0,
  hintsUsed: 0,
  optimalMoves: 0,
  status: 'idle',
  score: 0,
  stars: 0,
  scoreBreakdown: null,

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
}));
