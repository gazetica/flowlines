// analytics.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-020
//
// Centralised Firebase Analytics events. Thin wrapper: each function logs ONE
// event and nothing else (no business logic). Native-only (the plugin has no web
// implementation); fire-and-forget with errors swallowed so analytics can never
// affect gameplay.

import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-community/firebase-analytics';

function log(name: string, params: Record<string, unknown>): void {
  if (!Capacitor.isNativePlatform()) return;
  FirebaseAnalytics.logEvent({ name, params }).catch((err) =>
    console.warn(`[analytics] ${name} failed:`, err)
  );
}

// App opened (App.tsx mount, once per launch).
// NB: 'session_start' is a Firebase-reserved name (rejected for manual logging
// and auto-collected by Firebase), so we emit a custom 'app_session_start'.
export function sessionStart(): void {
  log('app_session_start', {});
}

// Player wins a level.
export function levelComplete(p: {
  levelId: number;
  gridSize: number;
  stars: number;
  score: number;
  timeElapsed: number;
}): void {
  log('level_complete', {
    level_id: p.levelId,
    grid_size: p.gridSize,
    stars: p.stars,
    score: p.score,
    time_elapsed: p.timeElapsed,
  });
}

// Timer expires / game over.
export function levelFail(p: { levelId: number; gridSize: number }): void {
  log('level_fail', { level_id: p.levelId, grid_size: p.gridSize });
}

// Correct tile tap.
export function tapCorrect(p: { levelId: number; tapCount: number }): void {
  log('tap_correct', { level_id: p.levelId, tap_count: p.tapCount });
}

// Wrong tile tap.
export function tapWrong(p: { levelId: number }): void {
  log('tap_wrong', { level_id: p.levelId });
}

// Ad shown (rewarded or interstitial).
// NB: 'ad_impression' is a Firebase-reserved name (rejected for manual logging
// and auto-collected by the Ads SDK), so we emit a custom 'app_ad_impression'.
export function adImpression(adType: 'rewarded' | 'interstitial'): void {
  log('app_ad_impression', { ad_type: adType });
}

// IAP purchase complete. T-020 ships the call-site; it fires for real in T-019
// once the purchase-completion handler is wired.
export function iapPurchase(p: { productId: string; value: number }): void {
  log('iap_purchase', { product_id: p.productId, value: p.value });
}
