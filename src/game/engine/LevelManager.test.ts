// LevelManager.test.ts
// Flow Lines | Gazetica Studio | Sprint 3 Day 15 | Task FL-S3-015

import { describe, it, expect } from 'vitest';
import {
  getLevel,
  getPackLevels,
  getPackSize,
  getLevelById,
  getNextLevel,
} from './LevelManager';

describe('LevelManager', () => {
  it('getLevel(1, 1) returns p1_001 with correct schema', () => {
    const lvl = getLevel(1, 1);
    expect(lvl).not.toBeNull();
    expect(lvl!.id).toBe('p1_001');
    expect(lvl!.pack).toBe(1);
    expect(lvl!.grid).toBe(6);
    expect(lvl!.colours).toBe(5);
    expect(lvl!.optimalMoves).toBe(36);
    expect(lvl!.dots).toHaveLength(5);
  });

  it('getLevel(1, 50) returns p1_050', () => {
    expect(getLevel(1, 50)?.id).toBe('p1_050');
  });

  it('getLevel(2, 1) returns p2_001', () => {
    expect(getLevel(2, 1)?.id).toBe('p2_001');
  });

  it('getLevel(1, 51) returns null (out of range)', () => {
    expect(getLevel(1, 51)).toBeNull();
  });

  it('getLevel(1, 0) returns null (1-based, index 0 invalid)', () => {
    expect(getLevel(1, 0)).toBeNull();
  });

  it('getLevel(3, 1) returns null (pack 3 empty)', () => {
    expect(getLevel(3, 1)).toBeNull();
  });

  it('getLevel(99, 1) returns null (unknown pack)', () => {
    expect(getLevel(99, 1)).toBeNull();
  });

  it('getPackLevels(1) has length 50', () => {
    expect(getPackLevels(1)).toHaveLength(50);
  });

  it('getPackLevels(2) has length 50', () => {
    expect(getPackLevels(2)).toHaveLength(50);
  });

  it('getPackSize(1) === 50', () => {
    expect(getPackSize(1)).toBe(50);
  });

  it('getPackSize(3) === 0', () => {
    expect(getPackSize(3)).toBe(0);
  });

  it("getLevelById('p1_001') returns the correct level", () => {
    expect(getLevelById('p1_001')?.id).toBe('p1_001');
  });

  it("getLevelById('p2_050') returns the correct level", () => {
    expect(getLevelById('p2_050')?.id).toBe('p2_050');
  });

  it("getLevelById('p1_999') returns null", () => {
    expect(getLevelById('p1_999')).toBeNull();
  });

  it("getLevelById('garbage') returns null", () => {
    expect(getLevelById('garbage')).toBeNull();
  });

  it("getNextLevel('p1_005') returns p1_006", () => {
    expect(getNextLevel('p1_005')?.id).toBe('p1_006');
  });

  it("getNextLevel('p1_050') returns null (last in pack)", () => {
    expect(getNextLevel('p1_050')).toBeNull();
  });
});
