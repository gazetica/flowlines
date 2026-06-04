// ResultScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 6 | Task T-013 | VD-05
//
// Post-game results: stars, score breakdown, personal-best flag, and next-level
// / play-again / home / board navigation. Records the completion to settingsStore
// (moved here from GameScreen to avoid double-recording).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { LevelManager } from '../game/LevelManager';
import { ScoreEngine } from '../game/ScoreEngine';
import { LeaderPanel } from './LeaderPanel';
import { submitCampaignScore } from '../services/campaignScores';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { SKIN } from '../styles/skin';
import { getFreePlayPB, setFreePlayPB } from '../services/freePlayPB';

export function ResultScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, currentLevel, score, timeElapsed, tapTimestamps, mode, startLevel, startFreePlay, difficulty, timed } = useGameStore();
  const { dailyStreak, recordLevelComplete, updateDailyStreak } = useSettingsStore();

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
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentLevel]);

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
          {isComplete ? t('result.level_complete') : t('result.times_up')}
        </h1>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>
          {currentLevel.grid}×{currentLevel.grid} Grid · {Math.round(timeElapsed)}s
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
            ★ Best (this config): {fpBest.toLocaleString()}
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

      {/* Ad slot placeholder — Sprint 4 replaces with real interstitial */}
      <div style={{ margin: '0 20px 12px', background: 'rgba(10,26,46,0.4)', border: '1px dashed rgba(30,139,195,0.15)', borderRadius: 6, padding: '8px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(30,139,195,0.3)', letterSpacing: 1 }}>{t('result.ad_slot')} · SPRINT 4</span>
      </div>

      {/* Action card(s) — T-004A Fix 5. Campaign (with a next level): gold NEXT
          LEVEL primary + dark PLAY AGAIN secondary. All other cases: gold PLAY
          AGAIN. HOME/BOARD live in the standard footer below — no duplication. */}
      <div style={{ padding: '0 20px 12px', position: 'relative', zIndex: 1, marginTop: 'auto' }}>
        {isComplete && nextLevelId && mode === 'campaign' ? (
          <>
            <button
              className="btn-gold"
              onClick={handleNextLevel}
              style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}
            >
              ▶ {t('result.btn_next_level')} ({LevelManager.getLevel(nextLevelId).grid}×{LevelManager.getLevel(nextLevelId).grid})
            </button>
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
