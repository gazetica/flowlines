// interstitialAdService.test.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-018b
//
// Covers the dual-trigger interstitial: time (>= 3min) OR completions (>= 5),
// the IAP guard, and the reset-only-on-success rule for both counters.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory @capacitor/preferences (same pattern as settingsStore.test.ts) so
// reads/writes never touch a native bridge. Exposed via globalThis so tests can
// seed and assert counter values directly.
const mem = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: mem.has(key) ? mem.get(key)! : null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      mem.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      mem.delete(key);
    },
  },
}));

// AdMob: prepare always succeeds; show is a spy whose behaviour each test sets.
const showInterstitialMock = vi.fn(async () => {});
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    prepareInterstitial: vi.fn(async () => {}),
    showInterstitial: () => showInterstitialMock(),
  },
}));

// settingsStore: only removeAdsPurchased matters here.
let removeAdsPurchased = false;
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ removeAdsPurchased }),
  },
}));

// analytics: no-op the impression call.
vi.mock('./analytics', () => ({ adImpression: vi.fn() }));

import {
  incrementLevelCount,
  maybeShowInterstitial,
} from './interstitialAdService';

const CAP_KEY = 'last_interstitial_shown';
const COUNT_KEY = 'levels_since_last_ad';

// Seed the two counters: `secondsElapsed` ago for the timestamp, `count` completions.
function seed(count: number, secondsElapsed: number) {
  mem.set(COUNT_KEY, String(count));
  mem.set(CAP_KEY, String(Date.now() - secondsElapsed * 1000));
}

beforeEach(() => {
  mem.clear();
  removeAdsPurchased = false;
  showInterstitialMock.mockReset();
  showInterstitialMock.mockResolvedValue(undefined);
});

describe('interstitialAdService — dual trigger (T-018b)', () => {
  it('1. levelCount=4, timeElapsed=60s → ad NOT shown', async () => {
    seed(4, 60);
    await maybeShowInterstitial();
    expect(showInterstitialMock).not.toHaveBeenCalled();
  });

  it('2. levelCount=5, timeElapsed=60s → ad shown (completion trigger)', async () => {
    seed(5, 60);
    await maybeShowInterstitial();
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('3. levelCount=2, timeElapsed=180s → ad shown (time trigger)', async () => {
    seed(2, 180);
    await maybeShowInterstitial();
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('4. levelCount=5, timeElapsed=180s → ad shown once only (both true)', async () => {
    seed(5, 180);
    await maybeShowInterstitial();
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('5. levelCount=5, removeAdsPurchased=true → ad NOT shown (IAP guard)', async () => {
    seed(5, 180);
    removeAdsPurchased = true;
    await maybeShowInterstitial();
    expect(showInterstitialMock).not.toHaveBeenCalled();
  });

  it('6. after a successful show, levels_since_last_ad resets to 0', async () => {
    seed(5, 60);
    await maybeShowInterstitial();
    expect(mem.get(COUNT_KEY)).toBe('0');
  });

  it('7. after a successful show, last_interstitial_shown is updated', async () => {
    seed(2, 180);
    const before = Number(mem.get(CAP_KEY));
    await maybeShowInterstitial();
    expect(Number(mem.get(CAP_KEY))).toBeGreaterThan(before);
  });

  it('8. ad throws on show → neither counter resets', async () => {
    seed(5, 180);
    const beforeTs = mem.get(CAP_KEY);
    showInterstitialMock.mockRejectedValueOnce(new Error('no fill'));
    await maybeShowInterstitial();
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
    expect(mem.get(COUNT_KEY)).toBe('5'); // count unchanged
    expect(mem.get(CAP_KEY)).toBe(beforeTs); // timestamp unchanged
  });
});

describe('incrementLevelCount (T-018b)', () => {
  it('increments an existing count by 1', async () => {
    mem.set(COUNT_KEY, '3');
    await incrementLevelCount();
    expect(mem.get(COUNT_KEY)).toBe('4');
  });

  it('defaults a missing/unparseable count to 0 before incrementing', async () => {
    await incrementLevelCount(); // key absent
    expect(mem.get(COUNT_KEY)).toBe('1');
    mem.set(COUNT_KEY, 'garbage');
    await incrementLevelCount();
    expect(mem.get(COUNT_KEY)).toBe('1');
  });

  it('a completion that pushes the count to 5 then fires the ad', async () => {
    mem.set(COUNT_KEY, '4');
    mem.set(CAP_KEY, String(Date.now())); // time trigger NOT met
    await incrementLevelCount();          // 4 -> 5
    await maybeShowInterstitial();
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
    expect(mem.get(COUNT_KEY)).toBe('0'); // reset on show
  });
});
