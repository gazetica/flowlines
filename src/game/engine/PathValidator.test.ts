// PathValidator.test.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 | Task FL-S1-003

import { describe, it, expect } from 'vitest';
import { canExtendPath, isPathComplete } from './PathValidator';
import { initGrid, occupyCell, type Cell, type DotPair, type Grid } from './GridEngine';

// red pair across the top row of a 6x6: (0,0) ↔ (0,5)
const RED_PAIR: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 0, c2: 5 }];

/**
 * Build a path whose first cell is the real grid endpoint cell at coords[0]
 * (so isEndpoint/colour are correct) and whose remaining cells are synthetic
 * tips at the given coordinates (canExtendPath only reads row/col of the tip).
 */
function pathFrom(grid: Grid, coords: Array<[number, number]>): Cell[] {
  return coords.map(([r, c], i) =>
    i === 0
      ? grid[coords[0][0]][coords[0][1]]
      : ({ row: r, col: c, colour: 'red', isEndpoint: false, isOccupied: true } as Cell),
  );
}

/** Synthetic cell by coordinate (for isPathComplete, which only reads row/col). */
const at = (row: number, col: number): Cell =>
  ({ row, col, colour: null, isEndpoint: false, isOccupied: false } as Cell);

describe('canExtendPath', () => {
  it('returns false when currentPath is empty (no start point)', () => {
    const grid = initGrid(6, RED_PAIR);
    expect(canExtendPath(grid, 'red', [], 0, 1)).toBe(false);
  });

  it('returns false when first cell in path is not an endpoint', () => {
    const grid = initGrid(6, RED_PAIR);
    const path = [grid[2][2]]; // not an endpoint
    expect(canExtendPath(grid, 'red', path, 2, 3)).toBe(false);
  });

  it('returns true for valid orthogonal move to empty cell', () => {
    const grid = initGrid(6, RED_PAIR);
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 1, 0)).toBe(true);
  });

  it('returns true for move right', () => {
    const grid = initGrid(6, RED_PAIR);
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 0, 1)).toBe(true);
  });

  it('returns true for move left', () => {
    const grid = initGrid(6, RED_PAIR);
    const path = pathFrom(grid, [[0, 0], [0, 1], [0, 2]]); // tip at (0,2)
    expect(canExtendPath(grid, 'red', path, 0, 1)).toBe(true);
  });

  it('returns true for move up', () => {
    const grid = initGrid(6, RED_PAIR);
    const path = pathFrom(grid, [[0, 0], [1, 0], [2, 0]]); // tip at (2,0)
    expect(canExtendPath(grid, 'red', path, 1, 0)).toBe(true);
  });

  it('returns true for move down', () => {
    const grid = initGrid(6, RED_PAIR);
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 1, 0)).toBe(true);
  });

  it('returns false for diagonal move (row+1, col+1)', () => {
    const grid = initGrid(6, RED_PAIR);
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 1, 1)).toBe(false);
  });

  it('returns false for target occupied by different colour', () => {
    let grid = initGrid(6, RED_PAIR);
    grid = occupyCell(grid, 0, 1, 'blue');
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 0, 1)).toBe(false);
  });

  it('returns true for target occupied by same colour (retrace)', () => {
    let grid = initGrid(6, RED_PAIR);
    grid = occupyCell(grid, 0, 1, 'red');
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 0, 1)).toBe(true);
  });

  it('returns true for move onto own colour endpoint (completion)', () => {
    const grid = initGrid(6, RED_PAIR); // other endpoint at (0,5)
    const path = pathFrom(grid, [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]); // tip (0,4)
    expect(canExtendPath(grid, 'red', path, 0, 5)).toBe(true);
  });

  it('returns false for target out of bounds', () => {
    const grid = initGrid(6, RED_PAIR);
    const path = pathFrom(grid, [[0, 5]]); // start at the (0,5) endpoint
    expect(canExtendPath(grid, 'red', path, 0, 6)).toBe(false);
  });

  it('returns false for zero-movement (same cell as current tip)', () => {
    const grid = initGrid(6, RED_PAIR);
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 0, 0)).toBe(false);
  });

  it('returns false for step of 2 cells', () => {
    const grid = initGrid(6, RED_PAIR);
    expect(canExtendPath(grid, 'red', pathFrom(grid, [[0, 0]]), 0, 2)).toBe(false);
  });
});

describe('isPathComplete', () => {
  it('returns false for single-cell path', () => {
    expect(isPathComplete([at(0, 0)], RED_PAIR, 'red')).toBe(false);
  });

  it('returns false when end cell is not the matching endpoint', () => {
    expect(isPathComplete([at(0, 0), at(0, 3)], RED_PAIR, 'red')).toBe(false);
  });

  it('returns true when path starts at r1,c1 and ends at r2,c2', () => {
    expect(isPathComplete([at(0, 0), at(0, 1), at(0, 5)], RED_PAIR, 'red')).toBe(true);
  });

  it('returns true when path starts at r2,c2 and ends at r1,c1 (reverse)', () => {
    expect(isPathComplete([at(0, 5), at(0, 1), at(0, 0)], RED_PAIR, 'red')).toBe(true);
  });

  it("returns false when path connects wrong colour's endpoints", () => {
    // blue has no dot pair in RED_PAIR
    expect(isPathComplete([at(0, 0), at(0, 5)], RED_PAIR, 'blue')).toBe(false);
  });

  it('returns false for empty path', () => {
    expect(isPathComplete([], RED_PAIR, 'red')).toBe(false);
  });
});
