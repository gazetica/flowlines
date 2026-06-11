// CoverageCalc.test.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 | Task FL-S1-003

import { describe, it, expect } from 'vitest';
import { calculateCoverage, isWinCondition } from './CoverageCalc';
import { initGrid, occupyCell, type Colour, type DotPair, type Grid } from './GridEngine';

// 5 dot pairs (10 distinct cells) for a 6x6 coverage test.
const FIVE_PAIRS: DotPair[] = [
  { colour: 'red',    r1: 0, c1: 0, r2: 0, c2: 1 },
  { colour: 'blue',   r1: 1, c1: 0, r2: 1, c2: 1 },
  { colour: 'green',  r1: 2, c1: 0, r2: 2, c2: 1 },
  { colour: 'yellow', r1: 3, c1: 0, r2: 3, c2: 1 },
  { colour: 'purple', r1: 4, c1: 0, r2: 4, c2: 1 },
];

/** Occupy the first `n` cells in row-major order with `colour`. */
function occupyN(grid: Grid, colour: Colour, n: number): Grid {
  let g = grid;
  let k = 0;
  for (let r = 0; r < g.length && k < n; r++) {
    for (let c = 0; c < g[r].length && k < n; c++) {
      g = occupyCell(g, r, c, colour);
      k++;
    }
  }
  return g;
}

/** Occupy every cell with `colour` (full coverage + one connected region). */
function occupyAll(grid: Grid, colour: Colour): Grid {
  return occupyN(grid, colour, grid.length * grid[0].length);
}

describe('calculateCoverage', () => {
  it('fresh 6x6 grid with 5 dot pairs → 28% (10/36)', () => {
    expect(calculateCoverage(initGrid(6, FIVE_PAIRS))).toBe(28);
  });

  it('fresh 6x6 grid with 0 dot pairs → 0%', () => {
    expect(calculateCoverage(initGrid(6, []))).toBe(0);
  });

  it('fully occupied 6x6 grid → 100%', () => {
    expect(calculateCoverage(occupyAll(initGrid(6, []), 'red'))).toBe(100);
  });

  it('fully occupied 9x9 grid → 100%', () => {
    expect(calculateCoverage(occupyAll(initGrid(9, []), 'red'))).toBe(100);
  });

  it('half-occupied 6x6 grid → 50%', () => {
    expect(calculateCoverage(occupyN(initGrid(6, []), 'red', 18))).toBe(50);
  });

  it('returns an integer (no decimals)', () => {
    const cov = calculateCoverage(occupyN(initGrid(4, []), 'red', 1));
    expect(Number.isInteger(cov)).toBe(true);
  });

  it('1 occupied cell on 4x4 → 6% (round(1/16*100))', () => {
    expect(calculateCoverage(occupyN(initGrid(4, []), 'red', 1))).toBe(6);
  });

  it('15 occupied cells on 4x4 → 94%', () => {
    expect(calculateCoverage(occupyN(initGrid(4, []), 'red', 15))).toBe(94);
  });
});

describe('isWinCondition', () => {
  // 2x2 grid, single red pair on the top row; full red coverage connects them.
  const TWO_BY_TWO: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 0, c2: 1 }];

  it('returns false when coverage < 100 even if all dots connected', () => {
    let grid = initGrid(2, TWO_BY_TWO);
    grid = occupyCell(grid, 0, 0, 'red');
    grid = occupyCell(grid, 0, 1, 'red'); // red connected, but (1,*) empty → 50%
    expect(isWinCondition(grid, TWO_BY_TWO)).toBe(false);
  });

  it('returns false when coverage === 100 but dots not all connected', () => {
    // Fill all 4 cells but split colours so red endpoints are not connected.
    let grid = initGrid(2, [{ colour: 'red', r1: 0, c1: 0, r2: 1, c2: 1 }]);
    grid = occupyCell(grid, 0, 0, 'red');
    grid = occupyCell(grid, 0, 1, 'blue');
    grid = occupyCell(grid, 1, 0, 'blue');
    grid = occupyCell(grid, 1, 1, 'red'); // red corners not orthogonally linked
    expect(calculateCoverage(grid)).toBe(100);
    expect(isWinCondition(grid, [{ colour: 'red', r1: 0, c1: 0, r2: 1, c2: 1 }])).toBe(false);
  });

  it('returns true when coverage === 100 AND all dots connected', () => {
    const grid = occupyAll(initGrid(2, TWO_BY_TWO), 'red');
    expect(isWinCondition(grid, TWO_BY_TWO)).toBe(true);
  });

  it('returns false on fresh grid (endpoints placed, nothing drawn)', () => {
    expect(isWinCondition(initGrid(6, FIVE_PAIRS), FIVE_PAIRS)).toBe(false);
  });

  it('1 pair connected + full coverage on 2x2 grid → true', () => {
    const grid = occupyAll(initGrid(2, TWO_BY_TWO), 'red');
    expect(isWinCondition(grid, TWO_BY_TWO)).toBe(true);
  });

  it('2 pairs: one connected, one not + full coverage → false', () => {
    const dots: DotPair[] = [
      { colour: 'red',  r1: 0, c1: 0, r2: 0, c2: 1 },
      { colour: 'blue', r1: 1, c1: 0, r2: 1, c2: 1 },
    ];
    let grid = initGrid(2, dots);
    grid = occupyCell(grid, 0, 0, 'red');
    grid = occupyCell(grid, 0, 1, 'red'); // red connected
    grid = occupyCell(grid, 1, 0, 'blue');
    grid = occupyCell(grid, 1, 1, 'green'); // blue NOT connected to its pair
    expect(calculateCoverage(grid)).toBe(100);
    expect(isWinCondition(grid, dots)).toBe(false);
  });

  it('2 pairs: both connected + 1 empty cell → false', () => {
    const dots: DotPair[] = [
      { colour: 'red',  r1: 0, c1: 0, r2: 0, c2: 2 },
      { colour: 'blue', r1: 2, c1: 0, r2: 2, c2: 2 },
    ];
    let grid = initGrid(3, dots);
    grid = occupyCell(grid, 0, 1, 'red');  // red connected across row 0
    grid = occupyCell(grid, 2, 1, 'blue'); // blue connected across row 2
    // middle row 1 left empty → coverage < 100
    expect(isWinCondition(grid, dots)).toBe(false);
  });

  it('returns false for empty dots array + non-100 coverage', () => {
    expect(isWinCondition(initGrid(6, []), [])).toBe(false);
  });

  it('returns true for empty dots array + 100 coverage', () => {
    const grid = occupyAll(initGrid(2, []), 'red');
    expect(isWinCondition(grid, [])).toBe(true);
  });

  it('correctly handles 7x7 grid (49 cells)', () => {
    const dots: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 6, c2: 6 }];
    const grid = occupyAll(initGrid(7, dots), 'red');
    expect(calculateCoverage(grid)).toBe(100);
    expect(isWinCondition(grid, dots)).toBe(true);
  });

  it('correctly handles 9x9 grid (81 cells)', () => {
    const dots: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 8, c2: 8 }];
    const grid = occupyAll(initGrid(9, dots), 'red');
    expect(calculateCoverage(grid)).toBe(100);
    expect(isWinCondition(grid, dots)).toBe(true);
  });

  it('returns false when coverage is 99 (one cell short)', () => {
    // 10x10 = 100 cells; occupy 99 with empty dots so connectivity is vacuously true.
    const grid = occupyN(initGrid(10, []), 'red', 99);
    expect(calculateCoverage(grid)).toBe(99);
    expect(isWinCondition(grid, [])).toBe(false);
  });
});
