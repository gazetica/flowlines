// GazeticaPromoCard.tsx
// Numtap | Gazetica Studio | Sprint 5 | Task B-012
//
// Internal house-ad slot on ResultScreen: rotating cross-promotion of upcoming
// Gazetica games. Entirely static — no network, no SDK, no AdMob. Three height
// variants by result state (compact / medium / full). Taps open the games page
// in the in-app Capacitor Browser (same pattern as AboutScreen).

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export type PromoVariant = 'compact' | 'medium' | 'full';

export interface PromoGame {
  name: string;
  tagline: string;
  description: string;
  color: string; // per-game accent
}

export const GAMES: PromoGame[] = [
  {
    name: 'Flow Lines',
    tagline: 'Connect the dots. Fill the grid.',
    description: 'Draw paths to connect matching colours and fill every cell. 500+ hand-crafted levels.',
    color: '#1D9E75', // teal
  },
  {
    name: 'Word Drop',
    tagline: 'Words fall. You catch them.',
    description: 'Form words from falling letter tiles before the grid fills up. Fast and addictive.',
    color: '#7F77DD', // purple
  },
  {
    name: 'Pulse Grid',
    tagline: 'Tap to the beat.',
    description: 'Hit grid targets in rhythm with the pulse. Every miss breaks your streak.',
    color: '#D85A30', // coral
  },
  {
    name: 'Echo Trail',
    tagline: 'Follow the path. Trust your memory.',
    description: 'Memorise a growing path across the grid and retrace it perfectly.',
    color: '#378ADD', // blue
  },
];

const GAMES_URL = 'https://gazetica.com/games.html';

// Module-level rotation counter — survives across mounts so each new ResultScreen
// shows the next game in sequence (Flow Lines → Word Drop → Pulse Grid → Echo
// Trail → …). Not React state, so it never triggers a re-render.
let promoIndex = 0;

// B-012 NOTE: the brief's pseudocode increments promoIndex in the render body.
// ResultScreen re-renders several times per visit (stars/breakdown/gate effects),
// which would advance the counter multiple times per result. We instead pick the
// game once per MOUNT via a useState initializer (read-only state — never set, so
// no extra re-renders), which both honours "next game each mount" and avoids the
// over-increment bug.

// Open the Gazetica games page in the in-app browser (native only; web no-op).
async function openGames(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[GazeticaPromoCard] open (web no-op):', GAMES_URL);
    return;
  }
  await Browser.open({ url: GAMES_URL });
}

const NAVY_CARD = 'rgba(10,26,46,0.75)';
const FONT = "'Space Mono', monospace";

function ComingSoon() {
  return (
    <span style={{ position: 'absolute', top: 6, right: 10, fontFamily: FONT, fontSize: 8, color: 'var(--muted)', letterSpacing: 0.5 }}>
      Coming Soon
    </span>
  );
}

function GameIcon({ color, size = 26 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}66` }} />;
}

export function GazeticaPromoCard({ variant }: { variant: PromoVariant }) {
  // Pick the game once per mount; advance the shared rotation counter.
  const [game] = useState<PromoGame>(() => {
    const g = GAMES[promoIndex % GAMES.length];
    promoIndex += 1;
    return g;
  });

  const onTap = () => { void openGames(); };

  // —— Compact (44px): campaign win — single line, no card, just text + arrow ——
  if (variant === 'compact') {
    return (
      <button
        onClick={onTap}
        style={{
          width: '100%', height: 44, background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 0,
          fontFamily: FONT, fontSize: 10, letterSpacing: 0.5, color: 'var(--muted)',
        }}
      >
        <span>ALSO BY GAZETICA: <span style={{ color: game.color }}>{game.name}</span></span>
        <span aria-hidden>→</span>
      </button>
    );
  }

  // —— Medium (80px): non-campaign win — icon + name + tagline + Coming Soon ——
  if (variant === 'medium') {
    return (
      <button
        onClick={onTap}
        style={{
          position: 'relative', width: '100%', height: 80, cursor: 'pointer', textAlign: 'left',
          background: NAVY_CARD, border: `1px solid ${game.color}4D`, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
        }}
      >
        <ComingSoon />
        <GameIcon color={game.color} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>{game.name}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{game.tagline}</span>
        </span>
      </button>
    );
  }

  // —— Full (120px): fail / timeout — header + name + description + DISCOVER ——
  return (
    <button
      onClick={onTap}
      style={{
        position: 'relative', width: '100%', height: 120, cursor: 'pointer', textAlign: 'left',
        background: NAVY_CARD, border: `1px solid ${game.color}4D`, borderRadius: 10,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '12px 14px',
      }}
    >
      <ComingSoon />
      <span style={{ fontFamily: FONT, fontSize: 9, color: 'var(--gold)', letterSpacing: 1.5 }}>MORE FROM GAZETICA</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <GameIcon color={game.color} size={24} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'var(--white)' }}>{game.name}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{game.description}</span>
        </span>
      </span>
      <span style={{ alignSelf: 'flex-end', fontFamily: FONT, fontSize: 10, color: 'var(--gold)', letterSpacing: 1 }}>DISCOVER →</span>
    </button>
  );
}
