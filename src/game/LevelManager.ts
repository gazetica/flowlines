// LevelManager.ts
// Numtap | Gazetica Studio | Sprint 2 Day 2 | Task T-003
//
// Thin level-config loader and query class. Pure TypeScript.
// ZERO Phaser imports. ZERO React imports. ZERO browser APIs.
// Imports the 100-level dataset from levels.json and exposes query methods.

import levelsData from './levels.json';
import type { Modifier, Direction } from './GridEngine';
import { ScoreEngine } from './ScoreEngine';

export interface LevelConfig {
  id: number;
  pack: 1 | 2 | 3;
  grid: 3 | 4 | 5 | 6 | 7;
  modifier: Modifier;
  direction: Direction;
  timeLimit: number;
  stars: [number, number, number];
}

export class LevelManager {
  // NOTE: levels.json is imported with resolveJsonModule, so TypeScript widens
  // its literal fields (modifier: string, grid: number, stars: number[]). The
  // dataset is hand-validated against the LevelConfig shape (see T-003 data
  // integrity checks), so we cast through `unknown` to apply the precise type.
  private static levels: LevelConfig[] = levelsData.levels as unknown as LevelConfig[];

  // Returns config for a level. Throws if id not found.
  static getLevel(id: number): LevelConfig {
    const level = this.levels.find((l) => l.id === id);
    if (!level) throw new Error(`Level ${id} not found`);
    return level;
  }

  // Returns all levels in a pack (1, 2, or 3).
  static getPack(pack: 1 | 2 | 3): LevelConfig[] {
    return this.levels.filter((l) => l.pack === pack);
  }

  // Returns total number of levels.
  static getTotalLevels(): number {
    return this.levels.length;
  }

  // Returns star count for a completion time using ScoreEngine.
  static getStars(level: LevelConfig, timeElapsed: number): 0 | 1 | 2 | 3 {
    return ScoreEngine.getStars(timeElapsed, level.stars);
  }

  // Returns true if a pack is unlocked.
  // Pack 1 is always unlocked.
  // Pack 2 unlocks when all Pack 1 levels have >=1 star (score > 0).
  // Pack 3 unlocks when all Pack 2 levels have >=1 star.
  // completedLevels = { [levelId]: starsEarned }
  static isPackUnlocked(
    pack: 2 | 3,
    completedLevels: Record<number, number>
  ): boolean {
    const prerequisitePack = pack === 2 ? 1 : 2;
    const prerequisiteLevels = this.getPack(prerequisitePack);
    return prerequisiteLevels.every((l) => (completedLevels[l.id] ?? 0) >= 1);
  }

  // Returns the next level id after a given id.
  // Returns null if the given id is the last level.
  static getNextLevelId(currentId: number): number | null {
    // Validates that currentId exists (throws otherwise), matching brief spec.
    this.getLevel(currentId);
    const next = this.levels.find((l) => l.id === currentId + 1);
    return next ? next.id : null;
  }

  // Returns true if a level id is the first level of a new pack.
  static isPackStart(levelId: number): boolean {
    const level = this.getLevel(levelId);
    return this.levels.filter((l) => l.pack === level.pack)[0].id === levelId;
  }
}
