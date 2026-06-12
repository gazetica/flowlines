// SplashScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 14 | Task FL-S3-014 (VD-01)
//
// React splash screen: mandala logo, loading bar, then routes to /language
// (first launch — no language set) or /home (returning user).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';

export function SplashScreen() {
  const navigate = useNavigate();
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    // Animate the loading bar to 100% over 1800ms.
    const t = setTimeout(() => setBarWidth(100), 50);

    // After ~2s, route by first-launch state. A dedicated firstLaunchComplete
    // flag drives onboarding (language defaults to 'en', so it can't be the
    // signal — see CF-005). First run → /language onboarding; returning → /home.
    const nav = setTimeout(() => {
      const done = useFlowSettingsStore.getState().firstLaunchComplete;
      navigate(done ? '/home' : '/language', { replace: true });
    }, 2000);

    return () => {
      clearTimeout(t);
      clearTimeout(nav);
    };
  }, [navigate]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: skin.bgDeep,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: skin.fontBody,
      }}
    >
      {/* Dot-grid texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(127,119,221,0.15) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Mandala logo (VDD VD-01) */}
      <svg width="80" height="80" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#1C0E42" />
        <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(127,119,221,0.2)" strokeWidth="1" />
        <path d="M10 32 Q32 6 54 32" stroke="#E24B4A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M10 32 Q32 58 54 32" stroke="#378ADD" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M32 8 Q58 32 32 56" stroke="#639922" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M32 8 Q6 32 32 56" stroke="#EF9F27" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="32" r="6" fill="#7F77DD" />
        <circle cx="32" cy="32" r="3" fill="#ADA7F0" />
      </svg>

      <div
        style={{
          marginTop: 20,
          fontFamily: skin.fontDisplay,
          fontSize: 28,
          letterSpacing: 3,
          color: skin.gold,
        }}
      >
        FLOW LINES
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: skin.muted }}>Colour Connection Puzzle</div>

      {/* Loading bar */}
      <div
        style={{
          marginTop: 32,
          width: 200,
          height: 4,
          background: skin.bgBorder,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidth}%`,
            background: skin.purple,
            borderRadius: 2,
            transition: 'width 1800ms ease-out',
          }}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: skin.muted }}>Loading puzzles…</div>

      <div style={{ position: 'absolute', bottom: 24, fontSize: 10, color: skin.muted }}>by Gazetica</div>
    </div>
  );
}

export default SplashScreen;
