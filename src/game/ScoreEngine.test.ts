// ScoreEngine.test.ts
// Numtap | Gazetica Studio | Sprint 2 Day 1 | Task T-002
//
// Vitest unit tests for ScoreEngine. All expected values are pre-calculated
// in the T-002 brief and asserted exactly (deterministic integers/floats).
// Run with: npx vitest run src/game/ScoreEngine.test.ts

import { describe, it, expect } from 'vitest';
import { ScoreEngine } from '../game/ScoreEngine';
import type { ScoreParams } from '../game/ScoreEngine';

// Helper: build N timestamps spaced `gap` ms apart, starting at 0.
function timestamps(count: number, gap: number): number[] {
  return Array.from({ length: count }, (_, i) => i * gap);
}

describe('ScoreEngine', () => {
  // ---------------------------------------------------------------------
  // Group 1: calcBaseScore
  // ---------------------------------------------------------------------
  describe('calcBaseScore()', () => {
    it('tapCount=9 → 900', () => expect(ScoreEngine.calcBaseScore(9)).toBe(900));
    it('tapCount=16 → 1600', () => expect(ScoreEngine.calcBaseScore(16)).toBe(1600));
    it('tapCount=25 → 2500', () => expect(ScoreEngine.calcBaseScore(25)).toBe(2500));
    it('tapCount=36 → 3600', () => expect(ScoreEngine.calcBaseScore(36)).toBe(3600));
    it('tapCount=49 → 4900', () => expect(ScoreEngine.calcBaseScore(49)).toBe(4900));
  });

  // ---------------------------------------------------------------------
  // Group 2: calcTimeBonus
  // ---------------------------------------------------------------------
  describe('calcTimeBonus()', () => {
    it('timeLimit=80, timeElapsed=38 → 840', () =>
      expect(ScoreEngine.calcTimeBonus(80, 38)).toBe(840));
    it('timeLimit=80, timeElapsed=80 → 0 (no time remaining)', () =>
      expect(ScoreEngine.calcTimeBonus(80, 80)).toBe(0));
    it('timeLimit=80, timeElapsed=85 → 0 (over limit, no penalty)', () =>
      expect(ScoreEngine.calcTimeBonus(80, 85)).toBe(0));
    it('timeLimit=60, timeElapsed=20 → 800', () =>
      expect(ScoreEngine.calcTimeBonus(60, 20)).toBe(800));
    it('timeLimit=60, timeElapsed=59 → 20 (1 second remaining)', () =>
      expect(ScoreEngine.calcTimeBonus(60, 59)).toBe(20));
  });

  // ---------------------------------------------------------------------
  // Group 3: calcSpeedBonus
  // ---------------------------------------------------------------------
  describe('calcSpeedBonus()', () => {
    it('[0,1000,2000,3000] → 200 (avg 1000ms < 2000)', () =>
      expect(ScoreEngine.calcSpeedBonus([0, 1000, 2000, 3000])).toBe(200));
    it('[0,1500,3000,4500] → 200 (avg 1500ms < 2000)', () =>
      expect(ScoreEngine.calcSpeedBonus([0, 1500, 3000, 4500])).toBe(200));
    it('[0,2000,4000,6000] → 0 (avg 2000ms, NOT under threshold)', () =>
      expect(ScoreEngine.calcSpeedBonus([0, 2000, 4000, 6000])).toBe(0));
    it('[0,3000,6000] → 0 (avg 3000ms)', () =>
      expect(ScoreEngine.calcSpeedBonus([0, 3000, 6000])).toBe(0));
    it('[1000] → 0 (only 1 timestamp)', () =>
      expect(ScoreEngine.calcSpeedBonus([1000])).toBe(0));
    it('[] → 0 (empty array)', () =>
      expect(ScoreEngine.calcSpeedBonus([])).toBe(0));
  });

  // ---------------------------------------------------------------------
  // Group 4: calcStreakMultiplier
  // ---------------------------------------------------------------------
  describe('calcStreakMultiplier()', () => {
    it('dailyStreak=0 → 1.0', () => expect(ScoreEngine.calcStreakMultiplier(0)).toBe(1.0));
    it('dailyStreak=1 → 1.05', () => expect(ScoreEngine.calcStreakMultiplier(1)).toBe(1.05));
    it('dailyStreak=5 → 1.25', () => expect(ScoreEngine.calcStreakMultiplier(5)).toBe(1.25));
    it('dailyStreak=10 → 1.5', () => expect(ScoreEngine.calcStreakMultiplier(10)).toBe(1.5));
    it('dailyStreak=11 → 1.5 (capped)', () =>
      expect(ScoreEngine.calcStreakMultiplier(11)).toBe(1.5));
    it('dailyStreak=-1 → 1.0 (negative treated as 0)', () =>
      expect(ScoreEngine.calcStreakMultiplier(-1)).toBe(1.0));
  });

  // ---------------------------------------------------------------------
  // Group 5: calcGridMultiplier
  // ---------------------------------------------------------------------
  describe('calcGridMultiplier()', () => {
    it('gridSize=3 → 1.0', () => expect(ScoreEngine.calcGridMultiplier(3)).toBe(1.0));
    it('gridSize=4 → 1.5', () => expect(ScoreEngine.calcGridMultiplier(4)).toBe(1.5));
    it('gridSize=5 → 2.0', () => expect(ScoreEngine.calcGridMultiplier(5)).toBe(2.0));
    it('gridSize=6 → 2.8', () => expect(ScoreEngine.calcGridMultiplier(6)).toBe(2.8));
    it('gridSize=7 → 3.5', () => expect(ScoreEngine.calcGridMultiplier(7)).toBe(3.5));
    it('gridSize=99 → 1.0 (unknown size fallback)', () =>
      expect(ScoreEngine.calcGridMultiplier(99)).toBe(1.0));
  });

  // ---------------------------------------------------------------------
  // Group 6: getStars (boundary thresholds inclusive)
  // ---------------------------------------------------------------------
  describe('getStars()', () => {
    const t: [number, number, number] = [35, 55, 80];
    it('timeElapsed=30 → 3', () => expect(ScoreEngine.getStars(30, t)).toBe(3));
    it('timeElapsed=35 → 3 (boundary inclusive)', () =>
      expect(ScoreEngine.getStars(35, t)).toBe(3));
    it('timeElapsed=36 → 2', () => expect(ScoreEngine.getStars(36, t)).toBe(2));
    it('timeElapsed=55 → 2 (boundary inclusive)', () =>
      expect(ScoreEngine.getStars(55, t)).toBe(2));
    it('timeElapsed=56 → 1', () => expect(ScoreEngine.getStars(56, t)).toBe(1));
    it('timeElapsed=80 → 1 (boundary inclusive)', () =>
      expect(ScoreEngine.getStars(80, t)).toBe(1));
    it('timeElapsed=81 → 0', () => expect(ScoreEngine.getStars(81, t)).toBe(0));
  });

  // ---------------------------------------------------------------------
  // Group 7: calculate — end-to-end integration tests
  // ---------------------------------------------------------------------
  describe('calculate()', () => {
    it('Test A — 5x5, fast player, daily streak 5 → total 8850', () => {
      const params: ScoreParams = {
        gridSize: 5,
        tapCount: 25,
        timeLimit: 80,
        timeElapsed: 38,
        tapTimestamps: timestamps(25, 1000), // 0..24000, avg 1000ms
        dailyStreak: 5,
      };
      const r = ScoreEngine.calculate(params);
      expect(r.baseScore).toBe(2500);
      expect(r.timeBonus).toBe(840);
      expect(r.speedBonus).toBe(200);
      expect(r.streakMultiplier).toBe(1.25);
      expect(r.gridMultiplier).toBe(2.0);
      expect(r.totalScore).toBe(8850);
    });

    it('Test B — 3x3, slow player, no streak → total 940', () => {
      const params: ScoreParams = {
        gridSize: 3,
        tapCount: 9,
        timeLimit: 40,
        timeElapsed: 38,
        tapTimestamps: timestamps(9, 4000), // 0..32000, avg 4000ms
        dailyStreak: 0,
      };
      const r = ScoreEngine.calculate(params);
      expect(r.baseScore).toBe(900);
      expect(r.timeBonus).toBe(40);
      expect(r.speedBonus).toBe(0);
      expect(r.streakMultiplier).toBe(1.0);
      expect(r.gridMultiplier).toBe(1.0);
      expect(r.totalScore).toBe(940);
    });

    it('Test C — 7x7, max streak, time expired → total 25725', () => {
      const params: ScoreParams = {
        gridSize: 7,
        tapCount: 49,
        timeLimit: 165,
        timeElapsed: 165,
        tapTimestamps: timestamps(49, 3000), // avg 3000ms
        dailyStreak: 15,
      };
      const r = ScoreEngine.calculate(params);
      expect(r.baseScore).toBe(4900);
      expect(r.timeBonus).toBe(0);
      expect(r.speedBonus).toBe(0);
      expect(r.streakMultiplier).toBe(1.5);
      expect(r.gridMultiplier).toBe(3.5);
      expect(r.totalScore).toBe(25725);
    });

    it('result always carries a non-empty breakdown string', () => {
      const r = ScoreEngine.calculate({
        gridSize: 5,
        tapCount: 25,
        timeLimit: 80,
        timeElapsed: 38,
        tapTimestamps: timestamps(25, 1000),
        dailyStreak: 5,
      });
      expect(typeof r.breakdown).toBe('string');
      expect(r.breakdown.length).toBeGreaterThan(0);
      expect(r.breakdown).toContain('= 8850');
    });
  });

  describe('difficulty multiplier (T-004B)', () => {
    const base: ScoreParams = {
      gridSize: 3,
      tapCount: 9,
      timeLimit: 45,
      timeElapsed: 20,
      tapTimestamps: timestamps(9, 1000),
      dailyStreak: 0,
    };
    it('easy → difficultyMultiplier 1.0', () => {
      expect(ScoreEngine.calculate({ ...base, difficulty: 'easy' }).difficultyMultiplier).toBe(1.0);
    });
    it('pro → difficultyMultiplier 1.5', () => {
      expect(ScoreEngine.calculate({ ...base, difficulty: 'pro' }).difficultyMultiplier).toBe(1.5);
    });
    it('expert → difficultyMultiplier 2.0', () => {
      expect(ScoreEngine.calculate({ ...base, difficulty: 'expert' }).difficultyMultiplier).toBe(2.0);
    });
    it('omitted difficulty → 1.0 and totalScore unchanged (back-compat)', () => {
      const r = ScoreEngine.calculate(base);
      expect(r.difficultyMultiplier).toBe(1.0);
      // Applying expert (2.0×) to the same subtotal doubles it (multiplier works end-to-end).
      const expert = ScoreEngine.calculate({ ...base, difficulty: 'expert' });
      expect(Math.round(r.totalScore * expert.difficultyMultiplier)).toBe(r.totalScore * 2);
    });
  });
});
