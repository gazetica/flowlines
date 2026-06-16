// PathSolver.ts (runtime)
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-008L
//
// Runtime full-coverage Numberlink solver — a bundled copy of the build-time
// scripts/PathSolver.ts `solve()` (which is Node-only/locked). Used by GameScene
// to draw the HINT ghost path and to auto-complete a GET A CLUE colour, both of
// which need a real solution path (the in-game greedy hinter only yields one cell).
//
// Algorithm: backtracking DFS over single-step head extensions with MRV colour
// ordering, head→goal reachability + all-empty-reachable pruning, and a wall-clock
// timeout. Pure (no Phaser/React). Recursion depth ≤ gridSize² ≤ 81.

export type SolverCell = { r: number; c: number };

export type SolverDotPair = {
  colour: string;
  r1: number; c1: number;
  r2: number; c2: number;
};

// colour → ordered list of cells (both endpoints included)
export type Solution = Map<string, SolverCell[]>;

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

function inBounds(n: number, r: number, c: number): boolean {
  return r >= 0 && r < n && c >= 0 && c < n;
}

/**
 * Returns one valid full-coverage solution (colour → path) or null if unsolvable
 * within timeoutMs. Default timeout kept modest so a worst-case board can't hang
 * the UI thread — the caller treats null as "feature unavailable this tap".
 */
export function solve(
  gridSize: number,
  dotPairs: SolverDotPair[],
  timeoutMs = 2500,
): Solution | null {
  const N = gridSize;
  const K = dotPairs.length;
  if (N <= 0 || K === 0) return null;

  const grid: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(-1));

  for (let i = 0; i < K; i++) {
    const d = dotPairs[i];
    if (!inBounds(N, d.r1, d.c1) || !inBounds(N, d.r2, d.c2)) return null;
    if (d.r1 === d.r2 && d.c1 === d.c2) return null;
    if (grid[d.r1][d.c1] !== -1 || grid[d.r2][d.c2] !== -1) return null;
    grid[d.r1][d.c1] = i;
    grid[d.r2][d.c2] = i;
  }

  const head: SolverCell[] = dotPairs.map((d) => ({ r: d.r1, c: d.c1 }));
  const goal: SolverCell[] = dotPairs.map((d) => ({ r: d.r2, c: d.c2 }));
  const done: boolean[] = new Array<boolean>(K).fill(false);
  const paths: SolverCell[][] = dotPairs.map((d) => [{ r: d.r1, c: d.c1 }]);

  const total = N * N;
  let filled = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] !== -1) filled++;

  const deadline = Date.now() + timeoutMs;
  let timedOut = false;

  const visited: boolean[][] = Array.from({ length: N }, () => new Array<boolean>(N).fill(false));
  const resetVisited = () => {
    for (let r = 0; r < N; r++) visited[r].fill(false);
  };

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

  const headReachesGoal = (i: number): boolean => {
    const h = head[i];
    const g = goal[i];
    resetVisited();
    const stack: SolverCell[] = [h];
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

  const allEmptyReachable = (): boolean => {
    resetVisited();
    const stack: SolverCell[] = [];
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

    if (best === -1) return filled === total;
    if (bestMoves.length === 0) return false;

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
