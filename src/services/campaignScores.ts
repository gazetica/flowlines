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
  country: string; // B-005: ISO code for the leader's flag ('' / 'XX' = none)
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
  const { alias, country, bestScores, setBestTime } = useSettingsStore.getState();
  const { levelId, score, timeSecs, gridSize } = params;

  const { error } = await supabase.from('campaign_scores').insert({
    level_id: levelId,
    alias: alias || 'Player',
    score: Math.max(0, score), // floor at 0
    time_secs: timeSecs,
    grid_size: gridSize,
    country: country || 'XX', // T-005: from settingsStore
  });

  if (error) {
    console.warn('[campaignScores] submit error:', error.message);
  }

  // T-002: store the PB time locally so getPlayerPB() (and thus the YOU row) can show
  // it. ResultScreen calls recordLevelComplete() BEFORE this, so bestScores already
  // holds max(prev, score) — i.e. on a new PB `score === bestScores[key]`. We therefore
  // gate on `>=` (a strict `>` would never fire on a real PB). Stored regardless of the
  // Supabase result so the local panel works offline, mirroring the local score write.
  // Guard against a null/undefined time (the brief's requirement).
  const pbKey = `campaign_${levelId}`;
  if (timeSecs != null && score >= (bestScores[pbKey] ?? 0)) {
    await setBestTime(pbKey, timeSecs);
  }
}

/**
 * Fetch the top score for a given level (the "leader").
 * Returns null if no scores exist yet for this level.
 */
export async function fetchLevelLeader(levelId: number): Promise<LevelLeaderInfo | null> {
  const { data, error } = await supabase
    .from('campaign_scores')
    .select('alias, score, time_secs, country')
    .eq('level_id', levelId)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return {
    alias: data.alias,
    score: data.score,
    timeSecs: data.time_secs,
    country: data.country ?? '', // B-005: '' when the row has no country
  };
}

/**
 * Fetch the player's own personal best for a given level.
 * Uses settingsStore.bestScores (local) — no network call needed.
 */
export function getPlayerPB(levelId: number): { score: number; timeSecs: number | null } {
  const { bestScores, bestTimes } = useSettingsStore.getState();
  const key = `campaign_${levelId}`;
  const score = bestScores[key] ?? 0;
  // T-002: PB time is now stored locally (by submitCampaignScore on a best run),
  // alongside the score. Null until the level's first completion.
  const timeSecs = bestTimes[key] ?? null;
  return { score, timeSecs };
}
