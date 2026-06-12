// ResultScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 2 Day 11 | Task FL-S2-011
//
// Post-game result screen (VDD VD-06 scaffold — data complete, animations land
// in Sprint 3). Shown when gameStore.status === 'complete'. Reads everything
// from the store after triggerWin() has run. No @ts-nocheck, no Numtap alias.

import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';

const GOLD = '#EF9F27';
const MUTED = '#6b6898';
const STAR_EMPTY = '#4a4a6a';

export function ResultScreen() {
  const navigate = useNavigate();
  const levelId = useFlowGameStore((s) => s.levelId);
  const stars = useFlowGameStore((s) => s.stars);
  const score = useFlowGameStore((s) => s.score);
  const moveCount = useFlowGameStore((s) => s.moveCount);
  const coverage = useFlowGameStore((s) => s.coverage);
  const optimalMoves = useFlowGameStore((s) => s.optimalMoves);
  const breakdown = useFlowGameStore((s) => s.scoreBreakdown);
  const resetGame = useFlowGameStore((s) => s.resetGame);

  // Parse "p1_001" → pack 1, level 001 (falls back gracefully for TEST_LEVEL).
  const match = /^p(\d+)_(\d+)/.exec(levelId);
  const packNo = match ? match[1] : '–';
  const levelNo = match ? match[2] : '—';

  const goPackSelect = () => {
    resetGame();
    navigate('/');
  };
  const replay = () => {
    resetGame();
    navigate('/game');
  };
  const nextLevel = () => {
    // Real per-level loading lands in Sprint 3; for now reload the game screen.
    resetGame();
    navigate('/game');
  };

  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    boxSizing: 'border-box',
  };
  const row: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: skin.white,
    padding: '4px 0',
  };

  // Build the visible (non-zero) breakdown rows.
  const breakdownRows: Array<{ label: string; value: string }> = [];
  if (breakdown) {
    if (breakdown.perfectClearBonus > 0)
      breakdownRows.push({ label: 'Perfect Clear', value: `+${breakdown.perfectClearBonus}` });
    if (breakdown.moveBonus > 0)
      breakdownRows.push({ label: 'Move bonus', value: `+${breakdown.moveBonus}` });
    if (breakdown.movePenalty > 0)
      breakdownRows.push({ label: 'Move penalty', value: `−${breakdown.movePenalty}` });
    if (breakdown.hintPenalty > 0)
      breakdownRows.push({ label: 'Hint penalty', value: `−${breakdown.hintPenalty}` });
    if (breakdown.timeBonus > 0)
      breakdownRows.push({ label: 'Time bonus', value: `+${breakdown.timeBonus}` });
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: skin.bgDeep,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: skin.fontBody,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
        <button
          onClick={goPackSelect}
          style={{ background: 'none', border: 'none', color: skin.white, fontSize: 14, cursor: 'pointer', padding: 4 }}
        >
          ‹ Back to Pack
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 20px 24px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: skin.fontDisplay, fontSize: 26, color: GOLD, marginTop: 8 }}>
          LEVEL COMPLETE!
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: -8 }}>
          Pack {packNo} · Level {levelNo}
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', gap: 12, fontSize: 40, lineHeight: 1 }}>
          {[1, 2, 3].map((n) => (
            <span key={n} style={{ color: n <= stars ? GOLD : STAR_EMPTY }}>
              {n <= stars ? '★' : '☆'}
            </span>
          ))}
        </div>

        {/* Score breakdown card */}
        <div style={card}>
          <div style={{ fontFamily: skin.fontDisplay, fontSize: 13, color: skin.purpleLight, marginBottom: 8, letterSpacing: 1 }}>
            SCORE BREAKDOWN
          </div>
          {breakdown ? (
            <>
              {breakdownRows.map((r) => (
                <div key={r.label} style={row}>
                  <span style={{ color: MUTED }}>{r.label}</span>
                  <span>{r.value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'rgba(127,119,221,0.2)', margin: '8px 0' }} />
              <div style={{ ...row, fontFamily: skin.fontDisplay }}>
                <span>Total</span>
                <span style={{ color: GOLD }}>{breakdown.total}</span>
              </div>
            </>
          ) : (
            <div style={row}>
              <span style={{ color: MUTED }}>Score</span>
              <span style={{ color: GOLD }}>{score}</span>
            </div>
          )}
        </div>

        {/* Stat row */}
        <div style={{ width: '100%', textAlign: 'center', color: MUTED, fontSize: 12, lineHeight: 1.6 }}>
          <div>
            Moves: <span style={{ color: skin.white }}>{moveCount}</span> &nbsp;|&nbsp; Optimal:{' '}
            <span style={{ color: skin.white }}>{optimalMoves}</span>
          </div>
          <div>
            Coverage: <span style={{ color: skin.white }}>{coverage}%</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={nextLevel}
          style={{
            width: '100%',
            padding: '14px',
            background: GOLD,
            color: skin.bgDeep,
            border: 'none',
            borderRadius: 12,
            fontFamily: skin.fontDisplay,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ▶ NEXT LEVEL
        </button>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={replay} style={{ background: 'none', border: 'none', color: skin.purpleLight, fontSize: 13, cursor: 'pointer' }}>
            Replay
          </button>
          <button onClick={goPackSelect} style={{ background: 'none', border: 'none', color: skin.purpleLight, fontSize: 13, cursor: 'pointer' }}>
            Pack Select
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultScreen;
