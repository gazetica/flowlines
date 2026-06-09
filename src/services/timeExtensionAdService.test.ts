// timeExtensionAdService.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task F-009 (LOW ON TIME pill)
//
// Pure eligibility rule for the LOW ON TIME pill (isTimeExtensionEligible). All
// conditions must hold; each test flips exactly one to confirm it gates the pill.
// Threshold: final third of the clock (timeRemaining ≤ floor(timeLimit*0.3333)).

import { describe, it, expect } from 'vitest';
import { isTimeExtensionEligible, TIME_EXTENSION_SECONDS } from './timeExtensionAdService';

// Fully-eligible baseline: 5×5, 60s level, at the 33.33% threshold (≤19s left),
// time pill not yet used, timed + playing.
const OK = {
  playing: true,
  timed: true,
  gridSize: 5,
  timeLimit: 60,
  timeRemaining: 19, // floor(60*0.3333) = 19
  used: false,
};

describe('isTimeExtensionEligible (F-009 LOW ON TIME)', () => {
  it('eligible when all conditions are true (at the 33.33% threshold)', () => {
    expect(isTimeExtensionEligible(OK)).toBe(true);
  });

  it('NOT eligible before the 33.33% threshold (still above one-third)', () => {
    expect(isTimeExtensionEligible({ ...OK, timeRemaining: 20 })).toBe(false);
  });

  it('NOT eligible on a 3×3 grid', () => {
    expect(isTimeExtensionEligible({ ...OK, gridSize: 3 })).toBe(false);
  });

  it('NOT eligible when timeLimit <= 15s', () => {
    expect(isTimeExtensionEligible({ ...OK, timeLimit: 15, timeRemaining: 4 })).toBe(false);
  });

  it('NOT eligible once the time pill was already used this attempt (greyed)', () => {
    expect(isTimeExtensionEligible({ ...OK, used: true })).toBe(false);
  });

  it('NOT eligible when the timer is off (untimed Free Play)', () => {
    expect(isTimeExtensionEligible({ ...OK, timed: false })).toBe(false);
  });

  it('grants +15 seconds', () => {
    expect(TIME_EXTENSION_SECONDS).toBe(15);
  });
});
