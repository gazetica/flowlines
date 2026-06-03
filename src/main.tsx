import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import { App } from './App';
import { useSettingsStore } from './store/settingsStore';

// Hydrate settings from Capacitor Preferences before first render, so the
// first-launch flow (RedirectHandler) reads correct onboarding flags.
useSettingsStore
  .getState()
  .loadFromPreferences()
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
