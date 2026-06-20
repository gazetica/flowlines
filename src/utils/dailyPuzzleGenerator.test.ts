// dailyPuzzleGenerator.test.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-010

import { describe, it, expect } from 'vitest';
import { mulberry32, getDailySeed, generateDailyDots, buildDailyLevelConfig } from './dailyPuzzleGenerator';
import { solve } from '../game/engine/PathSolver';

describe('dailyPuzzleGenerator', () => {
  it('getDailySeed returns different values for campaign vs classic', () => {
    expect(getDailySeed('campaign')).not.toBe(getDailySeed('classic'));
  });

  it('same date always returns the same seed', () => {
    expect(getDailySeed('campaign')).toBe(getDailySeed('campaign'));
  });

  it('mulberry32 is deterministic for a given seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('generateDailyDots returns the requested number of colour pairs', () => {
    expect(generateDailyDots(999, 7, 6)).toHaveLength(6);
  });

  it('same seed produces identical dots', () => {
    expect(generateDailyDots(999, 7, 6)).toEqual(generateDailyDots(999, 7, 6));
  });

  it('no two dots share the same cell', () => {
    const dots = generateDailyDots(4242, 7, 6);
    const cells = new Set<string>();
    for (const d of dots) {
      cells.add(`${d.r1},${d.c1}`);
      cells.add(`${d.r2},${d.c2}`);
    }
    expect(cells.size).toBe(dots.length * 2);
  });

  it('produces the right number of distinct endpoint cells (Hamiltonian split)', () => {
    // 6 colours → 12 endpoint cells, all distinct (each cell visited once).
    const dots = generateDailyDots(4242, 7, 6);
    const cells = new Set<string>();
    for (const d of dots) { cells.add(`${d.r1},${d.c1}`); cells.add(`${d.r2},${d.c2}`); }
    expect(cells.size).toBe(12);
  });

  it('endpoints differ from their own pair (segments have length >= 2)', () => {
    for (const d of generateDailyDots(13, 7, 6)) {
      expect(`${d.r1},${d.c1}`).not.toBe(`${d.r2},${d.c2}`);
    }
  });

  it('all dot cells are inside the grid bounds', () => {
    const dots = generateDailyDots(7, 7, 6);
    for (const d of dots) {
      for (const v of [d.r1, d.c1, d.r2, d.c2]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(7);
      }
    }
  });

  it('buildDailyLevelConfig returns a valid daily LevelData (pack=0)', () => {
    const cfg = buildDailyLevelConfig('daily_campaign');
    expect(cfg.pack).toBe(0);
    expect(cfg.grid).toBe(7);
    expect(cfg.colours).toBe(6);
    expect(cfg.dots).toHaveLength(6);
    expect(cfg.timeLimit).toBe(90);      // FL-5A-028: daily matches Pack 2 (7×7) limits
    expect(cfg.classicMoveLimit).toBe(15);
    expect(cfg.id).toContain('daily_campaign');
  });

  it('campaign and classic daily configs differ', () => {
    expect(buildDailyLevelConfig('daily_campaign').dots).not.toEqual(buildDailyLevelConfig('daily_classic').dots);
  });

  // The core guarantee of 010b: every generated daily has a full-coverage solution.
  it('generated puzzles are full-coverage solvable (multiple seeds)', () => {
    for (const seed of [1, 7, 31, 100, 2026, 999999]) {
      const dots = generateDailyDots(seed, 7, 6);
      const solution = solve(7, dots, 4000);
      expect(solution).not.toBeNull();
    }
  });
});
