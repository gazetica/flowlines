// DifficultyScreen.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-004B | Part 1.4
//
// Pre-game difficulty selector, shown after a mode is chosen (Campaign / Speed /
// Endless) and before the game starts. Not shown for Daily (fixed Easy) or Free
// Play (has its own config). The pending {levelId, mode} arrive via route state.

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import type { GameMode } from '../store/gameStore';
import type { Difficulty } from '../game/GridEngine';
import { ParticleCanvas } from './ParticleCanvas';
import { SKIN } from '../styles/skin';

const OPTIONS: { key: Difficulty; label: string; desc: string; mult: string }[] = [
  { key: 'easy', label: 'EASY', desc: 'Ascending 1 → N²', mult: '1.0×' },
  { key: 'pro', label: 'PRO', desc: 'Descending N² → 1', mult: '1.5× score' },
  { key: 'expert', label: 'EXPERT', desc: 'Random order', mult: '2.0× score' },
];

export function DifficultyScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const startLevel = useGameStore((s) => s.startLevel);
  const [selected, setSelected] = useState<Difficulty>('easy');

  const state = location.state as { levelId?: number; mode?: GameMode } | null;
  const levelId = state?.levelId ?? 1;
  const mode: GameMode = state?.mode ?? 'campaign';

  const handleStart = () => {
    startLevel(levelId, mode, selected);
    navigate('/game');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-dots" />
      <ParticleCanvas />

      <div style={{ textAlign: 'center', padding: '56px 24px 24px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: 'var(--white)', letterSpacing: 2 }}>
          SELECT DIFFICULTY
        </h1>
      </div>

      <div style={{ flex: 1, padding: '0 20px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPTIONS.map((opt) => {
          const isSel = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              style={{
                textAlign: 'left',
                background: SKIN.cardBg,
                border: `1px solid ${isSel ? SKIN.tileBorderGold : SKIN.cardBorder}`,
                borderRadius: 10,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: isSel ? '0 0 12px rgba(255,215,0,0.18)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, letterSpacing: 1, color: isSel ? SKIN.gold : SKIN.white, marginBottom: 4 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 12, color: SKIN.muted, marginBottom: 2 }}>{opt.desc}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: isSel ? SKIN.gold : SKIN.muted }}>{opt.mult}</div>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 1 }}>
        <button className="btn-gold" onClick={handleStart} style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2 }}>
          START
        </button>
      </div>
    </div>
  );
}
