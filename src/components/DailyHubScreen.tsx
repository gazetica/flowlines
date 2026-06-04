// DailyHubScreen.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-006 Part 3 (full redesign)
//
// Daily hub redesigned: an S-shaped 7-day streak map (CSS flexbox + border
// connectors — chosen over SVG for clean mobile-width rendering without path
// maths), a 3-challenge connected track (play in order, colour-fill on complete),
// and SUBMIT-to-leaderboard which awards +1 💎 and advances the daily streak.
// CLAIM on a completed 7-day streak awards +3 💎 and resets the streak.

import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore, nextDailyStreak } from '../store/settingsStore';
import { getLocalDailyScores, submitDailyScore } from '../services/dailyScores';
import type { LocalDailyScores } from '../services/dailyScores';
import { getTodayDateString } from '../game/DailyChallenge';
import type { DailyChallengeIndex } from '../game/DailyChallenge';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { SKIN } from '../styles/skin';

type NodeState = 'past' | 'today-done' | 'today-pending' | 'future';

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
const CHALLENGE_FILL = ['#FFD700', '#00D2C8', '#9333EA']; // C1 gold · C2 teal · C3 purple

// Scoped keyframes for the streak-map animations (injected once with the screen).
const KEYFRAMES = `
@keyframes dh-pulseGlow { 0%,100% { box-shadow: 0 0 6px currentColor; } 50% { box-shadow: 0 0 16px currentColor; } }
@keyframes dh-pulseRing { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
@keyframes dh-floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-48px); } }
`;

export function DailyHubScreen() {
  const navigate = useNavigate();
  const startDailyChallenge = useGameStore((s) => s.startDailyChallenge);

  const dailyStreak = useSettingsStore((s) => s.dailyStreak);
  const lastDailyCompletionDate = useSettingsStore((s) => s.lastDailyCompletionDate);
  const setDailyStreak = useSettingsStore((s) => s.setDailyStreak);
  const setLastDailyCompletionDate = useSettingsStore((s) => s.setLastDailyCompletionDate);
  const addHints = useSettingsStore((s) => s.addHints);

  const [scores, setScores] = useState<LocalDailyScores | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reward, setReward] = useState<string | null>(null); // floating "+N 💎"

  useEffect(() => {
    getLocalDailyScores().then(setScores);
  }, []);

  const today = getTodayDateString();
  const todayDone = lastDailyCompletionDate === today;

  const c = scores ?? { date: '', c1: null, c2: null, c3: null };
  const cardScores: (number | null)[] = [c.c1, c.c2, c.c3];
  const doneCount = cardScores.filter((x) => x != null).length;
  const allDone = doneCount === 3;
  const total = (c.c1 ?? 0) + (c.c2 ?? 0) + (c.c3 ?? 0);

  const streak = Math.min(dailyStreak, 7);
  const streakComplete = dailyStreak >= 7;

  const nodeState = (i: number): NodeState => {
    if (i < streak) return todayDone && i === streak - 1 ? 'today-done' : 'past';
    if (i === streak && !todayDone && !streakComplete) return 'today-pending';
    return 'future';
  };
  const isFilled = (i: number) => {
    const s = nodeState(i);
    return s === 'past' || s === 'today-done';
  };

  const play = (index: DailyChallengeIndex) => {
    startDailyChallenge(index);
    navigate('/game');
  };

  const flashReward = (label: string) => {
    setReward(label);
    setTimeout(() => setReward(null), 1300);
  };

  const submit = async () => {
    if (!allDone || submitted) return;
    await submitDailyScore({ dailyDate: today, scoreC1: c.c1 ?? 0, scoreC2: c.c2 ?? 0, scoreC3: c.c3 ?? 0 });
    // Advance the daily streak (idempotent if already submitted today) + persist.
    const newStreak = nextDailyStreak(lastDailyCompletionDate, today, dailyStreak);
    await setDailyStreak(newStreak);
    await setLastDailyCompletionDate(today);
    // Event A — daily 3-challenge completion awards +1 hint.
    await addHints(1);
    flashReward('+1 💎');
    setSubmitted(true);
  };

  const claimStreak = async () => {
    if (!streakComplete) return;
    // Event B — 7-day streak completion awards +3 hints, then resets the streak.
    await addHints(3);
    await setDailyStreak(0);
    await setLastDailyCompletionDate('');
    flashReward('+3 💎');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{KEYFRAMES}</style>
      <div className="bg-dots" />
      <ParticleCanvas />

      <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '48px 20px 16px', zIndex: 10, borderBottom: '1px solid rgba(0,210,200,0.25)' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>DAILY CHALLENGE</h1>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#00D2C8' }}>{dailyStreak} 🔥</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px', position: 'relative', zIndex: 1 }}>
        {/* —— S-shaped 7-day streak map (Part 3.2) —— */}
        <StreakMap nodeState={nodeState} isFilled={isFilled} streakComplete={streakComplete} onClaim={claimStreak} />

        {/* —— 3-challenge connected track (Part 3.3) —— */}
        <ChallengeTrack cardScores={cardScores} allDone={allDone} onPlay={play} />

        {/* —— Submit —— */}
        <div style={{ textAlign: 'center', margin: '8px 0 10px', fontFamily: "'Space Mono', monospace", fontSize: 12, color: SKIN.muted, letterSpacing: 1 }}>
          {doneCount} / 3 complete{allDone ? ` · ${total.toLocaleString()} pts` : ''}
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
        <div style={{ textAlign: 'center', marginTop: 6, fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#00D2C8', letterSpacing: 1 }}>
          {submitted ? 'Reward claimed' : '+1 💎 on submit'}
        </div>
      </div>

      {/* Floating "+N 💎" reward animation */}
      {reward && (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 40,
            fontFamily: "'Space Mono', monospace",
            fontSize: 30,
            color: SKIN.gold,
            textShadow: SKIN.goldGlow,
            animation: 'dh-floatUp 1.3s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          {reward}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// —— Streak map ——————————————————————————————————————————————————

function StreakNode({ state, label }: { state: NodeState; label: string }) {
  const base: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Space Mono', monospace",
    fontSize: 16,
    flexShrink: 0,
  };
  let circle: React.CSSProperties;
  let glyph = '';
  if (state === 'past') {
    circle = { ...base, background: '#1B5E3A', border: '2px solid #2ECC71', color: '#2ECC71', animation: 'dh-pulseGlow 2.4s ease-in-out infinite' };
    glyph = '✓';
  } else if (state === 'today-done') {
    circle = { ...base, background: 'linear-gradient(145deg, #FFD700, #C8A800)', border: '2px solid #FFD700', color: '#07111F', animation: 'dh-pulseGlow 2s ease-in-out infinite' };
    glyph = '✓';
  } else if (state === 'today-pending') {
    circle = { ...base, background: 'rgba(10,26,46,0.6)', border: '2px solid #FFD700', color: '#FFD700', animation: 'dh-pulseRing 2s ease-in-out infinite' };
  } else {
    circle = { ...base, background: 'rgba(10,26,46,0.5)', border: '2px solid rgba(94,122,156,0.4)', color: SKIN.muted };
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={circle}>{glyph}</div>
      <div style={{ fontSize: 8, color: SKIN.muted, fontFamily: "'Space Mono', monospace" }}>{label}</div>
    </div>
  );
}

function HLine({ filled }: { filled: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        height: 0,
        margin: '0 2px',
        marginBottom: 16, // align with node circles (offset for the day label)
        borderTop: filled ? '2px solid #FFD700' : '2px dashed rgba(94,122,156,0.4)',
      }}
    />
  );
}

function StreakMap({
  nodeState,
  isFilled,
  streakComplete,
  onClaim,
}: {
  nodeState: (i: number) => NodeState;
  isFilled: (i: number) => boolean;
  streakComplete: boolean;
  onClaim: () => void;
}) {
  // Vertical connector — solid gold when the day it leads into is filled.
  const VConnector = ({ filled, align }: { filled: boolean; align: 'left' | 'right' }) => (
    <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', padding: align === 'right' ? '0 19px' : '0 19px' }}>
      <div style={{ width: 0, height: 22, borderLeft: filled ? '2px solid #FFD700' : '2px dashed rgba(94,122,156,0.4)' }} />
    </div>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Row 1 — Day 1 → 2 → 3 (left to right) */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <StreakNode state={nodeState(0)} label={DAY_LABELS[0]} />
        <HLine filled={isFilled(1)} />
        <StreakNode state={nodeState(1)} label={DAY_LABELS[1]} />
        <HLine filled={isFilled(2)} />
        <StreakNode state={nodeState(2)} label={DAY_LABELS[2]} />
      </div>

      <VConnector filled={isFilled(3)} align="right" />

      {/* Row 2 — Day 4 → 5 → 6 (rendered right-to-left so D4 sits under D3) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
        <StreakNode state={nodeState(3)} label={DAY_LABELS[3]} />
        <HLine filled={isFilled(4)} />
        <StreakNode state={nodeState(4)} label={DAY_LABELS[4]} />
        <HLine filled={isFilled(5)} />
        <StreakNode state={nodeState(5)} label={DAY_LABELS[5]} />
      </div>

      <VConnector filled={isFilled(6)} align="left" />

      {/* Row 3 — Day 7 → CLAIM */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <StreakNode state={nodeState(6)} label={DAY_LABELS[6]} />
        <HLine filled={streakComplete} />
        <button
          onClick={onClaim}
          disabled={!streakComplete}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: streakComplete ? 'pointer' : 'default',
            padding: 0,
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 0.5,
              background: streakComplete ? SKIN.btnGold : 'rgba(10,26,46,0.5)',
              color: streakComplete ? '#07111F' : SKIN.muted,
              border: streakComplete ? '1px solid #FFD700' : '1px solid rgba(94,122,156,0.4)',
              boxShadow: streakComplete ? SKIN.btnGoldShadow : 'none',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            💎💎💎 CLAIM
          </div>
          <div style={{ fontSize: 8, color: SKIN.muted, fontFamily: "'Space Mono', monospace" }}>+3 gems</div>
        </button>
      </div>
    </div>
  );
}

// —— 3-challenge connected track ————————————————————————————————

function ChallengeTrack({
  cardScores,
  allDone,
  onPlay,
}: {
  cardScores: (number | null)[];
  allDone: boolean;
  onPlay: (index: DailyChallengeIndex) => void;
}) {
  const isDone = (i: number) => cardScores[i] != null;
  const isActive = (i: number) => !isDone(i) && (i === 0 || isDone(i - 1));
  const isLocked = (i: number) => !isDone(i) && !isActive(i);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      {[0, 1, 2].map((i) => {
        const done = isDone(i);
        const active = isActive(i);
        const locked = isLocked(i);
        const fill = CHALLENGE_FILL[i];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < 2 ? 1 : 'initial' }}>
            {/* card + score-below in a column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => active && onPlay((i + 1) as DailyChallengeIndex)}
                disabled={!active}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: active ? 'pointer' : 'default',
                  background: done ? fill : 'rgba(10,26,46,0.6)',
                  border: active ? '2px solid #FFD700' : `1px solid ${done ? fill : 'rgba(94,122,156,0.4)'}`,
                  boxShadow: active ? '0 0 12px rgba(255,215,0,0.4)' : 'none',
                  animation: active ? 'dh-pulseGlow 1.8s ease-in-out infinite' : undefined,
                  color: done ? '#07111F' : SKIN.muted,
                }}
              >
                {done ? (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700 }}>✓</span>
                ) : locked ? (
                  <span style={{ fontSize: 18 }}>🔒</span>
                ) : (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: SKIN.white }}>{i + 1}</span>
                )}
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, marginTop: 1, color: done ? '#07111F' : SKIN.muted }}>
                  C{i + 1}
                </span>
              </button>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: SKIN.muted, minHeight: 10 }}>
                {done ? `${cardScores[i]!.toLocaleString()} pts` : ''}
              </span>
            </div>

            {/* connecting arrow to the next card — gold once the source card is
                complete (the path has progressed and the next card unlocks);
                grey otherwise. (DC-T006-06: "arrow C1→C2 turns gold" after C1.) */}
            {i < 2 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, color: isDone(i) ? '#FFD700' : 'rgba(94,122,156,0.5)', fontSize: 16 }}>
                ▶
              </div>
            )}
          </div>
        );
      })}

      {/* gem reward at the end */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 60, marginLeft: 6, opacity: allDone ? 1 : 0.4 }}>
        <span style={{ fontSize: 20, filter: allDone ? 'none' : 'grayscale(1)' }}>💎</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: allDone ? '#FFD700' : SKIN.muted }}>+1</span>
      </div>
    </div>
  );
}
