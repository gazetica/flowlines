// CoverageCalc.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 | Task FL-S1-003
//
// Board coverage percentage + the dual win condition (100% coverage AND all
// dot pairs connected). Pure logic — no Phaser, no React.

import {
  getCoveredCellCount,
  areAllDotsConnected,
  type Grid,
  type DotPair,
} from './GridEngine';

/**
 * Returns the percentage (0–100, rounded to an integer) of grid cells that are
 * occupied. Endpoints count as occupied. Returns 0 for an empty grid.
 */
export function calculateCoverage(grid: Grid): number {
  const rows = grid.length;
  if (rows === 0) return 0;
  const cols = grid[0].length;
  const totalCells = rows * cols;
  if (totalCells === 0) return 0;

  const occupied = getCoveredCellCount(grid);
  return Math.round((occupied / totalCells) * 100);
}

/**
 * Dual win condition — true ONLY if every cell is occupied (100% coverage) AND
 * every dot pair is connected. Either alone is not a win. The two checks are
 * evaluated independently.
 */
export function isWinCondition(grid: Grid, dots: DotPair[]): boolean {
  const fullyCovered = calculateCoverage(grid) === 100;
  const allConnected = areAllDotsConnected(grid, dots);
  return fullyCovered && allConnected;
}
