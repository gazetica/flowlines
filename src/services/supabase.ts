// supabase.ts
// Numtap | Gazetica Studio | Sprint 3 Day 3 | Task T-011
//
// Typed Supabase client + leaderboard service. Anonymous, no auth.
// Credentials come from .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) —
// never hardcoded, never committed.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing env vars. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// —— Types ——————————————————————————————————————————————————————————

export type GameMode = 'campaign' | 'daily' | 'endless' | 'speed';
export type LeaderboardTab = 'daily' | 'endless' | 'alltime';

export interface ScoreRow {
  id: number;
  alias: string;
  score: number;
  mode: GameMode;
  grid_size: number | null;
  level_id: number | null;
  country: string;
  created_at: string;
}

export interface SubmitScoreParams {
  alias: string;
  score: number;
  mode: GameMode;
  gridSize?: number;
  levelId?: number;
  country?: string;
}

// —— Score submission ————————————————————————————————————————————————

/**
 * Submit a score to the leaderboard.
 * Returns the inserted row or null on error.
 */
export async function submitScore(params: SubmitScoreParams): Promise<ScoreRow | null> {
  const { alias, score, mode, gridSize, levelId, country } = params;

  const { data, error } = await supabase
    .from('scores')
    .insert({
      alias: alias || 'Player',
      score,
      mode,
      grid_size: gridSize ?? null,
      level_id: levelId ?? null,
      country: country ?? 'XX',
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] submitScore error:', error.message);
    return null;
  }
  return data as ScoreRow;
}

// —— Leaderboard queries ——————————————————————————————————————————————

/**
 * Fetch top scores for a leaderboard tab.
 * - 'daily'   → today's daily challenge scores only (UTC day)
 * - 'endless' → all-time endless mode scores
 * - 'alltime' → all-time across all modes, highest first
 */
export async function fetchLeaderboard(tab: LeaderboardTab, limit = 50): Promise<ScoreRow[]> {
  let query = supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (tab === 'daily') {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    query = query.eq('mode', 'daily').gte('created_at', todayStart.toISOString());
  } else if (tab === 'endless') {
    query = query.eq('mode', 'endless');
  }
  // 'alltime' → no extra filter, all modes

  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] fetchLeaderboard error:', error.message);
    return [];
  }
  return (data ?? []) as ScoreRow[];
}

/**
 * Fetch the player's rank for a given score in a tab.
 * Returns rank (1-based) or null if unable to determine.
 */
export async function fetchPlayerRank(tab: LeaderboardTab, playerScore: number): Promise<number | null> {
  let query = supabase
    .from('scores')
    .select('score', { count: 'exact', head: true })
    .gt('score', playerScore);

  if (tab === 'daily') {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    query = query.eq('mode', 'daily').gte('created_at', todayStart.toISOString());
  } else if (tab === 'endless') {
    query = query.eq('mode', 'endless');
  }

  const { count, error } = await query;
  if (error || count === null) return null;
  return count + 1; // rank = number of higher scores + 1
}
