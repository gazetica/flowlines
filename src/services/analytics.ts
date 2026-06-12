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

// ─── FL-S4-021: Flow Lines analytics events ──────────────────────────────────
// Distinct, fl_-prefixed names so they never collide with Numtap events above or
// Firebase reserved names (level_start/level_up etc.). Same fire-and-forget log().

export function trackLevelStart(p: {
  level_id: string;
  pack_id: number;
  grid_size: number;
  colour_count: number;
}): void {
  log('fl_level_start', {
    level_id: p.level_id,
    pack_id: p.pack_id,
    grid_size: p.grid_size,
    colour_count: p.colour_count,
  });
}

export function trackLevelComplete(p: {
  level_id: string;
  pack_id: number;
  moves: number;
  stars: number;
  score: number;
}): void {
  log('fl_level_complete', {
    level_id: p.level_id,
    pack_id: p.pack_id,
    moves: p.moves,
    stars: p.stars,
    score: p.score,
  });
}

export function trackLevelAbandon(p: { level_id: string; coverage_pct: number }): void {
  log('fl_level_abandon', { level_id: p.level_id, coverage_pct: p.coverage_pct });
}

export function trackHintRequested(p: { level_id: string; hints_used_this_level: number }): void {
  log('fl_hint_requested', { level_id: p.level_id, hints_used_this_level: p.hints_used_this_level });
}

export function trackAdImpression(p: { ad_type: 'rewarded' | 'interstitial' }): void {
  log('fl_ad_impression', { ad_type: p.ad_type });
}

export function trackIapPurchase(p: { product_id: string; value: number }): void {
  log('fl_iap_purchase', { product_id: p.product_id, value: p.value });
}

export function trackPackUnlocked(p: { pack_id: number }): void {
  log('fl_pack_unlocked', { pack_id: p.pack_id });
}
