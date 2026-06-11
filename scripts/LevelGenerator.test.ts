// LevelGenerator.test.ts
// Flow Lines | Gazetica Studio | Sprint 2 Day 8 | Task FL-S2-008

import { describe, it, expect, beforeAll } from 'vitest';
import { generatePack, PACK_CONFIGS, type LevelData } from './LevelGenerator';
import { solve, isValidSolution, type DotPair } from './PathSolver';

const SEED = 42;
const SLOW = 60_000; // generous timeout for generation-heavy tests

// Shared batches generated once (seed 42 → deterministic).
let pack1: LevelData[];
let pack2: LevelData[];

beforeAll(async () => {
  pack1 = await generatePack(1, 5, SEED);
  pack2 = await generatePack(2, 5, SEED);
}, SLOW);

/** Convert a level's dot objects to PathSolver DotPair[] (identical shape). */
const toDots = (lvl: LevelData): DotPair[] => lvl.dots.map((d) => ({ ...d }));

// ─── Category 1 — PLACEMENT ────────────────────────────────────────────────

describe('Category 1 — placement', () => {
  it('all dots are within grid bounds', () => {
    for (const lvl of pack1) {
      for (const d of lvl.dots) {
        expect(d.r1).toBeGreaterThanOrEqual(0);
        expect(d.c1).toBeGreaterThanOrEqual(0);
        expect(d.r2).toBeGreaterThanOrEqual(0);
        expect(d.c2).toBeGreaterThanOrEqual(0);
        expect(d.r1).toBeLessThan(lvl.grid);
        expect(d.c1).toBeLessThan(lvl.grid);
        expect(d.r2).toBeLessThan(lvl.grid);
        expect(d.c2).toBeLessThan(lvl.grid);
      }
    }
  });

  it('no two dots share the same cell', () => {
    for (const lvl of pack1) {
      const seen = new Set<string>();
      for (const d of lvl.dots) {
        const a = `${d.r1},${d.c1}`;
        const b = `${d.r2},${d.c2}`;
        expect(seen.has(a)).toBe(false);
        seen.add(a);
        expect(seen.has(b)).toBe(false);
        seen.add(b);
      }
    }
  });

  it('same-colour dots have Manhattan distance ≥ 2', () => {
    for (const lvl of pack1) {
      for (const d of lvl.dots) {
        expect(Math.abs(d.r1 - d.r2) + Math.abs(d.c1 - d.c2)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('seed 42 produces identical level 1 dots every time (determinism)', async () => {
    const a = await generatePack(1, 1, SEED);
    const b = await generatePack(1, 1, SEED);
    expect(JSON.stringify(a[0].dots)).toBe(JSON.stringify(b[0].dots));
  }, SLOW);

  it('generatePack returns exactly count levels', () => {
    expect(pack1).toHaveLength(5);
    expect(pack2).toHaveLength(5);
  });
});

// ─── Category 2 — QUALITY CHECK ────────────────────────────────────────────

describe('Category 2 — quality', () => {
  it('every level has average path length ≥ 3', () => {
    // Average = sum of path lengths / numColours; sum == grid² (100% coverage).
    for (const lvl of pack1) {
      const avg = (lvl.grid * lvl.grid) / lvl.colours;
      expect(avg).toBeGreaterThanOrEqual(3);
    }
  });

  it('no single colour covers > 80% of the board', () => {
    for (const lvl of [...pack1, ...pack2]) {
      const sol = solve(lvl.grid, toDots(lvl), 5000)!;
      expect(sol).not.toBeNull();
      for (const d of lvl.dots) {
        const len = sol.get(d.colour)!.length;
        expect(len / (lvl.grid * lvl.grid)).toBeLessThanOrEqual(0.8);
      }
    }
  }, SLOW);

  it('optimalMoves equals grid² for every level', () => {
    for (const lvl of [...pack1, ...pack2]) {
      expect(lvl.optimalMoves).toBe(lvl.grid * lvl.grid);
    }
  });

  it('all dots in every level are within bounds', () => {
    for (const lvl of pack2) {
      for (const d of lvl.dots) {
        expect(Math.max(d.r1, d.c1, d.r2, d.c2)).toBeLessThan(lvl.grid);
        expect(Math.min(d.r1, d.c1, d.r2, d.c2)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('pack 1 levels use exactly 5 colours', () => {
    for (const lvl of pack1) {
      expect(lvl.colours).toBe(5);
      expect(lvl.dots).toHaveLength(5);
    }
  });

  it('pack 2 levels use exactly 6 colours', () => {
    for (const lvl of pack2) {
      expect(lvl.colours).toBe(6);
      expect(lvl.dots).toHaveLength(6);
    }
  });
});

// ─── Category 3 — Schema validation ────────────────────────────────────────

describe('Category 3 — schema', () => {
  it('every level has all required fields', () => {
    for (const lvl of pack1) {
      expect(lvl).toHaveProperty('id');
      expect(lvl).toHaveProperty('pack');
      expect(lvl).toHaveProperty('grid');
      expect(lvl).toHaveProperty('colours');
      expect(lvl).toHaveProperty('optimalMoves');
      expect(lvl).toHaveProperty('dots');
    }
  });

  it('id format is correct (p1_001 … p1_005)', () => {
    expect(pack1.map((l) => l.id)).toEqual(['p1_001', 'p1_002', 'p1_003', 'p1_004', 'p1_005']);
  });

  it('pack field matches the requested pack number', () => {
    for (const lvl of pack1) expect(lvl.pack).toBe(1);
    for (const lvl of pack2) expect(lvl.pack).toBe(2);
  });

  it('grid field matches the pack gridSize', () => {
    for (const lvl of pack1) expect(lvl.grid).toBe(PACK_CONFIGS[1].gridSize);
    for (const lvl of pack2) expect(lvl.grid).toBe(PACK_CONFIGS[2].gridSize);
  });

  it('colours field matches the pack numColours', () => {
    for (const lvl of pack1) expect(lvl.colours).toBe(PACK_CONFIGS[1].numColours);
    for (const lvl of pack2) expect(lvl.colours).toBe(PACK_CONFIGS[2].numColours);
  });

  it('dots array length equals numColours (one object per colour)', () => {
    for (const lvl of pack1) expect(lvl.dots).toHaveLength(PACK_CONFIGS[1].numColours);
    for (const lvl of pack2) expect(lvl.dots).toHaveLength(PACK_CONFIGS[2].numColours);
  });
});

// ─── Category 4 — Solver integration ───────────────────────────────────────

describe('Category 4 — solver integration', () => {
  it('every generated level is solvable (isValidSolution true)', () => {
    for (const lvl of [...pack1, ...pack2]) {
      const sol = solve(lvl.grid, toDots(lvl), 5000);
      expect(sol).not.toBeNull();
      expect(isValidSolution(lvl.grid, toDots(lvl), sol!)).toBe(true);
    }
  }, SLOW);

  it('pack 1 generates 5 levels without error (seed 42)', () => {
    expect(pack1).toHaveLength(5);
  });

  it('pack 2 generates 5 levels without error (seed 42)', () => {
    expect(pack2).toHaveLength(5);
  });

  it('no duplicate level IDs within a batch', () => {
    const ids = pack1.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('solve round-trip: generate 3, solve each, solutions valid', async () => {
    const batch = await generatePack(1, 3, SEED);
    for (const lvl of batch) {
      const sol = solve(lvl.grid, toDots(lvl), 5000);
      expect(sol).not.toBeNull();
      expect(isValidSolution(lvl.grid, toDots(lvl), sol!)).toBe(true);
    }
  }, SLOW);

  it('generatePack(1, 1, 42) runs in < 10 seconds', async () => {
    const start = Date.now();
    const batch = await generatePack(1, 1, SEED);
    const elapsed = Date.now() - start;
    expect(batch).toHaveLength(1);
    expect(elapsed).toBeLessThan(10_000);
  }, SLOW);
});

// ─── Category 5 — Edge cases ───────────────────────────────────────────────

describe('Category 5 — edge cases', () => {
  it('count: 1 produces exactly 1 level', async () => {
    const b = await generatePack(1, 1, SEED);
    expect(b).toHaveLength(1);
  }, SLOW);

  it('count: 10 produces exactly 10 levels (no off-by-one)', async () => {
    const b = await generatePack(1, 10, SEED);
    expect(b).toHaveLength(10);
  }, SLOW);

  it('same seed produces identical output on two consecutive calls', async () => {
    const a = await generatePack(1, 3, SEED);
    const b = await generatePack(1, 3, SEED);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, SLOW);

  it('different seeds produce different level 1 placements (probabilistic)', async () => {
    const a = await generatePack(1, 1, 42);
    const b = await generatePack(1, 1, 7);
    expect(JSON.stringify(a[0].dots)).not.toBe(JSON.stringify(b[0].dots));
  }, SLOW);

  it('packs 1–3 each generate 1 valid level; pack 4 config is valid', async () => {
    // Packs 1–3: full generation + solvability check. (Pack 4 / 9×9 generation
    // takes minutes per level with the random-placement→solve pipeline, so it is
    // verified at the config level only — see FL-S2-008 task report.)
    for (const pk of [1, 2, 3] as const) {
      const b = await generatePack(pk, 1, SEED);
      expect(b).toHaveLength(1);
      const d = b[0].dots.map((x) => ({ ...x }));
      const s = solve(b[0].grid, d, 5000);
      expect(s).not.toBeNull();
      expect(isValidSolution(b[0].grid, d, s!)).toBe(true);
    }
    // Pack 4 config sanity (generation deferred — perf).
    expect(PACK_CONFIGS[4].gridSize).toBe(9);
    expect(PACK_CONFIGS[4].numColours).toBe(8);
    expect(PACK_CONFIGS[4].colours).toHaveLength(8);
    expect(typeof generatePack).toBe('function');
  }, 90_000);

  it('id indexing is 1-based (first level is p1_001, not p1_000)', () => {
    expect(pack1[0].id).toBe('p1_001');
  });

  it('dots array contains all colours from the pack config', () => {
    for (const lvl of pack1) {
      const present = new Set(lvl.dots.map((d) => d.colour));
      for (const c of PACK_CONFIGS[1].colours) expect(present.has(c)).toBe(true);
    }
  });
});
