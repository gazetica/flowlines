// zenLevelGenerator.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-012
//
// Zen-session level generator — the Zen counterpart to dailyPuzzleGenerator.
// Same full-coverage Hamiltonian tiling (shared ./hamiltonianDots), but seeded
// from Date.now() so every Zen session is a fresh random puzzle (not date-locked).
//
// Timer / move-limit semantics (deviates from the brief's difficulty-default
// tables, which contradicted completion criterion #4 "Timer Off → no timer HUD"):
// the Zen UI lets the player pick an explicit timer (60/90/120s) or move budget
// (30/40/50), and stores 0 when that toggle is Off. So timerSeconds / moveLimit
// ARE the source of truth — 0 means "off", any positive value means "on". No
// difficulty-derived default is applied (that would force a timer when Off).

import type { LevelData } from '../game/engine/LevelManager';
import type { ZenConfig } from '../store/flowSettingsStore';
import { generateHamiltonianDots } from './hamiltonianDots';

// Colour count by grid size (matches the pack spec: 6→5, 7→6, 8→7, 9→8).
export const COLOUR_COUNT: Record<number, number> = { 6: 5, 7: 6, 8: 7, 9: 8 };

// LevelData carries the runtime puzzle; the extra Zen markers (level/isZen) are
// additive so existing LevelData consumers are unaffected.
export interface ZenLevelData extends LevelData {
  level: number;
  isZen: true;
}

export function buildZenLevelConfig(config: ZenConfig): ZenLevelData {
  const seed = Date.now(); // fresh random puzzle every session
  const grid = config.grid;
  const colours = COLOUR_COUNT[grid] ?? 5;
  const dots = generateHamiltonianDots(seed, grid, colours);

  return {
    id: `zen_${seed}`,
    pack: 0,            // 0 = not from a pack
    level: 0,           // 0 = not from a pack
    grid,
    colours,
    optimalMoves: grid * grid, // full-coverage solution length
    difficulty: config.difficulty,
    timeLimit: config.timerSeconds,     // 0 = timer off
    classicMoveLimit: config.moveLimit, // 0 = move limit off
    dots,
    isZen: true,
  };
}
