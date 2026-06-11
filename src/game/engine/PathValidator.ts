// PathValidator.ts
// Flow Lines | Gazetica Studio | Sprint 1 Day 3 | Task FL-S1-003
//
// Higher-level path validation built on GridEngine primitives. Answers
// "Can the player extend their current path to this cell?" and "Is the path
// complete (dot-to-matching-dot)?". Pure logic — no Phaser, no React.

import {
  isPathValid,
  type Grid,
  type Cell,
  type Colour,
  type DotPair,
} from './GridEngine';

/**
 * Returns true only if the player can legally extend `currentPath` (drawn in
 * `colour`) to (toRow, toCol). Requires: a path started from this colour's
 * endpoint, an in-bounds single orthogonal step from the current tip, and a
 * target that is empty or already this colour (never a different colour).
 */
export function canExtendPath(
  grid: Grid,
  colour: Colour,
  currentPath: Cell[],
  toRow: number,
  toCol: number,
): boolean {
  // 1. Must have started from an endpoint of this colour.
  if (currentPath.length === 0) return false;
  const start = currentPath[0];
  if (!start.isEndpoint || start.colour !== colour) return false;

  // 2-5. Bounds, single orthogonal step (excludes diagonal, jumps, and
  // zero-movement), and no different-colour conflict — all enforced by
  // GridEngine.isPathValid from the current tip.
  const tip = currentPath[currentPath.length - 1];
  return isPathValid(grid, colour, tip.row, tip.col, toRow, toCol);
}

/**
 * Returns true if `currentPath` runs from one endpoint of this colour's dot
 * pair to the other (in either direction) and has at least 2 cells.
 */
export function isPathComplete(
  currentPath: Cell[],
  dots: DotPair[],
  colour: Colour,
): boolean {
  if (currentPath.length < 2) return false;

  const dot = dots.find((d) => d.colour === colour);
  if (!dot) return false;

  const first = currentPath[0];
  const last = currentPath[currentPath.length - 1];

  const isEnd1 = (c: Cell) => c.row === dot.r1 && c.col === dot.c1;
  const isEnd2 = (c: Cell) => c.row === dot.r2 && c.col === dot.c2;

  // Forward: first at endpoint 1, last at endpoint 2.
  if (isEnd1(first) && isEnd2(last)) return true;
  // Reverse: first at endpoint 2, last at endpoint 1.
  if (isEnd2(first) && isEnd1(last)) return true;

  return false;
}
