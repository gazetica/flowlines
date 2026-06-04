// GridEngine.test.ts
// Numtap | Gazetica Studio | Sprint 2 Day 1 | Task T-001
//
// Vitest unit tests for GridEngine. Run with: npx vitest run src/game/GridEngine.test.ts
// Covers every public method and every modifier behaviour.

import { describe, it, expect, beforeEach } from 'vitest';
import { GridEngine } from '../game/GridEngine';
import type { Cell } from '../game/GridEngine';

// Helper: tap every number in expected order so the grid completes.
function completeGrid(engine: GridEngine): void {
  const n = engine.getGrid().length;
  const total = n * n;
  // For each expected value, find the cell holding it and tap it.
  for (let step = 0; step < total; step++) {
    const target = engine.getExpectedNext();
    const grid = engine.getGrid();
    let found = false;
    for (let r = 0; r < n && !found; r++) {
      for (let c = 0; c < n && !found; c++) {
        if (grid[r][c].value === target) {
          engine.validateTap(r, c);
          found = true;
        }
      }
    }
  }
}

// Helper: locate the cell currently holding a given value.
function findValue(engine: GridEngine, value: number): { row: number; col: number } {
  const grid = engine.getGrid();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].value === value) {
        return { row: r, col: c };
      }
    }
  }
  throw new Error(`value ${value} not found in grid`);
}

// Helper: flatten a grid into a single array of cells.
function flatten(grid: Cell[][]): Cell[] {
  return grid.reduce((acc, row) => acc.concat(row), [] as Cell[]);
}

describe('GridEngine', () => {
  // ---------------------------------------------------------------------
  // Group 1: generateGrid()
  // ---------------------------------------------------------------------
  describe('generateGrid()', () => {
    const sizes = [3, 4, 5, 6, 7];

    it('grid has correct dimensions (N rows, N cols each)', () => {
      for (const n of sizes) {
        const engine = new GridEngine(n, 'none', 'ascending');
        const grid = engine.getGrid();
        expect(grid.length).toBe(n);
        for (const row of grid) {
          expect(row.length).toBe(n);
        }
      }
    });

    it('total cell count = N² for each grid size (3,4,5,6,7)', () => {
      for (const n of sizes) {
        const engine = new GridEngine(n, 'none', 'ascending');
        expect(flatten(engine.getGrid()).length).toBe(n * n);
      }
    });

    it('all numbers 1 to N² present — no duplicates, no missing', () => {
      for (const n of sizes) {
        const engine = new GridEngine(n, 'none', 'ascending');
        const values = flatten(engine.getGrid()).map((c) => c.value).sort((a, b) => a - b);
        const expected = Array.from({ length: n * n }, (_, i) => i + 1);
        expect(values).toEqual(expected);
      }
    });

    it('no cell is tapped after generation', () => {
      const engine = new GridEngine(5, 'none', 'ascending');
      expect(flatten(engine.getGrid()).every((c) => c.tapped === false)).toBe(true);
    });

    it('no cell is revealed after generation', () => {
      const engine = new GridEngine(5, 'none', 'ascending');
      expect(flatten(engine.getGrid()).every((c) => c.revealed === false)).toBe(true);
    });

    it('expectedNext is 1 for ascending direction', () => {
      const engine = new GridEngine(5, 'none', 'ascending');
      expect(engine.getExpectedNext()).toBe(1);
    });

    it('expectedNext is N² for descending direction', () => {
      for (const n of sizes) {
        const engine = new GridEngine(n, 'none', 'descending');
        expect(engine.getExpectedNext()).toBe(n * n);
      }
    });
  });

  // ---------------------------------------------------------------------
  // Group 2: validateTap()
  // ---------------------------------------------------------------------
  describe('validateTap()', () => {
    let engine: GridEngine;
    beforeEach(() => {
      engine = new GridEngine(4, 'none', 'ascending');
    });

    it("correct tap on expectedNext returns 'CORRECT'", () => {
      const { row, col } = findValue(engine, 1);
      expect(engine.validateTap(row, col)).toBe('CORRECT');
    });

    it('after correct tap, cell.tapped is true', () => {
      const { row, col } = findValue(engine, 1);
      engine.validateTap(row, col);
      expect(engine.getGrid()[row][col].tapped).toBe(true);
    });

    it('after correct tap, expectedNext advances by 1 (ascending)', () => {
      const { row, col } = findValue(engine, 1);
      engine.validateTap(row, col);
      expect(engine.getExpectedNext()).toBe(2);
    });

    it('after correct tap, expectedNext decreases by 1 (descending)', () => {
      const desc = new GridEngine(4, 'none', 'descending');
      const top = 16;
      const { row, col } = findValue(desc, top);
      desc.validateTap(row, col);
      expect(desc.getExpectedNext()).toBe(top - 1);
    });

    it("wrong tap returns 'WRONG' and does NOT change expectedNext", () => {
      const { row, col } = findValue(engine, 2); // 1 is expected, not 2
      expect(engine.validateTap(row, col)).toBe('WRONG');
      expect(engine.getExpectedNext()).toBe(1);
    });

    it('wrong tap does NOT set cell.tapped', () => {
      const { row, col } = findValue(engine, 2);
      engine.validateTap(row, col);
      expect(engine.getGrid()[row][col].tapped).toBe(false);
    });

    it("tapping an already-tapped cell returns 'ALREADY_TAPPED'", () => {
      const { row, col } = findValue(engine, 1);
      engine.validateTap(row, col); // CORRECT
      expect(engine.validateTap(row, col)).toBe('ALREADY_TAPPED');
    });

    it('tapping all N² numbers in order sets isComplete() to true', () => {
      completeGrid(engine);
      expect(engine.isComplete()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Group 3: isComplete()
  // ---------------------------------------------------------------------
  describe('isComplete()', () => {
    it('returns false on fresh grid', () => {
      const engine = new GridEngine(4, 'none', 'ascending');
      expect(engine.isComplete()).toBe(false);
    });

    it('returns false after partial taps', () => {
      const engine = new GridEngine(4, 'none', 'ascending');
      const { row, col } = findValue(engine, 1);
      engine.validateTap(row, col);
      expect(engine.isComplete()).toBe(false);
    });

    it('returns true only when ALL cells tapped', () => {
      const engine = new GridEngine(3, 'none', 'ascending');
      completeGrid(engine);
      expect(engine.isComplete()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Group 4: onShuffleTick() — shuffle modifier
  // ---------------------------------------------------------------------
  describe('onShuffleTick() — shuffle modifier', () => {
    it("returns false when modifier is 'none'", () => {
      const engine = new GridEngine(4, 'none', 'ascending');
      expect(engine.onShuffleTick(10000)).toBe(false);
    });

    it('returns false when delta < 8000ms accumulated', () => {
      const engine = new GridEngine(4, 'shuffle', 'ascending');
      expect(engine.onShuffleTick(5000)).toBe(false);
      expect(engine.onShuffleTick(2000)).toBe(false); // total 7000 < 8000
    });

    it('returns true when accumulated delta >= 8000ms', () => {
      const engine = new GridEngine(4, 'shuffle', 'ascending');
      expect(engine.onShuffleTick(4000)).toBe(false);
      expect(engine.onShuffleTick(4000)).toBe(true); // total 8000
    });

    it('after shuffle: tapped cells do not move (their values unchanged)', () => {
      const engine = new GridEngine(4, 'shuffle', 'ascending');
      // Tap 1, 2, 3 in order.
      for (const v of [1, 2, 3]) {
        const { row, col } = findValue(engine, v);
        engine.validateTap(row, col);
      }
      // Record tapped cell positions + values.
      const before = flatten(engine.getGrid()).filter((c) => c.tapped);
      const beforeMap = before.map((c) => ({ row: c.row, col: c.col, value: c.value }));

      engine.onShuffleTick(8000); // trigger reshuffle

      const after = flatten(engine.getGrid()).filter((c) => c.tapped);
      for (const b of beforeMap) {
        const match = after.find((c) => c.row === b.row && c.col === b.col);
        expect(match).toBeDefined();
        expect(match!.value).toBe(b.value);
      }
    });

    it('after shuffle: all numbers still present (no duplicates, no missing)', () => {
      const engine = new GridEngine(5, 'shuffle', 'ascending');
      engine.onShuffleTick(8000);
      const values = flatten(engine.getGrid()).map((c) => c.value).sort((a, b) => a - b);
      const expected = Array.from({ length: 25 }, (_, i) => i + 1);
      expect(values).toEqual(expected);
    });

    it('after shuffle: expectedNext is unchanged', () => {
      const engine = new GridEngine(4, 'shuffle', 'ascending');
      const { row, col } = findValue(engine, 1);
      engine.validateTap(row, col); // expectedNext now 2
      const before = engine.getExpectedNext();
      engine.onShuffleTick(8000);
      expect(engine.getExpectedNext()).toBe(before);
    });
  });

  // ---------------------------------------------------------------------
  // Group 5: onPointerMove() — fog modifier
  // ---------------------------------------------------------------------
  describe('onPointerMove() — fog modifier', () => {
    it("does nothing when modifier is 'none'", () => {
      const engine = new GridEngine(5, 'none', 'ascending');
      engine.onPointerMove(2, 2);
      expect(flatten(engine.getGrid()).every((c) => c.revealed === false)).toBe(true);
    });

    it('reveals cells within 1-cell Chebyshev distance', () => {
      const engine = new GridEngine(5, 'fog', 'ascending');
      engine.onPointerMove(2, 2);
      const grid = engine.getGrid();
      // The 3x3 block centered on (2,2) should be revealed.
      for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
          expect(grid[r][c].revealed).toBe(true);
        }
      }
    });

    it('does not reveal cells further than 1 cell away', () => {
      const engine = new GridEngine(5, 'fog', 'ascending');
      engine.onPointerMove(2, 2);
      const grid = engine.getGrid();
      // (0,0) is Chebyshev distance 2 from (2,2).
      expect(grid[0][0].revealed).toBe(false);
      // (4,4) is distance 2.
      expect(grid[4][4].revealed).toBe(false);
      // (0,2) is distance 2.
      expect(grid[0][2].revealed).toBe(false);
    });

    it('does not un-reveal already-revealed cells', () => {
      const engine = new GridEngine(5, 'fog', 'ascending');
      engine.onPointerMove(2, 2); // reveals around (2,2)
      const revealedAtBefore = engine.getGrid()[2][2].revealedAt;
      engine.onPointerMove(0, 0); // far from (2,2)
      const cell = engine.getGrid()[2][2];
      expect(cell.revealed).toBe(true);
      // revealedAt for an already-revealed cell is not overwritten.
      expect(cell.revealedAt).toBe(revealedAtBefore);
    });

    it('does not affect tapped cells', () => {
      const engine = new GridEngine(5, 'fog', 'ascending');
      // Tap value 1 wherever it is.
      const { row, col } = findValue(engine, 1);
      engine.validateTap(row, col); // tapped cell becomes revealed=true
      const tappedRevealedAt = engine.getGrid()[row][col].revealedAt;
      // Move pointer onto the tapped cell.
      engine.onPointerMove(row, col);
      const cell = engine.getGrid()[row][col];
      expect(cell.tapped).toBe(true);
      // onPointerMove only touches untapped+hidden cells, so revealedAt
      // of the tapped cell (null, since validateTap doesn't set it) stays.
      expect(cell.revealedAt).toBe(tappedRevealedAt);
    });
  });

  // ---------------------------------------------------------------------
  // Group 6: onCountdownTick() — countdown modifier
  // ---------------------------------------------------------------------
  describe('onCountdownTick() — countdown modifier', () => {
    it("returns empty array when modifier is 'none'", () => {
      const engine = new GridEngine(4, 'none', 'ascending');
      expect(engine.onCountdownTick(100)).toEqual([]);
    });

    it('does not hide cells revealed less than 3000ms ago', () => {
      const engine = new GridEngine(4, 'countdown', 'ascending');
      // getGrid() returns a deep copy, so to exercise the countdown timing logic
      // we reach the engine's internal grid via a typed cast and arrange a cell
      // that was revealed recently (countdown has no public reveal entry point).
      const internal = (engine as unknown as { grid: Cell[][] }).grid;
      internal[0][0].revealed = true;
      internal[0][0].tapped = false;
      internal[0][0].revealedAt = Date.now() - 1000; // 1s ago
      const hidden = engine.onCountdownTick(16);
      expect(hidden.length).toBe(0);
      expect(internal[0][0].revealed).toBe(true);
    });

    it('hides cells revealed more than 3000ms ago', () => {
      const engine = new GridEngine(4, 'countdown', 'ascending');
      const internal = (engine as unknown as { grid: Cell[][] }).grid;
      internal[0][0].revealed = true;
      internal[0][0].tapped = false;
      internal[0][0].revealedAt = Date.now() - 4000; // 4s ago
      const hidden = engine.onCountdownTick(16);
      expect(hidden.length).toBe(1);
      expect(hidden[0].row).toBe(0);
      expect(hidden[0].col).toBe(0);
    });

    it('hidden cells have revealed=false and revealedAt=null', () => {
      const engine = new GridEngine(4, 'countdown', 'ascending');
      const internal = (engine as unknown as { grid: Cell[][] }).grid;
      internal[1][1].revealed = true;
      internal[1][1].tapped = false;
      internal[1][1].revealedAt = Date.now() - 5000;
      engine.onCountdownTick(16);
      expect(internal[1][1].revealed).toBe(false);
      expect(internal[1][1].revealedAt).toBe(null);
    });

    it('tapped cells are never hidden by countdown', () => {
      const engine = new GridEngine(4, 'countdown', 'ascending');
      const internal = (engine as unknown as { grid: Cell[][] }).grid;
      internal[2][2].revealed = true;
      internal[2][2].tapped = true; // tapped
      internal[2][2].revealedAt = Date.now() - 9000; // long ago
      const hidden = engine.onCountdownTick(16);
      expect(hidden.length).toBe(0);
      expect(internal[2][2].revealed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Group 7: getDisplayValue() — mirror modifier
  // ---------------------------------------------------------------------
  describe('getDisplayValue() — mirror modifier', () => {
    function cellWith(value: number): Cell {
      return { row: 0, col: 0, value, display: value, tapped: false, revealed: false, revealedAt: null };
    }

    it("returns same value when modifier is 'none'", () => {
      const engine = new GridEngine(4, 'none', 'ascending');
      expect(engine.getDisplayValue(cellWith(12))).toBe(12);
      expect(engine.getDisplayValue(cellWith(49))).toBe(49);
    });

    it('returns digit-reversed value when modifier is mirror (12→21, 7→7, 49→94)', () => {
      const engine = new GridEngine(7, 'mirror', 'ascending');
      expect(engine.getDisplayValue(cellWith(12))).toBe(21);
      expect(engine.getDisplayValue(cellWith(7))).toBe(7);
      expect(engine.getDisplayValue(cellWith(49))).toBe(94);
    });

    it('single digit numbers return same value (no change)', () => {
      const engine = new GridEngine(7, 'mirror', 'ascending');
      for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        expect(engine.getDisplayValue(cellWith(v))).toBe(v);
      }
    });
  });

  // ---------------------------------------------------------------------
  // Group 8: reset()
  // ---------------------------------------------------------------------
  describe('reset()', () => {
    it('after tapping several cells, reset() starts fresh', () => {
      const engine = new GridEngine(4, 'none', 'ascending');
      for (const v of [1, 2, 3]) {
        const { row, col } = findValue(engine, v);
        engine.validateTap(row, col);
      }
      engine.reset();
      expect(flatten(engine.getGrid()).every((c) => c.tapped === false)).toBe(true);
    });

    it('after reset, isComplete() returns false', () => {
      const engine = new GridEngine(3, 'none', 'ascending');
      completeGrid(engine);
      expect(engine.isComplete()).toBe(true);
      engine.reset();
      expect(engine.isComplete()).toBe(false);
    });

    it('after reset, expectedNext is 1 (ascending) or N² (descending)', () => {
      const asc = new GridEngine(4, 'none', 'ascending');
      completeGrid(asc);
      asc.reset();
      expect(asc.getExpectedNext()).toBe(1);

      const desc = new GridEngine(4, 'none', 'descending');
      const { row, col } = findValue(desc, 16);
      desc.validateTap(row, col);
      desc.reset();
      expect(desc.getExpectedNext()).toBe(16);
    });
  });

  describe('difficulty sequence (T-004B)', () => {
    it('easy → ascending [1..9]', () => {
      const e = new GridEngine(3, 'none', 'ascending', 'easy');
      expect(e.getSequence()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
    it('pro → descending [9..1]', () => {
      const e = new GridEngine(3, 'none', 'descending', 'pro');
      expect(e.getSequence()).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });
    it('expert → permutation of 1..9 (each exactly once)', () => {
      const seq = new GridEngine(3, 'none', 'ascending', 'expert').getSequence();
      expect(seq).toHaveLength(9);
      expect([...seq].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
    it('expert → two grids differ (shuffle active)', () => {
      const a = new GridEngine(7, 'none', 'ascending', 'expert').getSequence();
      const b = new GridEngine(7, 'none', 'ascending', 'expert').getSequence();
      expect(a).not.toEqual(b);
    });
    it('expert → getLastTappedValue tracks the previously tapped value', () => {
      const e = new GridEngine(3, 'none', 'ascending', 'expert');
      const seq = e.getSequence();
      expect(e.getLastTappedValue()).toBeNull();
      const cell = e.getGrid().flat().find((c) => c.value === seq[0])!;
      e.validateTap(cell.row, cell.col);
      expect(e.getLastTappedValue()).toBe(seq[0]);
    });
  });
});
