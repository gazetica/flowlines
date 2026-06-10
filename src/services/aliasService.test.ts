// aliasService.test.ts + campaignScores UID submission (B-023)
// Numtap | Gazetica Studio | Sprint 5 | Task B-023
//
// Verifies (6) submitCampaignScore stamps player_uid on the Supabase insert and
// (7) migrateAliasInSupabase updates all three score tables by player_uid.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Capture every Supabase table operation so we can assert on payloads / filters.
const inserted: Record<string, unknown[]> = {};
const updated: { table: string; values: Record<string, unknown>; eqCol: string; eqVal: unknown }[] = [];
// B-025: per-table error injection — when set, that table's update().eq() resolves with
// an { error } (mirrors a Supabase permission/RLS failure) instead of success.
const updateErrors: Record<string, { message: string }> = {};

// In-memory Preferences so setBestTime's write-through (inside submitCampaignScore)
// never touches a real native bridge.
vi.mock('@capacitor/preferences', () => {
  const mem = new Map<string, string>();
  return {
    Preferences: {
      get: async ({ key }: { key: string }) => ({ value: mem.has(key) ? mem.get(key)! : null }),
      set: async ({ key, value }: { key: string; value: string }) => { mem.set(key, value); },
      remove: async ({ key }: { key: string }) => { mem.delete(key); },
    },
  };
});

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        (inserted[table] ??= []).push(payload);
        return Promise.resolve({ error: null });
      },
      update: (values: Record<string, unknown>) => ({
        eq: (eqCol: string, eqVal: unknown) => {
          updated.push({ table, values, eqCol, eqVal });
          return Promise.resolve({ error: updateErrors[table] ?? null });
        },
      }),
    }),
  },
}));

import { migrateAliasInSupabase } from './aliasService';
import { submitCampaignScore } from './campaignScores';
import { useSettingsStore } from '../store/settingsStore';

describe('B-023 — player_uid on score submission (test 6)', () => {
  beforeEach(() => {
    for (const k of Object.keys(inserted)) delete inserted[k];
    useSettingsStore.setState({ playerUid: 'NT4K7M2Q', alias: 'Alex', country: 'GB', bestScores: {}, bestTimes: {} });
  });

  it('submitCampaignScore includes player_uid in the Supabase insert payload', async () => {
    await submitCampaignScore({ levelId: 1, score: 500, timeSecs: 8, gridSize: 3 });
    const rows = inserted['campaign_scores'] ?? [];
    expect(rows).toHaveLength(1);
    expect((rows[0] as Record<string, unknown>).player_uid).toBe('NT4K7M2Q');
  });
});

describe('B-023 — migrateAliasInSupabase (test 7)', () => {
  beforeEach(() => {
    updated.length = 0;
    for (const k of Object.keys(updateErrors)) delete updateErrors[k];
  });

  it('updates alias on all three tables, filtered by player_uid', async () => {
    await migrateAliasInSupabase('NT4K7M2Q', 'NewName');
    const tables = updated.map((u) => u.table).sort();
    expect(tables).toEqual(['campaign_scores', 'daily_scores', 'scores']);
    for (const u of updated) {
      expect(u.values).toEqual({ alias: 'NewName' });
      expect(u.eqCol).toBe('player_uid');
      expect(u.eqVal).toBe('NT4K7M2Q');
    }
  });

  it('no-ops (no update calls) when playerUid is empty', async () => {
    await migrateAliasInSupabase('', 'NewName');
    expect(updated).toHaveLength(0);
  });
});

describe('B-025 — migrateAliasInSupabase error handling', () => {
  beforeEach(() => {
    updated.length = 0;
    for (const k of Object.keys(updateErrors)) delete updateErrors[k];
  });

  it('1. returns { success: true, failedTables: [] } when all three updates succeed', async () => {
    const result = await migrateAliasInSupabase('NT4K7M2Q', 'NewName');
    expect(result).toEqual({ success: true, failedTables: [] });
  });

  it('2. returns success:false + the failed table when campaign_scores update errors', async () => {
    updateErrors['campaign_scores'] = { message: 'permission denied for table campaign_scores' };
    const result = await migrateAliasInSupabase('NT4K7M2Q', 'NewName');
    expect(result.success).toBe(false);
    expect(result.failedTables).toEqual(['campaign_scores']);
  });

  it('3. still attempts the other two tables when one fails (not fail-fast)', async () => {
    updateErrors['campaign_scores'] = { message: 'permission denied' };
    await migrateAliasInSupabase('NT4K7M2Q', 'NewName');
    // All three were attempted despite campaign_scores failing.
    const attempted = updated.map((u) => u.table).sort();
    expect(attempted).toEqual(['campaign_scores', 'daily_scores', 'scores']);
  });
});
