// WinScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 1 Day 6 | Task FL-S1-006
//
// Minimal win stub — confirms win detection fires and navigation works. The
// full ResultScreen (VDD VD-06) is built in Sprint 3. No SKIN import.

import { useNavigate } from 'react-router-dom';
import { useFlowGameStore } from '../store/flowGameStore';
import { skin } from '../styles/skin';

export function WinScreen() {
  const navigate = useNavigate();
  const coverage = useFlowGameStore((s) => s.coverage);
  const moveCount = useFlowGameStore((s) => s.moveCount);
  const resetGame = useFlowGameStore((s) => s.resetGame);

  const handlePlayAgain = () => {
    resetGame();
    navigate('/game');
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: skin.bgDeep,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: skin.fontDisplay,
      }}
    >
      <div style={{ fontSize: 32, color: skin.gold }}>✓ SOLVED</div>
      <div style={{ fontSize: 14, color: skin.purpleLight }}>
        Coverage: {coverage}% · Moves: {moveCount}
      </div>
      <button
        onClick={handlePlayAgain}
        style={{
          padding: '12px 32px',
          background: skin.gold,
          color: skin.bgDeep,
          border: 'none',
          borderRadius: 8,
          fontFamily: skin.fontDisplay,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

export default WinScreen;
