// ScoreEngine.test.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 | Task FL-S1-003

import { describe, it, expect } from 'vitest';
import { calcScore, calcStars, getScoreBreakdown, type ScoreParams } from './ScoreEngine';

/** Base params: optimal solve, no hints, not timed → score 200. */
const base = (over: Partial<ScoreParams> = {}): ScoreParams => ({
  optimalMoves: 20,
  actualMoves: 20,
  hintsUsed: 0,
  timeRemaining: 0,
  isTimedMode: false,
  ...over,
});

describe('calcScore', () => {
  it('optimal solve, no hints, not timed → base 200 only', () => {
    expect(calcScore(base())).toBe(200);
  });

  it('1 move over optimal → 200 - 5 = 195', () => {
    expect(calcScore(base({ actualMoves: 21 }))).toBe(195);
  });

  it('5 moves over optimal → 200 - 25 = 175', () => {
    expect(calcScore(base({ actualMoves: 25 }))).toBe(175);
  });

  it('3 hints used → 200 - 90 = 110', () => {
    expect(calcScore(base({ hintsUsed: 3 }))).toBe(110);
  });

  it('2 moves over + 1 hint → 200 - 10 - 30 = 160', () => {
    expect(calcScore(base({ actualMoves: 22, hintsUsed: 1 }))).toBe(160);
  });

  it('beat optimal by 2 moves → 200 + 10 = 210', () => {
    expect(calcScore(base({ actualMoves: 18 }))).toBe(210);
  });

  it('score never goes below 0 (extreme penalty case)', () => {
    expect(calcScore(base({ actualMoves: 1000, hintsUsed: 3 }))).toBe(0);
  });

  it('timed mode with 60 seconds remaining → +60*15 = +900', () => {
    expect(calcScore(base({ isTimedMode: true, timeRemaining: 60 }))).toBe(200 + 900);
  });

  it('timed mode with 0 seconds → no time bonus', () => {
    expect(calcScore(base({ isTimedMode: true, timeRemaining: 0 }))).toBe(200);
  });

  it('not timed mode → timeBonus is always 0 regardless of timeRemaining', () => {
    expect(calcScore(base({ isTimedMode: false, timeRemaining: 120 }))).toBe(200);
  });

  it('all penalties combined → still floors at 0', () => {
    expect(calcScore(base({ actualMoves: 100, hintsUsed: 3, isTimedMode: false }))).toBe(0);
  });
});

describe('calcStars', () => {
  it('actualMoves === optimalMoves → 3 stars', () => {
    expect(calcStars(20, 20)).toBe(3);
  });

  it('actualMoves < optimalMoves → 3 stars', () => {
    expect(calcStars(20, 15)).toBe(3);
  });

  it('actualMoves === floor(optimal * 1.20) → 2 stars', () => {
    expect(calcStars(10, 12)).toBe(2); // floor(12) = 12
  });

  it('actualMoves === floor(optimal * 1.20) + 1 → 1 star', () => {
    expect(calcStars(10, 13)).toBe(1);
  });

  it('actualMoves >>> optimal → 1 star', () => {
    expect(calcStars(10, 50)).toBe(1);
  });

  it('optimal = 10, actual = 12 → 2 stars (within 20%)', () => {
    expect(calcStars(10, 12)).toBe(2);
  });

  it('optimal = 10, actual = 13 → 1 star (over 20%)', () => {
    expect(calcStars(10, 13)).toBe(1);
  });
});

describe('getScoreBreakdown', () => {
  it('all fields present in returned object', () => {
    const b = getScoreBreakdown(base({ actualMoves: 22, hintsUsed: 1, isTimedMode: true, timeRemaining: 10 }));
    expect(b).toHaveProperty('perfectClearBonus');
    expect(b).toHaveProperty('moveBonus');
    expect(b).toHaveProperty('movePenalty');
    expect(b).toHaveProperty('hintPenalty');
    expect(b).toHaveProperty('timeBonus');
    expect(b).toHaveProperty('total');
  });

  it('total matches calcScore result for same params', () => {
    const params = base({ actualMoves: 23, hintsUsed: 2, isTimedMode: true, timeRemaining: 30 });
    expect(getScoreBreakdown(params).total).toBe(calcScore(params));
  });

  it('perfectClearBonus is always 200', () => {
    expect(getScoreBreakdown(base()).perfectClearBonus).toBe(200);
    expect(getScoreBreakdown(base({ actualMoves: 999, hintsUsed: 3 })).perfectClearBonus).toBe(200);
  });
});
