// interstitialReset.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task B-024
//
// Watching ANY rewarded ad to completion (gem / GET A CLUE / LOW ON TIME) resets the
// interstitial counter, so the post-game interstitial is deferred a fresh window. A
// dismissed/no-reward watch must NOT reset it. These tests drive the three ad services
// with a mocked AdMob bridge and assert resetInterstitialCounter is (not) called.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Controls whether the rewarded ad grants a reward (truthy) or is dismissed (null).
let rewardResult: unknown = { type: 'reward' };

vi.mock('@capacitor-community/admob', () => ({
  RewardAdPluginEvents: { Dismissed: 'adDismissed' },
  AdMob: {
    prepareRewardVideoAd: vi.fn(async () => {}),
    showRewardVideoAd: vi.fn(async () => rewardResult),
    // Fire the Dismissed listener on the next tick so the services' awaitAdDismissed()
    // resolves (they only return after the ad has "left the screen").
    addListener: vi.fn(async (event: string, cb: () => void) => {
      if (event === 'adDismissed') setTimeout(cb, 0);
      return { remove: () => {} };
    }),
  },
}));

// Spy on the reset — the unit under test is "does each service call it?". Hoisted so it
// exists when the (hoisted) vi.mock factory below references it.
const { resetSpy } = vi.hoisted(() => ({ resetSpy: vi.fn(async () => {}) }));
vi.mock('./interstitialAdService', () => ({ resetInterstitialCounter: resetSpy }));

// gameStore: the services touch these; values/spies are inert for this test.
vi.mock('../store/gameStore', () => ({
  useGameStore: {
    getState: () => ({
      pauseTimer: () => {},
      markCluePillUsed: () => {},
      markTimePillUsed: () => {},
      activateRescueFlash: () => {},
      setTimeRemaining: () => {},
      timeRemaining: 20,
    }),
  },
}));

vi.mock('./analytics', () => ({ adImpression: vi.fn() }));

import { showRewarded } from './rewardedAdService';
import { showClueAd } from './rescueAdService';
import { showTimeExtensionAd } from './timeExtensionAdService';

beforeEach(() => {
  resetSpy.mockClear();
  rewardResult = { type: 'reward' }; // default: reward granted
});

describe('B-024 — interstitial reset on rewarded ad watch', () => {
  it('1. resets the interstitial counter after a gem reward (WATCH AD)', async () => {
    const outcome = await showRewarded();
    expect(outcome).toBe('rewarded');
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('2. resets the interstitial counter after a GET A CLUE reward', async () => {
    await showClueAd(5);
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('3. resets the interstitial counter after a LOW ON TIME reward', async () => {
    const rewarded = await showTimeExtensionAd();
    expect(rewarded).toBe(true);
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('4. does NOT reset when the ad is dismissed without a reward', async () => {
    rewardResult = null; // dismissed / no reward
    const outcome = await showRewarded();
    expect(outcome).toBe('dismissed');
    expect(resetSpy).not.toHaveBeenCalled();
  });
});
