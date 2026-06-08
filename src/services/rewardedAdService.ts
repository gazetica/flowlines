// rewardedAdService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-017
//
// Preload + show the rewarded ad used by the in-game Hint ("WATCH AD") button.
// Kept separate from the LOCKED admob.ts; it reuses that file's test ad-unit
// constant (no hardcoded / live IDs) but does not modify it. The ad is preloaded
// on game-screen mount and reloaded after every show, so it is ready on tap.

import { AdMob } from '@capacitor-community/admob';
import type { RewardAdOptions } from '@capacitor-community/admob';
import { AD_UNITS } from './admob';
import * as analytics from './analytics';

export type RewardedOutcome = 'rewarded' | 'dismissed' | 'unavailable';

const REWARD_OPTIONS: RewardAdOptions = {
  adId: AD_UNITS.REWARDED, // live rewarded unit from admob.ts (T-015)
};

// Whether a prepared ad is currently in hand (prepareRewardVideoAd succeeded and
// has not yet been shown).
let prepared = false;

/** Preload a rewarded ad. Safe to call repeatedly; no-op while one is in hand. */
export async function loadRewarded(): Promise<void> {
  if (prepared) return;
  try {
    await AdMob.prepareRewardVideoAd(REWARD_OPTIONS);
    prepared = true;
  } catch (err) {
    prepared = false;
    console.warn('[rewardedAdService] preload failed:', err);
  }
}

/**
 * Show the preloaded rewarded ad and report the outcome:
 *  - 'rewarded'   — user watched to completion and earned the reward
 *  - 'dismissed'  — user closed/skipped before earning
 *  - 'unavailable'— no ad could be loaded/shown (no fill, no network, error)
 * Always reloads the next ad afterwards.
 */
export async function showRewarded(): Promise<RewardedOutcome> {
  if (!prepared) {
    await loadRewarded();
    if (!prepared) return 'unavailable';
  }
  let outcome: RewardedOutcome;
  try {
    const result = await AdMob.showRewardVideoAd();
    outcome = result ? 'rewarded' : 'dismissed';
    if (outcome === 'rewarded') analytics.adImpression('rewarded'); // T-020 (AC6)
  } catch (err) {
    console.warn('[rewardedAdService] show failed:', err);
    outcome = 'unavailable';
  } finally {
    prepared = false;
    void loadRewarded(); // preload the next one for the following tap
  }
  return outcome;
}
