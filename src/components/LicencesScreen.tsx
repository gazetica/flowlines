// LicencesScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-016
//
// Open-source licence attributions (Google Play review requirement). Rendered
// in-app — no external page needed. Tapping a row opens the library's repo via
// the in-app Capacitor Browser. Reached from AboutScreen → "Open Source Licences".

import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Browser } from '@capacitor/browser';
import { skin } from '../styles/skin';
import { FloatingPathCanvas } from './FloatingPathCanvas';

const GOLD = '#FFD700';

// Versions track package.json majors. All MIT-licensed.
const LICENCES: Array<{ name: string; version: string; licence: string; url: string }> = [
  { name: 'Phaser', version: '4.x', licence: 'MIT', url: 'https://github.com/phaserjs/phaser' },
  { name: 'React', version: '19.x', licence: 'MIT', url: 'https://github.com/facebook/react' },
  { name: 'Capacitor', version: '8.x', licence: 'MIT', url: 'https://github.com/ionic-team/capacitor' },
  { name: 'Zustand', version: '5.x', licence: 'MIT', url: 'https://github.com/pmndrs/zustand' },
  { name: 'Vite', version: '8.x', licence: 'MIT', url: 'https://github.com/vitejs/vite' },
  { name: 'Supabase JS', version: '2.x', licence: 'MIT', url: 'https://github.com/supabase/supabase-js' },
  { name: 'Howler.js', version: '2.x', licence: 'MIT', url: 'https://github.com/goldfire/howler.js' },
  { name: 'react-router-dom', version: '7.x', licence: 'MIT', url: 'https://github.com/remix-run/react-router' },
  { name: 'Tailwind CSS', version: '3.x', licence: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss' },
  { name: 'i18next', version: '26.x', licence: 'MIT', url: 'https://github.com/i18next/i18next' },
];

export function LicencesScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 16, overflow: 'hidden', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: skin.bgDeep, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <FloatingPathCanvas />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onPointerDown={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>{t('licences.title')}</span>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '8px 20px 24px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box', touchAction: 'pan-y' }}>
        <div style={{ fontSize: 12, color: skin.muted, lineHeight: 1.6, marginBottom: 12 }}>
          {t('licences.subtitle')}
        </div>

        <div style={card}>
          {LICENCES.map((lib, i) => (
            <button
              key={lib.name}
              onPointerDown={() => void Browser.open({ url: lib.url })}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', background: 'none', border: 'none',
                borderBottom: i === LICENCES.length - 1 ? 'none' : '1px solid rgba(127,119,221,0.12)',
                color: skin.white, textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 14 }}>{lib.name} <span style={{ color: skin.muted, fontSize: 12 }}>· {lib.version}</span></span>
              <span style={{ fontFamily: skin.fontDisplay, fontSize: 11, color: skin.purpleLight }}>{lib.licence} ›</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, color: skin.muted, textAlign: 'center', marginTop: 16 }}>
          {t('licences.footer')}
        </div>
      </div>
    </div>
  );
}

export default LicencesScreen;
