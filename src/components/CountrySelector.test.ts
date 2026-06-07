// CountrySelector.test.ts
// Numtap | Gazetica Studio | Sprint 4 | Task B-006
//
// Country list expansion: completeness, presence of key countries, alphabetical
// sort, and the shared search filter.

import { describe, it, expect } from 'vitest';
import { COUNTRIES, filterCountries } from './CountrySelector';
import { countryFlag } from '../utils/countryFlag';

describe('CountrySelector country list (B-006)', () => {
  it('1. has at least 140 countries', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(140);
  });

  it('2. India is present with the correct flag', () => {
    const india = COUNTRIES.find((c) => c.code === 'IN');
    expect(india).toBeDefined();
    expect(india!.name).toBe('India');
    expect(countryFlag('IN')).toBe('🇮🇳');
  });

  it('3. Germany is present with the correct flag', () => {
    const de = COUNTRIES.find((c) => c.code === 'DE');
    expect(de).toBeDefined();
    expect(de!.name).toBe('Germany');
    expect(countryFlag('DE')).toBe('🇩🇪');
  });

  it('4. Saudi Arabia is present', () => {
    const sa = COUNTRIES.find((c) => c.code === 'SA');
    expect(sa).toBeDefined();
    expect(sa!.name).toBe('Saudi Arabia');
  });

  it('5. every entry has a non-empty 2-letter code, name, and derived flag', () => {
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.name.trim().length).toBeGreaterThan(0);
      expect(countryFlag(c.code).length).toBeGreaterThan(0);
    }
  });

  it('6. is sorted alphabetically by name (English)', () => {
    expect(COUNTRIES[0].name.localeCompare(COUNTRIES[1].name)).toBeLessThan(0);
    for (let i = 1; i < COUNTRIES.length; i++) {
      expect(COUNTRIES[i - 1].name.localeCompare(COUNTRIES[i].name)).toBeLessThanOrEqual(0);
    }
  });

  it('extra: no duplicate country codes', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('CountrySelector search filter (B-006)', () => {
  it('7. filtering "India" returns exactly India', () => {
    const r = filterCountries('India');
    expect(r).toHaveLength(1);
    expect(r[0].code).toBe('IN');
  });

  it('8. filtering "zzz" returns an empty list (no crash)', () => {
    expect(filterCountries('zzz')).toEqual([]);
  });

  it('extra: filter is case-insensitive and matches code', () => {
    expect(filterCountries('saudi')[0].code).toBe('SA');
    expect(filterCountries('kr').some((c) => c.code === 'KR')).toBe(true);
  });

  it('extra: empty query returns the full list', () => {
    expect(filterCountries('').length).toBe(COUNTRIES.length);
  });
});
