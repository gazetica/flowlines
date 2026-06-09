// rescueAdService.ts
// Numtap | Gazetica Studio | Sprint 5 | Task F-005 (Part 7 — Rescue Flash)
//
// Loads and shows a rewarded ad for the RESCUE FLASH mechanic. On a successful
// watch it reveals the next N untapped tiles as amber (via gameStore). This service
// is COMPLETELY SEPARATE from rewardedAdService.ts (which handles the gem-hint
// "WATCH AD" button) — different state, different purpose. Do NOT merge them.
// It reuses the same AdMob rewarded ad-unit constant (AD_UNITS.REWARDED) only.

import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { RewardAdOptions } from '@capacitor-community/admob';
import { AD_UNITS } from './admob';
import { useGameStore } from '../store/gameStore';
import * as analytics from './analytics';

const RESCUE_OPTIONS: RewardAdOptions = {
  adId: AD_UNITS.REWARDED, // same live rewarded unit as the hint ad (separate flow)
};

// F-008 FIX 1: resolve once the rescue ad is actually DISMISSED (see the matching note
// in rewardedAdService) so the caller's 3-2-1 resume overlay runs after the ad is gone,
// not behind it. Listener removed on fire; safety timeout prevents a permanent pause.
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
 * GET A CLUE pill eligibility (F-009 — was isRescueEligible). ALL conditions must hold.
 * Pure + side-effect-free so GameScreen and the unit tests share one source of truth.
 *  1. grid larger than 3×3      2. level time limit > 15s
 *  3. in the final TWO-THIRDS of the clock (timeRemaining ≤ floor(timeLimit * 0.6667))
 *  4. ≥ 3 tiles left            5. the clue pill not already used this attempt
 *  6. timer is ON (not untimed Free Play)
 * F-005-FIX: the Remove Ads gate was REMOVED — the clue ad (a player-initiated, opt-in
 * rewarded ad) must be available to ALL players, including Remove-Ads owners. Only
 * auto interstitials are suppressed by removeAdsPurchased.
 */
export function isClueEligible(p: {
  playing: boolean;
  timed: boolean;
  gridSize: number;
  timeLimit: number;
  timeRemaining: number;
  tilesRemaining: number;
  used: boolean;
}): boolean {
  return (
    p.playing &&
    p.timed &&
    p.gridSize > 3 &&
    p.timeLimit > 15 &&
    p.timeRemaining <= Math.floor(p.timeLimit * 0.6667) &&
    p.tilesRemaining >= 3 &&
    !p.used
  );
}

/**
 * Reveal the next `tileCount` unfinished tiles (in tap-sequence order) as amber.
 * Delegates to gameStore, which computes them from engine.getSequence() + the live
 * grid. Rescue Flash never touches the gem balance — the ad watch IS the payment.
 */
export function activateRescueFlash(tileCount: number): void {
  useGameStore.getState().activateRescueFlash(tileCount);
}

/**
 * F-009: prepare + show a rewarded ad for the GET A CLUE pill. On 'rewarded' → reveal
 * the amber tiles AND mark the clue pill used for this attempt (one use). On dismiss /
 * no-fill / error → nothing (pill stays available). Native-only; no-ops on web.
 * Resolves only after the ad is DISMISSED so the caller's 3-2-1 resume overlay (F-008)
 * runs after the ad leaves the screen.
 */
export async function showClueAd(tileCount: number): Promise<void> {
  // F-008 FIX 1 Part A: freeze the live countdown before the ad shows. Resume is owned
  // by the caller's 3-2-1 countdown in GameScreen, so it is deliberately not called here.
  useGameStore.getState().pauseTimer();
  const dismissed = awaitAdDismissed(); // register before showing
  let shown = false;
  try {
    await AdMob.prepareRewardVideoAd(RESCUE_OPTIONS);
    const result = await AdMob.showRewardVideoAd(); // resolves on REWARD, not dismiss
    shown = true;
    if (result) {
      analytics.adImpression('rewarded'); // it is a rewarded ad (clue flow)
      activateRescueFlash(tileCount);
      useGameStore.getState().markCluePillUsed(); // F-009: one use per attempt
    }
    // dismissed / no reward → nothing happens (pill remains usable)
  } catch (err) {
    console.warn('[rescueAdService] showClueAd failed:', err);
  }
  // F-008 FIX 1: return only after the ad has left the screen, so the caller's resume
  // countdown overlay is shown to the player rather than running behind the ad.
  if (shown) await dismissed;
}
