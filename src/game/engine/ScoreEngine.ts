// ScoreEngine.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 | Task FL-S1-003
//
// Final score, star rating, and score breakdown. Formulas per CLAUDE.md §13.
// Pure logic — no Phaser, no React.

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
