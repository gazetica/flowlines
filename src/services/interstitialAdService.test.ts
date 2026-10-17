// interstitialAdService.test.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-018b
//
// Covers the dual-trigger interstitial: time (>= 3min) OR completions (>= 5),
// the IAP guard, and the reset-only-on-success rule for both counters.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

// AdMob: prepare and show are spies whose behaviour each test sets (both
// succeed by default).
const prepareInterstitialMock = vi.fn(async () => {});
const showInterstitialMock = vi.fn(async () => {});
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    prepareInterstitial: () => prepareInterstitialMock(),
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
  prepareInterstitialMock.mockReset();
  prepareInterstitialMock.mockResolvedValue(undefined);
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

// ─── FL-5B-005b: Zen interstitial (Registry v1.2 §8) ─────────────────────────
// The FL path keeps module-level counters initialised at import, so each test
// loads a fresh module copy with the mocked clock already set.
describe('FL onLevelComplete — Zen interstitial (FL-5B-005b)', () => {
  const T0 = new Date('2026-10-17T10:00:00Z').getTime();
  let onLevelComplete: typeof import('./interstitialAdService').onLevelComplete;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    vi.resetModules();
    ({ onLevelComplete } = await import('./interstitialAdService'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function completeZen(n: number) {
    for (let i = 0; i < n; i++) await onLevelComplete(true, false);
  }

  it('1. 4 Zen completions in < 3 min → interstitial NOT shown', async () => {
    vi.setSystemTime(T0 + 60_000);
    await completeZen(4);
    expect(showInterstitialMock).not.toHaveBeenCalled();
  });

  it('2. 5th Zen completion → shown, and the Zen count resets to 0', async () => {
    await completeZen(5);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
    // Reset proven: 4 more completions (still < 3 min) do not fire again.
    await completeZen(4);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('3. 1 Zen completion after 3 min 1 s → shown, and the Zen clock resets', async () => {
    vi.setSystemTime(T0 + 181_000);
    await completeZen(1);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
    // Clock reset proven: 1 s later the time trigger no longer holds.
    vi.setSystemTime(T0 + 182_000);
    await completeZen(1);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('4. 3 Campaign + 2 Zen completions → no interstitial (counters independent)', async () => {
    for (let i = 0; i < 3; i++) await onLevelComplete(false, false);
    await completeZen(2);
    expect(showInterstitialMock).not.toHaveBeenCalled();
  });

  it('5. Zen completions do not advance the Campaign counter', async () => {
    await completeZen(4);
    await onLevelComplete(false, false); // Campaign count = 1, not 5
    expect(showInterstitialMock).not.toHaveBeenCalled();
  });

  it('6. a Zen show does not reset the Campaign counter', async () => {
    for (let i = 0; i < 4; i++) await onLevelComplete(false, false);
    await completeZen(5); // Zen fires
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
    await onLevelComplete(false, false); // Campaign 4 → 5 fires
    expect(showInterstitialMock).toHaveBeenCalledTimes(2);
  });

  it('7. removeAdsPurchased → no Zen interstitial', async () => {
    for (let i = 0; i < 5; i++) await onLevelComplete(true, true);
    expect(showInterstitialMock).not.toHaveBeenCalled();
  });

  it('8. Zen show fails (no fill) → Zen counter not reset, retries next completion', async () => {
    showInterstitialMock.mockRejectedValueOnce(new Error('no fill'));
    await completeZen(5);
    await completeZen(1);
    expect(showInterstitialMock).toHaveBeenCalledTimes(2);
  });
});

// ─── FL-5B-008: mid-game interstitial race (mounted guard + preload) ─────────
describe('FL onLevelComplete — mid-game race fix (FL-5B-008)', () => {
  const T0 = new Date('2026-10-17T10:00:00Z').getTime();
  let svc: typeof import('./interstitialAdService');

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    vi.resetModules();
    svc = await import('./interstitialAdService');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // A prepareInterstitial call that stays pending until the test resolves it,
  // standing in for a slow live-ad network load.
  function slowLoad() {
    let resolve!: () => void;
    prepareInterstitialMock.mockImplementationOnce(() => new Promise<void>((r) => { resolve = r; }));
    return () => resolve();
  }

  it('1. player leaves during a slow load → NOT shown, counters NOT reset', async () => {
    vi.setSystemTime(T0 + 181_000); // time trigger met
    const finishLoad = slowLoad();
    const mounted = { current: true };
    const pending = svc.onLevelComplete(false, false, mounted);
    mounted.current = false; // player taps NEXT before the ad arrives
    finishLoad();
    await pending;
    expect(showInterstitialMock).not.toHaveBeenCalled();
    // Counters intact: the next mounted result screen still triggers, using the
    // already-loaded ad (no second load).
    await svc.onLevelComplete(false, false, { current: true });
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
    expect(prepareInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('2. player stays on the result screen → shown, and counters reset', async () => {
    const mounted = { current: true };
    for (let i = 0; i < 5; i++) await svc.onLevelComplete(false, false, mounted);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 4; i++) await svc.onLevelComplete(false, false, mounted);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1); // count reset to 0
  });

  it('3. preloadInterstitial skips the load for Remove-Ads owners', async () => {
    await svc.preloadInterstitial(true);
    expect(prepareInterstitialMock).not.toHaveBeenCalled();
  });

  it('4. preloaded ad is reused — onLevelComplete does not load a second one', async () => {
    await svc.preloadInterstitial(false);
    await svc.preloadInterstitial(false); // already loaded → no-op
    vi.setSystemTime(T0 + 181_000);
    await svc.onLevelComplete(false, false, { current: true });
    expect(prepareInterstitialMock).toHaveBeenCalledTimes(1);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('5. completions while unmounted still count toward the 5', async () => {
    const gone = { current: false };
    for (let i = 0; i < 4; i++) await svc.onLevelComplete(false, false, gone);
    await svc.onLevelComplete(false, false, { current: true });
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });

  it('6. preload fails → onLevelComplete retries the load, then shows', async () => {
    prepareInterstitialMock.mockRejectedValueOnce(new Error('no fill'));
    await svc.preloadInterstitial(false);
    vi.setSystemTime(T0 + 181_000);
    await svc.onLevelComplete(false, false, { current: true });
    expect(prepareInterstitialMock).toHaveBeenCalledTimes(2);
    expect(showInterstitialMock).toHaveBeenCalledTimes(1);
  });
});
