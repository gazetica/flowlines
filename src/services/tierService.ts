// tierService.ts
// Numtap | Gazetica Studio | Sprint 4 | Task F-001b
//
// Player tier = how far through the gated campaigns they've come:
//   completed Campaign 2 → 'expert', completed Campaign 1 → 'pro', else null.
// The LOCAL player's tier is cached in Preferences ('player_tier'), set by the
// Campaign screen once they clear C1/C2 — so it works offline. OTHER players'
// tiers come from the Supabase campaign_completions table (one batched query),
// and DEGRADE GRACEFULLY to no-tag when the table isn't there yet.

import { supabase } from './supabase';
import { Preferences } from '@capacitor/preferences';

export type Tier = 'expert' | 'pro';

// Tag colours used by the React components (Settings/Leaderboard/LeaderPanel/HUD).
export const TIER_COLORS: Record<Tier, string> = {
  pro: '#9B59B6',
  expert: '#00f5ff',
};

const TIER_KEY = 'player_tier';
let _cache: Tier | null = null;

function tierFromMaxCampaign(maxCampaignId: number): Tier | null {
  if (maxCampaignId >= 2) return 'expert';
  if (maxCampaignId >= 1) return 'pro';
  return null;
}

/** One player's tier from Supabase campaign_completions. null on any error. */
export async function getTier(alias: string): Promise<Tier | null> {
  if (!alias) return null;
  try {
    const { data, error } = await supabase
      .from('campaign_completions')
      .select('campaign_id')
      .eq('player_alias', alias);
    if (error || !data || !data.length) return null;
    return tierFromMaxCampaign(Math.max(...data.map((r) => r.campaign_id as number)));
  } catch {
    return null;
  }
}

/** Batched tier lookup for many aliases in ONE query → { alias: tier }. */
export async function getTiers(aliases: string[]): Promise<Record<string, Tier>> {
  const out: Record<string, Tier> = {};
  const uniq = [...new Set(aliases.filter(Boolean))];
  if (!uniq.length) return out;
  try {
    const { data, error } = await supabase
      .from('campaign_completions')
      .select('player_alias, campaign_id')
      .in('player_alias', uniq);
    if (error || !data) return out;
    for (const r of data as { player_alias: string; campaign_id: number }[]) {
      const t = tierFromMaxCampaign(r.campaign_id);
      if (!t) continue;
      // expert outranks pro
      if (!out[r.player_alias] || (out[r.player_alias] === 'pro' && t === 'expert')) {
        out[r.player_alias] = t;
      }
    }
    return out;
  } catch {
    return out;
  }
}

/** Synchronous read of the cached local tier (call loadLocalTier() once first). */
export function getLocalTier(): Tier | null {
  return _cache;
}

/** Load the local tier from Preferences into the cache. Returns it. */
export async function loadLocalTier(): Promise<Tier | null> {
  try {
    const { value } = await Preferences.get({ key: TIER_KEY });
    _cache = value === 'expert' || value === 'pro' ? value : null;
  } catch {
    _cache = null;
  }
  return _cache;
}

/** Persist the local tier (never downgrades expert → pro). */
export function setLocalTier(tier: Tier): void {
  if (_cache === 'expert' && tier === 'pro') return;
  _cache = tier;
  void Preferences.set({ key: TIER_KEY, value: tier });
}

/** Plain-text alias + tier, e.g. "Mahendra (PRO)". (Coloured rendering uses JSX.) */
export function formatAliasWithTier(alias: string, tier: Tier | null): string {
  return tier ? `${alias} (${tier.toUpperCase()})` : alias;
}
