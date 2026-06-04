// DailyHubScreen.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-005 Part 1.3
//
// Daily hub: 3 challenge cards (play once each per day), cumulative total, and a
// SUBMIT button enabled only once all 3 are complete. Scores are stored locally
// (reset at midnight); SUBMIT posts C1+C2+C3 to the daily_scores leaderboard.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getLocalDailyScores, submitDailyScore } from '../services/dailyScores';
import type { LocalDailyScores } from '../services/dailyScores';
import { getTodayDateString } from '../game/DailyChallenge';
import type { DailyChallengeIndex } from '../game/DailyChallenge';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { SKIN } from '../styles/skin';

export function DailyHubScreen() {
  const navigate = useNavigate();
  const startDailyChallenge = useGameStore((s) => s.startDailyChallenge);
  const [scores, setScores] = useState<LocalDailyScores | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getLocalDailyScores().then(setScores);
  }, []);

  const c = scores ?? { date: '', c1: null, c2: null, c3: null };
  const cards: { index: DailyChallengeIndex; score: number | null }[] = [
    { index: 1, score: c.c1 },
    { index: 2, score: c.c2 },
    { index: 3, score: c.c3 },
  ];
  const doneCount = cards.filter((x) => x.score != null).length;
  const allDone = doneCount === 3;
  const total = (c.c1 ?? 0) + (c.c2 ?? 0) + (c.c3 ?? 0);

  const play = (index: DailyChallengeIndex) => {
    startDailyChallenge(index);
    navigate('/game');
  };

  const submit = async () => {
    if (!allDone || submitted) return;
    await submitDailyScore({ dailyDate: getTodayDateString(), scoreC1: c.c1 ?? 0, scoreC2: c.c2 ?? 0, scoreC3: c.c3 ?? 0 });
    setSubmitted(true);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-dots" />
      <ParticleCanvas />

      <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '48px 20px 16px', zIndex: 10, borderBottom: '1px solid rgba(30,139,195,0.2)' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>DAILY CHALLENGE</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', position: 'relative', zIndex: 1 }}>
        {cards.map(({ index, score }) => {
          const done = score != null;
          return (
            <div
              key={index}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: SKIN.cardBg, border: `1px solid ${done ? 'rgba(46,204,113,0.4)' : SKIN.cardBorder}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: SKIN.white, letterSpacing: 1 }}>CHALLENGE {index}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: done ? SKIN.success : SKIN.muted, marginTop: 2 }}>
                  {done ? score!.toLocaleString() : '—'}
                </div>
              </div>
              {done ? (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: SKIN.success }}>✓</span>
              ) : (
                <button className="btn-gold" onClick={() => play(index)} style={{ padding: '10px 18px', fontSize: 11, letterSpacing: 1 }}>
                  PLAY
                </button>
              )}
            </div>
          );
        })}

        <div style={{ textAlign: 'center', margin: '12px 0 16px', fontFamily: "'Space Mono', monospace", fontSize: 12, color: SKIN.muted, letterSpacing: 1 }}>
          TOTAL: {doneCount} / 3 complete{allDone ? ` · ${total.toLocaleString()} pts` : ''}
        </div>

        <button
          onClick={submit}
          disabled={!allDone || submitted}
          style={{
            width: '100%',
            padding: '14px',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            borderRadius: 8,
            border: 'none',
            cursor: allDone && !submitted ? 'pointer' : 'default',
            background: allDone && !submitted ? SKIN.btnGold : 'rgba(10,26,46,0.6)',
            color: allDone && !submitted ? '#07111F' : SKIN.muted,
            boxShadow: allDone && !submitted ? SKIN.btnGoldShadow : 'none',
            fontWeight: 700,
          }}
        >
          {submitted ? 'SUBMITTED ✓' : 'SUBMIT TO LEADERBOARD'}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
