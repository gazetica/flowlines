// ResultScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 2 Day 11 | Task FL-S2-011
//
// Post-game result screen (VDD VD-06 scaffold — data complete, animations land
// in Sprint 3). Shown when gameStore.status === 'complete'. Reads everything
// from the store after triggerWin() has run. No @ts-nocheck, no Numtap alias.

import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { getNextLevel } from '../game/engine/LevelManager';
import { onLevelComplete } from '../services/interstitialAdService';
import { submitCampaignScore } from '../services/flCampaignScores';
import { trackLevelComplete } from '../services/analytics';
import { requestAndResolve } from '../services/consentService';
import { flagOf } from './CountrySelector';
import { GazeticaPromoCard } from './GazeticaPromoCard';

/** 1-based level index from a level id, e.g. "p1_005" → 5. */
function levelIndexFromId(id: string): number {
  return parseInt(id.split('_')[1] ?? '1', 10);
}

const GOLD = '#EF9F27';
const MUTED = '#6b6898';
const STAR_EMPTY = '#4a4a6a';

// Stars bounce in (VDD: 120ms each, ease-out, 130ms stagger). 3-star earns a
// gold glow pulse on the container 380ms after mount (last star lands at 260+120).
const RESULT_KEYFRAMES = `
@keyframes flStarBounce {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1.0); opacity: 1; }
}
@keyframes flStarGlow {
  0%   { box-shadow: 0 0 20px rgba(255,215,0,0.6); }
  100% { box-shadow: 0 0 0 rgba(255,215,0,0); }
}
`;

export function ResultScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelId = useFlowGameStore((s) => s.levelId);
  const stars = useFlowGameStore((s) => s.stars);
  const score = useFlowGameStore((s) => s.score);
  const moveCount = useFlowGameStore((s) => s.moveCount);
  const coverage = useFlowGameStore((s) => s.coverage);
  const optimalMoves = useFlowGameStore((s) => s.optimalMoves);
  const breakdown = useFlowGameStore((s) => s.scoreBreakdown);
  const resetGame = useFlowGameStore((s) => s.resetGame);

  // Player identity for the leaderboard rank snippet.
  const playerUid = useFlowSettingsStore((s) => s.playerUid);
  const alias = useFlowSettingsStore((s) => s.alias);
  const country = useFlowSettingsStore((s) => s.country);
  const packProgress = useFlowSettingsStore((s) => s.packProgress);
  const flag = country ? flagOf(country) : '🌐';

  const perfectClear = (breakdown?.perfectClearBonus ?? 0) > 0;

  // Interstitial gate (CLAUDE.md §9: ResultScreen only). Fires once on mount —
  // shows an ad on the 5-completions / 3-minute trigger, never for Remove-Ads
  // owners, never in Zen mode. Self-gating inside the service.
  useEffect(() => {
    const isZen = searchParams.get('mode') === 'zen';
    const removeAds = useFlowSettingsStore.getState().removeAdsPurchased ?? false;
    void onLevelComplete(isZen, removeAds);

    // Submit the campaign score + log completion for real pack levels only
    // (TEST_LEVEL has an empty levelId). Daily wins route to /daily, not here.
    const m = /^p(\d+)_(\d+)/.exec(levelId);
    if (m) {
      const pack = Number(m[1]);
      void submitCampaignScore(levelId, pack, score, moveCount);
      trackLevelComplete({ level_id: levelId, pack_id: pack, moves: moveCount, stars, score });
    }

    // FL-UX-B B.1: UMP consent is deferred to the first win. Fire it once (after
    // a short beat so the result screen renders first); persist so it never
    // repeats. Non-EU players skip silently inside requestAndResolve().
    const settings = useFlowSettingsStore.getState();
    if (!settings.consentRequested) {
      settings.markConsentRequested();
      setTimeout(() => { void requestAndResolve(); }, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse "p1_001" → pack 1, level 001 (falls back gracefully for TEST_LEVEL).
  const match = /^p(\d+)_(\d+)/.exec(levelId);
  const packNo = match ? match[1] : '–';
  const levelNo = match ? match[2] : '—';

  const currentPack = match ? Number(match[1]) : 1;
  const currentIndex = match ? Number(match[2]) : 1;

  const goPackSelect = () => {
    resetGame();
    navigate('/packs');
  };
  const replay = () => {
    resetGame();
    if (match) navigate(`/game?pack=${currentPack}&level=${currentIndex}`);
    else navigate('/game');
  };
  const nextLevel = () => {
    resetGame();
    const next = match ? getNextLevel(levelId) : null;
    if (next) {
      navigate(`/game?pack=${next.pack}&level=${levelIndexFromId(next.id)}`);
    } else {
      navigate('/packs'); // last level in pack (or no real level loaded)
    }
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

        {/* Stars — earned stars bounce in with a 130ms stagger; 3-star glow pulse */}
        <style>{RESULT_KEYFRAMES}</style>
        <div
          style={{
            display: 'flex',
            gap: 12,
            fontSize: 40,
            lineHeight: 1,
            borderRadius: 16,
            padding: '2px 8px',
            animation: stars >= 3 ? 'flStarGlow 600ms ease-out 380ms forwards' : undefined,
          }}
        >
          {[1, 2, 3].map((n) => {
            const earned = n <= stars;
            return (
              <span
                key={n}
                style={{
                  display: 'inline-block',
                  color: earned ? GOLD : STAR_EMPTY,
                  ...(earned
                    ? {
                        opacity: 0,
                        animation: `flStarBounce 120ms ease-out ${(n - 1) * 130}ms forwards`,
                      }
                    : {}),
                }}
              >
                {earned ? '★' : '☆'}
              </span>
            );
          })}
        </div>

        {/* ✨ PERFECT CLEAR badge */}
        {perfectClear && (
          <div
            style={{
              fontFamily: skin.fontDisplay,
              fontSize: 13,
              color: skin.gold,
              textAlign: 'center',
              marginTop: -4,
            }}
          >
            ✨ PERFECT CLEAR!
          </div>
        )}

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

        {/* Pack progress — never end a session on a zero; show a bar to fill. */}
        <div
          style={{
            margin: '0',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(127,119,221,0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: 10, color: MUTED, fontFamily: skin.fontDisplay, marginBottom: 8, letterSpacing: 1 }}>
            PACK {currentPack} PROGRESS
          </div>
          <div style={{ height: 6, background: 'rgba(127,119,221,0.2)', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(Math.min((packProgress[currentPack]?.solved ?? 0), 50) / 50) * 100}%`,
                background: 'linear-gradient(90deg, #7F77DD, #EF9F27)',
                borderRadius: 3,
                transition: 'width 0.6s ease-out',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: skin.purpleLight }}>
            {packProgress[currentPack]?.solved ?? 0} / 50 levels solved
          </div>
        </div>

        {/* YOUR RANK snippet — own-row highlight style from VD-08 */}
        <div
          style={{
            ...card,
            background: 'rgba(255,215,0,0.08)',
            border: '1px solid rgba(255,215,0,0.25)',
          }}
        >
          <div style={{ fontFamily: skin.fontDisplay, fontSize: 13, color: skin.purpleLight, marginBottom: 8, letterSpacing: 1 }}>
            YOUR RANK
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: skin.white }}>
            {/* TODO Sprint 4: real rank from Supabase */}
            <span style={{ fontFamily: skin.fontDisplay, color: GOLD, minWidth: 34 }}>#--</span>
            <span style={{ fontSize: 11, color: MUTED }}>{playerUid || '—'}</span>
            <span style={{ fontSize: 16 }}>{flag}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {alias || 'You'}
            </span>
            <span style={{ fontFamily: skin.fontDisplay, color: GOLD }}>{score}</span>
          </div>
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

        {/* Cross-promo (CLAUDE.md §9: ResultScreen bottom slot = GazeticaPromoCard only) */}
        <div style={{ width: '100%', height: 1, background: 'rgba(127,119,221,0.2)', marginTop: 4 }} />
        <GazeticaPromoCard />
      </div>
    </div>
  );
}

export default ResultScreen;
