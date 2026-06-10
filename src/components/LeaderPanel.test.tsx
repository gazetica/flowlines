// LeaderPanel.test.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task B-005
//
// Country flag before alias in the YOU / LEADER panel: the aliasFlag() policy
// (flag for a real code, nothing for missing/unset) and the rendered rows.

import { render, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const H = vi.hoisted(() => ({
  alias: 'Zephyrv',
  country: 'IN',
  leader: null as null | { alias: string; score: number; timeSecs: number; country: string },
}));

// B-023: the store now carries a permanent playerUid. LeaderPanel must NOT render it
// (UID is a leaderboard/settings concept only) — test 8 asserts its absence.
const TEST_UID = 'NT4K7M2Q';
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: Object.assign(
    () => ({ alias: H.alias, country: H.country, playerUid: TEST_UID }),
    { getState: () => ({ alias: H.alias, country: H.country, playerUid: TEST_UID, bestScores: {} }) }
  ),
}));
vi.mock('../services/campaignScores', () => ({
  fetchLevelLeader: async () => H.leader,
  getPlayerPB: () => ({ score: 0, timeSecs: null }),
}));
vi.mock('../services/tierService', () => ({
  loadLocalTier: async () => null,
  getTier: async () => null,
  TIER_COLORS: { pro: '#9B59B6', expert: '#00f5ff' },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { LeaderPanel, aliasFlag } from './LeaderPanel';

// Any Unicode regional-indicator pair (i.e. an actual flag emoji).
const FLAG = /[\u{1F1E6}-\u{1F1FF}]/u;

beforeEach(() => {
  H.alias = 'Zephyrv';
  H.country = 'IN';
  H.leader = null;
});
afterEach(() => cleanup());

describe('aliasFlag (B-005 flag policy)', () => {
  it("1. 'IN' → 🇮🇳", () => expect(aliasFlag('IN')).toBe('🇮🇳'));
  it("2. 'DE' → 🇩🇪", () => expect(aliasFlag('DE')).toBe('🇩🇪'));
  it("3. lowercase 'de' → 🇩🇪", () => expect(aliasFlag('de')).toBe('🇩🇪'));
  it('4. null → ""', () => expect(aliasFlag(null)).toBe(''));
  it('5. "" → ""', () => expect(aliasFlag('')).toBe(''));
  it("6. 'XX' (unset sentinel) → ''", () => expect(aliasFlag('XX')).toBe(''));
  it("7. wrong length 'I' → ''", () => expect(aliasFlag('I')).toBe(''));
});

describe('LeaderPanel YOU/LEADER flags (B-005)', () => {
  it('8. YOU row shows flag + alias when country is set', async () => {
    H.country = 'IN';
    const { container } = render(<LeaderPanel levelId={101} />);
    await waitFor(() => expect(container.textContent).toMatch(/Zephyrv/));
    expect(container.textContent).toContain('🇮🇳');
    expect(container.textContent).toMatch(/🇮🇳\s*Zephyrv/);
  });

  it('9. YOU row shows alias only (no flag) when country is unset (XX)', async () => {
    H.country = 'XX';
    const { container } = render(<LeaderPanel levelId={101} />);
    await waitFor(() => expect(container.textContent).toMatch(/Zephyrv/));
    expect(container.textContent).not.toMatch(FLAG);
  });

  it('10. LEADER row shows flag + alias when leader has a country', async () => {
    H.country = 'XX'; // suppress YOU flag so only the leader flag can match
    H.leader = { alias: 'Mahendra', score: 100, timeSecs: 5, country: 'IN' };
    const { container } = render(<LeaderPanel levelId={101} />);
    await waitFor(() => expect(container.textContent).toMatch(/Mahendra/));
    expect(container.textContent).toContain('🇮🇳');
    expect(container.textContent).toMatch(/🇮🇳\s*Mahendra/);
  });

  it('11. LEADER row shows alias only when leader has no country', async () => {
    H.country = 'XX';
    H.leader = { alias: 'Mahendra', score: 100, timeSecs: 5, country: '' };
    const { container } = render(<LeaderPanel levelId={101} />);
    await waitFor(() => expect(container.textContent).toMatch(/Mahendra/));
    expect(container.textContent).not.toMatch(FLAG);
  });
});

describe('LeaderPanel UID absence (B-023 — test 8)', () => {
  it('14. never renders the player UID in the in-play / result LeaderPanel', async () => {
    H.country = 'IN';
    H.leader = { alias: 'Mahendra', score: 100, timeSecs: 5, country: 'IN' };
    const { container } = render(<LeaderPanel levelId={101} />);
    await waitFor(() => expect(container.textContent).toMatch(/Zephyrv/));
    // UID must not leak into the YOU or LEADER rows.
    expect(container.textContent).not.toContain(TEST_UID);
    expect(container.textContent).not.toMatch(/NT[A-Z0-9]{6}/);
  });
});

describe('LeaderPanel YOU Time (B-015)', () => {
  it('12. shows a dash when no completion time is passed (PB time is null)', async () => {
    const { container } = render(<LeaderPanel levelId={101} />);
    await waitFor(() => expect(container.textContent).toMatch(/Zephyrv/));
    // getPlayerPB mock returns timeSecs: null and no youTimeSecs prop → dash.
    // F-007: the Time label is now t('leader.time'); the mock returns the key verbatim.
    expect(container.textContent).toContain('leader.time—');
  });

  it('13. renders the passed youTimeSecs as "Xs" in the YOU row', async () => {
    const { container } = render(<LeaderPanel levelId={101} youTimeSecs={6} />);
    await waitFor(() => expect(container.textContent).toMatch(/Zephyrv/));
    expect(container.textContent).toContain('leader.time6s');
    expect(container.textContent).not.toContain('leader.time—');
  });
});
