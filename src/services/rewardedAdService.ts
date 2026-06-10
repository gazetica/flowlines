// rewardedAdService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-017
//
// Preload + show the rewarded ad used by the in-game Hint ("WATCH AD") button.
// Kept separate from the LOCKED admob.ts; it reuses that file's test ad-unit
// constant (no hardcoded / live IDs) but does not modify it. The ad is preloaded
// on game-screen mount and reloaded after every show, so it is ready on tap.

import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { RewardAdOptions } from '@capacitor-community/admob';
import { AD_UNITS } from './admob';
import { useGameStore } from '../store/gameStore';
import * as analytics from './analytics';

export type RewardedOutcome = 'rewarded' | 'dismissed' | 'unavailable';

const REWARD_OPTIONS: RewardAdOptions = {
  adId: AD_UNITS.REWARDED, // live rewarded unit from admob.ts (T-015)
};

// F-008 FIX 1: a promise that resolves once the rewarded ad is actually DISMISSED
// (leaves the screen). AdMob.showRewardVideoAd() resolves on REWARD, which can fire
// while the end card is still up — resuming then would run the caller's 3-2-1 overlay
// behind the ad and let the clock tick under it. By also awaiting Dismissed we hand
// control back only after the ad is gone. The listener is removed as soon as it fires
// (no accumulation across watches); a safety timeout guarantees we never hang paused.
function awaitAdDismissed(): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    let handle: { remove: () => void } | undefined;
    const done = () => {
      if (settled) return;
      settled = true;
      handle?.remove();
      resolve();
    };
    AdMob.addListener(RewardAdPluginEvents.Dismissed, done).then((h) => {
      handle = h;
      if (settled) h.remove();
    });
    setTimeout(done, 30000); // safety net — never leave the game paused forever
  });
}

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
  // F-008 FIX 1 Part A: freeze the live countdown before the ad takes over the screen
  // so a short level cannot expire mid-watch. Idempotent (mirrors pauseGame). The RESUME
  // is intentionally NOT done here — F-010: the caller flags adJustCompleted on close and
  // the player resumes manually via the RESUME GAME overlay, so the round is never left
  // frozen without a way back and never auto-resumes behind the ad.
  useGameStore.getState().pauseTimer();
  if (!prepared) {
    await loadRewarded();
    if (!prepared) return 'unavailable';
  }
  // Register the dismiss listener BEFORE showing so we never miss the event.
  const dismissed = awaitAdDismissed();
  let shown = false;
  let rewarded = false;
  try {
    const result = await AdMob.showRewardVideoAd(); // resolves on REWARD, not dismiss
    shown = true;
    rewarded = !!result;
    if (rewarded) analytics.adImpression('rewarded'); // T-020 (AC6)
  } catch (err) {
    console.warn('[rewardedAdService] show failed:', err);
  } finally {
    prepared = false;
    void loadRewarded(); // preload the next one for the following tap
  }
  // F-008 FIX 1: only hand back to the caller (which starts the 3-2-1 resume overlay)
  // after the ad has actually left the screen.
  if (shown) await dismissed;
  return shown ? (rewarded ? 'rewarded' : 'dismissed') : 'unavailable';
}
