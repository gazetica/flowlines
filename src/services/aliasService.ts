// aliasService.ts
// Numtap | Gazetica Studio | Sprint 5 | Task B-023 (Player UID system) / B-025
//
// Migrates a player's historical leaderboard rows to a new alias. Because every row
// now carries a permanent player_uid (B-023), a single UPDATE per table re-labels ALL
// of that player's past scores instantly — no orphaned scores when the alias changes.
// Runs silently in the background; failure (e.g. offline) is acceptable — the rows
// stay under the old alias until the next successful alias change.
//
// B-025: the three updates are now checked individually and the function reports which
// tables failed, so a silent permission/RLS regression can be debugged instead of
// vanishing. Note: the anon role requires GRANT UPDATE (alias) ON <table> TO anon —
// applied in the Supabase dashboard on 10 June 2026. If migration fails again, check
// the anon GRANT + RLS policies in Supabase for campaign_scores / daily_scores / scores.

import { supabase } from './supabase';

/** Result of an alias migration: success only when every table updated cleanly. */
export interface AliasMigrationResult {
  success: boolean;
  failedTables: string[];
}

/**
 * Update the alias on every historical row belonging to `playerUid` across the three
 * score tables (campaign_scores, daily_scores, scores). Never throws to the caller.
 * Each update is awaited independently (Promise.all, NOT fail-fast) so one table's
 * failure does not prevent the others from being attempted. Returns which tables (if
 * any) failed so the caller can log a partial failure without alarming the player.
 */
export async function migrateAliasInSupabase(
  playerUid: string,
  newAlias: string,
): Promise<AliasMigrationResult> {
  if (!playerUid) return { success: true, failedTables: [] }; // no identity yet → nothing to migrate

  const tables = ['campaign_scores', 'daily_scores', 'scores'];
  const failedTables: string[] = [];

  await Promise.all(
    tables.map(async (table) => {
      try {
        const { error } = await supabase.from(table).update({ alias: newAlias }).eq('player_uid', playerUid);
        if (error) {
          console.error(`[aliasService] Failed to migrate alias in ${table}:`, error.message);
          failedTables.push(table);
        }
      } catch (err) {
        // Network/throw path (offline, client error) — treat as a failed table too.
        console.error(`[aliasService] Failed to migrate alias in ${table}:`, err);
        failedTables.push(table);
      }
    }),
  );

  return { success: failedTables.length === 0, failedTables };
}
