// AboutScreen.test.tsx
// Numtap | Gazetica Studio | Sprint 5 | Tasks F-003 + B-014
//
// F-003: a "How to Play" row gives permanent access to the tutorial (navigates to
// /how-to-play). B-014: the "Ad Preferences" row invokes the UMP consent form.
// Real i18n (en) so the visible row labels match production copy.

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../i18n';

const H = vi.hoisted(() => ({
  navigate: vi.fn(),
  reopen: vi.fn(async () => {}),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => H.navigate }));
vi.mock('../services/consentService', () => ({ reopenForm: () => H.reopen() }));
vi.mock('../services/crashlytics', () => ({ testCrash: async () => {} }));
vi.mock('./ParticleCanvas', () => ({ ParticleCanvas: () => null }));
vi.mock('./BottomNav', () => ({ BottomNav: () => null }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: async () => {} } }));

import { AboutScreen } from './AboutScreen';

afterEach(() => {
  cleanup();
  H.navigate.mockReset();
  H.reopen.mockReset();
});

describe('AboutScreen — F-003 + B-014', () => {
  it('F-003: "How to Play" row navigates to /how-to-play', () => {
    render(<AboutScreen />);
    fireEvent.click(screen.getByText('How to Play'));
    expect(H.navigate).toHaveBeenCalledWith('/how-to-play');
  });

  it('B-014: "Ad Preferences" row invokes the UMP consent form', () => {
    render(<AboutScreen />);
    fireEvent.click(screen.getByText('Ad Preferences (GDPR)'));
    expect(H.reopen).toHaveBeenCalledTimes(1);
  });
});
