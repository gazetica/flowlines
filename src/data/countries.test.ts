// countries.test.ts
// Flow Lines | Gazetica Studio | FL-UX-D-023 Fix 1

import { describe, it, expect } from 'vitest';
import { COUNTRIES } from './countries';

describe('COUNTRIES (FL-UX-D-023)', () => {
  it('has 170+ entries', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(170);
  });

  it('includes India', () => {
    expect(COUNTRIES.find((c) => c.code === 'IN')).toBeDefined();
  });

  it('includes South Korea (a localized market the brief list omitted)', () => {
    expect(COUNTRIES.find((c) => c.code === 'KR')).toBeDefined();
  });

  it('has no duplicate country codes', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
