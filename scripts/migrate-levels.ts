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

/** Difficulty by 1-indexed level number within a pack. FL-5A-029 / Game Registry
 *  v1.1 §2-3: 15/10/15/10 (easy 1-15, medium 16-25, hard 26-40, hardest 41-50). */
function getDifficulty(levelIndex: number): Difficulty {
  if (levelIndex <= 15) return 'easy';
  if (levelIndex <= 25) return 'medium';
  if (levelIndex <= 40) return 'hard';
  return 'hardest';
}

// Campaign countdown seconds, per pack × difficulty. FL-5A-029 / Registry §4.
const TIME_LIMITS: Record<number, Record<Difficulty, number>> = {
  1: { easy: 90, medium: 75, hard: 60, hardest: 45 },
  2: { easy: 90, medium: 75, hard: 60, hardest: 45 },
  3: { easy: 120, medium: 115, hard: 90, hardest: 75 },
  4: { easy: 120, medium: 115, hard: 90, hardest: 75 },
};

// Classic move budget (one complete colour path = one move). FL-5A-029 / Registry §5.
const MOVE_LIMITS: Record<number, Record<Difficulty, number>> = {
  1: { easy: 15, medium: 12, hard: 9, hardest: 6 },
  2: { easy: 15, medium: 12, hard: 9, hardest: 6 },
  3: { easy: 18, medium: 15, hard: 12, hardest: 9 },
  4: { easy: 18, medium: 15, hard: 12, hardest: 9 },
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
