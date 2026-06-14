// cdnLevelService.ts
// Flow Lines | Gazetica Studio | Sprint 5A Day 25.6 | Task FL-S5A-025c
//
// Optional OTA level override from Cloudflare R2. The bundled pack1–4.json are
// always the durable source of truth; this layer lets a newer pack version (or a
// future Pack 5+) load from the CDN when reachable. Every failure path returns
// null → "use bundled fallback". Never throws, never blocks the game (3s timeout),
// and caches in-memory for 24h so the CDN isn't hammered per level load.

import type { LevelData } from '../game/engine/LevelManager';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory (session-only) cache: packId → { levels, fetchedAt }. Intentionally
// NOT persisted — bundled levels are the durable fallback.
const cache = new Map<number, { levels: LevelData[]; fetchedAt: number }>();

/**
 * Fetch a pack from the CDN. Returns null on ANY failure (no base URL, network
 * error, abort/timeout, non-2xx, malformed/empty JSON) so the caller falls back
 * to the bundled pack. Reads VITE_CDN_BASE_URL at call time (env may be stubbed
 * in tests / absent in dev).
 */
export async function fetchPackFromCDN(
  packId: number,
  timeoutMs = 3000,
): Promise<LevelData[] | null> {
  const base = (import.meta.env.VITE_CDN_BASE_URL as string | undefined) ?? '';
  if (!base) return null;

  // Serve a fresh cached copy without re-fetching.
  const cached = cache.get(packId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.levels;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${base}/pack${packId}.json`, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    const levels = (await res.json()) as LevelData[];
    // Basic shape validation — must be a non-empty array.
    if (!Array.isArray(levels) || levels.length === 0) return null;

    cache.set(packId, { levels, fetchedAt: Date.now() });
    return levels;
  } catch {
    return null; // network error, abort/timeout, parse error → bundled fallback
  }
}

/** Clear the in-memory CDN cache (used by tests; also handy for a forced refresh). */
export function clearCDNCache(): void {
  cache.clear();
}
