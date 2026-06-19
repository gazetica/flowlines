// i18n.test.ts
// Flow Lines | Gazetica Studio | Sprint 5A | Task FL-5A-027

import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './i18n';

const LANGS = ['en', 'de', 'fr', 'ko', 'pt', 'es'] as const;
// Flow Lines key groups added in FL-5A-027 (alongside the legacy Numtap groups).
const FL_GROUPS = [
  'common', 'nav', 'splash', 'home', 'packs', 'levels', 'game', 'result',
  'daily', 'leaderboard', 'settings', 'store', 'buyhint', 'howtoplay', 'zen',
  'language', 'about', 'licences', 'difficulty',
];

describe('i18n setup (FL-5A-027)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); });

  it('all 6 languages load without error', () => {
    LANGS.forEach((lng) => {
      expect(i18n.hasResourceBundle(lng, 'translation')).toBe(true);
    });
  });

  it.each(LANGS)('all FL key groups present in %s', (lng) => {
    const bundle = i18n.getResourceBundle(lng, 'translation');
    FL_GROUPS.forEach((g) => expect(bundle).toHaveProperty(g));
  });

  it('full key parity — every EN Flow Lines key exists in every language', () => {
    const en = i18n.getResourceBundle('en', 'translation');
    const flatten = (obj: Record<string, unknown>, pre = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? flatten(v as Record<string, unknown>, `${pre}${k}.`) : [`${pre}${k}`],
      );
    const enFlKeys = FL_GROUPS.flatMap((g) => flatten({ [g]: en[g] }));
    const has = (obj: Record<string, unknown>, dotted: string): boolean => {
      let cur: unknown = obj;
      for (const part of dotted.split('.')) {
        if (!cur || typeof cur !== 'object' || !(part in (cur as object))) return false;
        cur = (cur as Record<string, unknown>)[part];
      }
      return true;
    };
    for (const lng of LANGS) {
      const bundle = i18n.getResourceBundle(lng, 'translation');
      const missing = enFlKeys.filter((k) => !has(bundle, k));
      expect(missing).toEqual([]);
    }
  });

  it('interpolation works: home.pack_level', () => {
    expect(i18n.t('home.pack_level', { pack: 1, level: 7 })).toBe('Pack 1 · Level 7');
  });

  it('language change applies translations (German common.next)', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('common.next')).toBe('WEITER');
    await i18n.changeLanguage('ko');
    expect(i18n.t('home.play_daily')).toBe('데일리 플레이');
    await i18n.changeLanguage('en');
    expect(i18n.t('common.next')).toBe('NEXT');
  });

  it('product name "Flow Lines" is never translated (home.title)', () => {
    LANGS.forEach((lng) => {
      const bundle = i18n.getResourceBundle(lng, 'translation');
      expect(bundle.home.title).toBe('FLOW LINES');
    });
  });
});
