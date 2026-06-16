// ResultScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-009 (VD-06)
//
// Mode-aware result screen with PASS and FAIL states. Reads the just-finished
// level's state from flowGameStore (set by triggerWin / fail), recomputes the
// per-mode score via ScoreEngine.calc, persists it via recordLevelComplete, and
// preserves the critical first-win side-effects (interstitial, Supabase score,
// UMP consent, daily-reminder permission) carried over from the prior screen.

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { getLevel } from '../game/engine/LevelManager';
import { ScoreEngine, type ScoreInput, type GameMode } from '../game/engine/ScoreEngine';
import { onLevelComplete } from '../services/interstitialAdService';
import { submitCampaignScore } from '../services/flCampaignScores';
import { trackLevelComplete } from '../services/analytics';
import { requestAndResolve } from '../services/consentService';
import { requestNotificationPermission, scheduleDailyReminder } from '../services/notificationService';
import { FloatingPathCanvas } from './FloatingPathCanvas';
import { GazeticaPromoCard } from './GazeticaPromoCard';

const GOLD = '#FFD700';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export function ResultScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packId = parseInt(searchParams.get('pack') ?? '1', 10);
  const levelIdx = parseInt(searchParams.get('level') ?? '1', 10);
  const mode = (searchParams.get('mode') ?? 'campaign') as GameMode;
  const isFail = searchParams.get('fail') === 'true';

  const isCampaign = mode === 'campaign' || mode === 'daily_campaign';
  const isClassic = mode === 'classic' || mode === 'daily_classic';
  const isDaily = mode === 'daily_campaign' || mode === 'daily_classic';

  // Finished-level state (still in the store; cleared by the next initLevel).
  const hintsUsed = useFlowGameStore((s) => s.hintsUsed);
  const clueUsed = useFlowGameStore((s) => s.clueUsed);
  const timeElapsed = useFlowGameStore((s) => s.timeElapsed);
  const timeLimitSeconds = useFlowGameStore((s) => s.timeLimitSeconds);
  const gestureCount = useFlowGameStore((s) => s.gestureCount);
  const classicMoveLimitTotal = useFlowGameStore((s) => s.classicMoveLimitTotal);
  const coverage = useFlowGameStore((s) => s.coverage);
  const moveCount = useFlowGameStore((s) => s.moveCount);
  const retryCount = useFlowGameStore((s) => s.retryCount);
  const incrementRetry = useFlowGameStore((s) => s.incrementRetry);

  const campaignProgress = useFlowSettingsStore((s) => s.campaignProgress);
  const classicProgress = useFlowSettingsStore((s) => s.classicProgress);
  const recordLevelComplete = useFlowSettingsStore((s) => s.recordLevelComplete);

  const levelData = useMemo(() => getLevel(packId, levelIdx), [packId, levelIdx]);
  const difficulty = levelData?.difficulty ?? 'easy';
  const gridSize = levelData?.grid ?? 6;
  const totalTiles = gridSize * gridSize;
  const filledTiles = Math.round((coverage / 100) * totalTiles);

  // Per-mode score (the 4-component FL-UX-D-004 formula).
  const result = useMemo(() => {
    const input: ScoreInput = {
      mode,
      dotsConnected: !isFail,
      coveragePct: coverage,
      timeElapsed,
      timeLimit: timeLimitSeconds,
      movesUsed: gestureCount,
      classicMoveLimit: classicMoveLimitTotal,
      optimalMoves: levelData?.optimalMoves ?? 20,
      cellMoveCount: moveCount,
      hintsUsed,
      clueUsed,
      difficulty,
    };
    return ScoreEngine.calc(input);
  }, [mode, isFail, coverage, timeElapsed, timeLimitSeconds, gestureCount, classicMoveLimitTotal, levelData, moveCount, hintsUsed, clueUsed, difficulty]);

  const stars = result.stars;
  const perfectClear = stars >= 3 && hintsUsed === 0 && !clueUsed;

  const modeProgress = isClassic ? classicProgress : campaignProgress;
  const packProg = modeProgress[packId];
  const levelId = levelData?.id ?? '';
  const bestTime = packProg?.bestTimes?.[levelId] ?? null;
  const bestMoves = packProg?.bestMoves?.[levelId] ?? null;

  // ─── Mount side-effects (record + interstitial + Supabase + consent + notif) ──
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (isFail) return; // fails: no record / score submit / ad / first-win flows

    // Zen has no pack progression — skip recording for it.
    if (mode !== 'zen') {
      recordLevelComplete({
        mode: mode === 'daily_campaign' ? 'campaign' : mode === 'daily_classic' ? 'classic' : mode,
        packId,
        levelId,
        levelIndex: levelIdx,
        stars,
        score: result.total,
        timeElapsed,
        gestureCount,
      });
    }

    // Interstitial — CLAUDE.md §9: ResultScreen only, never Zen. Self-gates inside.
    const isZen = mode === 'zen';
    const removeAds = useFlowSettingsStore.getState().removeAdsPurchased ?? false;
    const adTimer = setTimeout(() => { void onLevelComplete(isZen, removeAds); }, 1500);

    // Supabase score + analytics for real pack levels (TEST_LEVEL has empty id).
    const m = /^p(\d+)_(\d+)/.exec(levelId);
    if (m) {
      void submitCampaignScore(levelId, Number(m[1]), result.total, moveCount);
      trackLevelComplete({ level_id: levelId, pack_id: Number(m[1]), moves: moveCount, stars, score: result.total });
    }

    // First-win flows (deferred consent + daily reminder), persisted → fire once.
    const settings = useFlowSettingsStore.getState();
    if (!settings.consentRequested) {
      settings.markConsentRequested();
      setTimeout(() => { void requestAndResolve(); }, 800);
    }
    if (!settings.notificationScheduled) {
      void requestNotificationPermission().then((granted) => {
        if (granted) { void scheduleDailyReminder(); settings.markNotificationScheduled(); }
      });
    }

    return () => clearTimeout(adTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const breadcrumb = `Pack ${packId} · Level ${String(levelIdx).padStart(2, '0')} · ${cap(String(difficulty))}`;

  const screen: CSSProperties = {
    position: 'relative', minHeight: '100dvh', width: '100%',
    background: 'linear-gradient(160deg, #1A0A3C 0%, #2D1060 100%)',
    overflowX: 'hidden', overflowY: 'auto', touchAction: 'pan-y',
    paddingBottom: 24, fontFamily: skin.fontBody,
  };
  const card: CSSProperties = {
    margin: '0 20px 12px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(127,119,221,0.2)', borderRadius: 14, padding: '14px 16px',
  };
  const cardHeader: CSSProperties = { fontSize: 10, fontWeight: 700, color: 'rgba(127,119,221,0.7)', letterSpacing: 1.5, marginBottom: 10 };
  const ghostBtn: CSSProperties = {
    flex: 1, border: '1px solid rgba(255,255,255,0.12)', background: 'none', borderRadius: 10,
    padding: 13, fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
  };

  // ─── FAIL STATE ───────────────────────────────────────────────────────────
  if (isFail || stars === 0) {
    const retriesLeft = !isDaily || retryCount < 2;
    const tryAgain = () => {
      if (isDaily) incrementRetry();
      navigate(`/game?pack=${packId}&level=${levelIdx}&mode=${mode}`);
    };
    return (
      <div style={screen}>
        <FloatingPathCanvas />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64 }}>
          <div style={{ fontSize: 40 }}>{isClassic ? '♟' : '⏱'}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#E74C3C', letterSpacing: 2, marginTop: 12 }}>
            {isClassic ? 'OUT OF MOVES' : "TIME'S UP"}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, marginBottom: 24 }}>{breadcrumb}</div>

          <div style={{ ...card, alignSelf: 'stretch' }}>
            <div style={cardHeader}>HOW FAR YOU GOT</div>
            <Row label="You reached" value={`${coverage}%`} />
            <Row label="Tiles filled" value={`${filledTiles}/${totalTiles}`} />
            <Row label={isClassic ? 'Moves used' : 'Cell moves'} value={isClassic ? `${gestureCount}/${classicMoveLimitTotal}` : `${moveCount}`} last />
          </div>

          <div style={{ alignSelf: 'stretch', margin: '4px 20px 0' }}>
            {retriesLeft ? (
              <button
                onPointerDown={tryAgain}
                style={{ width: '100%', background: GOLD, color: '#0D0620', border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
              >
                ↩  TRY AGAIN
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 10 }}>No more retries today</div>
            )}
            <button onPointerDown={() => navigate(`/levels/${packId}?mode=${mode}`)} style={{ ...ghostBtn, width: '100%' }}>
              ‹ Back to Levels
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PASS STATE ───────────────────────────────────────────────────────────
  const b = result.breakdown;
  const cluePenalty = clueUsed ? -100 : 0;
  const nextLevelIdx = levelIdx + 1;
  const hasNextLevel = nextLevelIdx <= 50;

  const starSpan = (n: number) => {
    const earned = n <= stars;
    return (
      <span
        key={n}
        style={{
          fontSize: earned ? 36 : 28,
          color: earned ? GOLD : '#4a4a6a',
          display: 'inline-block',
          animation: `flStarBounce 500ms ease-out ${(n - 1) * 150}ms both`,
        }}
      >
        {earned ? '★' : '☆'}
      </span>
    );
  };

  return (
    <div style={screen}>
      <FloatingPathCanvas />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ fontSize: 24, fontWeight: 700, color: GOLD, letterSpacing: 2, textAlign: 'center', marginTop: 24, marginBottom: 4 }}>
          LEVEL COMPLETE!
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 16 }}>{breadcrumb}</div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          {[1, 2, 3].map(starSpan)}
        </div>
        {perfectClear && (
          <div style={{ fontSize: 13, color: GOLD, textAlign: 'center', marginBottom: 16 }}>✨ PERFECT CLEAR!</div>
        )}
        {!perfectClear && <div style={{ marginBottom: 16 }} />}

        {/* Score breakdown */}
        <div style={{ ...card, animation: 'flFadeSlideUp 300ms ease-out 200ms both' }}>
          <div style={cardHeader}>SCORE BREAKDOWN</div>
          <Row label="Dots connected" value={`${b.dotsScore} / 250`} />
          <Row label="Board filled" value={`${b.coverageScore} / 250`} />
          <Row label={isClassic ? 'Move efficiency' : 'Time efficiency'} value={`${b.efficiencyScore} / 300`} />
          <Row label={isClassic ? 'Time bonus' : 'Move bonus'} value={`${b.bonusScore} / 200`} />
          {hintsUsed > 0 && <Row label={`Hints used (×${hintsUsed})`} value={`${b.hintPenalty}`} />}
          {clueUsed && <Row label="Auto-complete used" value={`${cluePenalty}`} />}
          <div style={{ borderTop: '1px solid rgba(127,119,221,0.2)', margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>TOTAL</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>{result.total} / 1000</span>
          </div>
        </div>

        {/* Your stats */}
        <div style={{ ...card, animation: 'flFadeSlideUp 300ms ease-out 320ms both' }}>
          <div style={cardHeader}>YOUR STATS</div>
          {isCampaign && (
            <>
              <Row label="Time taken" value={mmss(timeElapsed)} />
              <Row label="Timer limit" value={mmss(timeLimitSeconds)} />
              <Row label="Cell moves" value={`${moveCount}`} />
              <Row label="Best time" value={bestTime != null ? mmss(bestTime) : 'First clear! 🎉'} last />
            </>
          )}
          {isClassic && (
            <>
              <Row label="Moves used" value={`${gestureCount} of ${classicMoveLimitTotal}`} />
              <Row label="Time taken" value={mmss(timeElapsed)} />
              <Row label="Best moves" value={bestMoves != null ? `${bestMoves}` : 'First clear! 🎉'} last />
            </>
          )}
          {!isCampaign && !isClassic && (
            <>
              <Row label="Moves taken" value={`${moveCount}`} />
              <Row label="Time" value={mmss(timeElapsed)} last />
            </>
          )}
        </div>

        {/* CTAs */}
        <button
          onPointerDown={() => hasNextLevel ? navigate(`/game?pack=${packId}&level=${nextLevelIdx}&mode=${mode}`) : navigate(`/packs?mode=${mode}`)}
          style={{ width: 'calc(100% - 40px)', margin: '0 20px 10px', background: GOLD, color: '#0D0620', border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          {hasNextLevel ? `▶  NEXT LEVEL (Level ${String(nextLevelIdx).padStart(2, '0')})` : '▶  PACK COMPLETE!'}
        </button>
        <div style={{ margin: '0 20px 16px', display: 'flex', gap: 10 }}>
          <button onPointerDown={() => navigate(`/game?pack=${packId}&level=${levelIdx}&mode=${mode}&replay=true`)} style={ghostBtn}>↩  Replay</button>
          <button onPointerDown={() => navigate(`/levels/${packId}?mode=${mode}`)} style={ghostBtn}>☰  Levels</button>
        </div>

        {/* Cross-promo (CLAUDE.md §9: ResultScreen bottom slot = GazeticaPromoCard only) */}
        <div style={{ margin: '0 20px 24px' }}>
          <GazeticaPromoCard />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: last ? 'none' : '1px solid rgba(127,119,221,0.08)' }}>
      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
      <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default ResultScreen;
