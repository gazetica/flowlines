// HamiltonianGenerator.ts
// Flow Lines | Gazetica Studio | Sprint 5A | Task FL-S5A-025
//
// BUILD-TIME ONLY (scripts/ is Node-only — never bundled). A second, faster
// level generator for the large grids (Pack 3 8×8, Pack 4 9×9) where the
// random-placement→solve pipeline in LevelGenerator.ts is impractical (~19s/
// level for 8×8, >3min for 9×9).
//
// Algorithm — Hamiltonian tiling:
//   1. Generate a random Hamiltonian path covering every cell once (→ 100%
//      coverage by construction).
//   2. Split the path into K contiguous segments (one per colour).
//   3. Each segment's first/last cells become that colour's dot pair.
// Any such split is a valid Flow Lines solution by construction, so NO solver
// search is needed — verification is an O(N²) check of the known segments
// (isValidSolution), never a timeout-prone solve(). LevelGenerator.ts is
// untouched; this lives alongside it.

import { isValidSolution, type DotPair } from './PathSolver';
import { PACK_CONFIGS, type LevelData, type PackNumber } from './LevelGenerator';

export type Cell = { r: number; c: number };

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

// Local copy of the project PRNG (LevelGenerator's is not exported). Seedable.
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Phase 1 — random Hamiltonian path ───────────────────────────────────────

function countUnvisitedNeighbours(r: number, c: number, N: number, visited: boolean[][]): number {
  let cnt = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited[nr][nc]) cnt++;
  }
  return cnt;
}

/** Backtracking DFS with Warnsdorff ordering (fewest-onward-moves first, random
 *  tiebreak). Recursion depth ≤ N² ≤ 81 — well under Node's stack limit. */
function walk(
  r: number, c: number, N: number, total: number,
  visited: boolean[][], path: Cell[], rng: () => number,
  budget: { steps: number; max: number },
): boolean {
  visited[r][c] = true;
  path.push({ r, c });
  if (path.length === total) return true;
  if (++budget.steps > budget.max) { visited[r][c] = false; path.pop(); return false; }

  const opts: Array<{ r: number; c: number; deg: number; key: number }> = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited[nr][nc]) {
      opts.push({ r: nr, c: nc, deg: countUnvisitedNeighbours(nr, nc, N, visited), key: rng() });
    }
  }
  // Warnsdorff: ascending onward-degree, random tiebreak.
  opts.sort((a, b) => a.deg - b.deg || a.key - b.key);
  for (const o of opts) {
    if (walk(o.r, o.c, N, total, visited, path, rng, budget)) return true;
  }
  visited[r][c] = false;
  path.pop();
  return false;
}

export function generateHamiltonianPath(gridSize: number, rng: () => number): Cell[] {
  const N = gridSize;
  const total = N * N;
  for (let attempt = 0; attempt < 500; attempt++) {
    const visited: boolean[][] = Array.from({ length: N }, () => new Array<boolean>(N).fill(false));
    const path: Cell[] = [];
    const startR = Math.floor(rng() * N);
    const startC = Math.floor(rng() * N);
    const budget = { steps: 0, max: 200000 };
    if (walk(startR, startC, N, total, visited, path, rng, budget)) return path;
  }
  throw new Error(`generateHamiltonianPath: no path for ${gridSize}×${gridSize} within 500 attempts`);
}

// ─── Phase 2 — split into K contiguous segments ──────────────────────────────

/** Split a Hamiltonian path into `numColours` contiguous segments. Each segment
 *  is seeded with a minimum length (≥3, no trivial freebies), then the remaining
 *  cells are distributed randomly — this guarantees the minimum + exact coverage
 *  without the flakiness of pure random cut points. Quality gates: none > 80% of
 *  the board, and length variance ≥ 3 when the path is long enough to allow it
 *  (the "monotonous" filter from the difficulty audit — relevant for 8×8/9×9).
 *  Throws after 50 retries so the caller can regenerate the whole path. */
export function splitPathIntoSegments(
  path: Cell[],
  numColours: number,
  rng: () => number,
): Cell[][] {
  const L = path.length;
  const K = numColours;
  const minSeg = Math.max(3, Math.floor(L / K / 2)); // ≥3 hard floor
  const maxSeg = Math.floor(L * 0.8);
  const extra = L - K * minSeg;
  if (extra < 0) throw new Error(`splitPathIntoSegments: path too short (${L}) for ${K} segments of ≥${minSeg}`);
  // Variance ≥3 is only achievable when there's slack beyond the minimums.
  const varianceFeasible = extra >= 3;

  for (let retry = 0; retry < 50; retry++) {
    const lengths = new Array<number>(K).fill(minSeg);
    for (let i = 0; i < extra; i++) lengths[Math.floor(rng() * K)]++;

    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    if (maxLen > maxSeg) continue;                              // one colour dominates
    if (varianceFeasible && maxLen - minLen < 3) continue;      // monotonous

    const segs: Cell[][] = [];
    let pos = 0;
    for (let i = 0; i < K; i++) {
      segs.push(path.slice(pos, pos + lengths[i]));
      pos += lengths[i];
    }
    return segs;
  }
  throw new Error(`splitPathIntoSegments: no valid ${numColours}-split after 50 retries`);
}

// ─── Phase 3 — dot pairs from segment endpoints ──────────────────────────────

export function segmentsToDotPairs(segments: Cell[][], colours: readonly string[]): LevelData['dots'] {
  return segments.map((seg, i) => ({
    colour: colours[i],
    r1: seg[0].r, c1: seg[0].c,
    r2: seg[seg.length - 1].r, c2: seg[seg.length - 1].c,
  }));
}

// ─── Phase 5 — quality scoring (gates already enforced in the split) ─────────

export function qualityCheck(segments: Cell[][], gridSize: number, numColours: number): boolean {
  if (segments.length !== numColours) return false;
  const lengths = segments.map((s) => s.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / numColours;
  if (avg < 3) return false;
  if (Math.max(...lengths) > gridSize * gridSize * 0.8) return false;
  if (Math.max(...lengths) - Math.min(...lengths) < 3) return false;
  return true;
}

/** Phase 4 — verify by construction: the segments ARE the solution, so build the
 *  Solution map and run the O(N²) isValidSolution (no solver search / timeout). */
function verifyByConstruction(
  N: number, dots: LevelData['dots'], segments: Cell[][], colours: readonly string[],
): boolean {
  const sol = new Map<string, Cell[]>();
  segments.forEach((seg, i) => sol.set(colours[i], seg));
  return isValidSolution(N, dots as DotPair[], sol);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generatePackHamiltonian(
  packNumber: PackNumber,
  count: number,
  seed?: number,
): Promise<LevelData[]> {
  const cfg = PACK_CONFIGS[packNumber];
  const N = cfg.gridSize;
  const usedSeed = seed ?? Date.now();
  if (seed === undefined) {
    process.stderr.write(`[pack ${packNumber} hamiltonian] no seed provided — using ${usedSeed}\n`);
  }
  const rng = mulberry32(usedSeed);

  const results: LevelData[] = [];
  const packStart = Date.now();

  while (results.length < count) {
    const n = results.length + 1;
    process.stderr.write(`[pack ${packNumber} hamiltonian] generating level ${n}/${count}...\n`);
    const t0 = Date.now();
    let level: LevelData | null = null;
    let attempts = 0;

    while (!level) {
      attempts++;
      const path = generateHamiltonianPath(N, rng);
      let segments: Cell[][];
      try {
        segments = splitPathIntoSegments(path, cfg.numColours, rng);
      } catch {
        continue; // unsplittable path → regenerate a fresh Hamiltonian path
      }
      if (!qualityCheck(segments, N, cfg.numColours)) continue;
      const dots = segmentsToDotPairs(segments, cfg.colours);
      if (!verifyByConstruction(N, dots, segments, cfg.colours)) continue; // bug guard
      level = {
        id: `p${packNumber}_${String(n).padStart(3, '0')}`,
        pack: packNumber,
        grid: N,
        colours: cfg.numColours,
        optimalMoves: N * N,
        dots,
      };
    }

    process.stderr.write(`[pack ${packNumber} hamiltonian] level ${n}/${count} done (attempt ${attempts}, ${Date.now() - t0}ms)\n`);
    results.push(level);
  }

  process.stderr.write(`[pack ${packNumber} hamiltonian] done — ${count} levels in ${Date.now() - packStart}ms\n`);
  return results;
}
