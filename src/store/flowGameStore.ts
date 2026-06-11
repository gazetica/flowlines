// flowGameStore.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 5 | Task FL-S1-005
//
// Zustand store for Flow Lines in-game state. Kept SEPARATE from Numtap's
// legacy src/store/gameStore.ts (still used by 12 Numtap modules) to avoid
// breaking that store's consumers and tests. When the Numtap screens are
// removed in Sprint 3, this becomes the canonical gameStore.
//
// Exports `useFlowGameStore`. No Phaser, no React beyond Zustand.

import { create } from 'zustand';
import type { Cell, Colour, DotPair, Grid } from '../game/engine/GridEngine';

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

  // Status
  status: 'idle' | 'playing' | 'complete' | 'abandoned';
  score: number;

  // Actions
  setCoverage: (pct: number) => void;
  setMoveCount: (n: number) => void;
  setStatus: (s: FlowGameState['status']) => void;
  setScore: (n: number) => void;
  setPath: (colour: Colour, cells: Cell[]) => void;
  clearPath: (colour: Colour) => void;
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
  status: 'idle',
  score: 0,

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
  resetGame: () =>
    set({
      paths: {},
      coverage: 0,
      moveCount: 0,
      hintsUsed: 0,
      status: 'idle',
      score: 0,
    }),
}));
