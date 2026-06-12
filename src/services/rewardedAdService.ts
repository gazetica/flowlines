// rewardedAdService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task T-017
//
// Preload + show the rewarded ad used by the in-game Hint ("WATCH AD") button.
// Kept separate from the LOCKED admob.ts; it reuses that file's test ad-unit
// constant (no hardcoded / live IDs) but does not modify it. The ad is preloaded
// on game-screen mount and reloaded after every show, so it is ready on tap.

import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { RewardAdOptions } from '@capacitor-community/admob';
import { AD_UNITS } from './admob';
import { useGameStore } from '../store/gameStore';
import { resetInterstitialCounter } from './interstitialAdService';
import * as analytics from './analytics';

export type RewardedOutcome = 'rewarded' | 'dismissed' | 'unavailable';

const REWARD_OPTIONS: RewardAdOptions = {
  adId: AD_UNITS.REWARDED, // live rewarded unit from admob.ts (T-015)
};

// F-008 FIX 1: a promise that resolves once the rewarded ad is actually DISMISSED
// (leaves the screen). AdMob.showRewardVideoAd() resolves on REWARD, which can fire
// while the end card is still up — resuming then would run the caller's 3-2-1 overlay
// behind the ad and let the clock tick under it. By also awaiting Dismissed we hand
// control back only after the ad is gone. The listener is removed as soon as it fires
// (no accumulation across watches); a safety timeout guarantees we never hang paused.
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
    setTimeout(done, 30000); // safety net — never leave the game paused forever
  });
}

// Whether a prepared ad is currently in hand (prepareRewardVideoAd succeeded and
// has not yet been shown).
let prepared = false;

/** Preload a rewarded ad. Safe to call repeatedly; no-op while one is in hand. */
export async function loadRewarded(): Promise<void> {
  if (prepared) return;
  try {
    await AdMob.prepareRewardVideoAd(REWARD_OPTIONS);
    prepared = true;
  } catch (err) {
    prepared = false;
    console.warn('[rewardedAdService] preload failed:', err);
  }
}

/**
 * Show the preloaded rewarded ad and report the outcome:
 *  - 'rewarded'   — user watched to completion and earned the reward
 *  - 'dismissed'  — user closed/skipped before earning
 *  - 'unavailable'— no ad could be loaded/shown (no fill, no network, error)
 * Always reloads the next ad afterwards.
 */
export async function showRewarded(): Promise<RewardedOutcome> {
  // F-008 FIX 1 Part A: freeze the live countdown before the ad takes over the screen
  // so a short level cannot expire mid-watch. Idempotent (mirrors pauseGame). The RESUME
  // is intentionally NOT done here — F-010: the caller flags adJustCompleted on close and
  // the player resumes manually via the RESUME GAME overlay, so the round is never left
  // frozen without a way back and never auto-resumes behind the ad.
  useGameStore.getState().pauseTimer();
  if (!prepared) {
    await loadRewarded();
    if (!prepared) return 'unavailable';
  }
  // Register the dismiss listener BEFORE showing so we never miss the event.
  const dismissed = awaitAdDismissed();
  let shown = false;
  let rewarded = false;
  try {
    const result = await AdMob.showRewardVideoAd(); // resolves on REWARD, not dismiss
    shown = true;
    rewarded = !!result;
    if (rewarded) {
      analytics.adImpression('rewarded'); // T-020 (AC6)
      void resetInterstitialCounter(); // B-024: a watched rewarded ad defers the interstitial
    }
  } catch (err) {
    console.warn('[rewardedAdService] show failed:', err);
  } finally {
    prepared = false;
    void loadRewarded(); // preload the next one for the following tap
  }
  // F-008 FIX 1: only hand back to the caller (which starts the 3-2-1 resume overlay)
  // after the ad has actually left the screen.
  if (shown) await dismissed;
  return shown ? (rewarded ? 'rewarded' : 'dismissed') : 'unavailable';
}

// ─── FL-S4-019: Flow Lines HINT rewarded ad ──────────────────────────────────
// Separate, self-contained flow from Numtap's showRewarded above (no timer-freeze
// / RESUME overlay — Flow Lines hints are untimed). The in-game HINT button watches
// a rewarded ad; on reward, GameScene.showHint() pulses the optimal next cell.

import { useFlowGameStore } from '../store/flowGameStore';
import type { Cell, Colour, DotPair } from '../game/engine/GridEngine';

// isTesting: true MUST be removed before production (T-015 Day 34). Top-level const
// so the Day-34 grep over rewarded/interstitial services finds it immediately.
const isTesting = true;

const HINT_REWARD_OPTIONS: RewardAdOptions = {
  adId: AD_UNITS.REWARDED, // test rewarded unit from admob.ts (live IDs at T-015)
  isTesting,
};

// Whether a hint rewarded ad is preloaded (kept separate from the Numtap `prepared`
// flag above so the two flows never clobber each other's loaded ad).
let hintPrepared = false;

/** Preload the hint rewarded ad. Call on GameScreen mount so it's ready on tap. */
export async function loadHintAd(): Promise<void> {
  if (hintPrepared) return;
  try {
    await AdMob.prepareRewardVideoAd(HINT_REWARD_OPTIONS);
    hintPrepared = true;
  } catch (err) {
    hintPrepared = false;
    console.warn('[rewardedAdService] hint preload failed:', err);
  }
}

export interface HintLevel {
  grid: number;      // N (grid is N×N)
  dots: DotPair[];   // the level's dot pairs (endpoints)
}

/**
 * Greedy Manhattan hint (Sprint 4 — good enough, not optimal). Chooses the
 * most-stuck UNSOLVED colour (fewest cells placed) and returns the orthogonal
 * neighbour of its path head that moves closest to the target endpoint, skipping
 * cells already used by any colour. Reads live path state from flowGameStore.
 * Returns null if every colour is already connected.
 * TODO Sprint 5: use the full PathSolver for an optimal next cell.
 */
export function computeHintCell(
  level: HintLevel,
  paths: Record<string, Cell[]>,
): { row: number; col: number } | null {
  const N = level.grid;

  // Cells occupied by ANY colour — candidate neighbours must avoid these.
  const occupied = new Set<string>();
  for (const cells of Object.values(paths)) {
    for (const c of cells) occupied.add(`${c.row},${c.col}`);
  }

  let best: { row: number; col: number } | null = null;
  let bestPlaced = Infinity;
  let bestRemaining = -1;

  for (const dot of level.dots) {
    const colour = dot.colour as Colour;
    const path = paths[colour] ?? [];
    const ep1 = { row: dot.r1, col: dot.c1 };
    const ep2 = { row: dot.r2, col: dot.c2 };

    // Head = current frontier; target = the endpoint we still need to reach.
    let head: { row: number; col: number };
    let target: { row: number; col: number };
    let placed: number;
    if (path.length > 0) {
      const start = path[0];
      const startIsEp1 = start.row === ep1.row && start.col === ep1.col;
      target = startIsEp1 ? ep2 : ep1;
      head = path[path.length - 1];
      placed = path.length;
    } else {
      head = ep1;
      target = ep2;
      placed = 1; // only the endpoint is "placed"
    }

    // Already connected → skip.
    if (head.row === target.row && head.col === target.col) continue;

    const ownSet = new Set(path.map((c) => `${c.row},${c.col}`));
    const remaining = Math.abs(head.row - target.row) + Math.abs(head.col - target.col);

    // Best legal neighbour for this colour (closest to target by Manhattan).
    const neighbours = [
      { row: head.row - 1, col: head.col },
      { row: head.row + 1, col: head.col },
      { row: head.row, col: head.col - 1 },
      { row: head.row, col: head.col + 1 },
    ];
    let pick: { row: number; col: number } | null = null;
    let pickDist = Infinity;
    for (const nb of neighbours) {
      if (nb.row < 0 || nb.row >= N || nb.col < 0 || nb.col >= N) continue;
      const key = `${nb.row},${nb.col}`;
      const isTarget = nb.row === target.row && nb.col === target.col;
      if (ownSet.has(key)) continue;                 // don't backtrack own path
      if (occupied.has(key) && !isTarget) continue;  // blocked by another colour
      const d = Math.abs(nb.row - target.row) + Math.abs(nb.col - target.col);
      if (d < pickDist) { pickDist = d; pick = nb; }
    }
    if (!pick) continue;

    // Prefer the most-stuck colour (fewest placed); tie-break by farther to go.
    if (placed < bestPlaced || (placed === bestPlaced && remaining > bestRemaining)) {
      best = pick;
      bestPlaced = placed;
      bestRemaining = remaining;
    }
  }

  return best;
}

/**
 * Show the HINT rewarded ad. The hint cell is computed BEFORE the ad shows (the
 * watch takes 5–30s) so it's ready instantly on reward. On reward, fires
 * onHintReady(row, col) — GameScreen then calls GameScene.showHint() and bumps
 * hintsUsed. No gems are awarded (FL rule: the ad replaces the gem cost).
 */
export async function showHintAd(
  level: HintLevel,
  onHintReady: (row: number, col: number) => void,
): Promise<RewardedOutcome> {
  // TODO Sprint 4 Day 23: analytics hint_requested event.
  // TODO UMP: gate on consent once consentService is wired into FL.
  const paths = useFlowGameStore.getState().paths;
  const hint = computeHintCell(level, paths);

  if (!hintPrepared) {
    await loadHintAd();
    if (!hintPrepared) return 'unavailable';
  }

  let shown = false;
  let rewarded = false;
  try {
    const result = await AdMob.showRewardVideoAd();
    shown = true;
    rewarded = !!result;
    if (rewarded) analytics.adImpression('rewarded');
  } catch (err) {
    console.warn('[rewardedAdService] hint show failed:', err);
  } finally {
    hintPrepared = false;
    void loadHintAd(); // preload the next one
  }

  if (shown && rewarded && hint) onHintReady(hint.row, hint.col);
  return shown ? (rewarded ? 'rewarded' : 'dismissed') : 'unavailable';
}
