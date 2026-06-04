// freePlayPB.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-004B P2
//
// Local-only personal best for Free Play, keyed per config (grid size +
// difficulty + timer setting). Free Play never touches the leaderboard, so this
// uses Capacitor Preferences directly with a dynamic key (outside the typed
// PREF_KEYS wrapper, which is for the fixed app-settings keys).

import { Preferences } from '@capacitor/preferences';
import type { Difficulty } from '../game/GridEngine';

function pbKey(gridSize: number, difficulty: Difficulty, timerSecs: number | null): string {
  return `fp_pb_${gridSize}_${difficulty}_${timerSecs ?? 'untimed'}`;
}

export async function getFreePlayPB(gridSize: number, difficulty: Difficulty, timerSecs: number | null): Promise<number> {
  const { value } = await Preferences.get({ key: pbKey(gridSize, difficulty, timerSecs) });
  return value ? Number(value) || 0 : 0;
}

/** Stores `score` if it beats the existing PB. Returns the resulting PB. */
export async function setFreePlayPB(
  gridSize: number,
  difficulty: Difficulty,
  timerSecs: number | null,
  score: number
): Promise<number> {
  const prev = await getFreePlayPB(gridSize, difficulty, timerSecs);
  if (score > prev) {
    await Preferences.set({ key: pbKey(gridSize, difficulty, timerSecs), value: String(score) });
    return score;
  }
  return prev;
}
