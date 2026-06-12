// DailyScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 16 | Task FL-S3-016 (VD-07)
//
// Daily challenge: deterministic UTC-seeded pack-2 level, one-attempt gate,
// streak + gem reward on completion. UI shell — Supabase submission is Sprint 4.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { useFlowGameStore } from '../store/flowGameStore';
import { submitDailyScore, getDailyLeaderboard, type DailyScoreRow } from '../services/flDailyScores';
import { BottomNav } from './BottomNav';
import { flagOf } from './CountrySelector';

const GOLD = '#FFD700';

/** UTC YYYY-MM-DD for a given date (defaults to now). */
function utcDateStr(d = new Date()): string {
  return d.toISOString().split('T')[0];
}

/** Deterministic pack-2 level index (1–50) for today's UTC date — same for all
 *  players worldwide. mulberry32 seeded with YYYYMMDD. */
function getDailyLevelIndex(): number {
  const now = new Date();
  const seed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  let s = seed;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Math.floor(rand() * 50) + 1;
}

export default function DailyScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streak = useFlowSettingsStore((s) => s.dailyStreakFL);
  const lastDaily = useFlowSettingsStore((s) => s.lastDailyDateFL);

  const today = utcDateStr();
  const levelIndex = getDailyLevelIndex();
  const gateClosed = lastDaily === today;

  const [dailyRows, setDailyRows] = useState<DailyScoreRow[]>([]);

  // On mount: record a fresh completion (streak + gems + Supabase score), then
  // always refresh today's daily leaderboard so the completed card can show it.
  useEffect(() => {
    const justCompleted = searchParams.get('completed') === 'true';
    const store = useFlowSettingsStore.getState();
    const alreadyRecorded = store.lastDailyDateFL === today;
    let cancelled = false;

    (async () => {
      if (justCompleted && !alreadyRecorded) {
        const yesterday = utcDateStr(new Date(Date.now() - 86400000));
        if (store.lastDailyDateFL === yesterday) {
          await store.incrementDailyStreak(); // continue streak
        } else {
          await store.resetDailyStreak();
          await store.incrementDailyStreak(); // start fresh streak at 1
        }
        await store.addGems(3); // daily reward
        const g = useFlowGameStore.getState();
        await submitDailyScore(g.score, g.moveCount); // flowlines_daily_scores
      }
      const rows = await getDailyLeaderboard(today, 10);
      if (!cancelled) setDailyRows(rows);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>DAILY CHALLENGE</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', color: skin.white, fontSize: 14 }}>{dateLabel}</div>
        <div style={{ textAlign: 'center', color: skin.muted, fontSize: 13 }}>🔥 {streak} day{streak === 1 ? '' : 's'}</div>

        {gateClosed ? (
          <div style={{ ...card, borderColor: 'rgba(127,119,221,0.2)' }}>
            <div style={{ fontFamily: skin.fontDisplay, fontSize: 18, color: skin.purpleLight }}>✓ COMPLETED</div>
            <div style={{ fontSize: 13, color: skin.muted, marginTop: 10 }}>Come back tomorrow for a new puzzle</div>
            <div style={{ fontSize: 12, color: GOLD, marginTop: 12 }}>Current streak: {streak} day{streak === 1 ? '' : 's'} 🔥</div>

            {dailyRows.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <div style={{ fontFamily: skin.fontDisplay, fontSize: 11, color: skin.muted, letterSpacing: 1, marginBottom: 8 }}>TODAY'S TOP</div>
                {dailyRows.slice(0, 5).map((r, i) => (
                  <div key={`${r.player_uid}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: skin.white, padding: '4px 0', borderBottom: '1px solid rgba(127,119,221,0.1)' }}>
                    <span style={{ fontFamily: skin.fontDisplay, color: skin.muted, minWidth: 22 }}>#{i + 1}</span>
                    <span style={{ fontSize: 14 }}>{flagOf(r.country || 'XX')}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.alias || 'Player'}</span>
                    <span style={{ fontFamily: skin.fontDisplay, color: GOLD }}>{r.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...card, border: '1px solid rgba(255,215,0,0.4)', background: 'rgba(255,215,0,0.06)' }}>
            <div style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD }}>TODAY'S PUZZLE</div>
            <div style={{ fontSize: 13, color: skin.white, marginTop: 8 }}>Pack 2 · Level {levelIndex}</div>
            <button
              onClick={() => navigate(`/game?pack=2&level=${levelIndex}&mode=daily`)}
              style={{
                marginTop: 16,
                width: '100%',
                padding: 14,
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
              ▶ PLAY NOW
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
