// timeExtensionAdService.ts
// Numtap | Gazetica Studio | Sprint 5 | Task F-009 (LOW ON TIME pill)
//
// Loads and shows a rewarded ad for the LOW ON TIME mechanic. On a successful watch it
// adds +15 seconds to the live countdown (via gameStore.setTimeRemaining) and marks the
// time pill used for this attempt. COMPLETELY SEPARATE from rescueAdService.ts (GET A
// CLUE / amber reveal) and rewardedAdService.ts (gem WATCH AD) — different reward, same
// AdMob rewarded ad-unit constant only (AD_UNITS.REWARDED).

import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { RewardAdOptions } from '@capacitor-community/admob';
import { AD_UNITS } from './admob';
import { useGameStore } from '../store/gameStore';
import * as analytics from './analytics';

// F-009: seconds granted by one LOW ON TIME watch.
export const TIME_EXTENSION_SECONDS = 15;

const TIME_OPTIONS: RewardAdOptions = {
  adId: AD_UNITS.REWARDED, // same live rewarded unit as the other rewarded flows
};

// Resolve once the ad is actually DISMISSED (mirrors rescueAdService) so the caller's
// 3-2-1 resume overlay (F-008) runs after the ad is gone, not behind it. Listener
// removed on fire; safety timeout prevents a permanent pause if the event is missed.
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
    setTimeout(done, 30000);
  });
}

/**
 * LOW ON TIME pill eligibility (F-009). ALL conditions must hold. Pure + side-effect-free
 * so GameScreen and the unit tests share one source of truth.
 *  1. grid larger than 3×3        2. level time limit > 15s
 *  3. in the final third of the clock (timeRemaining ≤ floor(timeLimit * 0.3333))
 *  4. the time pill not already used this attempt
 *  5. timer is ON (not untimed Free Play)
 * Like the clue pill, Remove Ads does NOT suppress it (opt-in rewarded ad).
 */
export function isTimeExtensionEligible(p: {
  playing: boolean;
  timed: boolean;
  gridSize: number;
  timeLimit: number;
  timeRemaining: number;
  used: boolean;
}): boolean {
  return (
    p.playing &&
    p.timed &&
    p.gridSize > 3 &&
    p.timeLimit > 15 &&
    p.timeRemaining <= Math.floor(p.timeLimit * 0.3333) &&
    !p.used
  );
}

/**
 * Prepare + show a rewarded ad for the time extension. On 'rewarded' → add +15s to the
 * store's timeRemaining and mark the time pill used; returns true so the caller can
 * apply the matching +15s to the on-screen timer and show the float animation. On
 * dismiss / no-fill / error → returns false (pill stays usable). Native-only; no-ops on
 * web. Resolves only after the ad is DISMISSED (so the F-008 resume overlay shows after).
 */
export async function showTimeExtensionAd(): Promise<boolean> {
  // F-008 FIX 1 Part A: freeze the live countdown before the ad shows. Resume is owned
  // by the caller's 3-2-1 countdown in GameScreen, so it is deliberately not called here.
  useGameStore.getState().pauseTimer();
  const dismissed = awaitAdDismissed(); // register before showing
  let shown = false;
  let rewarded = false;
  try {
    await AdMob.prepareRewardVideoAd(TIME_OPTIONS);
    const result = await AdMob.showRewardVideoAd(); // resolves on REWARD, not dismiss
    shown = true;
    if (result) {
      rewarded = true;
      analytics.adImpression('rewarded'); // it is a rewarded ad (time-extension flow)
      const { timeRemaining, setTimeRemaining, markTimePillUsed } = useGameStore.getState();
      setTimeRemaining(timeRemaining + TIME_EXTENSION_SECONDS);
      markTimePillUsed(); // F-009: one use per attempt
    }
  } catch (err) {
    console.warn('[timeExtensionAdService] showTimeExtensionAd failed:', err);
  }
  // F-008 FIX 1: return only after the ad has left the screen.
  if (shown) await dismissed;
  return rewarded;
}
