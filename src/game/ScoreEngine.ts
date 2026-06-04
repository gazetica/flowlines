// ScoreEngine.ts
// Numtap | Gazetica Studio | Sprint 2 Day 1 | Task T-002
//
// Pure TypeScript score calculator.
// ZERO Phaser imports. ZERO React imports. ZERO browser APIs. ZERO side effects.
// All methods are static pure functions — input in, result out. No instance state.

import type { Difficulty } from './GridEngine';

// T-004B: final score multiplier by difficulty. Applied LAST (after the
// wrong-tap penalty) by the caller (gameStore.endGame), so `totalScore` below
// stays the pre-difficulty subtotal and existing tests are unaffected.
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  pro: 1.5,
  expert: 2.0,
};

export interface ScoreParams {
  gridSize: number;          // N — the grid was NxN (3, 4, 5, 6, or 7)
  tapCount: number;          // number of correct taps completed = N²
  timeLimit: number;         // level's time limit in seconds
  timeElapsed: number;       // actual seconds used by player
  tapTimestamps: number[];   // ms timestamps of each correct tap (length = N²)
  dailyStreak: number;       // consecutive daily challenge days (0 = no streak bonus)
  difficulty?: Difficulty;   // T-004B: easy/pro/expert (defaults to easy)
}

export interface ScoreResult {
  baseScore: number;
  timeBonus: number;
  speedBonus: number;
  streakMultiplier: number;
  gridMultiplier: number;
  totalScore: number;            // pre-difficulty subtotal (× streak × grid)
  difficultyMultiplier: number;  // T-004B: 1.0 / 1.5 / 2.0 — apply after penalty
  breakdown: string;
}

export class ScoreEngine {
  // Main method. Calls all sub-calculators and assembles the result.
  static calculate(params: ScoreParams): ScoreResult {
    const baseScore = ScoreEngine.calcBaseScore(params.tapCount);
    const timeBonus = ScoreEngine.calcTimeBonus(params.timeLimit, params.timeElapsed);
    const speedBonus = ScoreEngine.calcSpeedBonus(params.tapTimestamps);
    const streakMult = ScoreEngine.calcStreakMultiplier(params.dailyStreak);
    const gridMult = ScoreEngine.calcGridMultiplier(params.gridSize);
    const totalScore = Math.round(
      (baseScore + timeBonus + speedBonus) * streakMult * gridMult
    );
    const breakdown = ScoreEngine.buildBreakdown(
      baseScore,
      timeBonus,
      speedBonus,
      streakMult,
      gridMult,
      totalScore
    );
    return {
      baseScore,
      timeBonus,
      speedBonus,
      streakMultiplier: streakMult,
      gridMultiplier: gridMult,
      totalScore,
      difficultyMultiplier: DIFFICULTY_MULTIPLIER[params.difficulty ?? 'easy'],
      breakdown,
    };
  }

  // Each correct tap = 100 points.
  static calcBaseScore(tapCount: number): number {
    return tapCount * 100;
  }

  // Remaining seconds rewarded at 20 points per second. Never negative.
  static calcTimeBonus(timeLimit: number, timeElapsed: number): number {
    const remainingSeconds = timeLimit - timeElapsed;
    return Math.max(0, Math.floor(remainingSeconds)) * 20;
  }

  // Reward for fast, consistent tapping. Needs at least 2 timestamps.
  static calcSpeedBonus(tapTimestamps: number[]): number {
    if (tapTimestamps.length < 2) return 0;
    const first = tapTimestamps[0];
    const last = tapTimestamps[tapTimestamps.length - 1];
    const avgInterval = (last - first) / (tapTimestamps.length - 1);
    return avgInterval < 2000 ? 200 : 0;
  }

  // Daily Challenge streak bonus. 1 + (streak × 0.05), capped at 1.5 (streak=10).
  static calcStreakMultiplier(dailyStreak: number): number {
    if (dailyStreak <= 0) return 1.0;
    return Math.min(1.5, 1 + dailyStreak * 0.05);
  }

  // Larger grids = harder = higher multiplier. Lookup map (not if/else).
  static calcGridMultiplier(gridSize: number): number {
    const multipliers: Record<number, number> = {
      3: 1.0,
      4: 1.5,
      5: 2.0,
      6: 2.8,
      7: 3.5,
    };
    return multipliers[gridSize] ?? 1.0;
  }

  // Human-readable breakdown string for the result screen.
  //
  // SPEC NOTE (genuine ambiguity resolved):
  //   The brief's prose "Format rules" prescribe always appending
  //   `× ${streakMult} streak × ${gridMult} grid`, but the brief's worked
  //   examples omit the "streak"/"grid" labels and show zero-padded decimals
  //   (e.g. "1.0", "2.0") that no single template-literal/toFixed formatter can
  //   reproduce consistently (1.25 has 2 decimals, 2.8 has 1, 1.0 has 1).
  //   Because the examples are not implementable as written, this follows the
  //   prescriptive prose Format rules. No unit test asserts the exact string.
  static buildBreakdown(
    base: number,
    timeBonus: number,
    speedBonus: number,
    streakMult: number,
    gridMult: number,
    total: number
  ): string {
    let s = `${base}`;
    if (timeBonus > 0) s += ` + ${timeBonus} time`;
    if (speedBonus > 0) s += ` + ${speedBonus} speed`;
    s += ` × ${streakMult} streak × ${gridMult} grid`;
    s += ` = ${total}`;
    return s;
  }

  // Star rating for a completed level. Boundary thresholds are inclusive.
  // starThresholds = [threeStarTime, twoStarTime, oneStarTime]
  static getStars(
    timeElapsed: number,
    starThresholds: [number, number, number]
  ): 0 | 1 | 2 | 3 {
    if (timeElapsed <= starThresholds[0]) return 3;
    if (timeElapsed <= starThresholds[1]) return 2;
    if (timeElapsed <= starThresholds[2]) return 1;
    return 0;
  }
}
