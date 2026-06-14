// App.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 14 | Task FL-S3-014
//
// App shell + router. Default route is the splash screen (CF-005 fixed — was
// the Day-4 debug `/game`). Splash routes to /language (first launch) or /home.
// Native init (consent → AdMob, billing, music) + settings hydration preserved.

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useSettingsStore } from './store/settingsStore';
import { requestAndResolve } from './services/consentService';
import { initAdmob } from './services/admob';
import { initialiseBilling } from './services/billing';
import * as analytics from './services/analytics';
import * as musicService from './services/musicService';
import { useFlowSettingsStore } from './store/flowSettingsStore';

import { PageTransition } from './components/PageTransition';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import PackSelectScreen from './components/PackSelectScreen';
import LevelSelectScreen from './components/LevelSelectScreen';
import DailyScreen from './components/DailyScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import SettingsScreen from './components/SettingsScreen';
import HowToPlayScreen from './components/HowToPlayScreen';
import AboutScreen from './components/AboutScreen';
import LanguageScreen from './components/LanguageScreen';
import CountrySelector from './components/CountrySelector';
import IAPScreen from './components/IAPScreen';

export function App() {
  // T-016: GDPR/UMP consent must resolve BEFORE AdMob initialises. Native-only.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    analytics.sessionStart();
    (async () => {
      await requestAndResolve();
      await initAdmob();
    })();
    void initialiseBilling();
  }, []);

  // Hydrate Flow Lines settings from Capacitor Preferences on mount.
  const hydrateFlowSettings = useFlowSettingsStore((s) => s.hydrate);
  useEffect(() => {
    void hydrateFlowSettings();
  }, [hydrateFlowSettings]);

  // Background music — auto-play only if previously left on.
  useEffect(() => {
    musicService.init();
    if (useSettingsStore.getState().musicEnabled) musicService.play();
  }, []);

  return (
    <BrowserRouter>
      <PageTransition>
        <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="/packs" element={<PackSelectScreen />} />
        <Route path="/levels/:packId" element={<LevelSelectScreen />} />
        <Route path="/daily" element={<DailyScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/tutorial" element={<HowToPlayScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="/language" element={<LanguageScreen />} />
        <Route path="/country" element={<CountrySelector />} />
        <Route path="/store" element={<IAPScreen />} />
        {/* Unknown routes return to splash, which re-routes appropriately. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </BrowserRouter>
  );
}
