import { AdMob } from '@capacitor-community/admob';
import type { AdOptions, RewardAdOptions } from '@capacitor-community/admob';

export const AD_UNITS = {
  REWARDED:     'ca-app-pub-7932168293321470/8916890465',
  INTERSTITIAL: 'ca-app-pub-7932168293321470/5496520200',
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