// campaignScores.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task T-002
//
// Local PB-time storage: getPlayerPB() now returns the time stored by
// submitCampaignScore() on a best run. Uses the real settingsStore (with an
// in-memory Preferences mock) and a stubbed Supabase insert.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory @capacitor/preferences for the store's write-through.
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

// Supabase insert succeeds (and is irrelevant to local PB-time storage).
vi.mock('./supabase', () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));

import { useSettingsStore } from '../store/settingsStore';
import { getPlayerPB, submitCampaignScore } from './campaignScores';

beforeEach(() => {
  useSettingsStore.setState({ alias: 'Zephyrv', country: 'IN', bestScores: {}, bestTimes: {} });
});

describe('campaignScores PB time (T-002)', () => {
  it('1. getPlayerPB returns timeSecs null when no time is stored (first visit)', () => {
    expect(getPlayerPB(1)).toEqual({ score: 0, timeSecs: null });
  });

  it('2. after submitCampaignScore on a new PB, getPlayerPB returns the stored timeSecs', async () => {
    // ResultScreen calls recordLevelComplete first, so bestScores already holds the run's score.
    useSettingsStore.setState({ bestScores: { campaign_1: 1580 } });
    await submitCampaignScore({ levelId: 1, score: 1580, timeSecs: 6.2, gridSize: 3 });
    expect(getPlayerPB(1).timeSecs).toBe(6.2);
  });

  it('3. getPlayerPB time is unchanged when the run is NOT a new PB', async () => {
    useSettingsStore.setState({ bestScores: { campaign_1: 2000 }, bestTimes: { campaign_1: 4.0 } });
    await submitCampaignScore({ levelId: 1, score: 1500, timeSecs: 9.9, gridSize: 3 });
    expect(getPlayerPB(1).timeSecs).toBe(4.0); // kept the existing PB time
  });

  it('4. a null timeSecs is never stored (guard)', async () => {
    useSettingsStore.setState({ bestScores: { campaign_1: 1580 } });
    // @ts-expect-error — exercise the runtime null guard
    await submitCampaignScore({ levelId: 1, score: 1580, timeSecs: null, gridSize: 3 });
    expect(getPlayerPB(1).timeSecs).toBeNull();
  });
});
