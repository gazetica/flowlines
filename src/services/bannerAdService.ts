// bannerAdService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task B-008
//
// ResultScreen banner ad. Kept separate from the LOCKED admob.ts (which is the
// init + rewarded/interstitial unit constants). Uses Google's standard TEST
// banner unit — swapped to the live banner in T-015 (the live unit must first be
// created in the AdMob console; see sprint-log). Adaptive banner pinned to the
// bottom of the screen. Show/hide are driven by ResultScreen mount/unmount.

import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { BannerAdOptions } from '@capacitor-community/admob';

// TEST banner unit (Google's public test ID). NOT a live publisher ID — stays
// test until T-015, same rule as the rewarded/interstitial units.
const BANNER_OPTIONS: BannerAdOptions = {
  adId: 'ca-app-pub-3940256099942544/6300978111',
  adSize: BannerAdSize.ADAPTIVE_BANNER,
  position: BannerAdPosition.BOTTOM_CENTER,
  margin: 0,
  isTesting: true,
};

// Whether a banner is currently displayed (guards double-show / stray removes).
let shown = false;

/** Show the ResultScreen banner. Idempotent; silent on failure (no-fill etc.). */
export async function showResultBanner(): Promise<void> {
  if (shown) return;
  try {
    await AdMob.showBanner(BANNER_OPTIONS);
    shown = true;
  } catch (err) {
    console.warn('[bannerAdService] showBanner failed:', err);
  }
}

/** Remove the banner (ResultScreen unmount). Silent if none is showing. */
export async function hideResultBanner(): Promise<void> {
  if (!shown) return;
  try {
    await AdMob.removeBanner();
  } catch (err) {
    console.warn('[bannerAdService] removeBanner failed:', err);
  } finally {
    shown = false;
  }
}
