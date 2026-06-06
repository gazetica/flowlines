// FreePlayScreen.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-004B P2
//
// Free Play configuration: grid size + difficulty + timer (on/off + duration).
// PLAY starts a synthetic game (no leaderboard, local PB only). 4-icon footer.

import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import type { Difficulty } from '../game/GridEngine';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { SKIN } from '../styles/skin';

const GRIDS = [3, 4, 5, 6, 7];
const DIFFS: { key: Difficulty; labelKey: string }[] = [
  { key: 'easy', labelKey: 'difficulty.easy' },
  { key: 'pro', labelKey: 'difficulty.pro' },
  { key: 'expert', labelKey: 'difficulty.expert' },
];
const TIMERS = [20, 30, 60, 90];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 4px',
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        background: SKIN.cardBg,
        border: `1px solid ${active ? SKIN.tileBorderGold : SKIN.cardBorder}`,
        borderRadius: 8,
        color: active ? SKIN.gold : SKIN.white,
        cursor: 'pointer',
        boxShadow: active ? '0 0 10px rgba(255,215,0,0.15)' : 'none',
        transition: 'border-color 0.2s, color 0.2s',
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: SKIN.muted, letterSpacing: 1, margin: '16px 0 8px' }}>
      {children}
    </div>
  );
}

export function FreePlayScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startFreePlay = useGameStore((s) => s.startFreePlay);
  const [grid, setGrid] = useState(4);
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [timerOn, setTimerOn] = useState(true);
  const [timerSecs, setTimerSecs] = useState(30);

  const handlePlay = () => {
    startFreePlay({ gridSize: grid, difficulty: diff, timerSecs: timerOn ? timerSecs : null });
    navigate('/game');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-dots" />
      <ParticleCanvas />

      <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '48px 20px 16px', gap: 16, zIndex: 10, borderBottom: '1px solid rgba(30,139,195,0.2)' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>{t('freeplay.title')}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px', position: 'relative', zIndex: 1 }}>
        <SectionLabel>{t('freeplay.grid_size')}</SectionLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {GRIDS.map((g) => (
            <Chip key={g} active={grid === g} onClick={() => setGrid(g)}>{g}×{g}</Chip>
          ))}
        </div>

        <SectionLabel>{t('freeplay.difficulty')}</SectionLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {DIFFS.map((d) => (
            <Chip key={d.key} active={diff === d.key} onClick={() => setDiff(d.key)}>{t(d.labelKey)}</Chip>
          ))}
        </div>

        <SectionLabel>{t('freeplay.timer')}</SectionLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip active={timerOn} onClick={() => setTimerOn(true)}>ON · {timerSecs}s</Chip>
          <Chip active={!timerOn} onClick={() => setTimerOn(false)}>{t('freeplay.off')}</Chip>
        </div>
        {timerOn && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {TIMERS.map((s) => (
              <Chip key={s} active={timerSecs === s} onClick={() => setTimerSecs(s)}>{s}s</Chip>
            ))}
          </div>
        )}

        <button className="btn-gold" onClick={handlePlay} style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2, marginTop: 28 }}>
          ▶ PLAY
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
