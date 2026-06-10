// aliasService.ts
// Numtap | Gazetica Studio | Sprint 5 | Task B-023 (Player UID system)
//
// Migrates a player's historical leaderboard rows to a new alias. Because every row
// now carries a permanent player_uid (B-023), a single UPDATE per table re-labels ALL
// of that player's past scores instantly — no orphaned scores when the alias changes.
// Runs silently in the background; failure (e.g. offline) is acceptable — the rows
// stay under the old alias until the next successful alias change.

import { supabase } from './supabase';

/**
 * Update the alias on every historical row belonging to `playerUid` across the three
 * score tables (campaign_scores, daily_scores, scores). Fire-and-forget; never throws
 * to the caller — errors are logged and swallowed so a rename never blocks the UI.
 */
export async function migrateAliasInSupabase(playerUid: string, newAlias: string): Promise<void> {
  if (!playerUid) return; // no identity yet → nothing to migrate
  try {
    await Promise.all([
      supabase.from('campaign_scores').update({ alias: newAlias }).eq('player_uid', playerUid),
      supabase.from('daily_scores').update({ alias: newAlias }).eq('player_uid', playerUid),
      supabase.from('scores').update({ alias: newAlias }).eq('player_uid', playerUid),
    ]);
  } catch (err) {
    console.warn('[aliasService] migrateAliasInSupabase failed:', err);
  }
}
