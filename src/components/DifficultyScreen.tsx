// DifficultyScreen.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-004B · visual overhaul T-006 Part 4
//
// Pre-game difficulty selector, shown after a mode is chosen (Campaign / Speed /
// Endless) and before the game starts. Not shown for Daily (fixed Easy) or Free
// Play (has its own config). The pending {levelId, mode} arrive via route state.
//
// T-006: three visually distinct "personality" cards (blue Easy / amber Pro /
// purple Expert), each with a mini-tile decoration; the START button colour
// follows the selected difficulty.

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import type { GameMode } from '../store/gameStore';
import type { Difficulty } from '../game/GridEngine';
import { ParticleCanvas } from './ParticleCanvas';
import { SKIN } from '../styles/skin';

interface DiffStyle {
  key: Difficulty;
  label: string;
  desc: string;
  mult: string;
  accent: string; // header / border / glow base colour
  cardBg: string;
  border: string;
  glow: string;
  tiles: (number | '?')[]; // mini-tile decoration sequence
  startBtn: string; // START gradient when selected
}

const OPTIONS: DiffStyle[] = [
  {
    key: 'easy',
    label: 'EASY',
    desc: 'Ascending 1 → N²',
    mult: '1.0×',
    accent: '#7FB0FF',
    cardBg: 'linear-gradient(135deg, #0F3460 0%, #0A2040 100%)',
    border: 'rgba(59,130,246,0.5)',
    glow: '0 0 20px rgba(59,130,246,0.1)',
    tiles: [1, 2, 3],
    startBtn: SKIN.btnGold,
  },
  {
    key: 'pro',
    label: 'PRO',
    desc: 'Descending N² → 1',
    mult: '1.5×',
    accent: '#F59E0B',
    cardBg: 'linear-gradient(135deg, #3D1F00 0%, #2A1500 100%)',
    border: 'rgba(245,158,11,0.5)',
    glow: '0 0 20px rgba(245,158,11,0.1)',
    tiles: [9, 8, 7],
    startBtn: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  {
    key: 'expert',
    label: 'EXPERT',
    desc: 'Random order',
    mult: '2.0×',
    accent: '#9333EA',
    cardBg: 'linear-gradient(135deg, #2D0A3F 0%, #1A0628 100%)',
    border: 'rgba(147,51,234,0.5)',
    glow: '0 0 20px rgba(147,51,234,0.1)',
    tiles: [7, '?', 3],
    startBtn: 'linear-gradient(135deg, #9333EA, #7C3AED)',
  },
];

// Reusable mini-tile used inside the difficulty cards (T-006 Part 4).
function MiniTile({ number, accent }: { number: number | '?'; accent: string }) {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Space Mono', monospace",
        fontSize: 10,
        color: accent,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25))',
        border: `1px solid ${accent}`,
      }}
    >
      {number}
    </div>
  );
}

export function DifficultyScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const startLevel = useGameStore((s) => s.startLevel);
  const [selected, setSelected] = useState<Difficulty>('easy');

  const state = location.state as { levelId?: number; mode?: GameMode } | null;
  const levelId = state?.levelId ?? 1;
  const mode: GameMode = state?.mode ?? 'campaign';

  const selectedOpt = OPTIONS.find((o) => o.key === selected)!;

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
                position: 'relative',
                textAlign: 'left',
                background: opt.cardBg,
                border: `1px solid ${opt.border}`,
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: isSel ? `${opt.glow}, inset 0 0 16px ${opt.border}` : opt.glow,
                outline: isSel ? `1px solid ${opt.accent}` : 'none',
                transition: 'box-shadow 0.2s, outline 0.2s',
                overflow: 'hidden',
              }}
            >
              {/* mini-tile decoration, top-right */}
              <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                {opt.tiles.map((n, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {idx > 0 && <span style={{ color: opt.accent, fontSize: 9 }}>→</span>}
                    <MiniTile number={n} accent={opt.accent} />
                  </div>
                ))}
              </div>

              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, letterSpacing: 1, color: opt.accent, marginBottom: 6, textShadow: isSel ? `0 0 10px ${opt.accent}` : 'none' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 12, color: SKIN.muted, marginBottom: 2 }}>{opt.desc}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: opt.accent }}>{opt.mult}</div>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 1 }}>
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '14px',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            background: selectedOpt.startBtn,
            color: selected === 'easy' ? '#07111F' : '#FFFFFF',
            boxShadow: selected === 'easy' ? SKIN.btnGoldShadow : `0 0 16px ${selectedOpt.border}, 0 4px 12px rgba(0,0,0,0.4)`,
          }}
        >
          START
        </button>
      </div>
    </div>
  );
}
