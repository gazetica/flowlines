// ScoreEngine.test.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 | Task FL-S1-003

import { describe, it, expect } from 'vitest';
import { calcScore, calcStars, getScoreBreakdown, ScoreEngine, type ScoreParams, type ScoreInput } from './ScoreEngine';

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

// ─── FL-UX-D-004: ScoreEngine.calc (per-mode) ────────────────────────────────

/** Base input: a perfect Campaign solve (timeElapsed 0 → full efficiency). */
const sin = (over: Partial<ScoreInput> = {}): ScoreInput => ({
  mode: 'campaign',
  dotsConnected: true,
  coveragePct: 100,
  timeElapsed: 0,
  timeLimit: 90,
  movesUsed: 0,
  classicMoveLimit: 10,
  optimalMoves: 36,
  cellMoveCount: 36,
  hintsUsed: 0,
  difficulty: 'easy',
  colourCount: 5,
  ...over,
});

describe('ScoreEngine.calc — Campaign', () => {
  it('perfect solve (timeElapsed 0, no hints) → 1000, 3 stars, passed', () => {
    const r = ScoreEngine.calc(sin());
    expect(r.total).toBe(1000);
    expect(r.stars).toBe(3);
    expect(r.passed).toBe(true);
  });
  it('timed out (timeElapsed >= timeLimit) → passed false, 0 stars, efficiency 0', () => {
    const r = ScoreEngine.calc(sin({ timeElapsed: 90 }));
    expect(r.passed).toBe(false);
    expect(r.stars).toBe(0);
    expect(r.breakdown.efficiencyScore).toBe(0);
  });
  it('solved with 2 hints → hintPenalty -80, total 920', () => {
    const r = ScoreEngine.calc(sin({ hintsUsed: 2 }));
    expect(r.breakdown.hintPenalty).toBe(-80);
    expect(r.total).toBe(920);
  });
  it('50% coverage → coverageScore 125', () => {
    expect(ScoreEngine.calc(sin({ coveragePct: 50 })).breakdown.coverageScore).toBe(125);
  });
  it('timeElapsed 30 of 90 → efficiency 200, total 900, 2 stars', () => {
    const r = ScoreEngine.calc(sin({ timeElapsed: 30 }));
    expect(r.breakdown.efficiencyScore).toBe(200);
    expect(r.total).toBe(900);
    expect(r.stars).toBe(2);
  });
  it('dots not connected → dotsScore 0, passed false', () => {
    const r = ScoreEngine.calc(sin({ dotsConnected: false }));
    expect(r.breakdown.dotsScore).toBe(0);
    expect(r.passed).toBe(false);
  });
  it('total never below 0 (extreme penalty, timed out)', () => {
    const r = ScoreEngine.calc(sin({ dotsConnected: false, coveragePct: 0, hintsUsed: 3, movesUsed: 10, timeElapsed: 90 }));
    expect(r.total).toBe(0);
  });
  it('total never exceeds 1000 (clamp)', () => {
    expect(ScoreEngine.calc(sin()).total).toBeLessThanOrEqual(1000);
  });
});

describe('ScoreEngine.calc — Classic', () => {
  const cls = (over: Partial<ScoreInput> = {}) => sin({ mode: 'classic', ...over });
  it('perfect (0 moves used, under 1 min) → total 1000, 3 stars, passed', () => {
    const r = ScoreEngine.calc(cls());
    expect(r.total).toBe(1000); // dots250+cov250+eff300+timeBonus200 (brief said 1100; max is 1000)
    expect(r.stars).toBe(3);
    expect(r.passed).toBe(true);
  });
  it('move limit exceeded (16 of 15) → passed false, 0 stars, efficiency 0', () => {
    const r = ScoreEngine.calc(cls({ movesUsed: 16, classicMoveLimit: 15 }));
    expect(r.passed).toBe(false);
    expect(r.stars).toBe(0);
    expect(r.breakdown.efficiencyScore).toBe(0);
  });
  it('solved in exactly the move limit → efficiency 0, passed true', () => {
    const r = ScoreEngine.calc(cls({ movesUsed: 15, classicMoveLimit: 15 }));
    expect(r.breakdown.efficiencyScore).toBe(0);
    expect(r.passed).toBe(true);
  });
  it('3 hints → hintPenalty -120', () => {
    expect(ScoreEngine.calc(cls({ hintsUsed: 3 })).breakdown.hintPenalty).toBe(-120);
  });
  it('total never exceeds 1100 (clamp)', () => {
    expect(ScoreEngine.calc(cls()).total).toBeLessThanOrEqual(1100);
  });
  it('mid-efficiency (4 of 10 moves) → 2 stars', () => {
    const r = ScoreEngine.calc(cls({ movesUsed: 4, classicMoveLimit: 10 }));
    expect(r.breakdown.efficiencyScore).toBe(180);
    expect(r.stars).toBe(2);
  });
});

describe('ScoreEngine.calc — gesture bonus (FL-UX-D-009b)', () => {
  const bonus = (over: Partial<ScoreInput>) => ScoreEngine.calc(sin(over)).breakdown.bonusScore;
  it('5 colours, 5 gestures → 200 (perfect)', () => { expect(bonus({ colourCount: 5, movesUsed: 5 })).toBe(200); });
  it('5 colours, 7 gestures → 120', () => { expect(bonus({ colourCount: 5, movesUsed: 7 })).toBe(120); });
  it('5 colours, 10 gestures → 0 (double)', () => { expect(bonus({ colourCount: 5, movesUsed: 10 })).toBe(0); });
  it('5 colours, 11 gestures → 0', () => { expect(bonus({ colourCount: 5, movesUsed: 11 })).toBe(0); });
  it('6 colours, 6 gestures → 200', () => { expect(bonus({ colourCount: 6, movesUsed: 6 })).toBe(200); });
  it('6 colours, 9 gestures → 100 (halfway)', () => { expect(bonus({ colourCount: 6, movesUsed: 9 })).toBe(100); });
  it('6 colours, 12 gestures → 0', () => { expect(bonus({ colourCount: 6, movesUsed: 12 })).toBe(0); });
  it('Classic uses the same gesture bonus', () => {
    expect(ScoreEngine.calc(sin({ mode: 'classic', colourCount: 5, movesUsed: 7, classicMoveLimit: 20 })).breakdown.bonusScore).toBe(120);
  });
});

describe('ScoreEngine.calc — Zen', () => {
  const zen = (over: Partial<ScoreInput> = {}) => sin({ mode: 'zen', ...over });
  it('always passed=true regardless of time/moves', () => {
    expect(ScoreEngine.calc(zen({ timeElapsed: 9999, movesUsed: 9999 })).passed).toBe(true);
  });
  it('dotsConnected=false → dotsScore 0, still passed', () => {
    const r = ScoreEngine.calc(zen({ dotsConnected: false }));
    expect(r.breakdown.dotsScore).toBe(0);
    expect(r.passed).toBe(true);
  });
  it('efficiencyScore is always 0', () => {
    expect(ScoreEngine.calc(zen()).breakdown.efficiencyScore).toBe(0);
  });
  it('total clamped to <= 800', () => {
    expect(ScoreEngine.calc(zen()).total).toBeLessThanOrEqual(800);
  });
});

describe('ScoreEngine.calc — Daily + edge cases', () => {
  it('daily_campaign uses the Campaign formula (perfect → 1000, passed)', () => {
    const r = ScoreEngine.calc(sin({ mode: 'daily_campaign' }));
    expect(r.total).toBe(1000);
    expect(r.passed).toBe(true);
  });
  it('daily_classic uses the Classic formula (over-limit → passed false)', () => {
    const r = ScoreEngine.calc(sin({ mode: 'daily_classic', movesUsed: 99, classicMoveLimit: 10 }));
    expect(r.passed).toBe(false);
  });
  it('coveragePct 0 → coverageScore 0', () => {
    expect(ScoreEngine.calc(sin({ coveragePct: 0 })).breakdown.coverageScore).toBe(0);
  });
  it('hintsUsed 0 → hintPenalty 0', () => {
    expect(ScoreEngine.calc(sin()).breakdown.hintPenalty).toBe(0);
  });
});
