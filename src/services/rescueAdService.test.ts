// rescueAdService.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task F-009 (GET A CLUE pill)
//
// Pure eligibility rule for the GET A CLUE pill (isClueEligible, was isRescueEligible).
// All conditions must hold; each test flips exactly one to confirm it gates the pill.
// F-009 threshold change: final TWO-THIRDS of the clock (≤ floor(timeLimit*0.6667)),
// and the one-use flag is now `used` (was `bannerShown`).

import { describe, it, expect } from 'vitest';
import { isClueEligible } from './rescueAdService';

// A fully-eligible baseline: 5×5, 60s level, at the 66.66% threshold (≤40s left),
// 8 tiles remaining, clue pill not yet used, timed + playing.
const OK = {
  playing: true,
  timed: true,
  gridSize: 5,
  timeLimit: 60,
  timeRemaining: 40, // floor(60*0.6667) = 40
  tilesRemaining: 8,
  used: false,
};

describe('isClueEligible (F-009 GET A CLUE)', () => {
  it('eligible when all conditions are true (at the 66.66% threshold)', () => {
    expect(isClueEligible(OK)).toBe(true);
  });

  it('NOT eligible before the 66.66% threshold (still above two-thirds)', () => {
    expect(isClueEligible({ ...OK, timeRemaining: 41 })).toBe(false);
  });

  it('NOT eligible on a 3×3 grid', () => {
    expect(isClueEligible({ ...OK, gridSize: 3 })).toBe(false);
  });

  // VER-003 boundary tests — grid ≥ 5 and timeLimit ≥ 45.
  it('VER-003: NOT eligible on a 4×4 grid (was allowed before)', () => {
    expect(isClueEligible({ ...OK, gridSize: 4 })).toBe(false);
  });

  it('VER-003: eligible on a 5×5 grid (minimum qualifying grid)', () => {
    expect(isClueEligible({ ...OK, gridSize: 5 })).toBe(true);
  });

  it('VER-003: NOT eligible at timeLimit 44s (below the 45s floor)', () => {
    // 44s level, in the final two-thirds (≤ floor(44*0.6667)=29s) — excluded by timeLimit.
    expect(isClueEligible({ ...OK, timeLimit: 44, timeRemaining: 29 })).toBe(false);
  });

  it('VER-003: eligible at timeLimit 45s (minimum qualifying limit)', () => {
    // 45s level, at the threshold (≤ floor(45*0.6667)=30s).
    expect(isClueEligible({ ...OK, timeLimit: 45, timeRemaining: 30 })).toBe(true);
  });

  it('NOT eligible when fewer than 3 tiles remain', () => {
    expect(isClueEligible({ ...OK, tilesRemaining: 2 })).toBe(false);
  });

  it('NOT eligible once the clue pill was already used this attempt (greyed)', () => {
    expect(isClueEligible({ ...OK, used: true })).toBe(false);
  });

  it('eligibility IGNORES Remove Ads — pill shows for paid users too', () => {
    // removeAdsPurchased is not part of the rule; the baseline carries no such field.
    expect(isClueEligible(OK)).toBe(true);
  });

  it('NOT eligible when the timer is off (untimed Free Play)', () => {
    expect(isClueEligible({ ...OK, timed: false })).toBe(false);
  });
});
