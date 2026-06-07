// ResultScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 6 | Task T-013 | VD-05
//
// Post-game results: stars, score breakdown, personal-best flag, and next-level
// / play-again / home / board navigation. Records the completion to settingsStore
// (moved here from GameScreen to avoid double-recording).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { LevelManager } from '../game/LevelManager';
import { ScoreEngine } from '../game/ScoreEngine';
import { LeaderPanel } from './LeaderPanel';
import { submitCampaignScore } from '../services/campaignScores';
import { autoSubmitDailyIfComplete } from '../services/dailyScores';
import { incrementLevelCount, maybeShowInterstitial } from '../services/interstitialAdService';
import { isCampaignUnlocked, isPurchased } from '../services/campaignGateService';
import { showResultBanner, hideResultBanner } from '../services/bannerAdService';
import * as analytics from '../services/analytics';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { SKIN } from '../styles/skin';
import { getFreePlayPB, setFreePlayPB } from '../services/freePlayPB';
import * as musicService from '../services/musicService';

export function ResultScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, currentLevel, score, timeElapsed, tapTimestamps, mode, startLevel, startFreePlay, difficulty, timed, currentChallengeIndex } = useGameStore();
  const { dailyStreak, recordLevelComplete, updateDailyStreak } = useSettingsStore();

  // T-018 / T-018b: interstitial on Result mount — the only trigger (never
  // mid-gameplay). First count this completion, then let the service decide:
  // it shows when Remove Ads is not owned AND (3-min cap elapsed OR >= 5
  // completions since the last ad). Fire-and-forget: never blocks the Result
  // screen from rendering, fails silently on no-fill (native-only — AdMob has
  // no web implementation).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    (async () => {
      await incrementLevelCount();   // T-018b: count this completion first
      await maybeShowInterstitial(); // decides on dual trigger + IAP guard
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // B-008: ResultScreen banner ad (native only). Show shortly after mount so the
  // result renders first; hide on unmount. Suppressed when Remove Ads is owned.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (useSettingsStore.getState().removeAdsPurchased) return;
    const id = setTimeout(() => { void showResultBanner(); }, 500);
    return () => {
      clearTimeout(id);
      void hideResultBanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // B-002e AC3: the menu water-drip was paused on game start (GameScreen). Resume
  // it on the Result screen — but only if the Music toggle is on (independent of
  // the Sound toggle that gates SFX, AC11). The win/fail SFX itself fires in
  // GameScene on completion, not here.
  useEffect(() => {
    if (useSettingsStore.getState().musicEnabled) musicService.play();
  }, []);

  const [stars, setStars] = useState<0 | 1 | 2 | 3>(0);
  const [breakdown, setBreakdown] = useState<{
    base: number;
    timeBonus: number;
    speedBonus: number;
    streakMult: number;
    gridMult: number;
    difficultyMult: number;
  } | null>(null);
  const [isPB, setIsPB] = useState(false);
  const [fpBest, setFpBest] = useState<number | null>(null); // Free Play local PB

  // B-004: campaign-boundary gate. When NEXT LEVEL would cross into a locked
  // Campaign 2/3 (next id 101 or 201), suppress the button and show a locked
  // message instead. nextCampaignLocked holds the resolved lock state;
  // gateCheckPending hides the button while the async gate query is in flight so
  // NEXT LEVEL never flashes before the locked message replaces it.
  const [nextCampaignLocked, setNextCampaignLocked] = useState(false);
  const [gateCheckPending, setGateCheckPending] = useState(false);

  useEffect(() => {
    if (!currentLevel) return;

    if (status === 'complete') {
      const params = {
        gridSize: currentLevel.grid,
        tapCount: currentLevel.grid * currentLevel.grid,
        timeLimit: currentLevel.timeLimit,
        timeElapsed,
        tapTimestamps,
        dailyStreak: mode === 'daily' ? dailyStreak : 0,
        difficulty,
      };
      const result = ScoreEngine.calculate(params);
      setBreakdown({
        base: result.baseScore,
        timeBonus: result.timeBonus,
        speedBonus: result.speedBonus,
        streakMult: result.streakMultiplier,
        gridMult: result.gridMultiplier,
        difficultyMult: result.difficultyMultiplier,
      });

      // T-000: the live/final score in the store already carries the wrong-tap
      // penalty (endGame). Floor it at 0 for PB comparison and for what we record.
      const finalScore = Math.max(0, useGameStore.getState().score);

      if (mode === 'freeplay') {
        // Free Play (T-004B P2): local per-config PB only. No stars, no leaderboard,
        // no campaign progress, no submit.
        const timerSecs = timed ? currentLevel.timeLimit : null;
        getFreePlayPB(currentLevel.grid, difficulty, timerSecs).then((prev) => {
          setIsPB(finalScore > prev);
          setFpBest(Math.max(prev, finalScore));
          setFreePlayPB(currentLevel.grid, difficulty, timerSecs, finalScore);
        });
        // T-020: Free Play has no stars/leaderboard → report stars 0.
        analytics.levelComplete({ levelId: currentLevel.id, gridSize: currentLevel.grid, stars: 0, score: finalScore, timeElapsed });
      } else {
        const earnedStars = LevelManager.getStars(currentLevel, timeElapsed);
        setStars(earnedStars);

        // Personal best check (against the previously stored best)
        const storeKey = `${mode}_${currentLevel.id}`;
        const { bestScores } = useSettingsStore.getState();
        const prevBest = bestScores[storeKey] ?? 0;
        setIsPB(finalScore > prevBest);

        // Record (idempotent — only improves)
        recordLevelComplete(currentLevel.id, earnedStars, finalScore, mode);

        // Campaign: submit this level's score for the YOU vs LEADER panel (T-001).
        if (mode === 'campaign' && currentLevel.id > 0) {
          submitCampaignScore({
            levelId: currentLevel.id,
            score: finalScore,
            timeSecs: Math.round(timeElapsed * 10) / 10,
            gridSize: currentLevel.grid,
          }).catch((err) => console.warn('[Result] submitCampaignScore:', err));
        }

        // Daily challenge: bump the consecutive-day streak (also marks today played).
        if (mode === 'daily') {
          updateDailyStreak();
          // T-006-FIX Issue 13: auto-submit the full 3-challenge total to the daily
          // leaderboard when Challenge 3 completes (replaces the removed manual hub
          // SUBMIT button). gameStore.endGame has already written C3's local score,
          // so all 3 are present. Fire-and-forget; leaderboard keeps the best total.
          if (currentChallengeIndex === 3) {
            autoSubmitDailyIfComplete().catch((err) => console.warn('[Result] autoSubmitDaily:', err));
          }
        }

        // T-020: level_complete with all 5 params.
        analytics.levelComplete({ levelId: currentLevel.id, gridSize: currentLevel.grid, stars: earnedStars, score: finalScore, timeElapsed });
      }
    } else if (status === 'failed') {
      // T-020: timer expired / game over.
      analytics.levelFail({ levelId: currentLevel.id, gridSize: currentLevel.grid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentLevel]);

  // B-004: at a campaign boundary (next level 101 or 201) check whether the next
  // campaign is locked before rendering NEXT LEVEL. The query is async (Supabase
  // via campaignGateService) — gateCheckPending suppresses the button until it
  // resolves. Non-boundary levels never enter this path (no flicker, no change).
  useEffect(() => {
    if (!currentLevel || mode !== 'campaign') return;
    const nid = LevelManager.getNextLevelId(currentLevel.id);
    if (nid !== 101 && nid !== 201) return;
    let alive = true;
    setGateCheckPending(true);
    (async () => {
      const locked = await isCampaignLocked(nid);
      if (!alive) return;
      setNextCampaignLocked(locked);
      setGateCheckPending(false);
    })();
    return () => { alive = false; };
  }, [currentLevel, mode]);

  if (!currentLevel) {
    navigate('/home', { replace: true });
    return null;
  }

  // Only campaign has a "next level". Daily uses synthetic id 0 (not in
  // levels.json), so calling getNextLevelId(0) would throw — guard against it.
  const nextLevelId = mode === 'campaign' ? LevelManager.getNextLevelId(currentLevel.id) : null;
  const isComplete = status === 'complete';
  const accuracy = isComplete ? '100%' : '—';
  // T-000: score may be negative during play (wrong-tap penalty); floor at 0 here.
  const displayScore = Math.max(0, score);

  const handleNextLevel = () => {
    if (nextLevelId) {
      startLevel(nextLevelId, 'campaign');
      navigate('/game');
    } else {
      navigate('/home');
    }
  };

  const handlePlayAgain = () => {
    // Free Play has no level id — restart with the same config.
    if (mode === 'freeplay') {
      startFreePlay({ gridSize: currentLevel.grid, difficulty, timerSecs: timed ? currentLevel.timeLimit : null });
    } else {
      startLevel(currentLevel.id, mode);
    }
    navigate('/game');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-dots" />
      <ParticleCanvas />

      {/* Header */}
      <div className="glass" style={{ textAlign: 'center', padding: '48px 20px 16px', borderBottom: '1px solid rgba(30,139,195,0.2)', position: 'relative', zIndex: 2 }}>
        <h1
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18,
            color: isComplete ? 'var(--gold)' : 'var(--danger)',
            letterSpacing: 2,
            marginBottom: 4,
            textShadow: isComplete ? '0 0 16px rgba(255,215,0,0.4)' : '0 0 16px rgba(224,80,80,0.4)',
          }}
        >
          {/* T-009b Fix 2: failed (timer expired) shows a distinct "LEVEL FAILED"
              heading in danger red; win keeps "LEVEL COMPLETE". (Locale files are
              not in scope this task, so the failed strings are literals.) */}
          {isComplete ? t('result.level_complete') : t('result.level_failed')}
        </h1>
        {!isComplete && (
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#6B84A8', letterSpacing: 1, marginBottom: 4 }}>
            {t('result.time_out')}
          </p>
        )}
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>
          {/* T-009: Classic/Campaign play prefixes the level number (e.g.
              "Level 3 · 4×4 Grid · 65s"). Other modes keep the grid·time line. */}
          {mode === 'campaign' ? `${t('common.level', { id: currentLevel.id })} · ` : ''}
          {t('result.grid_label', { size: currentLevel.grid })} · {t('result.time_label', { seconds: Math.round(timeElapsed) })}
        </p>
      </div>

      {/* Stars (not for Free Play — it has no star thresholds) */}
      {isComplete && mode !== 'freeplay' && (
        <div style={{ textAlign: 'center', padding: '20px 0 8px', position: 'relative', zIndex: 1 }}>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                fontSize: 36,
                margin: '0 4px',
                filter: i <= stars ? 'drop-shadow(0 0 8px rgba(255,215,0,0.7))' : 'grayscale(1) opacity(0.3)',
                transition: 'filter 0.3s',
              }}
            >
              ⭐
            </span>
          ))}
        </div>
      )}

      {/* Score */}
      <div style={{ textAlign: 'center', padding: '8px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 36, fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 16px rgba(255,215,0,0.4)' }}>
          {displayScore.toLocaleString()}
        </div>
        {isPB && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--success)', letterSpacing: 2, textShadow: '0 0 8px rgba(46,204,113,0.4)' }}>
            ★ {t('result.new_pb')}
          </div>
        )}
        {isComplete && mode === 'daily' && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--gold)', letterSpacing: 1, marginTop: 6 }}>
            🔥 {t('home.day_streak')}: {dailyStreak}
          </div>
        )}
        {isComplete && mode === 'freeplay' && fpBest !== null && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--gold)', letterSpacing: 1, marginTop: 6 }}>
            {t('result.best_config')} {fpBest.toLocaleString()}
          </div>
        )}
      </div>

      {/* Breakdown */}
      {breakdown && isComplete && (
        <div style={{ margin: '12px 20px', background: 'rgba(10,26,46,0.75)', border: '1px solid rgba(30,139,195,0.2)', borderRadius: 10, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          {[
            [t('result.base_score'), breakdown.base],
            // Untimed Free Play has no time/speed bonus — hide those rows.
            ...(mode === 'freeplay' && !timed
              ? []
              : [
                  [t('result.time_bonus'), breakdown.timeBonus],
                  [t('result.speed_bonus'), breakdown.speedBonus],
                ]),
            ['Difficulty', `${breakdown.difficultyMult}×`],
            [t('result.accuracy'), accuracy],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(30,139,195,0.08)', fontSize: 13, color: 'var(--muted)' }}>
              <span>{label}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", color: 'var(--white)' }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontSize: 14, fontWeight: 600 }}>
            <span style={{ color: 'var(--white)' }}>{t('result.total')}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", color: 'var(--gold)', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}>{displayScore.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Per-level leader panel (YOU vs LEADER) — campaign only (T-001). */}
      {mode === 'campaign' && currentLevel && currentLevel.id > 0 && (
        <div style={{ margin: '0 20px 12px', position: 'relative', zIndex: 1 }}>
          <LeaderPanel levelId={currentLevel.id} compact={false} />
        </div>
      )}

      {/* B-008: the AdMob banner renders natively at the screen bottom
          (BOTTOM_CENTER), driven by bannerAdService on mount/unmount. This div
          stays as layout spacing where the old placeholder sat. */}
      <div style={{ margin: '0 20px 12px', padding: '8px', position: 'relative', zIndex: 1 }} />

      {/* Action card(s) — T-004A Fix 5. Campaign (with a next level): gold NEXT
          LEVEL primary + dark PLAY AGAIN secondary. All other cases: gold PLAY
          AGAIN. HOME/BOARD live in the standard footer below — no duplication. */}
      <div style={{ padding: '0 20px 12px', position: 'relative', zIndex: 1, marginTop: 'auto' }}>
        {mode === 'daily' ? (
          <button
            className="btn-gold"
            onClick={() => navigate('/daily')}
            style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}
          >
            ▶ BACK TO DAILY
          </button>
        ) : isComplete && nextLevelId && mode === 'campaign' ? (
          <>
            {/* B-004: NEXT LEVEL is gate-aware at campaign boundaries (101/201).
                While the gate query is pending, show a brief placeholder so the
                button never flashes; if the next campaign is locked, show the
                CampaignLockedMessage in its place; otherwise the normal button. */}
            {gateCheckPending ? (
              <div style={{ width: '100%', padding: '14px', marginBottom: 10, textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--muted)', letterSpacing: 6, opacity: 0.5 }}>
                ···
              </div>
            ) : nextCampaignLocked ? (
              <CampaignLockedMessage campaignNumber={nextLevelId === 101 ? 2 : 3} onGo={() => navigate('/campaign')} />
            ) : (
              <button
                className="btn-gold"
                onClick={handleNextLevel}
                style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}
              >
                ▶ {t('result.btn_next_level')} ({LevelManager.getLevel(nextLevelId).grid}×{LevelManager.getLevel(nextLevelId).grid})
              </button>
            )}
            <button
              onClick={handlePlayAgain}
              style={{
                width: '100%',
                padding: '13px',
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                background: SKIN.cardBg,
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: 8,
                color: SKIN.gold,
                cursor: 'pointer',
              }}
            >
              ↺ {t('result.btn_play_again')}
            </button>
          </>
        ) : (
          <button
            className="btn-gold"
            onClick={handlePlayAgain}
            style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}
          >
            ▶ {t('result.btn_play_again')}
          </button>
        )}
      </div>

      {/* Standard 4-icon footer (T-004A Fix 5/6) */}
      <BottomNav />
    </div>
  );
}

// —— B-004: campaign-boundary gate check ————————————————————————————————
// True when `nextLevelId` crosses into Campaign 2 (101) or Campaign 3 (201) AND
// that campaign is still locked. A campaign is unlocked by EITHER the Early-Access
// IAP flag (isPurchased — reads the campaignN_purchased Preferences key) OR the
// community gate being met (isCampaignUnlocked). Any other id is mid-campaign and
// returns false synchronously (no Supabase call). Uses the existing gate-service
// API only — no duplicated gate/Preferences logic. Exported for unit testing.
export async function isCampaignLocked(nextLevelId: number): Promise<boolean> {
  const campaignId = nextLevelId === 101 ? 2 : nextLevelId === 201 ? 3 : 0;
  if (!campaignId) return false;
  const [purchased, unlocked] = await Promise.all([
    isPurchased(campaignId),
    isCampaignUnlocked(campaignId),
  ]);
  return !purchased && !unlocked;
}

// Shown in place of NEXT LEVEL when the next campaign is gate-locked. Styling
// mirrors the CampaignScreen gate cards (navy-card surface, navy-border, gold
// lock). The button routes to the Campaign screen, where the live gate counter
// and the Early-Access unlock live. Exported for unit testing.
export function CampaignLockedMessage({ campaignNumber, onGo }: { campaignNumber: number; onGo: () => void }) {
  return (
    <div style={{ background: 'var(--navy-card)', border: '1px solid var(--navy-border)', borderRadius: 12, padding: 16, marginBottom: 10, textAlign: 'center' }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'var(--gold)', letterSpacing: 1, marginBottom: 6 }}>
        🔒 Campaign {campaignNumber} Locked
      </div>
      <div style={{ fontSize: 11, color: 'var(--white)', marginBottom: 12 }}>
        Unlock via Early Access or wait for the community gate
      </div>
      <button
        className="btn-gold"
        onClick={onGo}
        style={{ width: '100%', padding: '12px', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}
      >
        GO TO CAMPAIGN SCREEN
      </button>
    </div>
  );
}
