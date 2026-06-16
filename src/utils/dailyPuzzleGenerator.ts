// dailyPuzzleGenerator.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-010 / 010b
//
// Seeded daily-puzzle generator. Daily challenges are NOT drawn from any pack —
// they are produced at runtime from a UTC-date seed so every player worldwide
// gets the same two puzzles for a given calendar day (one Campaign, one Classic).
//
// 010b: puzzles are now GUARANTEED FULL-COVERAGE SOLVABLE. We use the Hamiltonian
// tiling algorithm (a runtime port of the locked build-time scripts/Hamiltonian-
// Generator — same accepted pattern as the runtime PathSolver copy):
//   1. Build a random Hamiltonian path covering every cell once (→ 100% coverage).
//   2. Split it into K contiguous segments (one per colour).
//   3. Each segment's endpoints become that colour's dot pair.
// Any such split is a valid Flow Lines solution by construction — no solver search.

import type { LevelData } from '../game/engine/LevelManager';

export type DailyMode = 'daily_campaign' | 'daily_classic';

/** Deterministic 32-bit PRNG. Same seed → same sequence. */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two distinct seeds for the same UTC date — one per challenge. */
export function getDailySeed(suffix: 'campaign' | 'classic'): number {
  const now = new Date();
  const dateStr = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  const base = parseInt(dateStr, 10);
  return suffix === 'campaign' ? base * 31 : base * 37;
}

// Engine colour keys — MUST match skin.pathColors / GridEngine `Colour` exactly.
// (Brief listed 'violet'; the engine has no such key — it is 'purple'.)
const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'] as const;

export interface DailyDot {
  colour: string;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

type Cell = { r: number; c: number };
const DIRS: ReadonlyArray<readonly [number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ─── Hamiltonian path (Warnsdorff-ordered backtracking DFS) ──────────────────
function countUnvisitedNeighbours(r: number, c: number, N: number, visited: boolean[][]): number {
  let cnt = 0;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited[nr][nc]) cnt++;
  }
  return cnt;
}

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
  opts.sort((a, b) => a.deg - b.deg || a.key - b.key);
  for (const o of opts) {
    if (walk(o.r, o.c, N, total, visited, path, rng, budget)) return true;
  }
  visited[r][c] = false;
  path.pop();
  return false;
}

function generateHamiltonianPath(gridSize: number, rng: () => number): Cell[] {
  const N = gridSize;
  const total = N * N;
  for (let attempt = 0; attempt < 500; attempt++) {
    const visited: boolean[][] = Array.from({ length: N }, () => new Array<boolean>(N).fill(false));
    const path: Cell[] = [];
    const startR = Math.floor(rng() * N);
    const startC = Math.floor(rng() * N);
    if (walk(startR, startC, N, total, visited, path, rng, { steps: 0, max: 200000 })) return path;
  }
  throw new Error(`generateHamiltonianPath: no path for ${gridSize}×${gridSize}`);
}

// ─── Split into K contiguous segments (each ≥3, none > 80% of the board) ─────
function splitPathIntoSegments(path: Cell[], numColours: number, rng: () => number): Cell[][] | null {
  const L = path.length;
  const K = numColours;
  const minSeg = Math.max(3, Math.floor(L / K / 2));
  const maxSeg = Math.floor(L * 0.8);
  const extra = L - K * minSeg;
  if (extra < 0) return null;
  const varianceFeasible = extra >= 3;

  for (let retry = 0; retry < 50; retry++) {
    const lengths = new Array<number>(K).fill(minSeg);
    for (let i = 0; i < extra; i++) lengths[Math.floor(rng() * K)]++;

    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    if (maxLen > maxSeg) continue;
    if (varianceFeasible && maxLen - minLen < 3) continue;

    const segs: Cell[][] = [];
    let pos = 0;
    for (let i = 0; i < K; i++) { segs.push(path.slice(pos, pos + lengths[i])); pos += lengths[i]; }
    return segs;
  }
  return null;
}

/**
 * Generate `numColours` solvable dot pairs on a `gridSize × gridSize` board from
 * `seed`. The dots are the endpoints of a full-coverage Hamiltonian tiling, so a
 * 100%-coverage solution is guaranteed to exist. Deterministic for a given seed.
 */
export function generateDailyDots(seed: number, gridSize: number, numColours: number): DailyDot[] {
  const rng = mulberry32(seed);
  const colours = COLOURS.slice(0, numColours);

  for (let attempt = 0; attempt < 200; attempt++) {
    const path = generateHamiltonianPath(gridSize, rng);
    const segments = splitPathIntoSegments(path, numColours, rng);
    if (!segments) continue; // unsplittable → fresh path
    return segments.map((seg, i) => ({
      colour: colours[i],
      r1: seg[0].r, c1: seg[0].c,
      r2: seg[seg.length - 1].r, c2: seg[seg.length - 1].c,
    }));
  }
  throw new Error(`generateDailyDots: no solvable layout for ${gridSize}×${gridSize}/${numColours}`);
}

/**
 * Build a runtime LevelData for today's daily puzzle. pack=0 marks it as daily
 * (not from any pack). Campaign = 120s timer; Classic = 12-move budget.
 */
export function buildDailyLevelConfig(mode: DailyMode): LevelData {
  const seed = getDailySeed(mode === 'daily_campaign' ? 'campaign' : 'classic');
  const grid = 7;
  const colours = 6;
  const dots = generateDailyDots(seed, grid, colours);
  return {
    id: `daily_${mode}_${seed}`,
    pack: 0,
    grid,
    colours,
    optimalMoves: grid * grid, // full-coverage solution length
    difficulty: 'medium',
    timeLimit: 120,
    classicMoveLimit: 12,
    dots,
  };
}
