// dailyPuzzleGenerator.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-010 / 010b / 012
//
// Seeded daily-puzzle generator. Daily challenges are NOT drawn from any pack —
// they are produced at runtime from a UTC-date seed so every player worldwide
// gets the same two puzzles for a given calendar day (one Campaign, one Classic).
//
// The full-coverage Hamiltonian-tiling generator now lives in ./hamiltonianDots
// (shared with the Zen generator, FL-UX-D-012). Puzzles are guaranteed solvable.

import type { LevelData } from '../game/engine/LevelManager';
import { mulberry32, generateHamiltonianDots, type HamDot } from './hamiltonianDots';

export type DailyMode = 'daily_campaign' | 'daily_classic';
export type DailyDot = HamDot;

// Re-exported so existing importers (and tests) keep working unchanged.
export { mulberry32 };

/** Two distinct seeds for the same UTC date — one per challenge. */
export function getDailySeed(suffix: 'campaign' | 'classic'): number {
  const now = new Date();
  const dateStr = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  const base = parseInt(dateStr, 10);
  return suffix === 'campaign' ? base * 31 : base * 37;
}

/**
 * Generate `numColours` solvable dot pairs on a `gridSize × gridSize` board from
 * `seed` (full-coverage Hamiltonian tiling). Deterministic for a given seed.
 */
export function generateDailyDots(seed: number, gridSize: number, numColours: number): DailyDot[] {
  return generateHamiltonianDots(seed, gridSize, numColours);
}

/**
 * Build a runtime LevelData for today's daily puzzle. pack=0 marks it as daily
 * (not from any pack). Campaign = 120s timer; Classic = 12-move budget.
 */
export function buildDailyLevelConfig(mode: DailyMode): LevelData {
  const seed = getDailySeed(mode === 'daily_campaign' ? 'campaign' : 'classic');
  const grid = 7;
  const colours = 6;
  const dots = generateDailyDots(seed, grid, colours);
  return {
    id: `daily_${mode}_${seed}`,
    pack: 0,
    grid,
    colours,
    optimalMoves: grid * grid, // full-coverage solution length
    difficulty: 'medium',
    timeLimit: 120,
    classicMoveLimit: 12,
    dots,
  };
}
