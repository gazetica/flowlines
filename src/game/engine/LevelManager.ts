// LevelManager.ts
// Flow Lines | Gazetica Studio | Sprint 3 Day 15 | Task FL-S3-015
//
// Runtime level loader (counterpart to the build-time scripts/LevelGenerator).
// Imports all four pack JSON files so they bundle into the APK — this closes
// the "level JSON tree-shaken" issue from Day 12. Packs 3 & 4 are empty for now.

import pack1 from '../../levels/pack1.json';
import pack2 from '../../levels/pack2.json';
import pack3 from '../../levels/pack3.json';
import pack4 from '../../levels/pack4.json';

export type DotPair = {
  colour: string;
  r1: number; c1: number;
  r2: number; c2: number;
};

export type LevelData = {
  id: string;
  pack: number;
  grid: number;
  colours: number;
  optimalMoves: number;
  dots: DotPair[];
};

const packs: Record<number, LevelData[]> = {
  1: pack1 as LevelData[],
  2: pack2 as LevelData[],
  3: pack3 as LevelData[],
  4: pack4 as LevelData[],
};

/** Get a level by pack + 1-based index. Returns null if out of range. */
export function getLevel(packId: number, levelIndex: number): LevelData | null {
  const list = packs[packId];
  if (!list) return null;
  if (levelIndex < 1 || levelIndex > list.length) return null;
  return list[levelIndex - 1] ?? null;
}

/** All levels for a pack (empty array for unknown/empty packs). */
export function getPackLevels(packId: number): LevelData[] {
  return packs[packId] ?? [];
}

/** Number of levels in a pack. */
export function getPackSize(packId: number): number {
  return packs[packId]?.length ?? 0;
}

/** Level by its string id (e.g. "p1_005"). Null if not found. */
export function getLevelById(levelId: string): LevelData | null {
  const match = /^p(\d+)_(\d+)$/.exec(levelId);
  if (!match) return null;
  const packId = Number(match[1]);
  const index = Number(match[2]);
  return getLevel(packId, index);
}

/** Next level after the given id, or null if it's the last in its pack. */
export function getNextLevel(levelId: string): LevelData | null {
  const match = /^p(\d+)_(\d+)$/.exec(levelId);
  if (!match) return null;
  const packId = Number(match[1]);
  const index = Number(match[2]);
  return getLevel(packId, index + 1);
}
