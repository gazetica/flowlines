// GameScene.countdown.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task B-010
//
// Pure-function tests for the countdown partial-reveal selection. The rest of the
// countdown behaviour lives in the Phaser scene (view layer) and is covered by the
// device check; only selectCountdownVisibleTiles() is extracted as testable.

import { describe, it, expect, vi } from 'vitest';
import type { Cell } from '../game/GridEngine';

// GameScene.ts imports Phaser, whose real module-init draws to a canvas and throws
// under jsdom. We only test the pure selectCountdownVisibleTiles() export, so stub
// Phaser with just the Scene base class the GameScene class needs to `extends`.
vi.mock('phaser', () => ({ default: { Scene: class {} } }));

import { selectCountdownVisibleTiles } from './GameScene';

// Build an n×n grid, values 1..n² row-major, all untapped unless listed in `tapped`.
function buildGrid(n: number, tapped: number[] = []): Cell[][] {
  const grid: Cell[][] = [];
  let v = 1;
  for (let r = 0; r < n; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < n; c++) {
      row.push({
        row: r,
        col: c,
        value: v,
        display: v,
        tapped: tapped.includes(v),
        revealed: false,
        revealedAt: null,
      });
      v++;
    }
    grid.push(row);
  }
  return grid;
}

// "row,col" key for a 1-indexed row-major value on an n×n grid.
const keyForValue = (v: number, n: number) => `${Math.floor((v - 1) / n)},${(v - 1) % n}`;

describe('selectCountdownVisibleTiles (B-010)', () => {
  it('1. 4×4 ascending: visible count = 8', () => {
    expect(selectCountdownVisibleTiles(buildGrid(4), 4, 'ascending').size).toBe(8);
  });

  it('2. 4×4 ascending: value 1 is always visible', () => {
    for (let i = 0; i < 25; i++) {
      const vis = selectCountdownVisibleTiles(buildGrid(4), 4, 'ascending');
      expect(vis.has(keyForValue(1, 4))).toBe(true);
    }
  });

  it('3. 5×5 ascending: visible count = 13', () => {
    expect(selectCountdownVisibleTiles(buildGrid(5), 5, 'ascending').size).toBe(13);
  });

  it('4. 5×5 ascending: value 1 always visible', () => {
    for (let i = 0; i < 25; i++) {
      expect(selectCountdownVisibleTiles(buildGrid(5), 5, 'ascending').has(keyForValue(1, 5))).toBe(true);
    }
  });

  it('5. 7×7 descending: visible count = 25', () => {
    expect(selectCountdownVisibleTiles(buildGrid(7), 7, 'descending').size).toBe(25);
  });

  it('6. 7×7 descending: value 49 always visible', () => {
    for (let i = 0; i < 25; i++) {
      expect(selectCountdownVisibleTiles(buildGrid(7), 7, 'descending').has(keyForValue(49, 7))).toBe(true);
    }
  });

  it('7. no duplicate keys (Set size equals expected count)', () => {
    // 6×6 → ceil(36/2) = 18 unique keys.
    expect(selectCountdownVisibleTiles(buildGrid(6), 6, 'ascending').size).toBe(18);
  });

  it('8. already-tapped tiles are excluded from the visible selection', () => {
    const tappedKey = keyForValue(2, 4); // value 2 tapped
    for (let i = 0; i < 25; i++) {
      const vis = selectCountdownVisibleTiles(buildGrid(4, [2]), 4, 'ascending');
      expect(vis.has(tappedKey)).toBe(false);
      expect(vis.has(keyForValue(1, 4))).toBe(true); // first target still guaranteed
    }
  });
});
