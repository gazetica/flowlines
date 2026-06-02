import { AdMob } from '@capacitor-community/admob';
import type { AdOptions, RewardAdOptions } from '@capacitor-community/admob';

export const AD_UNITS = {
  REWARDED:     'ca-app-pub-3940256099942544/5224354917',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
};

export async function initAdmob() {
  await AdMob.initialize({});
}

export async function showRewarded(onRewarded: () => void) {
  const options: RewardAdOptions = {
    adId: AD_UNITS.REWARDED,
    isTesting: true,
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
    isTesting: true,
  };
  await AdMob.prepareInterstitial(options);
  await AdMob.showInterstitial();
}