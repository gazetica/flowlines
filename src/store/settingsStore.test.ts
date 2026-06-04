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

import { useSettingsStore, nextDailyStreak, DEFAULT_HINT_COUNT } from './settingsStore';

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
