// GetHintModal.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-006 Part 2.4
//
// Shown when the player taps HINT with 0 gems. Offers a rewarded AdMob ad (free)
// or a trip to the IAP screen. On ad completion: addHints(1) then immediately
// consumeHint() and apply the hint to the current tile (onApplyHint), then close.
//
// Reads the existing admob.ts rewarded flow (showRewarded) — admob.ts is not
// modified. If no ad is available, surfaces a fallback message.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { showRewarded } from '../services/admob';
import { SKIN } from '../styles/skin';

const NO_ADS_MSG = 'No ads available right now. Try buying gems.';

export function GetHintModal({ onClose, onApplyHint }: { onClose: () => void; onApplyHint: () => void }) {
  const navigate = useNavigate();
  const hintCount = useSettingsStore((s) => s.hintCount);
  const addHints = useSettingsStore((s) => s.addHints);
  const consumeHint = useSettingsStore((s) => s.consumeHint);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWatchAd = async () => {
    setBusy(true);
    setError(null);
    let rewarded = false;
    try {
      await showRewarded(() => {
        rewarded = true;
      });
    } catch {
      setError(NO_ADS_MSG);
      setBusy(false);
      return;
    }
    if (rewarded) {
      await addHints(1); // grant the earned hint…
      consumeHint(); // …then immediately spend it on the current tile
      onApplyHint();
      onClose();
      return;
    }
    setError(NO_ADS_MSG);
    setBusy(false);
  };

  const handleBuyGems = () => {
    onClose();
    navigate('/iap');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(3,8,16,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 320,
          background: SKIN.cardBg,
          border: `1px solid ${SKIN.gold}`,
          borderRadius: 14,
          boxShadow: '0 0 24px rgba(255,215,0,0.18), 0 8px 24px rgba(0,0,0,0.5)',
          padding: '22px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: SKIN.gold, letterSpacing: 1, marginBottom: 14 }}>
          Get a Hint 💡
        </div>

        <div style={{ fontSize: 13, color: SKIN.white, marginBottom: 18 }}>
          You have {hintCount} 💎 gem{hintCount === 1 ? '' : 's'}
        </div>

        <button
          onClick={handleWatchAd}
          disabled={busy}
          style={{
            width: '100%',
            padding: '13px',
            marginBottom: 10,
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            letterSpacing: 1,
            borderRadius: 8,
            border: 'none',
            cursor: busy ? 'default' : 'pointer',
            background: SKIN.btnGold,
            color: '#07111F',
            boxShadow: SKIN.btnGoldShadow,
            fontWeight: 700,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '…' : '📺 Watch Ad → Free'}
        </button>

        <button
          onClick={handleBuyGems}
          disabled={busy}
          style={{
            width: '100%',
            padding: '13px',
            marginBottom: 6,
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            letterSpacing: 1,
            borderRadius: 8,
            background: 'rgba(0,210,200,0.08)',
            border: '1px solid rgba(0,210,200,0.4)',
            color: '#00D2C8',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          💎 Buy Gems
        </button>

        {error && (
          <div style={{ fontSize: 11, color: SKIN.muted, margin: '8px 2px 2px' }}>{error}</div>
        )}

        <button
          onClick={onClose}
          disabled={busy}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '8px',
            background: 'none',
            border: 'none',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 1,
            color: SKIN.muted,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
