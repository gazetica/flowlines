// countryFlag.test.ts — T-005 Part 4
import { describe, it, expect } from 'vitest';
import { countryFlag } from './countryFlag';

describe('countryFlag', () => {
  it('IN → 🇮🇳', () => expect(countryFlag('IN')).toBe('🇮🇳'));
  it('US → 🇺🇸', () => expect(countryFlag('US')).toBe('🇺🇸'));
  it('KR → 🇰🇷', () => expect(countryFlag('KR')).toBe('🇰🇷'));
  it('lowercase in → 🇮🇳', () => expect(countryFlag('in')).toBe('🇮🇳'));
  it('XX → 🌐', () => expect(countryFlag('XX')).toBe('🌐'));
  it('empty → 🌐', () => expect(countryFlag('')).toBe('🌐'));
});
