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
  adId: AD_UNITS.INTERSTITIAL, // live interstitial unit from admob.ts (T-015)
};

// Whether a prepared interstitial is in hand (prepareInterstitial succeeded and
// has not yet been shown).
let prepared = false;

/** Parse a stringified integer Preferences value, defaulting to 0 when missing/NaN. */
function parseCount(value: string | null): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * B-024: reset BOTH interstitial triggers — the completion count back to 0 and the
 * "last shown" timestamp back to now (which restarts the 3-minute clock). Identical to
 * the reset a successful interstitial show performs, so watching ANY rewarded ad
 * (gem / clue / time) buys the player the same fresh window: no interstitial until 5
 * more completions OR 3 more minutes. Fire-and-forget; silent on a Preferences error.
 */
export async function resetInterstitialCounter(): Promise<void> {
  try {
    await Promise.all([
      Preferences.set({ key: CAP_KEY, value: String(Date.now()) }),
      Preferences.set({ key: COUNT_KEY, value: '0' }),
    ]);
  } catch (err) {
    console.warn('[interstitialAdService] resetInterstitialCounter failed:', err);
  }
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
    // T-018b: reset both triggers together, only on a confirmed show (B-024: same reset
    // a rewarded-ad watch performs).
    await resetInterstitialCounter();
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

// ─── FL-S4-019: Flow Lines result-screen interstitial (in-memory triggers) ───
// Self-contained entry point called from ResultScreen.tsx on mount. Uses module-
// level (not persisted) counters per the FL spec, distinct from the Numtap
// persisted path above. Trigger: 5 completions OR 3 minutes since the last show,
// AND not Remove-Ads. FL-5B-005b (Registry v1.2 §8): Zen also shows interstitials,
// on its own independent counter pair (zenCompletionCount / lastZenInterstitialTime).

// isTesting: true MUST be removed before production (T-015 Day 34 grep target).
const isTesting = false;

let levelCompletionCount = 0;
let lastInterstitialTime = Date.now(); // start the 3-minute clock at app load
let zenCompletionCount = 0;
let lastZenInterstitialTime = Date.now(); // Zen clock — wall-clock since cold start

const FL_OPTIONS: AdOptions = {
  adId: AD_UNITS.INTERSTITIAL, // live interstitial unit from admob.ts (T-015)
  isTesting,
};

// FL-5B-008: preload state. Live ads take ~4–5 s to load; loading only at show
// time let the ad land after the player had already tapped NEXT (mid-game ad).
// One load in flight at a time; a loaded ad is held until shown.
let flAdReady = false;
let flAdLoading: Promise<void> | null = null;

/**
 * FL-5B-008: load an interstitial ahead of time so the result-screen show is
 * near-instant. No-op for Remove-Ads owners, or when an ad is already loaded or
 * loading. Silent on failure — onLevelComplete retries the load if needed.
 */
export function preloadInterstitial(removeAdsPurchased: boolean): Promise<void> {
  if (removeAdsPurchased || flAdReady) return Promise.resolve();
  if (!flAdLoading) {
    flAdLoading = AdMob.prepareInterstitial(FL_OPTIONS)
      .then(() => { flAdReady = true; })
      .catch((err) => { console.warn('[interstitialAdService] FL preload failed:', err); })
      .finally(() => { flAdLoading = null; });
  }
  return flAdLoading;
}

/**
 * Call on every level completion (ResultScreen mount). Increments the in-memory
 * completion count, then shows an interstitial when permitted — 5 completions OR
 * 3 minutes elapsed, never for Remove-Ads owners. Zen and Campaign/Classic each
 * use their own counter pair and never affect each other. Resets the active pair
 * only on a confirmed show. Fire-and-forget; silent on no-fill / error.
 *
 * FL-5B-008: `mountedRef` is the caller's "still on the ResultScreen" flag. It is
 * checked after the ad is loaded and immediately before showing — if the player
 * has navigated away, nothing is shown and no counter resets (the held ad is
 * shown on a later result screen instead).
 */
export async function onLevelComplete(
  isZenMode: boolean,
  removeAdsPurchased: boolean,
  mountedRef: { current: boolean } = { current: true },
): Promise<void> {
  if (isZenMode) zenCompletionCount += 1; // counted synchronously, before any await
  else levelCompletionCount += 1;

  if (removeAdsPurchased) return; // IAP guard — suppresses interstitials only

  const now = Date.now();
  const shouldShow = isZenMode
    ? zenCompletionCount >= COMPLETION_CAP || now - lastZenInterstitialTime >= CAP_MS
    : levelCompletionCount >= COMPLETION_CAP || now - lastInterstitialTime >= CAP_MS;
  if (!shouldShow) return;

  await preloadInterstitial(false); // joins the in-flight preload, or loads now
  if (!flAdReady) return;           // no fill — retry next completion
  if (!mountedRef.current) return;  // player left during the load — never show mid-game

  try {
    flAdReady = false; // a shown (or failed-to-show) ad is consumed either way
    await AdMob.showInterstitial();
    analytics.adImpression('interstitial');
  } catch (err) {
    console.warn('[interstitialAdService] FL onLevelComplete failed:', err);
    return; // no reset on failure — retry next completion while conditions hold
  }

  if (isZenMode) {
    zenCompletionCount = 0;
    lastZenInterstitialTime = Date.now();
  } else {
    levelCompletionCount = 0;
    lastInterstitialTime = Date.now();
  }
}

/**
 * FL-UX-D-019: reset the FL interstitial gate after a rewarded ad is watched —
 * completion count → 0 and the 3-minute clock → now. Mirrors the reset a confirmed
 * interstitial show performs, so watching a rewarded ad buys the player a fresh
 * window and avoids back-to-back rewarded → interstitial exposure on the next result.
 * FL-5B-005b: resets the Zen pair too — WATCH AD is available in Zen as well.
 */
export function resetInterstitialGate(): void {
  levelCompletionCount = 0;
  lastInterstitialTime = Date.now();
  zenCompletionCount = 0;
  lastZenInterstitialTime = Date.now();
}
