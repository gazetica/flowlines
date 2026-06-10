// settingsStore.test.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-006
//
// Covers the T-006 additions: the unified hint inventory (hintCount default 3,
// addHints, consumeHint) and the pure daily-streak transition (nextDailyStreak).

import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory @capacitor/preferences so the store's write-through never touches a
// real native bridge during tests.
vi.mock('@capacitor/preferences', () => {
  const mem = new Map<string, string>();
  return {
    Preferences: {
      get: async ({ key }: { key: string }) => ({ value: mem.has(key) ? mem.get(key)! : null }),
      set: async ({ key, value }: { key: string; value: string }) => {
        mem.set(key, value);
      },
      remove: async ({ key }: { key: string }) => {
        mem.delete(key);
      },
    },
  };
});

import { useSettingsStore, nextDailyStreak, DEFAULT_HINT_COUNT, generatePlayerUid } from './settingsStore';
import { PREF_KEYS, prefGet, prefSet } from '../services/preferences';

// Helper: the date `days` days before `today` ('YYYY-MM-DD', UTC).
function daysBefore(today: string, days: number): string {
  const d = new Date(today + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

describe('settingsStore — hint inventory (T-006)', () => {
  beforeEach(() => {
    // Reset the singleton to a fresh-install state before each test.
    useSettingsStore.setState({ hintCount: DEFAULT_HINT_COUNT });
  });

  it('hintCount initialises to 3 on a fresh store', () => {
    expect(DEFAULT_HINT_COUNT).toBe(3);
    expect(useSettingsStore.getState().hintCount).toBe(3);
  });

  it('addHints(1) increments hintCount', async () => {
    await useSettingsStore.getState().addHints(1);
    expect(useSettingsStore.getState().hintCount).toBe(4);
  });

  it('consumeHint returns false when hintCount === 0 (no decrement)', () => {
    useSettingsStore.setState({ hintCount: 0 });
    const ok = useSettingsStore.getState().consumeHint();
    expect(ok).toBe(false);
    expect(useSettingsStore.getState().hintCount).toBe(0);
  });

  it('consumeHint returns true and decrements when hintCount > 0', () => {
    const ok = useSettingsStore.getState().consumeHint();
    expect(ok).toBe(true);
    expect(useSettingsStore.getState().hintCount).toBe(2);
  });
});

describe('settingsStore — bestTimes (T-002)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ bestTimes: {} });
  });

  it('setBestTime stores a PB time in state under the given key', async () => {
    await useSettingsStore.getState().setBestTime('campaign_1', 6.2);
    expect(useSettingsStore.getState().bestTimes['campaign_1']).toBe(6.2);
  });

  it('setBestTime overwrites an existing time and leaves other keys intact', async () => {
    useSettingsStore.setState({ bestTimes: { campaign_1: 9, campaign_2: 4 } });
    await useSettingsStore.getState().setBestTime('campaign_1', 5);
    expect(useSettingsStore.getState().bestTimes).toEqual({ campaign_1: 5, campaign_2: 4 });
  });
});

describe('settingsStore — gem economy (F-005)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ hintCount: 0, lastDailyRewardDate: '' });
  });

  it('1. claimDailyGems grants +3 gems on a new UTC day', async () => {
    const granted = await useSettingsStore.getState().claimDailyGems('2026-06-09');
    expect(granted).toBe(true);
    expect(useSettingsStore.getState().hintCount).toBe(3);
    expect(useSettingsStore.getState().lastDailyRewardDate).toBe('2026-06-09');
  });

  it('2. claimDailyGems does NOT award twice on the same day', async () => {
    await useSettingsStore.getState().claimDailyGems('2026-06-09');
    const second = await useSettingsStore.getState().claimDailyGems('2026-06-09');
    expect(second).toBe(false);
    expect(useSettingsStore.getState().hintCount).toBe(3); // still 3, not 6
  });

  it('3. claimDailyGems awards again on a different day', async () => {
    await useSettingsStore.getState().claimDailyGems('2026-06-09');
    const next = await useSettingsStore.getState().claimDailyGems('2026-06-10');
    expect(next).toBe(true);
    expect(useSettingsStore.getState().hintCount).toBe(6);
  });

  it('4. addGems(3) credits the daily-challenge / rewarded-ad amount', async () => {
    await useSettingsStore.getState().addGems(3);
    expect(useSettingsStore.getState().hintCount).toBe(3);
  });

  it('5. addGems(7) credits the weekly-bonus amount', async () => {
    await useSettingsStore.getState().addGems(7);
    expect(useSettingsStore.getState().hintCount).toBe(7);
  });

  it('6. addGems(20) credits the IAP Hint Pack amount', async () => {
    await useSettingsStore.getState().addGems(20);
    expect(useSettingsStore.getState().hintCount).toBe(20);
  });
});

describe('settingsStore — player UID (B-023)', () => {
  beforeEach(async () => {
    // Clear any persisted UID so each test starts from a true fresh-install state.
    await prefSet(PREF_KEYS.PLAYER_UID, '');
    useSettingsStore.setState({ playerUid: '' });
  });

  it('1. generatePlayerUid() returns a string starting with "NT"', () => {
    expect(generatePlayerUid().startsWith('NT')).toBe(true);
  });

  it('2. UID is exactly 8 characters (NT + 6)', () => {
    expect(generatePlayerUid()).toHaveLength(8);
  });

  it('3. UID characters are all from the valid set (A-Z, 0-9)', () => {
    // Run a handful — the 6 random chars must always match [A-Z0-9].
    for (let i = 0; i < 50; i++) {
      expect(generatePlayerUid()).toMatch(/^NT[A-Z0-9]{6}$/);
    }
  });

  it('4. UID generated once on first hydrate and persisted to Preferences', async () => {
    await prefSet(PREF_KEYS.PLAYER_UID, ''); // simulate fresh install (no UID yet)
    await useSettingsStore.getState().loadFromPreferences();
    const uid = useSettingsStore.getState().playerUid;
    expect(uid).toMatch(/^NT[A-Z0-9]{6}$/);
    // It must have been written through to Preferences.
    expect(await prefGet(PREF_KEYS.PLAYER_UID)).toBe(uid);
  });

  it('5. UID is never regenerated when one already exists in Preferences', async () => {
    await prefSet(PREF_KEYS.PLAYER_UID, 'NTABC123');
    await useSettingsStore.getState().loadFromPreferences();
    // Same value loaded — not replaced with a fresh random one.
    expect(useSettingsStore.getState().playerUid).toBe('NTABC123');
    expect(await prefGet(PREF_KEYS.PLAYER_UID)).toBe('NTABC123');
  });
});

describe('nextDailyStreak — daily streak logic (T-006)', () => {
  const today = '2026-06-04';

  it('increments when last completion was yesterday', () => {
    expect(nextDailyStreak(daysBefore(today, 1), today, 3)).toBe(4);
  });

  it('resets to 1 when last completion was 2 days ago (broken streak)', () => {
    expect(nextDailyStreak(daysBefore(today, 2), today, 3)).toBe(1);
  });

  it('is unchanged when already completed today', () => {
    expect(nextDailyStreak(today, today, 3)).toBe(3);
  });

  it('resets to 1 on first-ever completion (no prior date)', () => {
    expect(nextDailyStreak('', today, 0)).toBe(1);
  });
});
