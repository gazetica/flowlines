// SettingsScreen.test.tsx
// Numtap | Gazetica Studio | Sprint 5 | Task DEV-001
//
// Dev level-skip tool: dev-gate visibility, input validation, and the jump flow
// (campaign difficulty by range). DEV_TOOLS is evaluated at module load, so each
// test re-imports SettingsScreen after stubbing import.meta.env.

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const H = vi.hoisted(() => ({ navSpy: vi.fn(), startLevelSpy: vi.fn(), mem: new Map<string, string>() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => H.navSpy }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: H.mem.has(key) ? H.mem.get(key)! : null }),
    set: async ({ key, value }: { key: string; value: string }) => { H.mem.set(key, value); },
    remove: async ({ key }: { key: string }) => { H.mem.delete(key); },
  },
}));
vi.mock('../store/settingsStore', () => {
  const s = {
    soundEnabled: false, setSoundEnabled: () => {}, musicEnabled: false, setMusicEnabled: async () => {},
    hapticsEnabled: false, setHapticsEnabled: () => {}, language: 'en', setLanguage: () => {},
    alias: 'Zephyrv', setAlias: () => {}, country: 'IN', setCountry: () => {}, removeAdsPurchased: false,
  };
  return { useSettingsStore: Object.assign(() => s, { getState: () => s }) };
});
vi.mock('../store/gameStore', () => ({ useGameStore: { getState: () => ({ startLevel: H.startLevelSpy }) } }));
vi.mock('../services/musicService', () => ({ play: () => {}, pause: () => {} }));
vi.mock('../services/tierService', () => ({ loadLocalTier: async () => null, TIER_COLORS: { pro: '#9B59B6', expert: '#00f5ff' } }));
vi.mock('./CountrySelector', () => ({ CountrySelector: () => null, countryName: (c: string) => c }));
vi.mock('./ParticleCanvas', () => ({ ParticleCanvas: () => null }));
vi.mock('./BottomNav', () => ({ BottomNav: () => null }));

async function renderWith(env: { DEV: boolean; VITE_DEV_TOOLS: string }) {
  vi.resetModules();
  vi.stubEnv('DEV', env.DEV);
  vi.stubEnv('VITE_DEV_TOOLS', env.VITE_DEV_TOOLS);
  const { SettingsScreen } = await import('./SettingsScreen');
  return render(<SettingsScreen />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  H.navSpy.mockClear();
  H.startLevelSpy.mockClear();
  H.mem.clear();
});

describe('SettingsScreen DEV TOOLS (DEV-001)', () => {
  it('1. renders DEV TOOLS section when DEV is true', async () => {
    await renderWith({ DEV: true, VITE_DEV_TOOLS: 'false' });
    expect(screen.getByText(/DEV TOOLS/)).toBeInTheDocument();
    expect(screen.getByText('Jump to Level')).toBeInTheDocument();
    expect(screen.getByText('Reset Test State')).toBeInTheDocument();
  });

  it('1b. renders when VITE_DEV_TOOLS=true even if DEV is false (device build)', async () => {
    await renderWith({ DEV: false, VITE_DEV_TOOLS: 'true' });
    expect(screen.getByText(/DEV TOOLS/)).toBeInTheDocument();
  });

  it('2. does NOT render DEV TOOLS in a production build (DEV false, VITE_DEV_TOOLS unset)', async () => {
    await renderWith({ DEV: false, VITE_DEV_TOOLS: 'false' });
    expect(screen.queryByText(/DEV TOOLS/)).toBeNull();
    expect(screen.queryByText('Jump to Level')).toBeNull();
  });

  it('3. invalid level input shows the error and does not navigate', async () => {
    await renderWith({ DEV: true, VITE_DEV_TOOLS: 'false' });
    const input = screen.getByPlaceholderText('1-300');
    for (const bad of ['0', '301', 'abc']) {
      fireEvent.change(input, { target: { value: bad } });
      fireEvent.click(screen.getByText('GO'));
      expect(await screen.findByText('Enter a level between 1 and 300')).toBeInTheDocument();
    }
    expect(H.navSpy).not.toHaveBeenCalled();
    expect(H.startLevelSpy).not.toHaveBeenCalled();
  });

  it('4. valid C2 level (150) jumps with pro difficulty and navigates to /game', async () => {
    await renderWith({ DEV: true, VITE_DEV_TOOLS: 'false' });
    fireEvent.change(screen.getByPlaceholderText('1-300'), { target: { value: '150' } });
    fireEvent.click(screen.getByText('GO'));
    await waitFor(() => expect(H.startLevelSpy).toHaveBeenCalledWith(150, 'campaign', 'pro'));
    expect(H.navSpy).toHaveBeenCalledWith('/game');
    expect(H.mem.get('currentLevel')).toBe('150');
  });

  it('5. valid C3 level (250) jumps with expert; C1 (50) jumps with no difficulty', async () => {
    await renderWith({ DEV: true, VITE_DEV_TOOLS: 'false' });
    const input = screen.getByPlaceholderText('1-300');
    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.click(screen.getByText('GO'));
    await waitFor(() => expect(H.startLevelSpy).toHaveBeenCalledWith(250, 'campaign', 'expert'));
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.click(screen.getByText('GO'));
    await waitFor(() => expect(H.startLevelSpy).toHaveBeenCalledWith(50, 'campaign', undefined));
  });
});
