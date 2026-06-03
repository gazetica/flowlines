import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { GameScreen } from './components/GameScreen';
import { useSettingsStore } from './store/settingsStore';

// Hydrate settings from Capacitor Preferences before first render, so the
// `hydrated` flag (and all persisted state) is ready before any screen's
// first-launch decisions run.
useSettingsStore
  .getState()
  .loadFromPreferences()
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <GameScreen />
      </StrictMode>
    );
  });
