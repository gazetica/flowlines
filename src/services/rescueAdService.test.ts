// rescueAdService.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task F-005 (Part 7 — Rescue Flash)
//
// Pure eligibility rule for the Rescue Flash banner (isRescueEligible). All 7
// conditions must hold; each test flips exactly one to confirm it gates the banner.

import { describe, it, expect } from 'vitest';
import { isRescueEligible } from './rescueAdService';

// A fully-eligible baseline: 5×5, 60s level, in the final third (≤20s left), 8
// tiles remaining, no Remove Ads, banner not yet shown, timed + playing.
const OK = {
  playing: true,
  timed: true,
  removeAdsPurchased: false,
  gridSize: 5,
  timeLimit: 60,
  timeRemaining: 18,
  tilesRemaining: 8,
  bannerShown: false,
};

describe('isRescueEligible (F-005 Part 7)', () => {
  it('7. eligible when all conditions are true', () => {
    expect(isRescueEligible(OK)).toBe(true);
  });

  it('8. NOT eligible on a 3×3 grid', () => {
    expect(isRescueEligible({ ...OK, gridSize: 3 })).toBe(false);
  });

  it('9. NOT eligible when timeLimit <= 15s', () => {
    expect(isRescueEligible({ ...OK, timeLimit: 15, timeRemaining: 4 })).toBe(false);
  });

  it('10. NOT eligible when fewer than 3 tiles remain', () => {
    expect(isRescueEligible({ ...OK, tilesRemaining: 2 })).toBe(false);
  });

  it('11. NOT eligible when Remove Ads is purchased', () => {
    expect(isRescueEligible({ ...OK, removeAdsPurchased: true })).toBe(false);
  });

  it('12. NOT eligible when the banner was already shown this attempt', () => {
    expect(isRescueEligible({ ...OK, bannerShown: true })).toBe(false);
  });

  // Extra guards: the time-threshold and timer-on conditions.
  it('13. NOT eligible before the final third of the clock', () => {
    expect(isRescueEligible({ ...OK, timeRemaining: 30 })).toBe(false); // floor(60*0.33)=19
  });

  it('14. NOT eligible when the timer is off (untimed Free Play)', () => {
    expect(isRescueEligible({ ...OK, timed: false })).toBe(false);
  });
});
