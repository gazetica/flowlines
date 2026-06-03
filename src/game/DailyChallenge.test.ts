// DailyChallenge.test.ts
// Numtap | Gazetica Studio | Sprint 3 Day 7 | Task T-014

import { describe, it, expect } from 'vitest';
import { getDailyChallenge, dateToSeed, getTodayUTC } from './DailyChallenge';

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

  describe('getDailyChallenge', () => {
    it('returns gridSize 5', () => {
      expect(getDailyChallenge('2026-06-03').gridSize).toBe(5);
    });
    it('shuffledNumbers contains all 1–25, no duplicates', () => {
      const { shuffledNumbers } = getDailyChallenge('2026-06-03');
      expect(shuffledNumbers).toHaveLength(25);
      expect(new Set(shuffledNumbers).size).toBe(25);
      expect(Math.min(...shuffledNumbers)).toBe(1);
      expect(Math.max(...shuffledNumbers)).toBe(25);
    });
    it('is deterministic — same date same shuffle', () => {
      const a = getDailyChallenge('2026-06-03').shuffledNumbers;
      const b = getDailyChallenge('2026-06-03').shuffledNumbers;
      expect(a).toEqual(b);
    });
    it('different dates give different shuffles', () => {
      const a = getDailyChallenge('2026-06-03').shuffledNumbers;
      const b = getDailyChallenge('2026-06-04').shuffledNumbers;
      expect(a).not.toEqual(b);
    });
    it('returns correct date string', () => {
      expect(getDailyChallenge('2026-06-03').date).toBe('2026-06-03');
    });
  });

  describe('getTodayUTC', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      expect(getTodayUTC()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
