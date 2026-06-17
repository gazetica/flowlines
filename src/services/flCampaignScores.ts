// flCampaignScores.ts
// Flow Lines | Gazetica Studio | Sprint 4 Day 21 | Task FL-S4-021
//
// Campaign score submission + leaderboard for the `flowlines_scores` table.
// Created as an FL-specific file because the legacy Numtap campaignScores.ts
// (different schema: campaign_scores / timeSecs / gridSize, locked by its test +
// imported by LeaderPanel) already occupies that name. Reads FL identity from
// flowSettingsStore. Every call fails silently — a network error must never
// crash the game.

import { supabase } from './supabase';
import { useFlowSettingsStore } from '../store/flowSettingsStore';

export type CampaignScoreRow = {
  alias: string;
  country: string;
  score: number;
  moves: number;
  pack_id: number;
  level_id: string;
  player_uid: string;
};

const TABLE = 'flowlines_scores';

/**
 * Submit a campaign score. Upserts on (player_uid, level_id) so a player keeps
 * exactly one row per level — best score only (skips the write when an equal or
 * higher score already exists). Fire-and-forget; silent on any error.
 */
export type CampaignScoreMode = 'campaign' | 'classic' | 'daily_campaign' | 'daily_classic';

export async function submitCampaignScore(
  levelId: string,
  packId: number,
  score: number,
  moves: number,
  mode: CampaignScoreMode = 'campaign', // FL-UX-D-004: defaults preserve existing callers
): Promise<void> {
  try {
    const { alias, country, playerUid } = useFlowSettingsStore.getState();
    if (!playerUid || !levelId) return; // no identity / no real level

    // Best-score policy: only overwrite if this run beats the stored score.
    const { data: existing } = await supabase
      .from(TABLE)
      .select('score')
      .eq('player_uid', playerUid)
      .eq('level_id', levelId)
      .maybeSingle();
    if (existing && existing.score >= score) return;

    const { error } = await supabase.from(TABLE).upsert(
      {
        alias: alias || 'Player',
        country: country || 'XX',
        score,
        moves,
        pack_id: packId,
        level_id: levelId,
        player_uid: playerUid,
        mode, // FL-UX-D-004 — requires a `mode` column on flowlines_scores
      },
      { onConflict: 'player_uid,level_id' },
    );
    if (error) console.warn('[flCampaignScores] submit:', error.message);
  } catch (err) {
    console.warn('[flCampaignScores] submit failed:', err);
  }
}

/** Top campaign scores (highest first). Returns [] on error. */
export async function getCampaignLeaderboard(limit = 20): Promise<CampaignScoreRow[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('alias, country, score, moves, pack_id, level_id, player_uid')
      .order('score', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as CampaignScoreRow[];
  } catch (err) {
    console.warn('[flCampaignScores] leaderboard failed:', err);
    return [];
  }
}

/**
 * All-time board alias (TIMED tab placeholder until a dedicated timed table
 * exists). TODO Sprint 5: separate timed leaderboard.
 */
export async function getDailyLeaderboard_AllTime(limit = 20): Promise<CampaignScoreRow[]> {
  return getCampaignLeaderboard(limit);
}

// ─── FL-UX-D-011 — Leaderboard queries (Campaign / Classic) ──────────────────
// NOTE: the live `flowlines_scores` schema uses `pack_id` / `level_id` (not the
// brief's `pack` / `level`) and has NO `stars` column (submit never writes one),
// so stars are omitted. `mode` filtering depends on the pending mode-column
// migration (HANDOVER pending item #1); until it exists these return [].
// Unlike the fire-and-forget submitters, these THROW on error so the screen can
// distinguish a real failure (error state) from an empty board (empty state).

export interface FlLeaderboardRow {
  player_uid: string;
  alias: string;
  country: string;
  score: number;
  moves: number;
  pack_id: number;
  level_id: string;
}

const LB_COLUMNS = 'player_uid, alias, country, score, moves, pack_id, level_id';

/** Top 50 campaign scores across all packs (highest first). */
export async function fetchCampaignLeaderboard(): Promise<FlLeaderboardRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(LB_COLUMNS)
    .eq('mode', 'campaign')
    .order('score', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as FlLeaderboardRow[];
}

/** Top 50 classic scores across all packs (highest score first). */
export async function fetchClassicLeaderboard(): Promise<FlLeaderboardRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(LB_COLUMNS)
    .eq('mode', 'classic')
    .order('score', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as FlLeaderboardRow[];
}
