// ResultScreen.test.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task B-004
//
// Campaign-boundary gate check: isCampaignLocked() logic at the 101 / 201
// boundaries, and the ResultScreen render swap (NEXT LEVEL ↔ CampaignLockedMessage).

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Shared mutable refs the mocks read from (set per test). vi.hoisted so they
// exist before the hoisted vi.mock factories run.
const H = vi.hoisted(() => ({
  game: {} as Record<string, unknown>,
  settings: {} as Record<string, unknown>,
  navigate: (..._a: unknown[]) => {},
  purchased: false,
  unlocked: false,
}));

// Gate service: the two methods isCampaignLocked() relies on.
vi.mock('../services/campaignGateService', () => ({
  isPurchased: async () => H.purchased,
  isCampaignUnlocked: async () => H.unlocked,
}));

// Stores — return the controlled state for both hook-call and getState() forms.
vi.mock('../store/gameStore', () => ({
  useGameStore: Object.assign(() => H.game, { getState: () => H.game }),
}));
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: Object.assign(() => H.settings, { getState: () => H.settings }),
}));

// Router — only useNavigate is used by ResultScreen.
vi.mock('react-router-dom', () => ({ useNavigate: () => H.navigate }));

// i18n — return the key verbatim (locked-message text is literal, not keyed).
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

// Heavy children / side-effecting services — stub out (network, canvas, audio, ads).
vi.mock('./LeaderPanel', () => ({ LeaderPanel: () => null }));
vi.mock('./ParticleCanvas', () => ({ ParticleCanvas: () => null }));
vi.mock('./BottomNav', () => ({ BottomNav: () => null }));
vi.mock('../services/musicService', () => ({ play: () => {} }));
vi.mock('../services/interstitialAdService', () => ({
  incrementLevelCount: async () => {},
  maybeShowInterstitial: async () => {},
}));
vi.mock('../services/analytics', () => ({ levelComplete: () => {}, levelFail: () => {}, adImpression: () => {} }));
vi.mock('../services/campaignScores', () => ({ submitCampaignScore: async () => {} }));
vi.mock('../services/dailyScores', () => ({ autoSubmitDailyIfComplete: async () => {} }));
vi.mock('../services/freePlayPB', () => ({ getFreePlayPB: async () => 0, setFreePlayPB: async () => {} }));

import { ResultScreen, CampaignLockedMessage, isCampaignLocked, setGameCanvasInteractive } from './ResultScreen';
import { LevelManager } from '../game/LevelManager';

// A complete-campaign game state pinned to `levelId` (uses the real level config).
function campaignState(levelId: number) {
  return {
    status: 'complete',
    currentLevel: LevelManager.getLevel(levelId),
    score: 1000,
    timeElapsed: 10,
    tapTimestamps: [],
    mode: 'campaign',
    startLevel: vi.fn(),
    startFreePlay: vi.fn(),
    difficulty: 'easy',
    timed: true,
    currentChallengeIndex: 0,
  };
}

beforeEach(() => {
  H.purchased = false;
  H.unlocked = false;
  H.navigate = vi.fn();
  H.game = campaignState(100);
  H.settings = {
    dailyStreak: 0,
    recordLevelComplete: vi.fn(),
    updateDailyStreak: vi.fn(),
    musicEnabled: false,
    bestScores: {},
  };
});
afterEach(() => cleanup());

describe('isCampaignLocked (B-004 boundary logic)', () => {
  it('1. nextLevelId=99 (mid-campaign) → false, no gate check', async () => {
    // Even with both gate signals "locked", a non-boundary id must short-circuit.
    H.purchased = false;
    H.unlocked = false;
    expect(await isCampaignLocked(99)).toBe(false);
  });

  it('2. nextLevelId=101, C2 gate met, not purchased → false (unlocked via gate)', async () => {
    H.unlocked = true;
    H.purchased = false;
    expect(await isCampaignLocked(101)).toBe(false);
  });

  it('3. nextLevelId=101, C2 purchased → false (unlocked via IAP)', async () => {
    H.unlocked = false;
    H.purchased = true;
    expect(await isCampaignLocked(101)).toBe(false);
  });

  it('4. nextLevelId=101, gate NOT met and NOT purchased → true (locked)', async () => {
    H.unlocked = false;
    H.purchased = false;
    expect(await isCampaignLocked(101)).toBe(true);
  });

  it('5. nextLevelId=201, C3 gate met → false', async () => {
    H.unlocked = true;
    H.purchased = false;
    expect(await isCampaignLocked(201)).toBe(false);
  });

  it('6. nextLevelId=201, gate NOT met and NOT purchased → true (locked)', async () => {
    H.unlocked = false;
    H.purchased = false;
    expect(await isCampaignLocked(201)).toBe(true);
  });
});

describe('ResultScreen boundary render (B-004)', () => {
  it('7. L100 → C2 locked: CampaignLockedMessage (campaign 2), no NEXT LEVEL', async () => {
    H.game = campaignState(100); // next = 101
    H.unlocked = false;
    H.purchased = false;
    render(<ResultScreen />);
    expect(await screen.findByText(/Campaign 2 Locked/)).toBeInTheDocument();
    expect(screen.queryByText(/result\.btn_next_level/)).toBeNull();
  });

  it('8. L200 → C3 locked: CampaignLockedMessage (campaign 3)', async () => {
    H.game = campaignState(200); // next = 201
    H.unlocked = false;
    H.purchased = false;
    render(<ResultScreen />);
    expect(await screen.findByText(/Campaign 3 Locked/)).toBeInTheDocument();
    expect(screen.queryByText(/result\.btn_next_level/)).toBeNull();
  });

  it('9. L100 → C2 unlocked: NEXT LEVEL button renders, no locked message', async () => {
    H.game = campaignState(100);
    H.unlocked = true; // gate met
    H.purchased = false;
    render(<ResultScreen />);
    expect(await screen.findByText(/result\.btn_next_level/)).toBeInTheDocument();
    expect(screen.queryByText(/Campaign 2 Locked/)).toBeNull();
  });

  it('non-boundary L99 → NEXT LEVEL renders immediately, gate never consulted', async () => {
    H.game = campaignState(99); // next = 100, not a boundary
    H.unlocked = false; // would be "locked" if a check ran
    H.purchased = false;
    render(<ResultScreen />);
    expect(await screen.findByText(/result\.btn_next_level/)).toBeInTheDocument();
    expect(screen.queryByText(/Campaign .* Locked/)).toBeNull();
  });
});

describe('F-011 — game canvas focus release', () => {
  // Inject a single <canvas> (ParticleCanvas is mocked to null, so this is the only
  // one querySelector('canvas') can find) and clean it up after each test.
  let canvas: HTMLCanvasElement;
  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    canvas.remove();
  });

  it('1. release (complete/failed) sets canvas pointerEvents to none', () => {
    canvas.style.pointerEvents = 'auto';
    setGameCanvasInteractive(false); // what GameScreen does on status complete/failed
    expect(canvas.style.pointerEvents).toBe('none');
  });

  it('2. release blurs the focused canvas (frees the back-button focus trap)', () => {
    canvas.tabIndex = 0;
    canvas.focus();
    expect(document.activeElement).toBe(canvas);
    setGameCanvasInteractive(false);
    expect(document.activeElement).not.toBe(canvas);
    expect(canvas.style.pointerEvents).toBe('none');
  });

  it('3. NEXT LEVEL restores canvas pointerEvents to auto', async () => {
    canvas.style.pointerEvents = 'none'; // left disabled by the previous game's end
    H.game = campaignState(99); // next = 100 (non-boundary) → NEXT LEVEL renders
    render(<ResultScreen />);
    const btn = await screen.findByText(/result\.btn_next_level/);
    btn.click();
    expect(canvas.style.pointerEvents).toBe('auto');
  });

  it('4. PLAY AGAIN restores canvas pointerEvents to auto', async () => {
    canvas.style.pointerEvents = 'none';
    H.game = campaignState(99);
    render(<ResultScreen />);
    const btn = await screen.findByText(/result\.btn_play_again/);
    btn.click();
    expect(canvas.style.pointerEvents).toBe('auto');
  });
});

describe('CampaignLockedMessage (B-004 component)', () => {
  it('renders the campaign number, gate-status line, and CTA', () => {
    render(<CampaignLockedMessage campaignNumber={2} onGo={() => {}} />);
    expect(screen.getByText(/Campaign 2 Locked/)).toBeInTheDocument();
    expect(screen.getByText(/Unlock via Early Access or wait for the community gate/)).toBeInTheDocument();
    expect(screen.getByText(/GO TO CAMPAIGN SCREEN/)).toBeInTheDocument();
  });

  it('GO TO CAMPAIGN SCREEN invokes onGo (navigates to /campaign)', async () => {
    const onGo = vi.fn();
    render(<CampaignLockedMessage campaignNumber={3} onGo={onGo} />);
    screen.getByText(/GO TO CAMPAIGN SCREEN/).click();
    await waitFor(() => expect(onGo).toHaveBeenCalledTimes(1));
  });
});
