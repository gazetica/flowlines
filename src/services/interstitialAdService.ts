// interstitialAdService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-018 / T-018b
//
// Interstitial shown on the Result screen with a DUAL trigger (T-018b): it fires
// when EITHER the 3-minute cap has elapsed since the last successful show OR at
// least 5 level completions have accrued since then — whichever comes first.
// Both counters (timestamp + completion count) persist in Preferences so the cap
// survives app restarts, and both reset together ONLY on a successful show. Kept
// separate from the LOCKED admob.ts; reuses that file's test ad-unit constant
// (no hardcoded / live IDs) without modifying it.

import { AdMob } from '@capacitor-community/admob';
import type { AdOptions } from '@capacitor-community/admob';
import { Preferences } from '@capacitor/preferences';
import { AD_UNITS } from './admob';
import { useSettingsStore } from '../store/settingsStore';
import * as analytics from './analytics';

const CAP_KEY = 'last_interstitial_shown'; // Date.now() of the last successful show
const COUNT_KEY = 'levels_since_last_ad';  // T-018b: completions since the last show
const CAP_MS = 3 * 60 * 1000;              // 3 minutes between shows (time trigger)
const COMPLETION_CAP = 5;                  // 5 completions (completion trigger)

const OPTIONS: AdOptions = {
  adId: AD_UNITS.INTERSTITIAL, // test interstitial unit from admob.ts — live in T-015
  isTesting: true,
};

// Whether a prepared interstitial is in hand (prepareInterstitial succeeded and
// has not yet been shown).
let prepared = false;

/** Parse a stringified integer Preferences value, defaulting to 0 when missing/NaN. */
function parseCount(value: string | null): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Preload an interstitial. Idempotent; no-op while one is already in hand. */
export async function loadInterstitial(): Promise<void> {
  if (prepared) return;
  try {
    await AdMob.prepareInterstitial(OPTIONS);
    prepared = true;
  } catch (err) {
    prepared = false;
    console.warn('[interstitialAdService] preload failed:', err);
  }
}

/**
 * T-018b: increment the persisted "levels since last ad" counter by one. Called by
 * ResultScreen on every mount (any mode, win or fail). Does NOT attempt to show an
 * ad — that decision belongs to maybeShowInterstitial(). Silent on error.
 */
export async function incrementLevelCount(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: COUNT_KEY });
    const next = parseCount(value) + 1;
    await Preferences.set({ key: COUNT_KEY, value: String(next) });
  } catch (err) {
    console.warn('[interstitialAdService] incrementLevelCount failed:', err);
  }
}

/**
 * Show the preloaded interstitial. Silent on no-fill / failure (the player did
 * not request it). On success resets BOTH counters — the show timestamp (drives
 * the time trigger) and the completion count (drives the completion trigger) —
 * and reloads the next ad. On failure neither counter resets, so the next mount
 * can retry immediately while the conditions still hold. Fire-and-forget — never
 * blocks the caller's render.
 */
export async function showInterstitial(): Promise<void> {
  try {
    if (!prepared) {
      await loadInterstitial();
      if (!prepared) return; // no fill — degrade silently
    }
    await AdMob.showInterstitial();
    analytics.adImpression('interstitial'); // T-020 (AC6)
    // T-018b: reset both triggers together, only on a confirmed show.
    await Preferences.set({ key: CAP_KEY, value: String(Date.now()) });
    await Preferences.set({ key: COUNT_KEY, value: '0' });
  } catch (err) {
    console.warn('[interstitialAdService] show failed:', err);
  } finally {
    prepared = false;
    void loadInterstitial(); // ready for the next Result screen
  }
}

/**
 * T-018b: the single decision + show entry point for the Result screen. Preloads,
 * then shows the interstitial when permitted. Order of checks:
 *   1. Remove Ads IAP owners never see an interstitial (T-018 guard, unchanged).
 *   2. Read both counters; show when timeElapsed >= 3min OR completions >= 5.
 * Conservative on a Preferences read error (no show). Fire-and-forget.
 */
export async function maybeShowInterstitial(): Promise<void> {
  // 1. IAP guard — Remove Ads owners are exempt regardless of either trigger.
  if (useSettingsStore.getState().removeAdsPurchased) return;

  await loadInterstitial(); // preload (idempotent)

  // 2. Dual trigger — either condition fires; first one reached wins.
  let lastShown = 0;
  let levelCount = 0;
  try {
    const [{ value: ts }, { value: cnt }] = await Promise.all([
      Preferences.get({ key: CAP_KEY }),
      Preferences.get({ key: COUNT_KEY }),
    ]);
    lastShown = parseCount(ts);
    levelCount = parseCount(cnt);
  } catch {
    return; // conservative: no show on read failure (T-018 pattern)
  }

  const timeElapsed = Date.now() - lastShown;
  const shouldShow = timeElapsed >= CAP_MS || levelCount >= COMPLETION_CAP;
  if (!shouldShow) return;

  await showInterstitial(); // shows once + resets both counters on success
}
