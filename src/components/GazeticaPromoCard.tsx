// GazeticaPromoCard.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 17 | Task FL-S3-017
//
// Numtap cross-promo card. Rendered ONLY at the bottom of ResultScreen and
// inside AboutScreen — never mid-game, never blocking play (CLAUDE.md §9:
// ResultScreen bottom slot is GazeticaPromoCard only). Tapping opens the Numtap
// Play Store listing via the in-app Capacitor Browser.
//
// Replaces the Numtap B-012 rotating-roadmap component (unimported remnant);
// its obsolete test (GazeticaPromoCard.test.tsx) was removed with it.

import type { CSSProperties } from 'react';
import { Browser } from '@capacitor/browser';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';

const GOLD = '#FFD700';
const NUMTAP_URL = 'https://play.google.com/store/apps/details?id=com.gazetica.numtap';

export function GazeticaPromoCard() {
  const { t } = useTranslation();
  const openListing = () => {
    void Browser.open({ url: NUMTAP_URL });
  };

  const glass: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={glass}>
      <div style={{ fontSize: 11, color: skin.muted, letterSpacing: 1, marginBottom: 10 }}>
        🎮 {t('result.also_by_gazetica')}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: skin.bgDeep,
          border: '1px solid rgba(127,119,221,0.18)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        {/* CSS-only Numtap icon (FL-UX-D-023 Fix 3) — matches the real app icon:
            dark-navy grid background + a yellow ring around a bold yellow "N". */}
        <div
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 10,
            backgroundColor: '#0D1B3E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* grid dots */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, #1a2d5a 1px, transparent 1px)',
              backgroundSize: '8px 8px',
              opacity: 0.6,
            }}
          />
          {/* yellow ring + N */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '3px solid #EAB800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span style={{ fontFamily: skin.fontDisplay, fontWeight: 700, fontSize: 17, color: '#EAB800', lineHeight: 1 }}>N</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: skin.fontDisplay, fontSize: 14, color: GOLD, letterSpacing: 1 }}>
            NUMTAP
          </div>
          <div style={{ fontSize: 11, color: skin.muted }}>Speed Number Puzzles</div>
        </div>

        <button
          onClick={openListing}
          style={{
            flexShrink: 0,
            background: GOLD,
            color: skin.bgDeep,
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            fontFamily: skin.fontDisplay,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('result.try_free')}
        </button>
      </div>
    </div>
  );
}

export default GazeticaPromoCard;
