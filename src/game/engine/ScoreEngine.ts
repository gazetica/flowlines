// ScoreEngine.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 (FL-S1-003) · UX Sprint D (FL-UX-D-004)
//
// Score / star / breakdown logic. Pure — no Phaser, no React.
//
// Two APIs coexist:
//  - LEGACY: calcScore/calcStars/getScoreBreakdown (CLAUDE.md §13). Still used by
//    flowGameStore.triggerWin + ResultScreen; kept intact until the mode UI lands.
//  - NEW (FL-UX-D-004): ScoreEngine.calc(ScoreInput) → ScoreResult — the 4-component
//    per-mode formula (Campaign / Classic / Zen / Daily) that the upcoming mode
//    screens will use.

import type { Difficulty } from '../../types/level';

export interface ScoreParams {
  optimalMoves:  number;  // pre-computed in level JSON
  actualMoves:   number;  // how many moves the player used
  hintsUsed:     number;  // 0–3
  timeRemaining: number;  // seconds remaining — 0 if not Timed Mode
  isTimedMode:   boolean; // true only in Timed Mode
}

export interface ScoreBreakdown {
  perfectClearBonus: number;  // always 200
  moveBonus:         number;  // positive if player beat optimal
  movePenalty:       number;  // positive value (subtracted in display)
  hintPenalty:       number;  // positive value (subtracted in display)
  timeBonus:         number;  // 0 if not Timed Mode
  total:             number;  // final score (same as calcScore result)
}

const PERFECT_CLEAR_BONUS = 200;
const MOVE_POINTS = 5;        // per move under/over optimal
const HINT_PENALTY = 30;      // per hint used
const TIME_BONUS_PER_SEC = 15;

/**
 * Final score for a completed level. Components are summed then floored at 0
 * so the score is never negative.
 */
export function calcScore(params: ScoreParams): number {
  const { total } = getScoreBreakdown(params);
  return total;
}

/**
 * Star rating for a completed level. Never returns 0 — 0 stars means abandoned
 * and is set externally by the game, not here.
 *   3 ★ — actualMoves ≤ optimalMoves
 *   2 ★ — actualMoves ≤ floor(optimalMoves × 1.20)
 *   1 ★ — actualMoves > floor(optimalMoves × 1.20)
 */
export function calcStars(optimalMoves: number, actualMoves: number): 1 | 2 | 3 {
  if (actualMoves <= optimalMoves) return 3;
  if (actualMoves <= Math.floor(optimalMoves * 1.20)) return 2;
  return 1;
}

/**
 * Itemised score breakdown for ResultScreen (VDD VD-06). `total` equals the
 * `calcScore` result for the same params.
 */
export function getScoreBreakdown(params: ScoreParams): ScoreBreakdown {
  const { optimalMoves, actualMoves, hintsUsed, timeRemaining, isTimedMode } = params;

  const perfectClearBonus = PERFECT_CLEAR_BONUS;
  const moveBonus   = Math.max(0, (optimalMoves - actualMoves) * MOVE_POINTS);
  const movePenalty = Math.max(0, (actualMoves - optimalMoves) * MOVE_POINTS);
  const hintPenalty = hintsUsed * HINT_PENALTY;
  const timeBonus   = isTimedMode ? timeRemaining * TIME_BONUS_PER_SEC : 0;

  const raw = perfectClearBonus + moveBonus - movePenalty - hintPenalty + timeBonus;
  const total = Math.max(0, Math.round(raw));

  return { perfectClearBonus, moveBonus, movePenalty, hintPenalty, timeBonus, total };
}

// ─── FL-UX-D-004: per-mode scoring ───────────────────────────────────────────

export type GameMode = 'campaign' | 'classic' | 'zen' | 'daily_campaign' | 'daily_classic';

export interface ScoreInput {
  mode: GameMode;
  dotsConnected: boolean; // all colour pairs connected
  coveragePct: number;    // 0–100
  // Campaign (ignored otherwise)
  timeElapsed: number;    // seconds, counts up
  timeLimit: number;      // seconds, countdown ceiling
  // Classic (ignored otherwise)
  movesUsed: number;      // gesture count (one path drawn = one move)
  classicMoveLimit: number;
  // Shared efficiency
  optimalMoves: number;   // path-cell count from level JSON
  cellMoveCount: number;  // total cells traversed (gameStore.moveCount)
  hintsUsed: number;
  difficulty: Difficulty;
}

export interface ScoreResult {
  total: number;
  breakdown: {
    dotsScore: number;       // max 250
    coverageScore: number;   // max 250
    efficiencyScore: number; // max 300
    bonusScore: number;      // max 200
    hintPenalty: number;     // negative
  };
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Move-efficiency bonus (Campaign/Zen): 200 at/under optimal, decaying to 0. */
function moveEfficiencyBonus(cellMoveCount: number, optimalMoves: number): number {
  if (optimalMoves <= 0 || cellMoveCount <= optimalMoves) return 200;
  const overshoot = (cellMoveCount - optimalMoves) / optimalMoves;
  return Math.max(0, Math.round(200 * (1 - overshoot)));
}

function starsFor(result: ScoreResult, input: ScoreInput): 0 | 1 | 2 | 3 {
  if (!result.passed) return 0;
  if (
    input.dotsConnected &&
    input.coveragePct === 100 &&
    result.breakdown.efficiencyScore >= 240 && // 80% of 300
    input.hintsUsed === 0
  ) return 3;
  if (result.breakdown.efficiencyScore >= 150) return 2; // 50% of 300
  return 1;
}

function calc(input: ScoreInput): ScoreResult {
  const isClassic = input.mode === 'classic' || input.mode === 'daily_classic';
  const isZen = input.mode === 'zen';

  const dotsScore = input.dotsConnected ? 250 : 0;
  const coverageScore = Math.round((input.coveragePct / 100) * 250);
  const hintPenalty = input.hintsUsed > 0 ? input.hintsUsed * -40 : 0; // avoid -0

  let efficiencyScore = 0;
  let bonusScore = 0;
  let passed = true;
  let maxTotal = 1000;

  if (isClassic) {
    const movesRemaining = input.classicMoveLimit - input.movesUsed;
    if (input.movesUsed > input.classicMoveLimit) efficiencyScore = 0;
    else efficiencyScore = clamp(Math.round((movesRemaining / input.classicMoveLimit) * 300), 0, 300);
    // Time bonus.
    if (input.timeElapsed < 60) bonusScore = 200;
    else if (input.timeElapsed < 120) bonusScore = 150;
    else if (input.timeElapsed < 180) bonusScore = 100;
    else bonusScore = 50;
    passed = input.dotsConnected && input.coveragePct === 100 && input.movesUsed <= input.classicMoveLimit;
    maxTotal = 1100; // time bonus can lift the ceiling
  } else if (isZen) {
    efficiencyScore = 0; // no timer in Zen
    bonusScore = moveEfficiencyBonus(input.cellMoveCount, input.optimalMoves);
    passed = true; // Zen never fails
    maxTotal = 800;
  } else {
    // campaign / daily_campaign
    const timeRemaining = input.timeLimit - input.timeElapsed;
    if (timeRemaining <= 0) efficiencyScore = 0;
    else efficiencyScore = clamp(Math.round((timeRemaining / input.timeLimit) * 300), 0, 300);
    bonusScore = moveEfficiencyBonus(input.cellMoveCount, input.optimalMoves);
    passed = input.dotsConnected && input.coveragePct === 100 && input.timeElapsed < input.timeLimit;
    maxTotal = 1000;
  }

  const breakdown = { dotsScore, coverageScore, efficiencyScore, bonusScore, hintPenalty };
  const total = clamp(Math.round(dotsScore + coverageScore + efficiencyScore + bonusScore + hintPenalty), 0, maxTotal);

  const result: ScoreResult = { total, breakdown, stars: 0, passed };
  result.stars = starsFor(result, input);
  return result;
}

export const ScoreEngine = { calc };
