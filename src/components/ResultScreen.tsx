// ResultScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-009 / 009b (VD-06)
//
// Mode-aware result screen with PASS and FAIL states. Reads the just-finished
// level's state from flowGameStore, recomputes the per-mode score via
// ScoreEngine.calc, persists it via recordLevelComplete, and preserves the
// first-win side-effects (interstitial, Supabase score, UMP consent, daily
// reminder). 009b: single consolidated RESULT card, LEVEL FAILED state, BottomNav.

import type { ReactNode, CSSProperties } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowGameStore } from '../store/flowGameStore';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { getLevel } from '../game/engine/LevelManager';
import { buildDailyLevelConfig, type DailyMode } from '../utils/dailyPuzzleGenerator';
import { ScoreEngine, type ScoreInput, type GameMode } from '../game/engine/ScoreEngine';
import { onLevelComplete } from '../services/interstitialAdService';
import { submitCampaignScore } from '../services/flCampaignScores';
import { submitDailyScore } from '../services/flDailyScores';
import { trackLevelComplete } from '../services/analytics';
import { requestAndResolve } from '../services/consentService';
import { requestNotificationPermission, scheduleDailyReminder } from '../services/notificationService';
import { FloatingPathCanvas } from './FloatingPathCanvas';
import { GazeticaPromoCard } from './GazeticaPromoCard';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mmss = (s: number): string => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export function ResultScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packId = parseInt(searchParams.get('pack') ?? '1', 10);
  const levelIdx = parseInt(searchParams.get('level') ?? '1', 10);
  const mode = (searchParams.get('mode') ?? 'campaign') as GameMode;
  const isFail = searchParams.get('fail') === 'true';
  const isRetry = searchParams.get('retry') === 'true';

  const isCampaign = mode === 'campaign' || mode === 'daily_campaign';
  const isClassic = mode === 'classic' || mode === 'daily_classic';
  const isDaily = mode === 'daily_campaign' || mode === 'daily_classic';

  const hintsUsed = useFlowGameStore((s) => s.hintsUsed);
  const clueUsed = useFlowGameStore((s) => s.clueUsed);
  const timeElapsed = useFlowGameStore((s) => s.timeElapsed);
  const timeLimitSeconds = useFlowGameStore((s) => s.timeLimitSeconds);
  const gestureCount = useFlowGameStore((s) => s.gestureCount);
  const classicMoveLimitTotal = useFlowGameStore((s) => s.classicMoveLimitTotal);
  const coverage = useFlowGameStore((s) => s.coverage);
  const moveCount = useFlowGameStore((s) => s.moveCount);

  const campaignProgress = useFlowSettingsStore((s) => s.campaignProgress);
  const classicProgress = useFlowSettingsStore((s) => s.classicProgress);
  const recordLevelComplete = useFlowSettingsStore((s) => s.recordLevelComplete);
  const recordDailyComplete = useFlowSettingsStore((s) => s.recordDailyComplete);
  const dailyProgress = useFlowSettingsStore((s) => s.dailyProgress);
  const incrementDailyRetry = useFlowSettingsStore((s) => s.incrementDailyRetry);

  // FL-UX-D-010: daily levels are runtime-generated (not from any pack).
  const levelData = useMemo(
    () => (isDaily ? buildDailyLevelConfig(mode as DailyMode) : getLevel(packId, levelIdx)),
    [isDaily, mode, packId, levelIdx],
  );
  const difficulty = levelData?.difficulty ?? 'easy';
  const gridSize = levelData?.grid ?? 6;
  const totalTiles = gridSize * gridSize;
  const filledTiles = Math.round((coverage / 100) * totalTiles);

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
      colourCount: levelData?.colours ?? 5,
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
    if (isFail) return;

    if (isDaily) {
      // Daily completions do NOT touch pack progression — record the daily flag
      // and submit to the daily leaderboard. Retry score is capped at 80% (§8).
      const challenge = mode === 'daily_campaign' ? 'campaign' : 'classic';
      recordDailyComplete(challenge);
      const submitScore = isRetry ? Math.round(result.total * 0.8) : result.total;
      void submitDailyScore(submitScore, gestureCount);
    } else if (mode !== 'zen') {
      recordLevelComplete({
        mode, packId, levelId, levelIndex: levelIdx, stars, score: result.total, timeElapsed, gestureCount,
      });
    }

    const isZen = mode === 'zen';
    const removeAds = useFlowSettingsStore.getState().removeAdsPurchased ?? false;
    const adTimer = setTimeout(() => { void onLevelComplete(isZen, removeAds); }, 1500);

    const m = /^p(\d+)_(\d+)/.exec(levelId);
    if (m) {
      void submitCampaignScore(levelId, Number(m[1]), result.total, moveCount);
      trackLevelComplete({ level_id: levelId, pack_id: Number(m[1]), moves: moveCount, stars, score: result.total });
    }

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

  const breadcrumb = isDaily
    ? `Daily Challenge · ${isCampaign ? 'Campaign' : 'Classic'}`
    : `Pack ${packId} · Level ${String(levelIdx).padStart(2, '0')} · ${cap(String(difficulty))}`;

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
    const dailyAttempts = mode === 'daily_campaign' ? dailyProgress.campaignRetryCount : dailyProgress.classicRetryCount;
    const retriesLeft = !isDaily || dailyAttempts < 3; // first attempt + up to 2 retries
    const tryAgain = () => {
      if (isDaily) {
        incrementDailyRetry(mode === 'daily_campaign' ? 'campaign' : 'classic');
        navigate(`/game?mode=${mode}&retry=true`);
      } else {
        navigate(`/game?pack=${packId}&level=${levelIdx}&mode=${mode}`);
      }
    };
    return (
      <Frame>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 56 }}>
          <div style={{ fontSize: 40 }}>{isClassic ? '♟' : '⏱'}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#E74C3C', letterSpacing: 2, textAlign: 'center', marginTop: 12, marginBottom: 6 }}>
            LEVEL FAILED
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 4 }}>
            {isClassic ? 'No moves remaining' : 'Time ran out'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 20 }}>{breadcrumb}</div>

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
            <button onPointerDown={() => navigate(isDaily ? '/daily' : `/levels/${packId}?mode=${mode}`)} style={{ ...ghostBtn, width: '100%' }}>
              {isDaily ? '‹ Back to Daily' : '‹ Back to Levels'}
            </button>
          </div>

          <div style={{ height: 16 }} />
          <div style={{ alignSelf: 'stretch', margin: '0 20px 24px' }}><GazeticaPromoCard /></div>
        </div>
      </Frame>
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
      <span key={n} style={{ fontSize: 36, color: earned ? GOLD : 'rgba(255,255,255,0.6)', opacity: earned ? 1 : 0.35, display: 'inline-block', animation: `flStarBounce 500ms ease-out ${(n - 1) * 150}ms both` }}>
        {earned ? '★' : '☆'}
      </span>
    );
  };

  return (
    <Frame>
      <div style={{ fontSize: 24, fontWeight: 700, color: GOLD, letterSpacing: 2, textAlign: 'center', marginTop: 24, marginBottom: 4 }}>
        LEVEL COMPLETE!
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 16 }}>{breadcrumb}</div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>{[1, 2, 3].map(starSpan)}</div>
      {perfectClear
        ? <div style={{ fontSize: 13, color: GOLD, textAlign: 'center', marginBottom: 16 }}>✨ PERFECT CLEAR!</div>
        : <div style={{ marginBottom: 16 }} />}

      {/* Single consolidated RESULT card (score rows + stats) */}
      <div style={{ ...card, animation: 'flFadeSlideUp 300ms ease-out 200ms both' }}>
        <div style={cardHeader}>RESULT</div>
        <Row label="Dots connected" value={`${b.dotsScore}`} />
        <Row label="Board filled" value={`${b.coverageScore}`} />
        <Row label={isClassic ? 'Move efficiency' : 'Time efficiency'} value={`${b.efficiencyScore}`} />
        <Row label="Gesture bonus" value={`${b.bonusScore}`} />
        {hintsUsed > 0 && <Row label={`Hints used (×${hintsUsed})`} value={`${b.hintPenalty}`} />}
        {clueUsed && <Row label="Auto-complete used" value={`${cluePenalty}`} />}
        <div style={{ borderTop: '1px solid rgba(127,119,221,0.2)', margin: '6px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>TOTAL</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>{result.total}</span>
        </div>

        {/* Stats below divider */}
        <div style={{ borderTop: '1px solid rgba(127,119,221,0.15)', marginTop: 10, paddingTop: 10 }}>
          {isCampaign && (
            <>
              <StatRow a={['Time taken', mmss(timeElapsed)]} b={['Timer limit', mmss(timeLimitSeconds)]} />
              <StatRow a={['Gestures', `${gestureCount}`]} b={['Best time', bestTime != null ? mmss(bestTime) : 'First! 🎉']} last />
            </>
          )}
          {isClassic && (
            <>
              <StatRow a={['Gestures', `${gestureCount}`]} b={['Budget', `${classicMoveLimitTotal}`]} />
              <StatRow a={['Time taken', mmss(timeElapsed)]} b={['Best moves', bestMoves != null ? `${bestMoves}` : 'First! 🎉']} last />
            </>
          )}
          {!isCampaign && !isClassic && (
            <StatRow a={['Moves', `${moveCount}`]} b={['Time', mmss(timeElapsed)]} last />
          )}
        </div>
      </div>

      {/* CTAs */}
      {isDaily ? (
        <button
          onPointerDown={() => navigate('/daily')}
          style={{ width: 'calc(100% - 40px)', margin: '0 20px 16px', background: GOLD, color: '#0D0620', border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          ✓  BACK TO DAILY
        </button>
      ) : (
        <>
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
        </>
      )}

      <div style={{ margin: '0 20px 24px' }}><GazeticaPromoCard /></div>
    </Frame>
  );
}

// ─── Frame: gradient bg + FloatingPathCanvas + scroll area + pinned BottomNav ──
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', height: '100dvh', width: '100%', background: '#0D0620', overflowX: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <FloatingPathCanvas />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1, touchAction: 'pan-y', paddingBottom: 16 }}>
        {children}
      </div>
      <div style={{ position: 'relative', zIndex: 2 }}><BottomNav /></div>
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

function StatCell({ label, value, end }: { label: string; value: string; end?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: end ? 'flex-end' : 'flex-start' }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{value}</span>
    </div>
  );
}

function StatRow({ a, b, last }: { a: [string, string]; b: [string, string]; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: last ? 0 : 6 }}>
      <StatCell label={a[0]} value={a[1]} />
      <StatCell label={b[0]} value={b[1]} end />
    </div>
  );
}

export default ResultScreen;
