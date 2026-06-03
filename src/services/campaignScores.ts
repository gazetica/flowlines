// campaignScores.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-001 | VDD v1.2 Change C
//
// Supabase CRUD for the per-level `campaign_scores` table (separate from the
// anonymous global `scores` table used by the leaderboard). Powers the YOU vs
// LEADER panel. Submission is fire-and-forget — it must never block game flow.

import { supabase } from './supabase';
import { useSettingsStore } from '../store/settingsStore';

export interface CampaignScoreRow {
  id: number;
  level_id: number;
  alias: string;
  score: number;
  time_secs: number;
  grid_size: number;
  country: string;
  created_at: string;
}

export interface LevelLeaderInfo {
  alias: string;
  score: number;
  timeSecs: number;
}

/**
 * Submit a campaign score for a specific level.
 * Fire-and-forget — never blocks game flow.
 */
export async function submitCampaignScore(params: {
  levelId: number;
  score: number;
  timeSecs: number;
  gridSize: number;
}): Promise<void> {
  const { alias } = useSettingsStore.getState();
  const { levelId, score, timeSecs, gridSize } = params;

  const { error } = await supabase.from('campaign_scores').insert({
    level_id: levelId,
    alias: alias || 'Player',
    score: Math.max(0, score), // floor at 0
    time_secs: timeSecs,
    grid_size: gridSize,
    country: 'XX', // T-002: detect from device locale
  });

  if (error) {
    console.warn('[campaignScores] submit error:', error.message);
  }
}

/**
 * Fetch the top score for a given level (the "leader").
 * Returns null if no scores exist yet for this level.
 */
export async function fetchLevelLeader(levelId: number): Promise<LevelLeaderInfo | null> {
  const { data, error } = await supabase
    .from('campaign_scores')
    .select('alias, score, time_secs')
    .eq('level_id', levelId)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return {
    alias: data.alias,
    score: data.score,
    timeSecs: data.time_secs,
  };
}

/**
 * Fetch the player's own personal best for a given level.
 * Uses settingsStore.bestScores (local) — no network call needed.
 */
export function getPlayerPB(levelId: number): { score: number; timeSecs: number | null } {
  const { bestScores } = useSettingsStore.getState();
  const score = bestScores[`campaign_${levelId}`] ?? 0;
  // Time is not currently stored separately — return null until T-002 adds it.
  return { score, timeSecs: null };
}
