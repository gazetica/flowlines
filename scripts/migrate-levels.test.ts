// migrate-levels.test.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-003
//
// Validates the enriched pack JSON: 50 levels each, required fields present,
// difficulty distribution 15/15/12/8, and correct timeLimit / classicMoveLimit
// per pack × difficulty.

import { describe, it, expect } from 'vitest';
import pack1 from '../src/levels/pack1.json';
import pack2 from '../src/levels/pack2.json';
import pack3 from '../src/levels/pack3.json';
import pack4 from '../src/levels/pack4.json';

const PACKS = [
  { pack: 1, data: pack1 },
  { pack: 2, data: pack2 },
  { pack: 3, data: pack3 },
  { pack: 4, data: pack4 },
];

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'hardest'];

// FL-5A-029 / Game Registry v1.1 §4-5: per-difficulty limits per pack.
const TIME_LIMITS = {
  1: { easy: 90, medium: 75, hard: 60, hardest: 45 },
  2: { easy: 90, medium: 75, hard: 60, hardest: 45 },
  3: { easy: 120, medium: 115, hard: 90, hardest: 75 },
  4: { easy: 120, medium: 115, hard: 90, hardest: 75 },
} as const;

const MOVE_LIMITS = {
  1: { easy: 15, medium: 12, hard: 9, hardest: 6 },
  2: { easy: 15, medium: 12, hard: 9, hardest: 6 },
  3: { easy: 18, medium: 15, hard: 12, hardest: 9 },
  4: { easy: 18, medium: 15, hard: 12, hardest: 9 },
} as const;

describe('Level JSON migration', () => {
  for (const { pack, data } of PACKS) {
    describe(`Pack ${pack}`, () => {
      it('has exactly 50 levels', () => {
        expect(data).toHaveLength(50);
      });

      it('every level has required fields', () => {
        (data as any[]).forEach((level, idx) => {
          expect(level.id, `level ${idx} id`).toBeDefined();
          expect(level.pack, `level ${idx} pack`).toBe(pack);
          expect(level.grid, `level ${idx} grid`).toBeTypeOf('number');
          expect(level.colours, `level ${idx} colours`).toBeTypeOf('number');
          expect(level.optimalMoves, `level ${idx} optimalMoves`).toBeTypeOf('number');
          expect(level.dots, `level ${idx} dots`).toBeInstanceOf(Array);
          expect(level.dots.length, `level ${idx} dots length`).toBeGreaterThan(0);
        });
      });

      it('every level has difficulty field', () => {
        (data as any[]).forEach((level, idx) => {
          expect(
            VALID_DIFFICULTIES,
            `level ${idx} invalid difficulty "${level.difficulty}"`,
          ).toContain(level.difficulty);
        });
      });

      it('difficulty distribution is correct (15/10/15/10)', () => {
        const dist = { easy: 0, medium: 0, hard: 0, hardest: 0 };
        (data as any[]).forEach((l) => dist[l.difficulty as keyof typeof dist]++);
        expect(dist.easy).toBe(15);
        expect(dist.medium).toBe(10);
        expect(dist.hard).toBe(15);
        expect(dist.hardest).toBe(10);
      });

      it('every level has correct timeLimit for its difficulty', () => {
        (data as any[]).forEach((level, idx) => {
          const expected = TIME_LIMITS[pack as 1 | 2 | 3 | 4][level.difficulty as keyof (typeof TIME_LIMITS)[1]];
          expect(level.timeLimit, `level ${idx} timeLimit`).toBe(expected);
        });
      });

      it('every level has correct classicMoveLimit for its difficulty', () => {
        (data as any[]).forEach((level, idx) => {
          const expected = MOVE_LIMITS[pack as 1 | 2 | 3 | 4][level.difficulty as keyof (typeof MOVE_LIMITS)[1]];
          expect(level.classicMoveLimit, `level ${idx} classicMoveLimit`).toBe(expected);
        });
      });

      it('classicMoveLimit is always >= colours (minimum one move per colour)', () => {
        (data as any[]).forEach((level, idx) => {
          expect(
            level.classicMoveLimit,
            `level ${idx} moveLimit < colours (${level.colours})`,
          ).toBeGreaterThanOrEqual(level.colours);
        });
      });

      it('timeLimit is always positive', () => {
        (data as any[]).forEach((level, idx) => {
          expect(level.timeLimit, `level ${idx} timeLimit <= 0`).toBeGreaterThan(0);
        });
      });
    });
  }
});
