// bannerAdService.test.ts
// Numtap | Gazetica Studio | Sprint 4 | Task B-008
//
// The ResultScreen banner glue: correct test unit/size/position, show idempotency,
// and remove behaviour. Each test re-imports the module so its `shown` flag is
// fresh (vi.mock persists across resetModules; the factory re-runs new spies).

import { describe, it, expect, vi } from 'vitest';

vi.mock('@capacitor-community/admob', () => ({
  AdMob: { showBanner: vi.fn(async () => {}), removeBanner: vi.fn(async () => {}) },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

async function fresh() {
  vi.resetModules();      // fresh service module → its `shown` flag resets to false
  vi.clearAllMocks();     // reset the (cached) AdMob spy call counts per test
  const admob = await import('@capacitor-community/admob');
  const svc = await import('./bannerAdService');
  return { AdMob: admob.AdMob as unknown as { showBanner: ReturnType<typeof vi.fn>; removeBanner: ReturnType<typeof vi.fn> }, svc };
}

describe('bannerAdService (B-008)', () => {
  it('showResultBanner shows the banner once with the test unit/size/position', async () => {
    const { AdMob, svc } = await fresh();
    await svc.showResultBanner();
    expect(AdMob.showBanner).toHaveBeenCalledTimes(1);
    const opts = AdMob.showBanner.mock.calls[0][0];
    expect(opts.adId).toBe('ca-app-pub-3940256099942544/6300978111');
    expect(opts.adSize).toBe('ADAPTIVE_BANNER');
    expect(opts.position).toBe('BOTTOM_CENTER');
    expect(opts.isTesting).toBe(true);
  });

  it('showResultBanner is idempotent (no double show)', async () => {
    const { AdMob, svc } = await fresh();
    await svc.showResultBanner();
    await svc.showResultBanner();
    expect(AdMob.showBanner).toHaveBeenCalledTimes(1);
  });

  it('hideResultBanner removes a shown banner and allows re-show', async () => {
    const { AdMob, svc } = await fresh();
    await svc.showResultBanner();
    await svc.hideResultBanner();
    expect(AdMob.removeBanner).toHaveBeenCalledTimes(1);
    await svc.showResultBanner();
    expect(AdMob.showBanner).toHaveBeenCalledTimes(2);
  });

  it('hideResultBanner is a no-op when nothing is shown', async () => {
    const { AdMob, svc } = await fresh();
    await svc.hideResultBanner();
    expect(AdMob.removeBanner).not.toHaveBeenCalled();
  });
});
