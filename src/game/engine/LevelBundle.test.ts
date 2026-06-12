// LevelBundle.test.ts
// Flow Lines | Gazetica Studio | Sprint 2 Day 12 | Task FL-S2-012
//
// Bundle-inclusion guard: confirms pack1.json + pack2.json are importable at
// runtime (Vite inlines JSON imports into the JS bundle, so if these imports
// resolve here they resolve in the APK too) and that every level is schema-valid.

import { describe, it, expect } from 'vitest';
import pack1 from '../../levels/pack1.json';
import pack2 from '../../levels/pack2.json';

type LevelData = {
  id: string;
  pack: number;
  grid: number;
  colours: number;
  optimalMoves: number;
  dots: Array<{ colour: string; r1: number; c1: number; r2: number; c2: number }>;
};

const p1 = pack1 as LevelData[];
const p2 = pack2 as LevelData[];

const REQUIRED_FIELDS = ['id', 'pack', 'grid', 'colours', 'optimalMoves', 'dots'] as const;
const hasAllFields = (lvl: Record<string, unknown>) =>
  REQUIRED_FIELDS.every((f) => Object.prototype.hasOwnProperty.call(lvl, f));

// ─── Pack 1 basics ──────────────────────────────────────────────────────────

describe('LevelBundle — Pack 1 basics', () => {
  it('pack1 has 50 levels', () => {
    expect(p1.length).toBe(50);
  });

  it('pack1 first level id is p1_001', () => {
    expect(p1[0].id).toBe('p1_001');
  });

  it('pack1 last level id is p1_050', () => {
    expect(p1[49].id).toBe('p1_050');
  });
});

// ─── Pack 2 basics ──────────────────────────────────────────────────────────

describe('LevelBundle — Pack 2 basics', () => {
  it('pack2 has 50 levels', () => {
    expect(p2.length).toBe(50);
  });

  it('pack2 first level id is p2_001', () => {
    expect(p2[0].id).toBe('p2_001');
  });

  it('pack2 last level id is p2_050', () => {
    expect(p2[49].id).toBe('p2_050');
  });
});

// ─── Schema completeness ────────────────────────────────────────────────────

describe('LevelBundle — schema completeness', () => {
  it('every pack1 level has all required fields', () => {
    expect(p1.every((lvl) => hasAllFields(lvl as unknown as Record<string, unknown>))).toBe(true);
  });

  it('every pack2 level has all required fields', () => {
    expect(p2.every((lvl) => hasAllFields(lvl as unknown as Record<string, unknown>))).toBe(true);
  });
});

// ─── Schema values ──────────────────────────────────────────────────────────

describe('LevelBundle — schema values', () => {
  it('every pack1 level: pack 1, grid 6, 5 colours, optimalMoves 36, 5 dots', () => {
    expect(
      p1.every(
        (l) => l.pack === 1 && l.grid === 6 && l.colours === 5 && l.optimalMoves === 36 && l.dots.length === 5,
      ),
    ).toBe(true);
  });

  it('every pack2 level: pack 2, grid 7, 6 colours, optimalMoves 49, 6 dots', () => {
    expect(
      p2.every(
        (l) => l.pack === 2 && l.grid === 7 && l.colours === 6 && l.optimalMoves === 49 && l.dots.length === 6,
      ),
    ).toBe(true);
  });
});
