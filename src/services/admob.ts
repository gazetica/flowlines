// LOCKED — LIVE IDS — DO NOT MODIFY — T-015 completed 21 June 2026
// Any change to this file requires explicit authorisation from main Claude thread
//
// Live AdMob IDs (Voraky Retail LLP, publisher pub-7932168293321470). The native
// SDK reads the App ID from android/app/src/main/AndroidManifest.xml (already live);
// APP_ID is mirrored here for reference. The two ad-unit IDs below ARE the live
// units used by every rewarded/interstitial request.
import { AdMob } from '@capacitor-community/admob';
import type { AdOptions, RewardAdOptions } from '@capacitor-community/admob';

// App ID — also set in AndroidManifest.xml (com.google.android.gms.ads.APPLICATION_ID).
export const APP_ID = 'ca-app-pub-7932168293321470~6161449781';

export const AD_UNITS = {
  REWARDED:     'ca-app-pub-7932168293321470/8878598689', // live rewarded unit (T-015)
  INTERSTITIAL: 'ca-app-pub-7932168293321470/1184455275', // live interstitial unit (T-015)
};

export async function initAdmob() {
  await AdMob.initialize({});
}

export async function showRewarded(onRewarded: () => void) {
  const options: RewardAdOptions = {
    adId: AD_UNITS.REWARDED,
  };
  await AdMob.prepareRewardVideoAd(options);
  const result = await AdMob.showRewardVideoAd();
  if (result) {
    onRewarded();
  }
}

export async function showInterstitial() {
  const options: AdOptions = {
    adId: AD_UNITS.INTERSTITIAL,
  };
  await AdMob.prepareInterstitial(options);
  await AdMob.showInterstitial();
}
