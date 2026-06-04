// DailyHubScreen.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-006 · corrected T-006-FIX (Issues 4–11, 13)
//
// Daily hub: an S-shaped 7-day streak map (START anchor → Day1..7 → CLAIM circle,
// CSS flexbox with centre-aligned border connectors), a 3-challenge connected
// track wired to startDailyChallenge(), and a once-per-day diamond CLAIM. The
// manual SUBMIT button is gone — the leaderboard auto-submits on C3 completion
// (ResultScreen). Streak/challenge instruction blocks sit above each section.

import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  getLocalDailyScores,
  isDailyDiamondClaimed,
  setDailyDiamondClaimed,
} from '../services/dailyScores';
import type { LocalDailyScores } from '../services/dailyScores';
import { getTodayDateString } from '../game/DailyChallenge';
import type { DailyChallengeIndex } from '../game/DailyChallenge';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { SKIN } from '../styles/skin';

type NodeState = 'past' | 'today-done' | 'today-pending' | 'future';

const CHALLENGE_FILL = ['#FFD700', '#00D2C8', '#9333EA']; // C1 gold · C2 teal · C3 purple
const NODE = 52; // px — circle node diameter (START / Day / CLAIM all identical)

const KEYFRAMES = `
@keyframes dh-pulseGlow { 0%,100% { box-shadow: 0 0 6px currentColor; } 50% { box-shadow: 0 0 16px currentColor; } }
@keyframes dh-pulseRing { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
@keyframes dh-floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-48px); } }
`;

export function DailyHubScreen() {
  const navigate = useNavigate();
  const startDailyChallenge = useGameStore((s) => s.startDailyChallenge);

  const dailyStreak = useSettingsStore((s) => s.dailyStreak);
  const lastDailyCompletionDate = useSettingsStore((s) => s.lastDailyCompletionDate);
  const setLastDailyCompletionDate = useSettingsStore((s) => s.setLastDailyCompletionDate);
  const addHints = useSettingsStore((s) => s.addHints);

  const [scores, setScores] = useState<LocalDailyScores | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState<string | null>(null);

  // Reload local scores + today's claim status on mount (covers returning from a
  // game: React Router remounts this screen, so the effect re-runs and refreshes
  // every card state, the streak map, and the claim button).
  useEffect(() => {
    getLocalDailyScores().then(setScores);
    isDailyDiamondClaimed().then(setClaimed);
  }, []);

  const today = getTodayDateString();
  const todayDone = lastDailyCompletionDate === today;

  const c = scores ?? { date: '', c1: null, c2: null, c3: null };
  const cardScores: (number | null)[] = [c.c1, c.c2, c.c3];
  const doneCount = cardScores.filter((x) => x != null).length;
  const allDone = doneCount === 3;

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

  // Issue 13: one daily diamond per day. Award +1 hint, persist the claim flag
  // (keyed by date), and mark today complete for the streak map's gold state.
  const claim = async () => {
    if (!allDone || claimed) return; // defensive — covers replay after claim
    await addHints(1);
    await setDailyDiamondClaimed();
    await setLastDailyCompletionDate(today);
    setClaimed(true);
    flashReward('+1 💎');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{KEYFRAMES}</style>
      <div className="bg-dots" />
      <ParticleCanvas />

      <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '48px 20px 16px', zIndex: 10, borderBottom: '1px solid rgba(239,68,68,0.25)' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>DAILY CHALLENGE</h1>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#FFD700' }}>{dailyStreak} 🔥</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 24px', position: 'relative', zIndex: 1 }}>
        {/* —— Streak instructions (Issue 8) —— */}
        <Instructions
          header="HOW THE STREAK WORKS"
          line1="Complete all 3 daily challenges every day."
          line2="Reach 7 days in a row to claim 3 💎 gems."
        />

        {/* —— S-shaped 7-day streak map (Issues 4–7) —— */}
        <StreakMap nodeState={nodeState} isFilled={isFilled} streakComplete={streakComplete} />

        {/* —— Challenge instructions (Issue 9) —— */}
        <Instructions
          header="DAILY CHALLENGES"
          line1="Play all 3 challenges to earn 1 💎 gem."
          line2="Complete in order — each challenge unlocks the next."
        />

        {/* —— 3-challenge connected track (Issues 10, 11) —— */}
        <ChallengeTrack cardScores={cardScores} onPlay={play} />

        {/* —— Large diamond display (Issue 13) —— */}
        <DiamondDisplay claimable={allDone} />

        {/* —— Claim button — three states (Issue 13) —— */}
        <ClaimButton allDone={allDone} claimed={claimed} onClaim={claim} />
      </div>

      {reward && (
        <div
          style={{
            position: 'absolute', top: '40%', left: 0, right: 0, textAlign: 'center', zIndex: 40,
            fontFamily: "'Space Mono', monospace", fontSize: 30, color: SKIN.gold,
            textShadow: SKIN.goldGlow, animation: 'dh-floatUp 1.3s ease-out forwards', pointerEvents: 'none',
          }}
        >
          {reward}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// —— Instruction block (Issues 8 / 9) ————————————————————————————

function Instructions({ header, line1, line2 }: { header: string; line1: string; line2: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#FFD700', marginBottom: 6 }}>{header}</div>
      <div style={{ fontSize: 12, color: '#E8F0F8', lineHeight: 1.6 }}>{line1}</div>
      <div style={{ fontSize: 11, color: '#5E7A9C', lineHeight: 1.6 }}>{line2}</div>
    </div>
  );
}

// —— Streak map ——————————————————————————————————————————————————

function circleStyle(state: NodeState): React.CSSProperties {
  const base: React.CSSProperties = {
    width: NODE, height: NODE, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Space Mono', monospace", fontSize: 16,
  };
  if (state === 'past') return { ...base, background: '#1B5E3A', border: '2px solid #2ECC71', color: '#2ECC71', animation: 'dh-pulseGlow 2.4s ease-in-out infinite' };
  if (state === 'today-done') return { ...base, background: 'linear-gradient(145deg, #FFD700, #C8A800)', border: '2px solid #FFD700', color: '#07111F', animation: 'dh-pulseGlow 2s ease-in-out infinite' };
  if (state === 'today-pending') return { ...base, background: 'rgba(10,26,46,0.6)', border: '2px solid #FFD700', color: '#FFD700', animation: 'dh-pulseRing 2s ease-in-out infinite' };
  return { ...base, background: 'rgba(10,26,46,0.5)', border: '2px solid rgba(94,122,156,0.4)', color: SKIN.muted };
}

// A node = circle + a small label below it. Fixed total height so the circle's
// vertical centre is a constant 26px from the row top (connectors align to it).
function NodeCell({ state, label, children }: { state: NodeState; label: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: NODE }}>
      <div style={circleStyle(state)}>{children ?? (state === 'past' || state === 'today-done' ? '✓' : '')}</div>
      <div style={{ fontSize: 8, color: SKIN.muted, fontFamily: "'Space Mono', monospace", marginTop: 4, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
}

// Horizontal connector — sits at the circle's vertical centre (NODE/2 − 1px).
function HConn({ gold }: { gold: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        height: 0,
        marginTop: NODE / 2 - 1,
        borderTop: gold ? '2px solid #FFD700' : '2px dashed rgba(255,255,255,0.15)',
      }}
    />
  );
}

function StreakMap({
  nodeState,
  isFilled,
  streakComplete,
}: {
  nodeState: (i: number) => NodeState;
  isFilled: (i: number) => boolean;
  streakComplete: boolean;
}) {
  // Vertical drop connector, aligned to the centre of a circle on the given side.
  const VConn = ({ gold, align }: { gold: boolean; align: 'left' | 'right' }) => (
    <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <div style={{ width: NODE, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 0, height: 20, borderLeft: gold ? '2px solid #FFD700' : '2px dashed rgba(255,255,255,0.15)' }} />
      </div>
    </div>
  );

  const startState: NodeState = 'future'; // anchor — never "completed"
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Row 1 — START → Day1 → Day2 → Day3 (Day1 is the 2nd item = centre-left) */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <NodeCell state={startState} label="START">
          <div style={{ fontSize: 7, lineHeight: 1.1, color: SKIN.muted, textAlign: 'center', fontFamily: "'Space Mono', monospace" }}>
            7 DAY<br />STREAK
          </div>
        </NodeCell>
        <HConn gold={isFilled(0)} />
        <NodeCell state={nodeState(0)} label="Day 1" />
        <HConn gold={isFilled(1)} />
        <NodeCell state={nodeState(1)} label="Day 2" />
        <HConn gold={isFilled(2)} />
        <NodeCell state={nodeState(2)} label="Day 3" />
      </div>

      {/* drop from Day3 (right) down to Day4 */}
      <VConn gold={isFilled(3)} align="right" />

      {/* Row 2 — Day6 ← Day5 ← Day4 (Day4 sits under Day3 on the right) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
        <NodeCell state={nodeState(5)} label="Day 6" />
        <HConn gold={isFilled(5)} />
        <NodeCell state={nodeState(4)} label="Day 5" />
        <HConn gold={isFilled(4)} />
        <NodeCell state={nodeState(3)} label="Day 4" />
      </div>

      {/* drop from Day6 (left) down to Day7 */}
      <VConn gold={isFilled(6)} align="left" />

      {/* Row 3 — Day7 → CLAIM circle */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <NodeCell state={nodeState(6)} label="Day 7" />
        <HConn gold={streakComplete} />
        {/* CLAIM node — same 52px circle as the day nodes (Issue 6), visual only */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: NODE }}>
          <div
            style={{
              width: NODE, height: NODE, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              background: streakComplete ? 'linear-gradient(145deg, #FFD700, #C8A800)' : 'rgba(10,26,46,0.5)',
              border: streakComplete ? '2px solid #FFD700' : '2px solid rgba(94,122,156,0.4)',
              boxShadow: streakComplete ? '0 0 16px rgba(255,215,0,0.5)' : 'none',
              filter: streakComplete ? 'none' : 'grayscale(1) opacity(0.5)',
            }}
          >
            💎
          </div>
          <div style={{ fontSize: 8, color: SKIN.muted, fontFamily: "'Space Mono', monospace", marginTop: 4 }}>CLAIM</div>
        </div>
      </div>
    </div>
  );
}

// —— 3-challenge connected track (Issues 10, 11) ————————————————————

function ChallengeTrack({
  cardScores,
  onPlay,
}: {
  cardScores: (number | null)[];
  onPlay: (index: DailyChallengeIndex) => void;
}) {
  const isDone = (i: number) => cardScores[i] != null;
  const isActive = (i: number) => !isDone(i) && (i === 0 || isDone(i - 1));
  const isLocked = (i: number) => !isDone(i) && !isActive(i);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
      {[0, 1, 2].map((i) => {
        const done = isDone(i);
        const active = isActive(i);
        const locked = isLocked(i);
        const fill = CHALLENGE_FILL[i];
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < 2 ? 1 : 'initial' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button
                // Active card starts the next challenge; a completed card can be
                // replayed to improve its score (the once-per-day diamond claim is
                // guarded by the persisted flag, so replay can't re-award — Issue 13
                // replay-protection + DC-FIX-16). Locked cards are not tappable.
                onClick={() => (active || done) && onPlay((i + 1) as DailyChallengeIndex)}
                disabled={!active && !done}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  cursor: active || done ? 'pointer' : 'default',
                  background: done ? fill : 'rgba(10,26,46,0.6)',
                  border: active ? '2px solid #FFD700' : `1px solid ${done ? fill : 'rgba(94,122,156,0.4)'}`,
                  boxShadow: active ? '0 0 12px rgba(255,215,0,0.4)' : 'none',
                  animation: active ? 'dh-pulseGlow 1.8s ease-in-out infinite' : undefined,
                  color: done ? '#07111F' : SKIN.muted,
                }}
              >
                {done ? (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700 }}>✓</span>
                ) : locked ? (
                  <span style={{ fontSize: 16 }}>🔒</span>
                ) : (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: SKIN.white }}>{i + 1}</span>
                )}
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, letterSpacing: 0.3, color: done ? '#07111F' : SKIN.muted, textTransform: 'uppercase' }}>
                  CHALLENGE {i + 1}
                </span>
              </button>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: SKIN.muted, minHeight: 10 }}>
                {done ? `${cardScores[i]!.toLocaleString()} pts` : ''}
              </span>
            </div>

            {/* connecting arrow — gold once the source card is complete */}
            {i < 2 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 64, color: isDone(i) ? '#FFD700' : 'rgba(94,122,156,0.5)', fontSize: 16 }}>
                ▶
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// —— Large diamond display (Issue 13) ————————————————————————————

function DiamondDisplay({ claimable }: { claimable: boolean }) {
  return (
    <div
      style={{
        textAlign: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        background: claimable ? 'rgba(255,215,0,0.08)' : 'rgba(10,26,46,0.4)',
        border: claimable ? '1px solid rgba(255,215,0,0.35)' : '1px solid rgba(30,139,195,0.15)',
      }}
    >
      <div style={{ fontSize: 36, opacity: claimable ? 1 : 0.3 }}>💎</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: claimable ? '#FFD700' : SKIN.muted, marginTop: 4 }}>
        +1 GEM
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: SKIN.muted, marginTop: 2 }}>
        Daily Challenge Reward
      </div>
    </div>
  );
}

// —— Claim button — three states (Issue 13) —————————————————————————

function ClaimButton({ allDone, claimed, onClaim }: { allDone: boolean; claimed: boolean; onClaim: () => void }) {
  // State 3 — already claimed today
  if (claimed) {
    return (
      <button
        disabled
        style={{
          width: '100%', padding: '14px', fontFamily: "'Space Mono', monospace", fontSize: 11,
          letterSpacing: 2, borderRadius: 8, border: '1px solid rgba(46,204,113,0.4)',
          background: SKIN.cardBg, color: SKIN.success, cursor: 'default', fontWeight: 700,
        }}
      >
        ✓ DAILY 💎 CLAIMED
      </button>
    );
  }
  // State 2 — all 3 complete, claimable
  if (allDone) {
    return (
      <button
        onClick={onClaim}
        style={{
          width: '100%', padding: '14px', fontFamily: "'Space Mono', monospace", fontSize: 11,
          letterSpacing: 2, borderRadius: 8, border: 'none', background: SKIN.btnGold,
          color: '#07111F', boxShadow: SKIN.btnGoldShadow, cursor: 'pointer', fontWeight: 700,
        }}
      >
        💎 CLAIM YOUR DAILY 💎
      </button>
    );
  }
  // State 1 — not all complete
  return (
    <button
      disabled
      style={{
        width: '100%', padding: '14px', fontFamily: "'Space Mono', monospace", fontSize: 11,
        letterSpacing: 1, borderRadius: 8, border: 'none', background: 'rgba(10,26,46,0.6)',
        color: SKIN.muted, cursor: 'default',
      }}
    >
      💎 Complete all challenges to claim
    </button>
  );
}
