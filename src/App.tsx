// App.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 4 | Task T-012a
//
// App shell + router. RedirectHandler picks the first screen from onboarding
// flags (first-launch flow: Language -> HowToPlay -> Home). i18n is imported in
// main.tsx (before render), so it is not re-imported here.

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useSettingsStore } from './store/settingsStore';
import { requestAndResolve } from './services/consentService';
import { initAdmob } from './services/admob';
import { initialiseBilling } from './services/billing';
import * as analytics from './services/analytics';
import * as musicService from './services/musicService';
import { LanguageScreen } from './components/LanguageScreen';
import { HowToPlayScreen } from './components/HowToPlayScreen';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { AboutScreen } from './components/AboutScreen';
import { IAPScreen } from './components/IAPScreen';
import { ResultScreen } from './components/ResultScreen';
import { CampaignScreen } from './components/CampaignScreen';
import { DifficultyScreen } from './components/DifficultyScreen';
import { FreePlayScreen } from './components/FreePlayScreen';
import { DailyHubScreen } from './components/DailyHubScreen';

/**
 * Decides the first screen to show based on onboarding flags.
 * Runs once after settings are hydrated.
 */
function RedirectHandler() {
  const { hydrated } = useSettingsStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    // FL-S1-004 device check: land directly on the Flow Lines grid. The Numtap
    // onboarding flow (language → how-to-play → home) is bypassed until the Flow
    // Lines onboarding screens are built in Sprint 3.
    navigate('/game', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Show nothing while deciding (hydration is fast — <100ms)
  return null;
}

export function App() {
  // T-016: GDPR/UMP consent must resolve BEFORE AdMob initialises. The UMP SDK
  // shows its native dialog for EU/EEA/UK users and stays silent elsewhere; we
  // only init AdMob once that completes. Native-only (UMP/AdMob have no web impl).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    analytics.sessionStart(); // T-020: once per launch
    (async () => {
      await requestAndResolve(); // UMP consent (form for EU; NOT_REQUIRED otherwise)
      await initAdmob(); // AdMob.initialize — strictly after consent resolves
    })();
    void initialiseBilling(); // T-019: connect the Play Billing client (native only)
  }, []);

  // B-002: background music. Settings are hydrated before App renders (main.tsx
  // awaits loadFromPreferences), so the saved toggle is reliable here. init()
  // wires the background/foreground listener; we only auto-play if music was left
  // ON. Defaults OFF on a fresh install (no auto-play on first run). Not native-
  // gated — Howler plays in the browser too.
  useEffect(() => {
    musicService.init();
    if (useSettingsStore.getState().musicEnabled) musicService.play();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedirectHandler />} />
        <Route path="/language" element={<LanguageScreen />} />
        <Route path="/how-to-play" element={<HowToPlayScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="/iap" element={<IAPScreen />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="/campaign" element={<CampaignScreen />} />
        <Route path="/difficulty" element={<DifficultyScreen />} />
        <Route path="/free-play-config" element={<FreePlayScreen />} />
        <Route path="/daily" element={<DailyHubScreen />} />
        {/* Fallback — anything unknown (incl. not-yet-built /leaderboard, /settings,
            /about from the bottom nav — those arrive in T-012b) goes to root, which
            re-routes to /home once onboarding is complete. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
