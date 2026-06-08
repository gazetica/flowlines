// HowToPlayScreen.test.tsx
// Numtap | Gazetica Studio | Sprint 5 | Task B-013
//
// Onboarding slide content checks after the VDD v1.2 fix: slide 1 no longer claims
// ascending-only / "30 seconds"; slide 3 drops the removed ENDLESS/SPEED modes and
// shows the real CAMPAIGN (300 levels) / DAILY / FREE PLAY set. Uses the real i18n
// resources (English) so the mode rows — which are translated — assert true content.

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '../i18n'; // initialise the real i18next singleton (en) for translated rows

vi.mock('./ParticleCanvas', () => ({ ParticleCanvas: () => null }));
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: () => ({ setOnboardingShown: async () => {} }),
}));

import { HowToPlayScreen } from './HowToPlayScreen';

function renderScreen() {
  return render(
    <MemoryRouter>
      <HowToPlayScreen />
    </MemoryRouter>,
  );
}

// Advance to the modes slide (page index 2) via the two "NEXT →" buttons.
function gotoModesSlide() {
  fireEvent.click(screen.getByText('NEXT →'));
  fireEvent.click(screen.getByText('NEXT →'));
}

afterEach(cleanup);

describe('HowToPlayScreen — B-013 onboarding fixes', () => {
  it('1. slide 1 drops the stale "from 1 upward" / "30 seconds" copy', () => {
    renderScreen();
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('from 1 upward');
    expect(text).not.toContain('30 seconds');
    expect(text).toContain('Tap them in sequence');
  });

  it('2. slide 3 lists all five live modes (incl. restored ENDLESS + SPEED)', () => {
    renderScreen();
    gotoModesSlide();
    const text = document.body.textContent ?? '';
    for (const mode of ['CAMPAIGN', 'DAILY', 'FREE PLAY', 'ENDLESS', 'SPEED']) {
      expect(text).toContain(mode);
    }
  });

  it('3. slide 3 shows the 300-level campaign and FREE PLAY', () => {
    renderScreen();
    gotoModesSlide();
    const text = document.body.textContent ?? '';
    expect(text).toContain('300 levels');
    expect(text).toContain('FREE PLAY');
  });
});
