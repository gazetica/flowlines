// LevelGenerator.ts
// Flow Lines | Gazetica Studio | Sprint 2 Day 8 | Task FL-S2-008
//
// BUILD-TIME ONLY (Node, never bundled). Generates solvable, quality-checked
// Flow Lines levels via a 5-phase pipeline built on PathSolver:
//   PLACEMENT → SOLVE → VALIDATE → QUALITY CHECK → STORE
//
// Reproducible when given a seed (mulberry32 PRNG). Progress logs go to stderr
// (stdout is reserved for piped JSON output).

import { solve, isValidSolution, type DotPair, type Solution } from './PathSolver';

export const PACK_CONFIGS = {
  1: { gridSize: 6, numColours: 5, colours: ['red', 'blue', 'green', 'yellow', 'purple'] },
  2: { gridSize: 7, numColours: 6, colours: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] },
  3: { gridSize: 8, numColours: 7, colours: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal'] },
  4: { gridSize: 9, numColours: 8, colours: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'] },
} as const;

export type PackNumber = 1 | 2 | 3 | 4;

export type LevelData = {
  id: string;           // "p1_001" — pack number + 3-digit 1-based index
  pack: number;         // 1 | 2 | 3 | 4
  grid: number;         // gridSize
  colours: number;      // numColours
  optimalMoves: number; // total path cells = gridSize² (100% coverage)
  dots: Array<{
    colour: string;
    r1: number; c1: number; // start dot (0-indexed row, col)
    r2: number; c2: number; // end dot
  }>;
};

// mulberry32 — small, fast, seedable PRNG (matches the algorithm used elsewhere).
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Quality-check constants (PHASE 4).
const MIN_AVG_PATH_LENGTH = 3;
const MAX_SINGLE_PATH_FRACTION = 0.8;

// PHASE 1 — randomly place two dots per colour with the placement rules.
// Returns DotPair[] or null if a valid placement isn't found within 100 tries.
function tryPlacement(
  N: number,
  colours: ReadonlyArray<string>,
  rand: () => number,
): DotPair[] | null {
  const randCell = () => ({ r: Math.floor(rand() * N), c: Math.floor(rand() * N) });

  for (let attempt = 0; attempt < 100; attempt++) {
    const used = new Set<string>();
    const dots: DotPair[] = [];
    let ok = true;

    for (const colour of colours) {
      // First dot: any free cell.
      let a: { r: number; c: number } | null = null;
      for (let t = 0; t < 50 && !a; t++) {
        const cand = randCell();
        if (!used.has(`${cand.r},${cand.c}`)) a = cand;
      }
      if (!a) { ok = false; break; }

      // Second dot: free, distinct, Manhattan distance ≥ 2 from the first.
      let b: { r: number; c: number } | null = null;
      for (let t = 0; t < 50 && !b; t++) {
        const cand = randCell();
        const key = `${cand.r},${cand.c}`;
        if (used.has(key)) continue;
        if (cand.r === a.r && cand.c === a.c) continue;
        if (Math.abs(cand.r - a.r) + Math.abs(cand.c - a.c) < 2) continue;
        b = cand;
      }
      if (!b) { ok = false; break; }

      used.add(`${a.r},${a.c}`);
      used.add(`${b.r},${b.c}`);
      dots.push({ colour, r1: a.r, c1: a.c, r2: b.r, c2: b.c });
    }

    if (ok) return dots;
  }
  return null;
}

// PHASE 4 — quality gates. Returns true if the solution is "good enough".
function passesQuality(N: number, colours: ReadonlyArray<string>, solution: Solution): boolean {
  const lengths = colours.map((c) => solution.get(c)?.length ?? 0);
  if (lengths.some((l) => l === 0)) return false;

  const avg = lengths.reduce((a, b) => a + b, 0) / colours.length;
  if (avg < MIN_AVG_PATH_LENGTH) return false; // Rule A

  const maxFraction = Math.max(...lengths) / (N * N);
  if (maxFraction > MAX_SINGLE_PATH_FRACTION) return false; // Rule B

  return true;
}

/**
 * Generate `count` valid levels for a pack. Deterministic when `seed` is given;
 * otherwise seeds from Date.now() and logs the seed to stderr for reproducibility.
 */
export async function generatePack(
  packNumber: PackNumber,
  count: number,
  seed?: number,
): Promise<LevelData[]> {
  const cfg = PACK_CONFIGS[packNumber];
  const N = cfg.gridSize;
  const usedSeed = seed ?? Date.now();
  if (seed === undefined) {
    process.stderr.write(`[pack ${packNumber}] no seed provided — using ${usedSeed}\n`);
  }
  const rand = mulberry32(usedSeed);

  const results: LevelData[] = [];
  const packStart = Date.now();

  while (results.length < count) {
    const n = results.length + 1;
    process.stderr.write(`[pack ${packNumber}] generating level ${n}/${count}...\n`);
    const attemptStart = Date.now();
    let attempts = 0;
    let level: LevelData | null = null;

    while (!level) {
      attempts++;

      // PHASE 1 — PLACEMENT
      const dots = tryPlacement(N, cfg.colours, rand);
      if (!dots) continue;

      // PHASE 2 — SOLVE
      const solution = solve(N, dots, 5000);
      if (!solution) continue;

      // PHASE 3 — VALIDATE (double-check solve())
      if (!isValidSolution(N, dots, solution)) continue;

      // PHASE 4 — QUALITY CHECK
      if (!passesQuality(N, cfg.colours, solution)) continue;

      // PHASE 5 — STORE
      level = {
        id: `p${packNumber}_${String(n).padStart(3, '0')}`,
        pack: packNumber,
        grid: N,
        colours: cfg.numColours,
        optimalMoves: N * N,
        dots,
      };
    }

    const ms = Date.now() - attemptStart;
    process.stderr.write(`[pack ${packNumber}] level ${n}/${count} done (attempt ${attempts}, ${ms}ms)\n`);
    results.push(level);
  }

  process.stderr.write(
    `[pack ${packNumber}] done — ${count} levels generated in ${Date.now() - packStart}ms\n`,
  );
  return results;
}
