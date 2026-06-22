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
    // FL-5B-004: the precheck MUST filter by `mode`. Without it, a Classic run on
    // level p1_001 matched the player's existing *Campaign* row for the same level
    // and was skipped whenever the Campaign score was >= the Classic score (almost
    // always — Campaign time-efficiency points dominate). Result: zero Classic rows
    // ever reached flowlines_scores. Mode-scoping the precheck keeps Campaign and
    // Classic bests fully independent.
    const { data: existing } = await supabase
      .from(TABLE)
      .select('score')
      .eq('player_uid', playerUid)
      .eq('level_id', levelId)
      .eq('mode', mode)
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
      // FL-5B-004: conflict target MUST include `mode` so a player can hold one
      // Campaign AND one Classic best per level. REQUIRES the DB unique constraint
      // to be (player_uid, level_id, mode) — see the migration in the task report.
      // The old (player_uid, level_id) key let Classic overwrite / be blocked by
      // the Campaign row for the same level.
      { onConflict: 'player_uid,level_id,mode' },
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

// FL-UX-D-022 Fix 5: each level completion is its own row in flowlines_scores, so a
// raw SELECT showed one player up to 50 times. These RPCs aggregate SUM(score) per
// player (GROUP BY player_uid) so the board shows ONE cumulative row per player.
// SQL defined in Supabase: get_campaign_leaderboard / get_classic_leaderboard.
interface RpcLeaderboardRow {
  player_uid: string;
  alias: string;
  country: string;
  // bigint → may arrive as string. Field name defensively resolved (see fromRpc):
  // the RPC aliases it total_score, but tolerate score/sum/total in case the
  // deployed SQL differs (FL-UX-D-022 Fix A — was showing 0 for every player).
  total_score?: number | string;
  score?: number | string;
  sum?: number | string;
  total?: number | string;
}

/** Map an aggregated RPC row to the shape the LeaderboardScreen renders (value = total). */
function fromRpc(rows: RpcLeaderboardRow[] | null): FlLeaderboardRow[] {
  return (rows ?? []).map((r) => {
    const raw = r.total_score ?? r.score ?? r.sum ?? r.total ?? 0;
    return {
      player_uid: r.player_uid,
      alias: r.alias,
      country: r.country,
      score: Number(raw) || 0, // cumulative total across all of the player's levels
      moves: 0,
      pack_id: 0,
      level_id: '',
    };
  });
}

/** Top 50 campaign players by cumulative total score (SUM across their levels). */
export async function fetchCampaignLeaderboard(): Promise<FlLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_campaign_leaderboard', { limit_count: 50 });
  if (error) throw error;
  return fromRpc(data as RpcLeaderboardRow[] | null);
}

/** Top 50 classic players by cumulative total score (SUM across their levels). */
export async function fetchClassicLeaderboard(): Promise<FlLeaderboardRow[]> {
  const { data, error } = await supabase.rpc('get_classic_leaderboard', { limit_count: 50 });
  if (error) throw error;
  return fromRpc(data as RpcLeaderboardRow[] | null);
}

// FL-UX-D-023 Fix 7: the GameScreen LEADER row should show the GLOBAL best for the
// current level (highest score across ALL players), not the player's own best.
export interface LevelBest {
  alias: string;
  country: string;
  score: number;
  moves: number;
}

/** Highest score for a single level across all players. null if none / on error. */
export async function fetchLevelBest(
  levelId: string,
  mode: 'campaign' | 'classic',
): Promise<LevelBest | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('alias, country, score, moves')
      .eq('level_id', levelId)
      .eq('mode', mode)
      .order('score', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      alias: data.alias,
      country: data.country,
      score: data.score,
      moves: data.moves,
    };
  } catch (err) {
    console.warn('[flCampaignScores] fetchLevelBest failed:', err);
    return null;
  }
}
