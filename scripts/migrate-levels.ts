// migrate-levels.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-003
//
// BUILD-TIME ONLY (scripts/ is Node-only — never bundled). Enriches every level
// in src/levels/pack{1-4}.json IN PLACE with three additive fields:
//   - difficulty       (by 1-indexed level position within the pack)
//   - timeLimit        (Campaign countdown seconds, per pack × difficulty)
//   - classicMoveLimit (Classic move budget, per pack × difficulty)
// Dot positions and optimalMoves are NEVER changed — purely additive.
//
// Run: npx ts-node scripts/migrate-levels.ts

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

type Difficulty = 'easy' | 'medium' | 'hard' | 'hardest';

/** Difficulty by 1-indexed level number within a pack (15/15/12/8). */
function getDifficulty(levelIndex: number): Difficulty {
  if (levelIndex <= 15) return 'easy';
  if (levelIndex <= 30) return 'medium';
  if (levelIndex <= 42) return 'hard';
  return 'hardest';
}

// Campaign countdown seconds. (hardest == hard — complexity, not a time squeeze.)
const TIME_LIMITS: Record<number, Record<Difficulty, number>> = {
  1: { easy: 90, medium: 60, hard: 40, hardest: 40 },
  2: { easy: 120, medium: 80, hard: 55, hardest: 55 },
  3: { easy: 150, medium: 100, hard: 70, hardest: 70 },
  4: { easy: 180, medium: 130, hard: 90, hardest: 90 },
};

// Classic move budget (one complete colour path = one move).
const MOVE_LIMITS: Record<number, Record<Difficulty, number>> = {
  1: { easy: 15, medium: 10, hard: 7, hardest: 5 },
  2: { easy: 18, medium: 12, hard: 8, hardest: 6 },
  3: { easy: 21, medium: 14, hard: 9, hardest: 7 },
  4: { easy: 24, medium: 16, hard: 10, hardest: 8 },
};

interface RawLevel {
  id: string;
  optimalMoves: number;
  dots: unknown[];
  [k: string]: unknown;
}

for (const packNum of [1, 2, 3, 4]) {
  const filePath = resolve(__dirname, `../src/levels/pack${packNum}.json`);
  const levels = JSON.parse(readFileSync(filePath, 'utf-8')) as RawLevel[];

  const enriched = levels.map((level, idx) => {
    const levelIndex = idx + 1; // 1-indexed
    const difficulty = getDifficulty(levelIndex);

    if (typeof level.optimalMoves !== 'number') throw new Error(`Level ${level.id} missing optimalMoves`);
    if (!Array.isArray(level.dots) || level.dots.length === 0) throw new Error(`Level ${level.id} missing dots`);

    return {
      ...level,
      difficulty,
      timeLimit: TIME_LIMITS[packNum][difficulty],
      classicMoveLimit: MOVE_LIMITS[packNum][difficulty],
    };
  });

  writeFileSync(filePath, JSON.stringify(enriched, null, 2));
  console.log(`Pack ${packNum}: ${enriched.length} levels enriched`);

  const dist: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, hardest: 0 };
  for (const l of enriched) dist[l.difficulty]++;
  console.log('   Distribution:', dist);
}

console.log('\nMigration complete. All 4 packs updated.');
