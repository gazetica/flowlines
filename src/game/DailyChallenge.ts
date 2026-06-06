// DailyChallenge.ts
// Numtap | Gazetica Studio | Sprint 3 Day 7 (T-014) · Sprint 4 (T-005 Part 1.2)
//
// Deterministic seeded daily generator. The seed comes from the UTC date, so the
// grid LAYOUT is identical for every player on a given day. T-005: each day has 3
// challenges over that same layout — C1 ascending (easy), C2 descending (pro),
// C3 random order (expert). Labels never reveal the difficulty.

import i18n from '../i18n';

export type DailyChallengeIndex = 1 | 2 | 3;
export type DailyDifficulty = 'easy' | 'pro' | 'expert';

export interface DailyChallengeConfig {
  index: DailyChallengeIndex;
  gridSize: number; // same for all 3 on a given day (5)
  difficulty: DailyDifficulty; // 1=easy, 2=pro, 3=expert
  seed: number; // same seed for all 3
  label: string; // 'CHALLENGE 1' | 'CHALLENGE 2' | 'CHALLENGE 3'
}

const DIFFICULTY_BY_INDEX: Record<DailyChallengeIndex, DailyDifficulty> = {
  1: 'easy',
  2: 'pro',
  3: 'expert',
};

// Simple deterministic PRNG (mulberry32). Same seed → same sequence.
function mulberry32(seed: number) {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle using a seeded PRNG (seeded, not random).
function seededShuffle(array: number[], rand: () => number): number[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Derives a numeric seed from a UTC date string 'YYYY-MM-DD'.
export function dateToSeed(dateStr: string): number {
  const digits = dateStr.replace(/-/g, '');
  let hash = 0;
  for (let i = 0; i < digits.length; i++) {
    hash = (Math.imul(31, hash) + digits.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Today's UTC date as 'YYYY-MM-DD'. (getTodayUTC kept for back-compat callers.)
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
export const getTodayUTC = getTodayDateString;

// The seeded 5x5 grid LAYOUT (values 1..25 in seeded positions) — identical for
// all 3 challenges on a given day. The difficulty only changes the tap order.
export function getDailyShuffledNumbers(date?: string): number[] {
  const d = date ?? getTodayDateString();
  const rand = mulberry32(dateToSeed(d));
  return seededShuffle(
    Array.from({ length: 25 }, (_, i) => i + 1),
    rand
  );
}

// Config for a specific challenge (1, 2, or 3) on a given day.
export function getDailyChallenge(index: DailyChallengeIndex, date?: string): DailyChallengeConfig {
  const d = date ?? getTodayDateString();
  return {
    index,
    gridSize: 5,
    difficulty: DIFFICULTY_BY_INDEX[index],
    seed: dateToSeed(d),
    label: i18n.t('daily.challenge', { n: index }),
  };
}
