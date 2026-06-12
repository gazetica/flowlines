// GameIntegration.test.ts
// Flow Lines | Gazetica Studio | Sprint 2 Day 11 | Task FL-S2-011
//
// Engine-only integration test of the win/score path. No Phaser, React, or
// Zustand. Exercises LevelData schema + ScoreEngine end to end.

import { describe, it, expect } from 'vitest';
import { calcScore, calcStars, getScoreBreakdown, type ScoreParams } from './ScoreEngine';
import pack1 from '../../levels/pack1.json';

// ScoreEngine takes a ScoreParams object (Flow Lines is not Timed Mode here).
const params = (optimalMoves: number, actualMoves: number, hintsUsed: number): ScoreParams => ({
  optimalMoves,
  actualMoves,
  hintsUsed,
  timeRemaining: 0,
  isTimedMode: false,
});

describe('GameIntegration — level data + scoring', () => {
  it('1. Pack 1 level 0 conforms to the LevelData schema', () => {
    const lvl = (pack1 as unknown[])[0] as {
      id: string; pack: number; grid: number; colours: number; optimalMoves: number; dots: unknown[];
    };
    expect(typeof lvl.id).toBe('string');
    expect(lvl.id).toBe('p1_001');
    expect(lvl.pack).toBe(1);
    expect(lvl.grid).toBe(6);
    expect(lvl.colours).toBe(5);
    expect(lvl.optimalMoves).toBe(36); // grid² (100% coverage)
    expect(Array.isArray(lvl.dots)).toBe(true);
    expect(lvl.dots).toHaveLength(5);
  });

  it('2. calcStars(36, 36) → 3 stars (optimal)', () => {
    expect(calcStars(36, 36)).toBe(3);
  });

  it('3. calcStars(36, 43) → 2 stars (within 20%: floor(36×1.2)=43)', () => {
    expect(calcStars(36, 43)).toBe(2);
  });

  it('4. calcStars(36, 50) → 1 star (above 20% threshold)', () => {
    expect(calcStars(36, 50)).toBe(1);
  });

  it('5. calcScore(36, 36, 0) → 200 (perfect clear, no deductions)', () => {
    expect(calcScore(params(36, 36, 0))).toBe(200);
  });

  it('6. calcScore(36, 40, 0) → 180 (200 − 4×5 move penalty)', () => {
    expect(calcScore(params(36, 40, 0))).toBe(180);
  });

  it('7. calcScore(36, 36, 2) → 140 (200 − 2×30 hint penalty)', () => {
    expect(calcScore(params(36, 36, 2))).toBe(140);
  });

  it('8. getScoreBreakdown(36, 36, 0) → perfect clear 200, no penalties, total 200', () => {
    const b = getScoreBreakdown(params(36, 36, 0));
    expect(b.perfectClearBonus).toBe(200);
    expect(b.moveBonus).toBe(0);
    expect(b.movePenalty).toBe(0);
    expect(b.hintPenalty).toBe(0);
    expect(b.timeBonus).toBe(0);
    expect(b.total).toBe(200);
  });
});
