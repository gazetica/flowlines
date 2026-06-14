// HomeScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 14 | Task FL-S3-014 (VD-02)
//
// Main hub: header + gem badge, progress summary, CONTINUE card, 2×2 mode grid,
// daily-streak row, BottomNav. Reads (never mutates) flowSettingsStore.

import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';

function GemBadge({ balance }: { balance: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(255,215,0,0.12)',
        border: '1px solid rgba(255,215,0,0.3)',
        borderRadius: 10,
        padding: '4px 10px',
        color: GOLD,
        fontFamily: skin.fontDisplay,
        fontSize: 12,
      }}
    >
      <span>💎</span>
      <span>{balance}</span>
    </div>
  );
}

const MODES: Array<{ title: string; icon: string; subtitle: string; route: string; accent: string; tint: string; circle: string }> = [
  { title: 'CLASSIC', icon: '🎁', subtitle: 'Packs 1–4',      route: '/packs', accent: '#7F77DD', tint: 'rgba(127,119,221,0.06)', circle: 'rgba(127,119,221,0.15)' },
  { title: 'TIMED',   icon: '⏱', subtitle: '3 min rush',      route: '/packs', accent: '#E24B4A', tint: 'rgba(226,75,74,0.06)',  circle: 'rgba(226,75,74,0.15)' },
  { title: 'DAILY',   icon: '📅', subtitle: "Today's puzzle",  route: '/daily', accent: '#EF9F27', tint: 'rgba(239,159,39,0.08)', circle: 'rgba(239,159,39,0.15)' },
  { title: 'ZEN',     icon: '🧘', subtitle: 'No timer',        route: '/packs', accent: '#639922', tint: 'rgba(99,153,34,0.06)',  circle: 'rgba(99,153,34,0.15)' },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const packProgress = useFlowSettingsStore((s) => s.packProgress);
  const dailyStreak = useFlowSettingsStore((s) => s.dailyStreakFL);

  const totalSolved = [1, 2, 3, 4].reduce((sum, p) => sum + (packProgress[p]?.solved ?? 0), 0);

  // Current pack = highest pack with 0 < solved < 50 (in progress).
  const inProgressPack = [4, 3, 2, 1].find(
    (p) => (packProgress[p]?.solved ?? 0) > 0 && (packProgress[p]?.solved ?? 0) < 50,
  );
  const continueMode = inProgressPack !== undefined;
  const currentPack = inProgressPack ?? 1;
  const nextLevel = (packProgress[currentPack]?.solved ?? 0) + 1;

  const onContinue = () =>
    navigate(continueMode ? `/game?pack=${currentPack}&level=${nextLevel}` : '/packs');

  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 8,
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3">
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>FLOW LINES</span>
        <GemBadge balance={gemBalance} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Progress summary */}
        <div style={{ fontSize: 12, color: skin.muted }}>
          Solved: {totalSolved} &nbsp;|&nbsp; Streak: {dailyStreak}
          {dailyStreak > 0 && dailyStreak % 7 === 0 && (
            <span style={{ color: '#EF9F27', marginLeft: 4 }}>✨</span>
          )}
        </div>

        {/* CONTINUE card */}
        <button
          onClick={onContinue}
          style={{
            width: '100%',
            textAlign: 'left',
            background: GOLD,
            color: skin.bgDeep,
            border: 'none',
            borderRadius: 12,
            padding: 16,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontFamily: skin.fontDisplay, fontSize: 18, fontWeight: 700 }}>
            ▶ {continueMode ? 'CONTINUE' : 'START PLAYING'}
          </div>
          {continueMode && (
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
              Classic · Pack {currentPack} · Level {nextLevel}
            </div>
          )}
        </button>

        {/* Mode grid 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MODES.map((m) => (
            <button
              key={m.title}
              onClick={() => navigate(m.route)}
              style={{
                ...card,
                background: m.tint,
                borderLeft: `3px solid ${m.accent}`,
                padding: 14,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: m.circle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 6,
                }}
              >
                {m.icon}
              </div>
              <span style={{ fontFamily: skin.fontDisplay, fontSize: 11, color: skin.purpleLight, letterSpacing: 1 }}>{m.title}</span>
              <span style={{ fontSize: 9, color: skin.muted }}>{m.subtitle}</span>
            </button>
          ))}
        </div>

        {/* Daily streak row */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontSize: 10, color: skin.muted, letterSpacing: 1, marginBottom: 10 }}>DAILY STREAK</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {Array.from({ length: 7 }, (_, i) => {
              // Fill `dailyStreak` dots from the right.
              const filled = i >= 7 - Math.min(7, dailyStreak);
              return (
                <div
                  key={i}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    background: filled ? 'rgba(255,215,0,0.3)' : 'rgba(127,119,221,0.12)',
                    color: filled ? GOLD : skin.muted,
                  }}
                >
                  {filled ? '✓' : '·'}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default HomeScreen;
