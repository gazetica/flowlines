// flDailyScores.ts
// Flow Lines | Gazetica Studio | Sprint 4 Day 21 | Task FL-S4-021
//
// Daily-challenge score submission + leaderboard for `flowlines_daily_scores`.
// FL-specific file because the legacy Numtap dailyScores.ts (3-challenge schema:
// daily_scores / score_c1..c3, imported by gameStore) already owns that name.
// Single score per player per UTC day. Reads identity from flowSettingsStore.
// Every call fails silently — a network error must never crash the game.

import { supabase } from './supabase';
import { useFlowSettingsStore } from '../store/flowSettingsStore';

export type DailyScoreRow = {
  date: string; // ISO 'YYYY-MM-DD' UTC
  alias: string;
  country: string;
  score: number;
  moves: number;
  player_uid: string;
};

const TABLE = 'flowlines_daily_scores';

/** Today's UTC date as 'YYYY-MM-DD'. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Submit today's daily score. Upserts on (player_uid, date) so a player keeps one
 * row per day — best score only (skips when an equal/higher score exists).
 * Fire-and-forget; silent on any error.
 */
export async function submitDailyScore(score: number, moves: number): Promise<void> {
  try {
    const { alias, country, playerUid } = useFlowSettingsStore.getState();
    if (!playerUid) return;
    const date = todayUtc();

    const { data: existing } = await supabase
      .from(TABLE)
      .select('score')
      .eq('player_uid', playerUid)
      .eq('date', date)
      .maybeSingle();
    if (existing && existing.score >= score) return;

    const { error } = await supabase.from(TABLE).upsert(
      {
        date,
        alias: alias || 'Player',
        country: country || 'XX',
        score,
        moves,
        player_uid: playerUid,
      },
      { onConflict: 'player_uid,date' },
    );
    if (error) console.warn('[flDailyScores] submit:', error.message);
  } catch (err) {
    console.warn('[flDailyScores] submit failed:', err);
  }
}

/** Daily leaderboard for a given UTC date (highest first). Returns [] on error. */
export async function getDailyLeaderboard(date: string, limit = 20): Promise<DailyScoreRow[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('date, alias, country, score, moves, player_uid')
      .eq('date', date)
      .order('score', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as DailyScoreRow[];
  } catch (err) {
    console.warn('[flDailyScores] leaderboard failed:', err);
    return [];
  }
}
