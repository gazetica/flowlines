// levelUtils.test.ts
// Flow Lines | Gazetica Studio | FL-UX-D-022 Fix 4

import { describe, it, expect } from 'vitest';
import { globalLevelNum, globalLevelStr } from './levelUtils';

describe('globalLevelNum', () => {
  it('Pack 1 Level 1 = 1', () => expect(globalLevelNum(1, 1)).toBe(1));
  it('Pack 1 Level 50 = 50', () => expect(globalLevelNum(1, 50)).toBe(50));
  it('Pack 2 Level 1 = 51', () => expect(globalLevelNum(2, 1)).toBe(51));
  it('Pack 2 Level 50 = 100', () => expect(globalLevelNum(2, 50)).toBe(100));
  it('Pack 3 Level 1 = 101', () => expect(globalLevelNum(3, 1)).toBe(101));
  it('Pack 4 Level 50 = 200', () => expect(globalLevelNum(4, 50)).toBe(200));
});

describe('globalLevelStr', () => {
  it('pads to 2 chars (Pack 1 Level 1 → "01")', () => expect(globalLevelStr(1, 1)).toBe('01'));
  it('Pack 2 Level 1 → "51"', () => expect(globalLevelStr(2, 1)).toBe('51'));
});
