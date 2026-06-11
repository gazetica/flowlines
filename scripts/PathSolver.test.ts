// PathSolver.test.ts
// Flow Lines | Gazetica Studio | Sprint 2 Day 7 | Task FL-S2-007

import { describe, it, expect } from 'vitest';
import { solve, isValidSolution, type Cell, type DotPair, type Solution } from './PathSolver';

const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'];

const p = (colour: string, r1: number, c1: number, r2: number, c2: number): DotPair =>
  ({ colour, r1, c1, r2, c2 });

/** Boustrophedon (snake) Hamiltonian path, row-major. */
function rowSnake(N: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < N; r++) {
    if (r % 2 === 0) for (let c = 0; c < N; c++) cells.push([r, c]);
    else for (let c = N - 1; c >= 0; c--) cells.push([r, c]);
  }
  return cells;
}

/** Boustrophedon snake, column-major (a distinct Hamiltonian path). */
function colSnake(N: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let c = 0; c < N; c++) {
    if (c % 2 === 0) for (let r = 0; r < N; r++) cells.push([r, c]);
    else for (let r = N - 1; r >= 0; r--) cells.push([r, c]);
  }
  return cells;
}

/**
 * Split a Hamiltonian path into K contiguous segments and use each segment's
 * ends as a dot pair. The split IS a full-coverage solution, so the resulting
 * config is GUARANTEED solvable (each segment length ≥ 2 when K ≤ ⌊len/2⌋).
 */
function partition(cells: Array<[number, number]>, K: number): DotPair[] {
  const per = Math.floor(cells.length / K);
  const dots: DotPair[] = [];
  let idx = 0;
  for (let i = 0; i < K; i++) {
    const start = idx;
    const end = i === K - 1 ? cells.length - 1 : start + per - 1;
    dots.push(p(COLOURS[i], cells[start][0], cells[start][1], cells[end][0], cells[end][1]));
    idx = end + 1;
  }
  return dots;
}

function expectSolvable(N: number, dots: DotPair[], timeoutMs = 5000): Solution {
  const sol = solve(N, dots, timeoutMs);
  expect(sol).not.toBeNull();
  expect(isValidSolution(N, dots, sol as Solution)).toBe(true);
  return sol as Solution;
}

// ─── Category 1 — Trivial 3×3 ──────────────────────────────────────────────

describe('Category 1 — trivial 3×3', () => {
  it('1 colour, full-coverage snake → solution exists', () => {
    expectSolvable(3, partition(rowSnake(3), 1));
  });

  it('1 colour, parity-impossible endpoints → null', () => {
    // 9 cells (odd): a Hamiltonian path must start & end on the majority
    // (even-parity) colour. Both endpoints odd-parity → impossible.
    expect(solve(3, [p('red', 0, 1, 1, 0)], 2000)).toBeNull();
  });

  it('2 colours, both connectable + full coverage → solution exists', () => {
    expectSolvable(3, partition(rowSnake(3), 2));
  });
});

// ─── Category 2 — Known-solvable 4×4 (≥8) ──────────────────────────────────

describe('Category 2 — solvable 4×4', () => {
  for (let K = 1; K <= 8; K++) {
    it(`rowSnake 4×4 split into ${K} colour(s)`, () => {
      expectSolvable(4, partition(rowSnake(4), K));
    });
  }
  // A second 3-colour case (distinct construction) — satisfies "≥2 with 3 colours".
  it('colSnake 4×4 split into 3 colours', () => {
    expectSolvable(4, partition(colSnake(4), 3));
  });
});

// ─── Category 3 — Known-unsolvable (≥5) ────────────────────────────────────

describe('Category 3 — unsolvable', () => {
  it('degenerate dot (start === end) → null', () => {
    expect(solve(3, [p('red', 1, 1, 1, 1)], 1000)).toBeNull();
  });

  it('endpoint out of bounds → null', () => {
    expect(solve(3, [p('red', 0, 0, 3, 0)], 1000)).toBeNull();
  });

  it('overlapping endpoints (two colours share a cell) → null', () => {
    expect(solve(3, [p('red', 0, 0, 1, 1), p('blue', 1, 1, 2, 2)], 1000)).toBeNull();
  });

  it('2×2 single colour, same-parity diagonal → null (no Hamiltonian path)', () => {
    expect(solve(2, [p('red', 0, 0, 1, 1)], 1000)).toBeNull();
  });

  it('3×3 single colour, both endpoints odd-parity → null', () => {
    expect(solve(3, [p('red', 0, 1, 1, 0)], 2000)).toBeNull();
  });

  it('4×4 single colour, same-parity endpoints → null (no Hamiltonian path)', () => {
    // (0,0) parity 0 and (2,0) parity 0; 16 cells even → endpoints must differ.
    expect(solve(4, [p('red', 0, 0, 2, 0)], 3000)).toBeNull();
  });

  it('2×2 two diagonal colours → null (paths cannot fit in 4 cells)', () => {
    expect(solve(2, [p('red', 0, 0, 1, 1), p('blue', 0, 1, 1, 0)], 1000)).toBeNull();
  });
});

// ─── Category 4 — 6×6 (≥10, ≥3 with 5 colours) ─────────────────────────────

describe('Category 4 — solvable 6×6', () => {
  for (let K = 2; K <= 8; K++) {
    it(`rowSnake 6×6 split into ${K} colour(s)`, () => {
      expectSolvable(6, partition(rowSnake(6), K));
    });
  }
  // Three 5-colour (Pack 1 colour count) cases, distinct constructions.
  it('rowSnake 6×6, 5 colours', () => {
    expectSolvable(6, partition(rowSnake(6), 5));
  });
  it('colSnake 6×6, 5 colours', () => {
    expectSolvable(6, partition(colSnake(6), 5));
  });
  it('reversed rowSnake 6×6, 5 colours', () => {
    expectSolvable(6, partition([...rowSnake(6)].reverse(), 5));
  });
});

// ─── Category 5 — isValidSolution unit tests (≥8) ──────────────────────────

describe('Category 5 — isValidSolution', () => {
  const dots2 = [p('red', 0, 0, 1, 0), p('blue', 0, 1, 1, 1)];
  const good: Solution = new Map<string, Cell[]>([
    ['red', [{ r: 0, c: 0 }, { r: 1, c: 0 }]],
    ['blue', [{ r: 0, c: 1 }, { r: 1, c: 1 }]],
  ]);

  it('correct full-coverage solution → true', () => {
    expect(isValidSolution(2, dots2, good)).toBe(true);
  });

  it('non-continuous path (gap between cells) → false', () => {
    const sol: Solution = new Map([
      ['red', [{ r: 0, c: 0 }, { r: 1, c: 1 }]], // (0,0)->(1,1) not adjacent
      ['blue', [{ r: 0, c: 1 }, { r: 1, c: 0 }]],
    ]);
    expect(isValidSolution(2, dots2, sol)).toBe(false);
  });

  it('missing a colour → false', () => {
    const sol: Solution = new Map([['red', [{ r: 0, c: 0 }, { r: 1, c: 0 }]]]);
    expect(isValidSolution(2, dots2, sol)).toBe(false);
  });

  it('two paths share a cell → false', () => {
    const sol: Solution = new Map([
      ['red', [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }]],
      ['blue', [{ r: 0, c: 1 }, { r: 1, c: 1 }]], // (1,1) shared
    ]);
    expect(isValidSolution(2, dots2, sol)).toBe(false);
  });

  it('< 100% coverage → false', () => {
    const dots = [p('red', 0, 0, 0, 1)];
    const sol: Solution = new Map([['red', [{ r: 0, c: 0 }, { r: 0, c: 1 }]]]); // only 2/4
    expect(isValidSolution(2, dots, sol)).toBe(false);
  });

  it('wrong start/end cell → false', () => {
    const sol: Solution = new Map([
      ['red', [{ r: 0, c: 0 }, { r: 1, c: 0 }]],
      ['blue', [{ r: 1, c: 1 }, { r: 0, c: 1 }]], // blue dots are (0,1)-(1,1); ends ok but...
    ]);
    // Make blue genuinely wrong: end at (0,0) which isn't a blue endpoint.
    const bad: Solution = new Map([
      ['red', [{ r: 0, c: 0 }, { r: 1, c: 0 }]],
      ['blue', [{ r: 0, c: 1 }, { r: 0, c: 0 }]],
    ]);
    expect(isValidSolution(2, dots2, sol)).toBe(true); // sanity: reversed order is valid
    expect(isValidSolution(2, dots2, bad)).toBe(false);
  });

  it('diagonal step within a path → false', () => {
    const dots = [p('red', 0, 0, 1, 1)];
    const sol: Solution = new Map([['red', [{ r: 0, c: 0 }, { r: 1, c: 1 }]]]);
    expect(isValidSolution(2, dots, sol)).toBe(false);
  });

  it('empty solution map → false', () => {
    expect(isValidSolution(2, dots2, new Map())).toBe(false);
  });

  it('out-of-bounds cell in path → false', () => {
    const dots = [p('red', 0, 0, 0, 1)];
    const sol: Solution = new Map([['red', [{ r: 0, c: 0 }, { r: 0, c: 9 }]]]);
    expect(isValidSolution(2, dots, sol)).toBe(false);
  });
});

// ─── Category 6 — Timeout (≥2) ─────────────────────────────────────────────

describe('Category 6 — timeout', () => {
  it('impossible 6×6, timeoutMs:100 → null, returns quickly', () => {
    const start = Date.now();
    const result = solve(6, [p('red', 0, 0, 2, 0)], 100); // same-parity single colour
    const elapsed = Date.now() - start;
    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(800);
  });

  it('impossible 7×7, timeoutMs:100 → null, returns quickly', () => {
    const start = Date.now();
    const result = solve(7, [p('red', 0, 1, 1, 0)], 100); // odd-parity single colour
    const elapsed = Date.now() - start;
    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(800);
  });
});

// ─── Category 7 — Performance smoke (≥3) ───────────────────────────────────

describe('Category 7 — performance', () => {
  it('6×6 5-colour solvable in < 2000ms', () => {
    const dots = partition(rowSnake(6), 5);
    const start = Date.now();
    const sol = solve(6, dots, 2000);
    const elapsed = Date.now() - start;
    expect(sol).not.toBeNull();
    expect(isValidSolution(6, dots, sol as Solution)).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });

  it('7×7 6-colour solvable in < 5000ms', () => {
    const dots = partition(rowSnake(7), 6);
    const start = Date.now();
    const sol = solve(7, dots, 5000);
    const elapsed = Date.now() - start;
    expect(sol).not.toBeNull();
    expect(isValidSolution(7, dots, sol as Solution)).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  });

  it('6×6 5-colour repeated 3× (no variance issue)', () => {
    const dots = partition(rowSnake(6), 5);
    for (let i = 0; i < 3; i++) {
      const sol = solve(6, dots, 2000);
      expect(sol).not.toBeNull();
      expect(isValidSolution(6, dots, sol as Solution)).toBe(true);
    }
  });
});
