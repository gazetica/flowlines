// supabase.ts
// Numtap | Gazetica Studio | Sprint 3 Day 3 | Task T-011
//
// Typed Supabase client + leaderboard service. Anonymous, no auth.
// Credentials come from .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) —
// never hardcoded, never committed.

import { createClient } from '@supabase/supabase-js';
import { useSettingsStore } from '../store/settingsStore';

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
  // B-023: stamp the permanent player identity on every scores-table row so alias
  // migration (aliasService.migrateAliasInSupabase) can re-label all historical rows.
  const { playerUid } = useSettingsStore.getState();

  const { data, error } = await supabase
    .from('flowlines_scores')
    .insert({
      player_uid: playerUid,
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
    .from('flowlines_scores')
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
    .from('flowlines_scores')
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

// —— T-005 leaderboard RPCs ————————————————————————————————————————————

export interface CampaignLeaderRow {
  player_uid: string; // B-023: returned by the updated get_campaign_leaderboard RPC
  alias: string;
  country: string;
  total_campaign_score: number;
}
export interface AllTimeLeaderRow {
  player_uid: string; // B-023: returned by the updated get_alltime_leaderboard RPC
  alias: string;
  country: string;
  alltime_score: number;
}

/** Campaign leaderboard: per-player sum of best score per level (RPC). */
export async function fetchCampaignLeaderboard(limit = 50): Promise<CampaignLeaderRow[]> {
  const { data, error } = await supabase.rpc('get_campaign_leaderboard', { row_limit: limit });
  if (error || !data) {
    if (error) console.warn('[Supabase] fetchCampaignLeaderboard:', error.message);
    return [];
  }
  return data as CampaignLeaderRow[];
}

/** All-Time leaderboard: campaign total + daily totals combined per player (RPC). */
export async function fetchAllTimeLeaderboard(limit = 50): Promise<AllTimeLeaderRow[]> {
  const { data, error } = await supabase.rpc('get_alltime_leaderboard', { row_limit: limit });
  if (error || !data) {
    if (error) console.warn('[Supabase] fetchAllTimeLeaderboard:', error.message);
    return [];
  }
  return data as AllTimeLeaderRow[];
}
