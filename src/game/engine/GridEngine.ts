// GridEngine.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 2 | Task FL-S1-002
//
// Core data structure for the Flow Lines grid. Manages the NxN grid of cells,
// tracks which cells are occupied by which colour paths, and validates whether
// a path move is legal.
//
// Pure data logic. ZERO Phaser imports. ZERO React imports. ZERO rendering APIs.

import type { PathColour } from '../../styles/skin';

// ─── Types ──────────────────────────────────────────────────────────────

// Colour string — must match keys in skin.pathColors exactly. Kept structurally
// identical to PathColour from skin.ts; the assertion below guards against drift.
export type Colour = 'red' | 'blue' | 'green' | 'yellow' | 'purple'
                   | 'orange' | 'teal' | 'pink';

// Compile-time guard: if Colour and skin's PathColour ever diverge, this type
// resolves to `never` and the assignment below fails to compile.
type _ColourInSync = Colour extends PathColour
  ? (PathColour extends Colour ? true : never)
  : never;
const _colourSync: _ColourInSync = true;
void _colourSync;

// A single grid cell.
export interface Cell {
  row:        number;        // 0-indexed from top
  col:        number;        // 0-indexed from left
  colour:     Colour | null; // null = empty, string = occupied by this colour
  isEndpoint: boolean;       // true if this cell is a dot endpoint
  isOccupied: boolean;       // true if any path runs through this cell
}

// A dot pair from level JSON — two endpoints of the same colour.
export interface DotPair {
  colour: Colour;
  r1: number; c1: number;    // first endpoint position
  r2: number; c2: number;    // second endpoint position
}

// The full grid — 2D array of cells, [row][col].
export type Grid = Cell[][];

// ─── Construction ─────────────────────────────────────────────────────────

/**
 * Creates and returns a fresh NxN grid. All cells start empty; each DotPair's
 * two endpoints are marked with their colour, isEndpoint and isOccupied.
 */
export function initGrid(N: number, dots: DotPair[]): Grid {
  const grid: Grid = [];
  for (let row = 0; row < N; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < N; col++) {
      rowCells.push({
        row,
        col,
        colour: null,
        isEndpoint: false,
        isOccupied: false,
      });
    }
    grid.push(rowCells);
  }

  for (const dot of dots) {
    for (const [r, c] of [[dot.r1, dot.c1], [dot.r2, dot.c2]] as const) {
      if (isCellInBounds(grid, r, c)) {
        const cell = grid[r][c];
        cell.colour = dot.colour;
        cell.isEndpoint = true;
        cell.isOccupied = true;
      }
    }
  }

  return grid;
}

// ─── Queries (non-mutating) ─────────────────────────────────────────────────

/**
 * Returns true if (row, col) exists within the grid bounds.
 */
export function isCellInBounds(grid: Grid, row: number, col: number): boolean {
  const size = grid.length;
  if (row < 0 || col < 0) return false;
  if (row >= size) return false;
  // grid is square, but guard against the row's own length to be safe.
  const cols = grid[row]?.length ?? size;
  return col < cols;
}

/**
 * Returns true only if the move from (fromRow,fromCol) to (toRow,toCol) is a
 * legal single orthogonal step into a cell that is empty or already this colour.
 */
export function isPathValid(
  grid: Grid,
  colour: Colour,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): boolean {
  // 1. Target must be in bounds.
  if (!isCellInBounds(grid, toRow, toCol)) return false;

  const rowDelta = Math.abs(toRow - fromRow);
  const colDelta = Math.abs(toCol - fromCol);

  // 2 & 4. Exactly one orthogonal step — no diagonal, no jumps, no stay-in-place.
  const horizontalStep = toRow === fromRow && colDelta === 1;
  const verticalStep   = toCol === fromCol && rowDelta === 1;
  if (!horizontalStep && !verticalStep) return false;

  // 3. Target must not belong to a different colour.
  const target = grid[toRow][toCol];
  if (target.colour !== null && target.colour !== colour) return false;

  return true;
}

/**
 * Returns all cells currently occupied by the given colour (endpoints included).
 */
export function getPathCells(grid: Grid, colour: Colour): Cell[] {
  const cells: Cell[] = [];
  for (const rowCells of grid) {
    for (const cell of rowCells) {
      if (cell.isOccupied && cell.colour === colour) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

/**
 * Returns the total number of occupied cells. Used by CoverageCalc (Day 3).
 */
export function getCoveredCellCount(grid: Grid): number {
  let count = 0;
  for (const rowCells of grid) {
    for (const cell of rowCells) {
      if (cell.isOccupied) count++;
    }
  }
  return count;
}

/**
 * Returns true if every DotPair has a continuous same-colour path connecting
 * its two endpoints. Uses BFS over orthogonally-adjacent cells of the colour.
 */
export function areAllDotsConnected(grid: Grid, dots: DotPair[]): boolean {
  for (const dot of dots) {
    if (!isDotConnected(grid, dot)) return false;
  }
  return true;
}

function isDotConnected(grid: Grid, dot: DotPair): boolean {
  const { colour, r1, c1, r2, c2 } = dot;

  // Both endpoints must be occupied by this colour to even begin.
  if (!isCellInBounds(grid, r1, c1) || !isCellInBounds(grid, r2, c2)) return false;
  if (grid[r1][c1].colour !== colour) return false;
  if (grid[r2][c2].colour !== colour) return false;

  const key = (r: number, c: number) => `${r},${c}`;
  const visited = new Set<string>([key(r1, c1)]);
  const queue: Array<[number, number]> = [[r1, c1]];
  const steps: ReadonlyArray<readonly [number, number]> = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === r2 && c === c2) return true;

    for (const [dr, dc] of steps) {
      const nr = r + dr;
      const nc = c + dc;
      if (!isCellInBounds(grid, nr, nc)) continue;
      const k = key(nr, nc);
      if (visited.has(k)) continue;
      const cell = grid[nr][nc];
      if (cell.colour !== colour) continue;
      visited.add(k);
      queue.push([nr, nc]);
    }
  }

  return false;
}

// ─── Mutations (return new Grid, never mutate input) ────────────────────────

/**
 * Returns a new Grid with (row, col) set to the given colour and occupied.
 * isEndpoint is preserved. Out-of-bounds coordinates return a copy unchanged.
 */
export function occupyCell(grid: Grid, row: number, col: number, colour: Colour): Grid {
  const next = cloneGrid(grid);
  if (isCellInBounds(next, row, col)) {
    next[row][col].colour = colour;
    next[row][col].isOccupied = true;
  }
  return next;
}

/**
 * Returns a new Grid with all non-endpoint cells of the given colour cleared.
 * Endpoint cells of that colour are left unchanged (endpoints are permanent).
 */
export function clearPath(grid: Grid, colour: Colour): Grid {
  const next = cloneGrid(grid);
  for (const rowCells of next) {
    for (const cell of rowCells) {
      if (cell.colour === colour && !cell.isEndpoint) {
        cell.colour = null;
        cell.isOccupied = false;
      }
    }
  }
  return next;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function cloneGrid(grid: Grid): Grid {
  return grid.map((rowCells) => rowCells.map((cell) => ({ ...cell })));
}
