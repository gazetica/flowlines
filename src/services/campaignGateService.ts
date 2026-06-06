// campaignGateService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task F-001
//
// Community-gate backend for Campaign 2 (Pro) and Campaign 3 (Expert). A campaign
// unlocks once enough players have completed the PREVIOUS campaign:
//   - C2 unlocks when campaign-1 completions >= gate_config['campaign1_completion_gate']
//   - C3 unlocks when campaign-2 completions >= gate_config['campaign2_completion_gate']
// …or when the player has bought Early Access (Preferences flag, set by IAP in T-019).
//
// Supabase tables (gate_config, campaign_completions) are created server-side via
// the dashboard (anon key is SELECT/INSERT only). Every call is DEFENSIVE: if a
// table is absent or the network fails, completion counts fall back to 0 and the
// threshold to DEFAULT_THRESHOLD, so the UI degrades to a clean "0 / 1,000" locked
// state rather than throwing.

import { supabase } from './supabase';
import { Preferences } from '@capacitor/preferences';

const DEFAULT_THRESHOLD = 1000;

// Campaign N unlocks based on the completions of campaign N-1.
const PREREQ_CAMPAIGN: Record<number, number> = { 2: 1, 3: 2 };
// The gate_config row holding each campaign's unlock threshold.
const GATE_KEY: Record<number, string> = {
  2: 'campaign1_completion_gate',
  3: 'campaign2_completion_gate',
};
// The Preferences flag set by the Early-Access IAP (T-019).
const PURCHASE_KEY: Record<number, string> = {
  2: 'campaign2_purchased',
  3: 'campaign3_purchased',
};

/**
 * Record that `alias` finished campaign `campaignId`. Idempotent: the table has a
 * UNIQUE(player_alias, campaign_id) constraint, so duplicates are ignored. Safe to
 * call repeatedly (e.g. every time the player opens the Campaign screen).
 */
export async function recordCompletion(alias: string, campaignId: number): Promise<void> {
  if (!alias) return;
  try {
    const { error } = await supabase
      .from('campaign_completions')
      .upsert(
        { player_alias: alias, campaign_id: campaignId },
        { onConflict: 'player_alias,campaign_id', ignoreDuplicates: true }
      );
    if (error) console.warn('[gate] recordCompletion:', error.message);
  } catch (e) {
    console.warn('[gate] recordCompletion failed:', e);
  }
}

/** Number of players who have completed campaign `campaignId`. 0 on any error. */
export async function getCompletionCount(campaignId: number): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('campaign_completions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);
    if (error) {
      console.warn('[gate] getCompletionCount:', error.message);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.warn('[gate] getCompletionCount failed:', e);
    return 0;
  }
}

/** Unlock threshold for `campaignId` from gate_config. DEFAULT_THRESHOLD on error. */
export async function getGateThreshold(campaignId: number): Promise<number> {
  const key = GATE_KEY[campaignId];
  if (!key) return DEFAULT_THRESHOLD;
  try {
    const { data, error } = await supabase
      .from('gate_config')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return DEFAULT_THRESHOLD;
    return typeof data.value === 'number' ? data.value : DEFAULT_THRESHOLD;
  } catch (e) {
    console.warn('[gate] getGateThreshold failed:', e);
    return DEFAULT_THRESHOLD;
  }
}

/** True when enough players completed the prerequisite campaign to unlock this one. */
export async function isCampaignUnlocked(campaignId: number): Promise<boolean> {
  const prereq = PREREQ_CAMPAIGN[campaignId];
  if (!prereq) return false;
  const [count, threshold] = await Promise.all([
    getCompletionCount(prereq),
    getGateThreshold(campaignId),
  ]);
  return count >= threshold;
}

/** True when the player bought Early Access for `campaignId` (Preferences flag). */
export async function isPurchased(campaignId: number): Promise<boolean> {
  const key = PURCHASE_KEY[campaignId];
  if (!key) return false;
  try {
    const { value } = await Preferences.get({ key });
    return value === 'true';
  } catch {
    return false;
  }
}
