// DailyChallenge.test.ts
// Numtap | Gazetica Studio | Sprint 3 Day 7 (T-014) · updated T-005 (3-challenge API)

import { describe, it, expect } from 'vitest';
import {
  getDailyChallenge,
  getDailyShuffledNumbers,
  dateToSeed,
  getTodayUTC,
  getTodayDateString,
} from './DailyChallenge';

describe('DailyChallenge', () => {
  describe('dateToSeed', () => {
    it('returns a positive integer', () => {
      expect(dateToSeed('2026-06-03')).toBeGreaterThan(0);
    });
    it('is deterministic — same date same seed', () => {
      expect(dateToSeed('2026-06-03')).toBe(dateToSeed('2026-06-03'));
    });
    it('different dates give different seeds', () => {
      expect(dateToSeed('2026-06-03')).not.toBe(dateToSeed('2026-06-04'));
    });
  });

  describe('getDailyShuffledNumbers (seeded layout)', () => {
    it('contains all 1–25, no duplicates', () => {
      const s = getDailyShuffledNumbers('2026-06-03');
      expect(s).toHaveLength(25);
      expect(new Set(s).size).toBe(25);
      expect(Math.min(...s)).toBe(1);
      expect(Math.max(...s)).toBe(25);
    });
    it('is deterministic — same date same shuffle', () => {
      expect(getDailyShuffledNumbers('2026-06-03')).toEqual(getDailyShuffledNumbers('2026-06-03'));
    });
    it('different dates give different shuffles', () => {
      expect(getDailyShuffledNumbers('2026-06-03')).not.toEqual(getDailyShuffledNumbers('2026-06-04'));
    });
  });

  describe('getDailyChallenge (3-challenge config — T-005)', () => {
    it('C1 = easy', () => expect(getDailyChallenge(1).difficulty).toBe('easy'));
    it('C2 = pro', () => expect(getDailyChallenge(2).difficulty).toBe('pro'));
    it('C3 = expert', () => expect(getDailyChallenge(3).difficulty).toBe('expert'));
    it('label is CHALLENGE N', () => {
      expect(getDailyChallenge(1).label).toBe('CHALLENGE 1');
      expect(getDailyChallenge(2).label).toBe('CHALLENGE 2');
      expect(getDailyChallenge(3).label).toBe('CHALLENGE 3');
    });
    it('all 3 share the same seed + gridSize on a given day', () => {
      const a = getDailyChallenge(1, '2026-06-03');
      const b = getDailyChallenge(3, '2026-06-03');
      expect(a.seed).toBe(b.seed);
      expect(a.gridSize).toBe(5);
      expect(b.gridSize).toBe(5);
    });
  });

  describe('date helpers', () => {
    it('getTodayDateString is YYYY-MM-DD', () => {
      expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it('getTodayUTC aliases getTodayDateString', () => {
      expect(getTodayUTC()).toBe(getTodayDateString());
    });
  });
});
