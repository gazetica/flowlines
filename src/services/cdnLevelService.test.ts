// cdnLevelService.test.ts
// Flow Lines | Gazetica Studio | Sprint 5A Day 25.6 | Task FL-S5A-025c
//
// Covers the CDN level loader: env gating, every failure → null (never throws),
// the 24h in-memory cache, and the abort/timeout path. fetch is mocked globally
// and import.meta.env.VITE_CDN_BASE_URL is stubbed per test — no real network.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchPackFromCDN, clearCDNCache } from './cdnLevelService';

const BASE = 'https://cdn.test/flowlines';
const SAMPLE = [{ id: 'p3_001', pack: 3, grid: 8, colours: 7, optimalMoves: 64, dots: [] }];

function okResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

beforeEach(() => {
  clearCDNCache();
  vi.stubEnv('VITE_CDN_BASE_URL', BASE);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('cdnLevelService (FL-S5A-025c)', () => {
  it('1. returns null when VITE_CDN_BASE_URL is not set (and never fetches)', async () => {
    vi.stubEnv('VITE_CDN_BASE_URL', '');
    expect(await fetchPackFromCDN(3)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('2. returns null on a network error (fetch rejects)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network down'));
    expect(await fetchPackFromCDN(3)).toBeNull();
  });

  it('3. returns null on HTTP 404 (res.ok === false)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    expect(await fetchPackFromCDN(3)).toBeNull();
  });

  it('4. returns null on malformed JSON (res.json throws)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('bad json'); } } as unknown as Response);
    expect(await fetchPackFromCDN(3)).toBeNull();
  });

  it('5. returns null on an empty-array response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(okResponse([]));
    expect(await fetchPackFromCDN(3)).toBeNull();
  });

  it('6. returns parsed levels on a valid response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(okResponse(SAMPLE));
    const levels = await fetchPackFromCDN(3);
    expect(levels).toEqual(SAMPLE);
    expect(fetch).toHaveBeenCalledWith(`${BASE}/pack3.json`, expect.objectContaining({ signal: expect.anything() }));
  });

  it('7. returns the cached result on a second call within TTL (fetch once)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse(SAMPLE));
    const first = await fetchPackFromCDN(3);
    const second = await fetchPackFromCDN(3);
    expect(first).toEqual(SAMPLE);
    expect(second).toEqual(SAMPLE);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('8. returns null on timeout (request aborted)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    // Short timeout so the test resolves quickly via the real timer.
    expect(await fetchPackFromCDN(3, 30)).toBeNull();
  });
});
