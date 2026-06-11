// GridEngine.test.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 2 | Task FL-S1-002
//
// Unit tests for the pure GridEngine data structure. No Phaser, no React.

import { describe, it, expect } from 'vitest';
import {
  initGrid,
  isCellInBounds,
  isPathValid,
  occupyCell,
  clearPath,
  getPathCells,
  getCoveredCellCount,
  areAllDotsConnected,
  type DotPair,
  type Grid,
} from './GridEngine';

// ─── Fixtures ───────────────────────────────────────────────────────────────

// Two dot pairs on a 6x6 grid:
//   red:  (0,0) ↔ (0,2)
//   blue: (5,0) ↔ (5,3)
const TWO_PAIRS: DotPair[] = [
  { colour: 'red',  r1: 0, c1: 0, r2: 0, c2: 2 },
  { colour: 'blue', r1: 5, c1: 0, r2: 5, c2: 3 },
];

const SINGLE_RED: DotPair[] = [
  { colour: 'red', r1: 0, c1: 0, r2: 0, c2: 2 },
];

/** Draw a path along a list of [row,col] cells with one colour (mutating helper for tests). */
function paint(grid: Grid, colour: Parameters<typeof occupyCell>[3], cells: Array<[number, number]>): Grid {
  let g = grid;
  for (const [r, c] of cells) {
    g = occupyCell(g, r, c, colour);
  }
  return g;
}

// ─── initGrid ─────────────────────────────────────────────────────────────

describe('initGrid', () => {
  it('creates a 6x6 grid with 36 cells', () => {
    const grid = initGrid(6, []);
    expect(grid.length).toBe(6);
    expect(grid.flat().length).toBe(36);
  });

  it('creates a 9x9 grid with 81 cells', () => {
    const grid = initGrid(9, []);
    expect(grid.length).toBe(9);
    expect(grid.flat().length).toBe(81);
  });

  it('all non-endpoint cells start with colour null', () => {
    const grid = initGrid(6, TWO_PAIRS);
    const nonEndpoints = grid.flat().filter((c) => !c.isEndpoint);
    expect(nonEndpoints.every((c) => c.colour === null)).toBe(true);
  });

  it('all non-endpoint cells start with isOccupied false', () => {
    const grid = initGrid(6, TWO_PAIRS);
    const nonEndpoints = grid.flat().filter((c) => !c.isEndpoint);
    expect(nonEndpoints.every((c) => c.isOccupied === false)).toBe(true);
  });

  it('dot endpoint cells have correct colour set', () => {
    const grid = initGrid(6, TWO_PAIRS);
    expect(grid[0][0].colour).toBe('red');
    expect(grid[0][2].colour).toBe('red');
    expect(grid[5][0].colour).toBe('blue');
    expect(grid[5][3].colour).toBe('blue');
  });

  it('dot endpoint cells have isEndpoint true and isOccupied true', () => {
    const grid = initGrid(6, TWO_PAIRS);
    for (const [r, c] of [[0, 0], [0, 2], [5, 0], [5, 3]]) {
      expect(grid[r][c].isEndpoint).toBe(true);
      expect(grid[r][c].isOccupied).toBe(true);
    }
  });

  it('records correct row/col coordinates on each cell', () => {
    const grid = initGrid(4, []);
    expect(grid[2][3].row).toBe(2);
    expect(grid[2][3].col).toBe(3);
  });
});

// ─── isCellInBounds ─────────────────────────────────────────────────────────

describe('isCellInBounds', () => {
  const grid = initGrid(6, []);

  it('returns true for (0,0) on 6x6', () => {
    expect(isCellInBounds(grid, 0, 0)).toBe(true);
  });

  it('returns true for (5,5) on 6x6', () => {
    expect(isCellInBounds(grid, 5, 5)).toBe(true);
  });

  it('returns false for (-1,0)', () => {
    expect(isCellInBounds(grid, -1, 0)).toBe(false);
  });

  it('returns false for (6,0) on 6x6', () => {
    expect(isCellInBounds(grid, 6, 0)).toBe(false);
  });

  it('returns false for (0,6) on 6x6', () => {
    expect(isCellInBounds(grid, 0, 6)).toBe(false);
  });
});

// ─── isPathValid ────────────────────────────────────────────────────────────

describe('isPathValid', () => {
  it('valid move right (same row, col+1) to empty cell', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 2, 2, 2, 3)).toBe(true);
  });

  it('valid move down (row+1, same col) to empty cell', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 2, 2, 3, 2)).toBe(true);
  });

  it('valid move left (same row, col-1) to empty cell', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 2, 2, 2, 1)).toBe(true);
  });

  it('valid move up (row-1, same col) to empty cell', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 2, 2, 1, 2)).toBe(true);
  });

  it('invalid — diagonal move (row+1, col+1) returns false', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 2, 2, 3, 3)).toBe(false);
  });

  it('invalid — move to cell occupied by different colour returns false', () => {
    let grid = initGrid(6, []);
    grid = occupyCell(grid, 2, 3, 'blue');
    expect(isPathValid(grid, 'red', 2, 2, 2, 3)).toBe(false);
  });

  it('valid — move to cell occupied by same colour (retrace) returns true', () => {
    let grid = initGrid(6, []);
    grid = occupyCell(grid, 2, 3, 'red');
    expect(isPathValid(grid, 'red', 2, 2, 2, 3)).toBe(true);
  });

  it('invalid — target cell out of bounds returns false', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 0, 5, 0, 6)).toBe(false);
  });

  it('invalid — move of 2 cells in one step returns false', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 2, 2, 2, 4)).toBe(false);
  });

  it('valid — move onto own endpoint cell returns true', () => {
    const grid = initGrid(6, SINGLE_RED); // red endpoint at (0,2)
    expect(isPathValid(grid, 'red', 0, 1, 0, 2)).toBe(true);
  });

  it('invalid — no movement (same cell) returns false', () => {
    const grid = initGrid(6, []);
    expect(isPathValid(grid, 'red', 2, 2, 2, 2)).toBe(false);
  });
});

// ─── occupyCell ─────────────────────────────────────────────────────────────

describe('occupyCell', () => {
  it('returns new grid with target cell colour set', () => {
    const grid = initGrid(6, []);
    const next = occupyCell(grid, 1, 1, 'green');
    expect(next[1][1].colour).toBe('green');
  });

  it('does not mutate the original grid', () => {
    const grid = initGrid(6, []);
    occupyCell(grid, 1, 1, 'green');
    expect(grid[1][1].colour).toBeNull();
    expect(grid[1][1].isOccupied).toBe(false);
  });

  it('isOccupied is true on target cell after occupy', () => {
    const grid = initGrid(6, []);
    const next = occupyCell(grid, 1, 1, 'green');
    expect(next[1][1].isOccupied).toBe(true);
  });

  it('isEndpoint unchanged after occupy', () => {
    const grid = initGrid(6, SINGLE_RED); // endpoint at (0,0)
    const next = occupyCell(grid, 0, 0, 'red');
    expect(next[0][0].isEndpoint).toBe(true);
    // and a non-endpoint stays non-endpoint
    const next2 = occupyCell(grid, 3, 3, 'red');
    expect(next2[3][3].isEndpoint).toBe(false);
  });
});

// ─── clearPath ──────────────────────────────────────────────────────────────

describe('clearPath', () => {
  it('clears all non-endpoint cells of that colour', () => {
    let grid = initGrid(6, SINGLE_RED);
    grid = paint(grid, 'red', [[0, 1]]); // connect (0,0)-(0,2) via (0,1)
    const cleared = clearPath(grid, 'red');
    expect(cleared[0][1].colour).toBeNull();
    expect(cleared[0][1].isOccupied).toBe(false);
  });

  it('does not clear endpoint cells of that colour', () => {
    let grid = initGrid(6, SINGLE_RED);
    grid = paint(grid, 'red', [[0, 1]]);
    const cleared = clearPath(grid, 'red');
    expect(cleared[0][0].colour).toBe('red');
    expect(cleared[0][0].isOccupied).toBe(true);
    expect(cleared[0][2].colour).toBe('red');
  });

  it('does not affect cells of other colours', () => {
    let grid = initGrid(6, TWO_PAIRS);
    grid = paint(grid, 'red', [[0, 1]]);
    grid = paint(grid, 'blue', [[5, 1], [5, 2]]);
    const cleared = clearPath(grid, 'red');
    expect(cleared[5][1].colour).toBe('blue');
    expect(cleared[5][2].colour).toBe('blue');
    expect(cleared[5][0].colour).toBe('blue'); // blue endpoint
  });

  it('returns new grid without mutating original', () => {
    let grid = initGrid(6, SINGLE_RED);
    grid = paint(grid, 'red', [[0, 1]]);
    const before = grid[0][1].colour;
    clearPath(grid, 'red');
    expect(grid[0][1].colour).toBe(before); // original untouched
    expect(grid[0][1].colour).toBe('red');
  });
});

// ─── getPathCells ───────────────────────────────────────────────────────────

describe('getPathCells', () => {
  it('returns endpoint cells for a colour on a fresh grid', () => {
    const grid = initGrid(6, SINGLE_RED);
    expect(getPathCells(grid, 'red').length).toBe(2);
  });

  it('includes painted cells plus endpoints', () => {
    let grid = initGrid(6, SINGLE_RED);
    grid = paint(grid, 'red', [[0, 1]]);
    expect(getPathCells(grid, 'red').length).toBe(3);
  });

  it('returns empty array for a colour not present', () => {
    const grid = initGrid(6, SINGLE_RED);
    expect(getPathCells(grid, 'teal')).toEqual([]);
  });
});

// ─── getCoveredCellCount ────────────────────────────────────────────────────

describe('getCoveredCellCount', () => {
  it('returns N (endpoint count) for fresh grid with N dot pairs', () => {
    const grid = initGrid(6, TWO_PAIRS); // 2 pairs => 4 endpoints
    expect(getCoveredCellCount(grid)).toBe(4);
  });

  it('returns correct count after occupying additional cells', () => {
    let grid = initGrid(6, TWO_PAIRS); // 4 endpoints
    grid = paint(grid, 'red', [[0, 1]]); // +1
    grid = paint(grid, 'blue', [[5, 1], [5, 2]]); // +2
    expect(getCoveredCellCount(grid)).toBe(7);
  });
});

// ─── areAllDotsConnected ────────────────────────────────────────────────────

describe('areAllDotsConnected', () => {
  it('returns false for fresh grid (endpoints exist but paths not drawn)', () => {
    const grid = initGrid(6, TWO_PAIRS);
    expect(areAllDotsConnected(grid, TWO_PAIRS)).toBe(false);
  });

  it('returns true when a single colour pair is connected by a path', () => {
    let grid = initGrid(6, SINGLE_RED); // (0,0)-(0,2)
    grid = paint(grid, 'red', [[0, 1]]);
    expect(areAllDotsConnected(grid, SINGLE_RED)).toBe(true);
  });

  it('returns false when one colour is connected but another is not', () => {
    let grid = initGrid(6, TWO_PAIRS);
    grid = paint(grid, 'red', [[0, 1]]); // red connected
    // blue (5,0)-(5,3) left unconnected
    expect(areAllDotsConnected(grid, TWO_PAIRS)).toBe(false);
  });

  it('returns true when all colours are fully connected', () => {
    let grid = initGrid(6, TWO_PAIRS);
    grid = paint(grid, 'red', [[0, 1]]);
    grid = paint(grid, 'blue', [[5, 1], [5, 2]]);
    expect(areAllDotsConnected(grid, TWO_PAIRS)).toBe(true);
  });

  it('returns true for an L-shaped (multi-turn) connecting path', () => {
    // red (0,0) -> down to (2,0) -> right to (2,2) endpoint
    const dots: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 2, c2: 2 }];
    let grid = initGrid(6, dots);
    grid = paint(grid, 'red', [[1, 0], [2, 0], [2, 1]]);
    expect(areAllDotsConnected(grid, dots)).toBe(true);
  });

  it('returns false when path is broken by a one-cell gap', () => {
    // red (0,0) and (0,3); paint (0,1) only, leaving (0,2) empty
    const dots: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 0, c2: 3 }];
    let grid = initGrid(6, dots);
    grid = paint(grid, 'red', [[0, 1]]);
    expect(areAllDotsConnected(grid, dots)).toBe(false);
  });
});
