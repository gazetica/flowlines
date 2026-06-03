// DailyChallenge.ts
// Numtap | Gazetica Studio | Sprint 3 Day 7 | Task T-014
//
// Deterministic seeded puzzle generator. No Phaser, no React — unit-testable.
// The seed is derived from the UTC date (YYYY-MM-DD), so every player on the
// same calendar day gets an identical 5x5 grid. The seed changes at midnight UTC.

export interface DailyChallengeInfo {
  date: string; // 'YYYY-MM-DD' UTC
  seed: number; // numeric seed derived from date
  gridSize: 5; // always 5x5 per VDD spec
  shuffledNumbers: number[]; // 1–25, deterministically shuffled
}

/**
 * Simple deterministic PRNG (mulberry32).
 * Given the same seed, always produces the same sequence.
 */
function mulberry32(seed: number) {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded PRNG (seeded, not random).
 */
function seededShuffle(array: number[], rand: () => number): number[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Derives a numeric seed from a UTC date string 'YYYY-MM-DD'.
 */
export function dateToSeed(dateStr: string): number {
  const digits = dateStr.replace(/-/g, '');
  let hash = 0;
  for (let i = 0; i < digits.length; i++) {
    hash = (Math.imul(31, hash) + digits.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Returns today's UTC date as 'YYYY-MM-DD'.
 */
export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the DailyChallengeInfo for a given UTC date (defaults to today).
 */
export function getDailyChallenge(date?: string): DailyChallengeInfo {
  const d = date ?? getTodayUTC();
  const seed = dateToSeed(d);
  const rand = mulberry32(seed);
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1); // 1–25
  const shuffledNumbers = seededShuffle(numbers, rand);
  return { date: d, seed, gridSize: 5, shuffledNumbers };
}
