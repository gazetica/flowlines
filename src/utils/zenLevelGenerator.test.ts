// zenLevelGenerator.test.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-012

import { describe, it, expect } from 'vitest';
import { buildZenLevelConfig, COLOUR_COUNT } from './zenLevelGenerator';
import { solve } from '../game/engine/PathSolver';
import type { ZenConfig } from '../store/flowSettingsStore';

const cfg = (over: Partial<ZenConfig> = {}): ZenConfig => ({
  grid: 6, difficulty: 'easy', timerSeconds: 0, moveLimit: 0, ...over,
});

describe('buildZenLevelConfig', () => {
  it.each([[6, 5], [7, 6], [8, 7], [9, 8]] as const)(
    '%dx%d grid → %d colours',
    (grid, colours) => {
      const c = buildZenLevelConfig(cfg({ grid }));
      expect(c.grid).toBe(grid);
      expect(c.colours).toBe(colours);
      expect(c.dots).toHaveLength(colours);
    },
  );

  it('pack and level are 0 (not from a pack)', () => {
    const c = buildZenLevelConfig(cfg({ grid: 8, difficulty: 'medium' }));
    expect(c.pack).toBe(0);
    expect(c.level).toBe(0);
  });

  it('isZen flag is true', () => {
    expect(buildZenLevelConfig(cfg({ grid: 7 })).isZen).toBe(true);
  });

  // NOTE: deviates from the brief's difficulty-default table. timerSeconds/moveLimit
  // are the source of truth (0 = off) so GameScreen can detect "off" via 0 — which
  // the difficulty-default approach made impossible (completion criterion #4).
  it('timer off → timeLimit is 0 (so the HUD hides it)', () => {
    expect(buildZenLevelConfig(cfg({ grid: 8, timerSeconds: 0 })).timeLimit).toBe(0);
  });

  it('timer on → timeLimit uses the chosen value', () => {
    expect(buildZenLevelConfig(cfg({ grid: 8, timerSeconds: 90 })).timeLimit).toBe(90);
  });

  it('move limit off → classicMoveLimit is 0; on → chosen value', () => {
    expect(buildZenLevelConfig(cfg({ moveLimit: 0 })).classicMoveLimit).toBe(0);
    expect(buildZenLevelConfig(cfg({ moveLimit: 40 })).classicMoveLimit).toBe(40);
  });

  it('COLOUR_COUNT matches the pack spec', () => {
    expect(COLOUR_COUNT).toEqual({ 6: 5, 7: 6, 8: 7, 9: 8 });
  });

  it('no two dots share the same cell', () => {
    const c = buildZenLevelConfig(cfg({ grid: 9, difficulty: 'hardest' }));
    const cells = c.dots.flatMap((d) => [`${d.r1},${d.c1}`, `${d.r2},${d.c2}`]);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('generated puzzles are full-coverage solvable', () => {
    for (const grid of [6, 7, 8] as const) {
      const c = buildZenLevelConfig(cfg({ grid }));
      expect(solve(grid, c.dots, 4000)).not.toBeNull();
    }
  });
});
