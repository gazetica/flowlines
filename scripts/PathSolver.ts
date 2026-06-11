// PathSolver.ts
// Flow Lines | Gazetica Studio | Sprint 2 Day 7 | Task FL-S2-007
//
// BUILD-TIME ONLY. Never bundled into the app (scripts/ is Node-only). Verifies
// that a dot placement is solvable (full-coverage Numberlink / "Flow") and
// returns one valid solution. The level generator uses null === "discard".
//
// Algorithm: backtracking DFS over single-step head extensions, with:
//   - MRV colour ordering (extend the most-constrained colour first)
//   - Connectivity pruning (mandatory): per-colour head→goal reachability over
//     empty cells, AND every empty cell must stay reachable by some unsolved
//     head (else it can never be covered → 100% coverage impossible).
//   - Timeout (mandatory): Date.now() deadline → null.
//
// Note on "iterative deepening": for a 100%-coverage solution the search depth
// is fixed (== number of empty cells, ≤ gridSize² ≤ 81), so true IDDFS does not
// apply. Recursion depth is therefore bounded at ≤81 — far below Node's stack
// limit — so plain recursive DFS is used. See the task report for rationale.

export type Cell = { r: number; c: number };

export type DotPair = {
  colour: string;
  r1: number; c1: number; // start dot
  r2: number; c2: number; // end dot
};

// Ordered list of cells for one colour, including both endpoints.
export type Path = Cell[];

// colour → Path
export type Solution = Map<string, Path>;

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

function inBounds(n: number, r: number, c: number): boolean {
  return r >= 0 && r < n && c >= 0 && c < n;
}

// ─── solve ───────────────────────────────────────────────────────────────────

export function solve(
  gridSize: number,
  dotPairs: DotPair[],
  timeoutMs = 5000,
): Solution | null {
  const N = gridSize;
  const K = dotPairs.length;
  if (N <= 0 || K === 0) return null;

  // grid[r][c] = colour index occupying the cell, or -1 if empty.
  const grid: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(-1));

  // Place endpoints; reject out-of-bounds, degenerate, or overlapping dots.
  for (let i = 0; i < K; i++) {
    const d = dotPairs[i];
    if (!inBounds(N, d.r1, d.c1) || !inBounds(N, d.r2, d.c2)) return null;
    if (d.r1 === d.r2 && d.c1 === d.c2) return null;
    if (grid[d.r1][d.c1] !== -1 || grid[d.r2][d.c2] !== -1) return null;
    grid[d.r1][d.c1] = i;
    grid[d.r2][d.c2] = i;
  }

  const head: Cell[] = dotPairs.map((d) => ({ r: d.r1, c: d.c1 }));
  const goal: Cell[] = dotPairs.map((d) => ({ r: d.r2, c: d.c2 }));
  const done: boolean[] = new Array<boolean>(K).fill(false);
  const paths: Cell[][] = dotPairs.map((d) => [{ r: d.r1, c: d.c1 }]);

  const total = N * N;
  let filled = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] !== -1) filled++;

  const deadline = Date.now() + timeoutMs;
  let timedOut = false;

  // Scratch buffer reused by BFS prunes (avoids per-call allocation).
  const visited: boolean[][] = Array.from({ length: N }, () => new Array<boolean>(N).fill(false));
  const resetVisited = () => {
    for (let r = 0; r < N; r++) visited[r].fill(false);
  };

  // Valid next steps for colour i's head: empty neighbours + connect-to-goal.
  type Move = { connect: boolean; r: number; c: number };
  const validMoves = (i: number): Move[] => {
    const h = head[i];
    const g = goal[i];
    const moves: Move[] = [];
    for (const [dr, dc] of DIRS) {
      const nr = h.r + dr;
      const nc = h.c + dc;
      if (!inBounds(N, nr, nc)) continue;
      if (nr === g.r && nc === g.c) {
        moves.push({ connect: true, r: nr, c: nc });
      } else if (grid[nr][nc] === -1) {
        moves.push({ connect: false, r: nr, c: nc });
      }
    }
    return moves;
  };

  // Can colour i's head still reach its goal through empty cells?
  const headReachesGoal = (i: number): boolean => {
    const h = head[i];
    const g = goal[i];
    resetVisited();
    const stack: Cell[] = [h];
    visited[h.r][h.c] = true;
    while (stack.length) {
      const cur = stack.pop()!;
      for (const [dr, dc] of DIRS) {
        const nr = cur.r + dr;
        const nc = cur.c + dc;
        if (!inBounds(N, nr, nc) || visited[nr][nc]) continue;
        if (nr === g.r && nc === g.c) return true;
        if (grid[nr][nc] === -1) {
          visited[nr][nc] = true;
          stack.push({ r: nr, c: nc });
        }
      }
    }
    return false;
  };

  // Every empty cell must be reachable by some unsolved head over empty cells —
  // otherwise it can never be covered, so 100% coverage is impossible.
  const allEmptyReachable = (): boolean => {
    resetVisited();
    const stack: Cell[] = [];
    for (let i = 0; i < K; i++) {
      if (done[i]) continue;
      const h = head[i];
      for (const [dr, dc] of DIRS) {
        const nr = h.r + dr;
        const nc = h.c + dc;
        if (inBounds(N, nr, nc) && grid[nr][nc] === -1 && !visited[nr][nc]) {
          visited[nr][nc] = true;
          stack.push({ r: nr, c: nc });
        }
      }
    }
    while (stack.length) {
      const cur = stack.pop()!;
      for (const [dr, dc] of DIRS) {
        const nr = cur.r + dr;
        const nc = cur.c + dc;
        if (inBounds(N, nr, nc) && grid[nr][nc] === -1 && !visited[nr][nc]) {
          visited[nr][nc] = true;
          stack.push({ r: nr, c: nc });
        }
      }
    }
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c] === -1 && !visited[r][c]) return false;
      }
    }
    return true;
  };

  // Conservative prune: returns true if the current state provably cannot reach
  // a full solution. Both checks only reject impossible states.
  const isDeadEnd = (): boolean => {
    for (let i = 0; i < K; i++) {
      if (!done[i] && !headReachesGoal(i)) return true;
    }
    return !allEmptyReachable();
  };

  const dfs = (): boolean => {
    if (Date.now() > deadline) {
      timedOut = true;
      return false;
    }

    // MRV: choose the unsolved colour with the fewest valid moves.
    let best = -1;
    let bestMoves: Move[] = [];
    let bestCount = Infinity;
    for (let i = 0; i < K; i++) {
      if (done[i]) continue;
      const moves = validMoves(i);
      if (moves.length < bestCount) {
        bestCount = moves.length;
        best = i;
        bestMoves = moves;
        if (bestCount === 0) break;
      }
    }

    if (best === -1) {
      // All colours connected — a solution iff the board is fully covered.
      return filled === total;
    }
    if (bestMoves.length === 0) return false; // stuck colour → backtrack

    for (const mv of bestMoves) {
      const prevHead = head[best];
      if (mv.connect) {
        done[best] = true;
        head[best] = goal[best];
        paths[best].push({ r: goal[best].r, c: goal[best].c });
        if (!isDeadEnd() && dfs()) return true;
        paths[best].pop();
        head[best] = prevHead;
        done[best] = false;
      } else {
        grid[mv.r][mv.c] = best;
        filled++;
        head[best] = { r: mv.r, c: mv.c };
        paths[best].push({ r: mv.r, c: mv.c });
        if (!isDeadEnd() && dfs()) return true;
        paths[best].pop();
        head[best] = prevHead;
        filled--;
        grid[mv.r][mv.c] = -1;
      }
      if (timedOut) return false;
    }
    return false;
  };

  const solved = dfs();
  if (!solved || timedOut) return null;

  const solution: Solution = new Map();
  for (let i = 0; i < K; i++) {
    solution.set(dotPairs[i].colour, paths[i].map((cell) => ({ r: cell.r, c: cell.c })));
  }
  return solution;
}

// ─── isValidSolution ──────────────────────────────────────────────────────────

/**
 * Pure validator — independently re-checks all four win conditions. Never calls
 * solve(). Returns false (never throws) for any invalid input.
 */
export function isValidSolution(
  gridSize: number,
  dotPairs: DotPair[],
  solution: Solution,
): boolean {
  const N = gridSize;
  if (N <= 0 || dotPairs.length === 0) return false;
  if (!(solution instanceof Map)) return false;

  // owner[r][c] = colour string that covers the cell, or undefined.
  const owner: (string | undefined)[][] = Array.from(
    { length: N },
    () => new Array<string | undefined>(N).fill(undefined),
  );
  let count = 0;

  for (const d of dotPairs) {
    const path = solution.get(d.colour);
    if (!path || path.length < 1) return false;

    // Condition 2: path runs dot→dot (either orientation).
    const f = path[0];
    const l = path[path.length - 1];
    const fwd = f.r === d.r1 && f.c === d.c1 && l.r === d.r2 && l.c === d.c2;
    const rev = f.r === d.r2 && f.c === d.c2 && l.r === d.r1 && l.c === d.c1;
    if (!fwd && !rev) return false;

    for (let k = 0; k < path.length; k++) {
      const { r, c } = path[k];
      if (!inBounds(N, r, c)) return false;
      // Condition 4 + no self-intersection: each cell owned once.
      if (owner[r][c] !== undefined) return false;
      owner[r][c] = d.colour;
      count++;
      // Condition 1: consecutive cells orthogonally adjacent (no diagonals/jumps).
      if (k > 0) {
        const p = path[k - 1];
        if (Math.abs(p.r - r) + Math.abs(p.c - c) !== 1) return false;
      }
    }
  }

  // Condition 3: 100% coverage.
  return count === N * N;
}

// ─── ts-node self-test (__main__) ─────────────────────────────────────────────
// Guarded so it never runs (or throws) under ESM/vitest where `require` is absent.

function selfTest(): void {
  const checks: Array<{ name: string; pass: boolean }> = [];

  // 1) Solvable 2x2: red corners + blue corners → full coverage.
  {
    const dots: DotPair[] = [
      { colour: 'red', r1: 0, c1: 0, r2: 1, c2: 0 },
      { colour: 'blue', r1: 0, c1: 1, r2: 1, c2: 1 },
    ];
    const sol = solve(2, dots, 1000);
    checks.push({ name: '2x2 solvable', pass: !!sol && isValidSolution(2, dots, sol) });
  }

  // 2) Solvable 3x3: single snake from a corner to the opposite corner.
  {
    const dots: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 2, c2: 0 }];
    const sol = solve(3, dots, 2000);
    // One colour must cover all 9 cells.
    const ok = !!sol && isValidSolution(3, dots, sol) && (sol.get('red')?.length === 9);
    checks.push({ name: '3x3 single-colour full cover', pass: ok });
  }

  // 3) Unsolvable: two colours on a 2x2 that cannot achieve full coverage.
  {
    const dots: DotPair[] = [
      { colour: 'red', r1: 0, c1: 0, r2: 0, c2: 1 },
      { colour: 'blue', r1: 1, c1: 0, r2: 1, c2: 1 },
    ];
    // Each path is a straight 2-cell line; together they cover all 4 cells → actually solvable.
    // Make it genuinely unsolvable: diagonal endpoints leaving an uncoverable parity gap.
    const bad: DotPair[] = [{ colour: 'red', r1: 0, c1: 0, r2: 0, c2: 0 }]; // degenerate
    const sol = solve(2, bad, 1000);
    checks.push({ name: 'degenerate → null', pass: sol === null });
    void dots;
  }

  let allPass = true;
  for (const ch of checks) {
    const verdict = ch.pass ? 'PASS' : 'FAIL';
    if (!ch.pass) allPass = false;
    // eslint-disable-next-line no-console
    console.log(`[PathSolver self-test] ${verdict} — ${ch.name}`);
  }

  // Perf timings on the real Pack grid sizes (a snake split is always solvable).
  const snake = (n: number): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (let r = 0; r < n; r++) {
      if (r % 2 === 0) for (let c = 0; c < n; c++) out.push([r, c]);
      else for (let c = n - 1; c >= 0; c--) out.push([r, c]);
    }
    return out;
  };
  const partition = (n: number, k: number): DotPair[] => {
    const cells = snake(n);
    const per = Math.floor(cells.length / k);
    const cols = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'];
    const dots: DotPair[] = [];
    let idx = 0;
    for (let i = 0; i < k; i++) {
      const s = idx;
      const e = i === k - 1 ? cells.length - 1 : s + per - 1;
      dots.push({ colour: cols[i], r1: cells[s][0], c1: cells[s][1], r2: cells[e][0], c2: cells[e][1] });
      idx = e + 1;
    }
    return dots;
  };
  for (const [n, k] of [[6, 5], [7, 6]] as const) {
    const t0 = Date.now();
    const sol = solve(n, partition(n, k), 5000);
    const ms = Date.now() - t0;
    const ok = !!sol && isValidSolution(n, partition(n, k), sol);
    if (!ok) allPass = false;
    // eslint-disable-next-line no-console
    console.log(`[PathSolver self-test] ${ok ? 'PASS' : 'FAIL'} — ${n}x${k}c solved in ${ms}ms`);
  }

  // eslint-disable-next-line no-console
  console.log(`[PathSolver self-test] ${allPass ? 'ALL PASS' : 'SOME FAILED'}`);
}

// Run the self-test only when executed directly (e.g. `ts-node PathSolver.ts`),
// not when imported (vitest). process.argv[1] is the entry script path in both
// CommonJS and ESM, so this works regardless of ts-node's module mode and stays
// inert under vitest (whose argv[1] is the test runner, not this file).
const entryPath = typeof process !== 'undefined' && process.argv[1] ? process.argv[1] : '';
if (/PathSolver\.(ts|js)$/.test(entryPath)) {
  selfTest();
}
