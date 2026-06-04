// dailyScores.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-005 Part 1.5
//
// Daily 3-challenge leaderboard service + local per-day score state.
// daily_scores table has score_c1/c2/c3 + a GENERATED total_score (do NOT insert).

import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';
import { useSettingsStore } from '../store/settingsStore';
import { getTodayDateString } from '../game/DailyChallenge';
import type { DailyChallengeIndex } from '../game/DailyChallenge';

export interface DailyLeaderRow {
  alias: string;
  country: string;
  totalScore: number;
  scoreC1: number;
  scoreC2: number;
  scoreC3: number;
}

export async function submitDailyScore(params: {
  dailyDate: string;
  scoreC1: number;
  scoreC2: number;
  scoreC3: number;
}): Promise<void> {
  const { alias, country } = useSettingsStore.getState();
  const { error } = await supabase.from('daily_scores').insert({
    daily_date: params.dailyDate,
    alias: alias || 'Player',
    country: country || 'XX',
    score_c1: Math.max(0, params.scoreC1),
    score_c2: Math.max(0, params.scoreC2),
    score_c3: Math.max(0, params.scoreC3),
    // total_score is GENERATED — do not include.
  });
  if (error) console.warn('[dailyScores] submit:', error.message);
}

export async function fetchDailyLeaderboard(dailyDate: string, limit = 50): Promise<DailyLeaderRow[]> {
  const { data, error } = await supabase
    .from('daily_scores')
    .select('alias, country, total_score, score_c1, score_c2, score_c3')
    .eq('daily_date', dailyDate)
    .order('total_score', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    alias: r.alias,
    country: r.country,
    totalScore: r.total_score,
    scoreC1: r.score_c1,
    scoreC2: r.score_c2,
    scoreC3: r.score_c3,
  }));
}

// —— Local per-day challenge scores (Capacitor Preferences) ——————————————
// Reset automatically when the stored date no longer matches today (new day).

export interface LocalDailyScores {
  date: string;
  c1: number | null;
  c2: number | null;
  c3: number | null;
}

export async function getLocalDailyScores(): Promise<LocalDailyScores> {
  const today = getTodayDateString();
  const { value: storedDate } = await Preferences.get({ key: 'daily_date' });
  if (storedDate !== today) {
    await Preferences.set({ key: 'daily_date', value: today });
    await Promise.all([
      Preferences.remove({ key: 'daily_c1_score' }),
      Preferences.remove({ key: 'daily_c2_score' }),
      Preferences.remove({ key: 'daily_c3_score' }),
    ]);
    return { date: today, c1: null, c2: null, c3: null };
  }
  const read = async (i: number): Promise<number | null> => {
    const { value } = await Preferences.get({ key: `daily_c${i}_score` });
    return value != null ? Number(value) : null;
  };
  return { date: today, c1: await read(1), c2: await read(2), c3: await read(3) };
}

export async function setLocalDailyScore(index: DailyChallengeIndex, score: number): Promise<void> {
  await Preferences.set({ key: 'daily_date', value: getTodayDateString() });
  await Preferences.set({ key: `daily_c${index}_score`, value: String(Math.max(0, score)) });
}
