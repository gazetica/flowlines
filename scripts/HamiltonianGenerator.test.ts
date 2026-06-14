// HamiltonianGenerator.test.ts
// Flow Lines | Gazetica Studio | Sprint 5A | Task FL-S5A-025
//
// Covers the Hamiltonian tiling generator: path generation (full coverage, no
// repeats), segment splitting (min length, contiguity, determinism), dot-pair
// extraction, full pack generation (shape + ids), and solvability + performance.

import { describe, it, expect } from 'vitest';
import {
  generateHamiltonianPath,
  splitPathIntoSegments,
  segmentsToDotPairs,
  generatePackHamiltonian,
  mulberry32,
  type Cell,
} from './HamiltonianGenerator';
import { solve, isValidSolution } from './PathSolver';

// Boustrophedon ("snake") path — a guaranteed Hamiltonian path for split/extract
// unit tests (same construction pattern PathSolver.test.ts uses).
function boustrophedon(N: number): Cell[] {
  const path: Cell[] = [];
  for (let r = 0; r < N; r++) {
    if (r % 2 === 0) for (let c = 0; c < N; c++) path.push({ r, c });
    else for (let c = N - 1; c >= 0; c--) path.push({ r, c });
  }
  return path;
}

function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

describe('Hamiltonian path (Phase 1)', () => {
  it('1. 4×4 grid → path length 16', () => {
    expect(generateHamiltonianPath(4, mulberry32(1)).length).toBe(16);
  });
  it('2. 6×6 grid → path length 36', () => {
    expect(generateHamiltonianPath(6, mulberry32(2)).length).toBe(36);
  });
  it('3. 8×8 grid → path length 64', () => {
    expect(generateHamiltonianPath(8, mulberry32(3)).length).toBe(64);
  });
  it('4. 9×9 grid → path length 81', () => {
    expect(generateHamiltonianPath(9, mulberry32(4)).length).toBe(81);
  });
  it('5. no cell visited twice, every step orthogonally adjacent', () => {
    const p = generateHamiltonianPath(8, mulberry32(7));
    const seen = new Set(p.map((c) => `${c.r},${c.c}`));
    expect(seen.size).toBe(p.length);
    for (let i = 1; i < p.length; i++) expect(isAdjacent(p[i - 1], p[i])).toBe(true);
  });
});

describe('Segment splitting (Phase 2)', () => {
  it('6. 3 segments from a 9-cell path → each ≥ 3 cells', () => {
    const segs = splitPathIntoSegments(boustrophedon(3), 3, mulberry32(5));
    expect(segs.length).toBe(3);
    segs.forEach((s) => expect(s.length).toBeGreaterThanOrEqual(3));
  });
  it('7. 5 segments from a 36-cell path → no segment > 80% of 36', () => {
    const segs = splitPathIntoSegments(boustrophedon(6), 5, mulberry32(9));
    segs.forEach((s) => expect(s.length).toBeLessThanOrEqual(36 * 0.8));
  });
  it('8. 8 segments from an 81-cell path → all lengths ≥ 3', () => {
    const segs = splitPathIntoSegments(boustrophedon(9), 8, mulberry32(3));
    expect(segs.length).toBe(8);
    segs.forEach((s) => expect(s.length).toBeGreaterThanOrEqual(3));
  });
  it('9. split is contiguous: concatenated segments === original path', () => {
    const p = boustrophedon(6);
    const segs = splitPathIntoSegments(p, 5, mulberry32(11));
    expect(segs.flat()).toEqual(p);
  });
  it('10. deterministic with the same seed', () => {
    const p = boustrophedon(8);
    const a = splitPathIntoSegments(p, 7, mulberry32(42));
    const b = splitPathIntoSegments(p, 7, mulberry32(42));
    expect(a.map((s) => s.length)).toEqual(b.map((s) => s.length));
  });
});

describe('Dot pair extraction (Phase 3)', () => {
  const COLS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal'];
  it('11. each colour gets exactly one dot pair', () => {
    const segs = splitPathIntoSegments(boustrophedon(8), 7, mulberry32(1));
    const dots = segmentsToDotPairs(segs, COLS);
    expect(dots.length).toBe(7);
    expect(new Set(dots.map((d) => d.colour)).size).toBe(7);
  });
  it('12. r1/c1 is first cell, r2/c2 is last cell of each segment', () => {
    const segs = splitPathIntoSegments(boustrophedon(6), 5, mulberry32(2));
    const dots = segmentsToDotPairs(segs, COLS.slice(0, 5));
    dots.forEach((d, i) => {
      const seg = segs[i];
      expect({ r: d.r1, c: d.c1 }).toEqual(seg[0]);
      expect({ r: d.r2, c: d.c2 }).toEqual(seg[seg.length - 1]);
    });
  });
  it('13. all dot positions are within grid bounds', () => {
    const N = 9;
    const segs = splitPathIntoSegments(boustrophedon(N), 8, mulberry32(4));
    const dots = segmentsToDotPairs(segs, [...COLS, 'pink']);
    for (const d of dots) {
      for (const [r, c] of [[d.r1, d.c1], [d.r2, d.c2]] as const) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(N);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(N);
      }
    }
  });
});

describe('Full generation (Phase 5)', () => {
  it('14. generatePackHamiltonian(3, 5, 42) returns 5 levels', async () => {
    expect((await generatePackHamiltonian(3, 5, 42)).length).toBe(5);
  }, 15000);
  it('15. generatePackHamiltonian(4, 5, 42) returns 5 levels', async () => {
    expect((await generatePackHamiltonian(4, 5, 42)).length).toBe(5);
  }, 15000);
  it('16. all Pack 3 levels: grid 8, colours 7, optimalMoves 64', async () => {
    const lv = await generatePackHamiltonian(3, 5, 42);
    lv.forEach((l) => {
      expect(l.grid).toBe(8);
      expect(l.colours).toBe(7);
      expect(l.optimalMoves).toBe(64);
    });
  }, 15000);
  it('17. all Pack 4 levels: grid 9, colours 8, optimalMoves 81', async () => {
    const lv = await generatePackHamiltonian(4, 5, 42);
    lv.forEach((l) => {
      expect(l.grid).toBe(9);
      expect(l.colours).toBe(8);
      expect(l.optimalMoves).toBe(81);
    });
  }, 15000);
  it('18. level IDs are sequential p3_001…p3_005', async () => {
    const lv = await generatePackHamiltonian(3, 5, 42);
    expect(lv.map((l) => l.id)).toEqual(['p3_001', 'p3_002', 'p3_003', 'p3_004', 'p3_005']);
  }, 15000);
  it('19. generated Pack 3 dots are solvable (solve + isValidSolution)', async () => {
    const lv = await generatePackHamiltonian(3, 3, 42);
    const sol = solve(lv[0].grid, lv[0].dots, 10000);
    expect(sol).not.toBeNull();
    expect(isValidSolution(lv[0].grid, lv[0].dots, sol!)).toBe(true);
  }, 20000);
});

describe('Performance', () => {
  it('20. Pack 3, 5 levels in < 5s', async () => {
    const t = Date.now();
    await generatePackHamiltonian(3, 5, 42);
    expect(Date.now() - t).toBeLessThan(5000);
  }, 15000);
  it('21. Pack 4, 5 levels in < 10s', async () => {
    const t = Date.now();
    await generatePackHamiltonian(4, 5, 42);
    expect(Date.now() - t).toBeLessThan(10000);
  }, 20000);
});
