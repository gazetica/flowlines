// interstitialAdService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-018
//
// Interstitial shown on the Result screen, frequency-capped to one per 3 minutes
// (timestamp persisted in Preferences, so the cap survives app restarts). Kept
// separate from the LOCKED admob.ts; reuses that file's test ad-unit constant
// (no hardcoded / live IDs) without modifying it.

import { AdMob } from '@capacitor-community/admob';
import type { AdOptions } from '@capacitor-community/admob';
import { Preferences } from '@capacitor/preferences';
import { AD_UNITS } from './admob';
import * as analytics from './analytics';

const CAP_KEY = 'last_interstitial_shown';
const CAP_MS = 3 * 60 * 1000; // 3 minutes between shows

const OPTIONS: AdOptions = {
  adId: AD_UNITS.INTERSTITIAL, // test interstitial unit from admob.ts — live in T-015
  isTesting: true,
};

// Whether a prepared interstitial is in hand (prepareInterstitial succeeded and
// has not yet been shown).
let prepared = false;

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
 * True when at least the 3-minute cap has elapsed since the last successful show
 * (or none has ever been shown). Conservative on error (returns false → no show).
 */
export async function isCapElapsed(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: CAP_KEY });
    if (!value) return true;
    const last = Number(value);
    if (Number.isNaN(last)) return true;
    return Date.now() - last >= CAP_MS;
  } catch {
    return false;
  }
}

/**
 * Show the preloaded interstitial. Silent on no-fill / failure (the player did
 * not request it). Persists the show timestamp on success (drives the cap) and
 * reloads the next ad. Fire-and-forget — never blocks the caller's render.
 */
export async function showInterstitial(): Promise<void> {
  try {
    if (!prepared) {
      await loadInterstitial();
      if (!prepared) return; // no fill — degrade silently
    }
    await AdMob.showInterstitial();
    analytics.adImpression('interstitial'); // T-020 (AC6)
    await Preferences.set({ key: CAP_KEY, value: String(Date.now()) });
  } catch (err) {
    console.warn('[interstitialAdService] show failed:', err);
  } finally {
    prepared = false;
    void loadInterstitial(); // ready for the next Result screen
  }
}
