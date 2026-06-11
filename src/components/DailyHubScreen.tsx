// @ts-nocheck — Numtap component, broken SKIN import; replaced in Sprint 3 (FL-S1-004 Task 0)
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
import { Preferences } from '@capacitor/preferences';
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
import { skin as SKIN } from '../styles/skin';
// B-001a: this screen's labels live in module-scope sub-components (Instructions,
// StreakMap, ClaimButton, …) that can't use the useTranslation hook, so we read
// from the i18n singleton directly.
import i18n from '../i18n';

// —— Weekly diamond claim (T-008 Part 2) ————————————————————————————
// One claim per ISO week, keyed 'weekly_diamond_claimed_YYYY-WNN'. Stored via
// Capacitor Preferences directly (dailyScores.ts — home of the daily equivalent
// — is locked this task; the key is week-dynamic so it doesn't fit PREF_KEYS).

function getISOWeekKey(date: Date): string {
  // Standard ISO-8601 week: week belongs to the year of its Thursday.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // shift to the week's Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const weeklyClaimKey = () => `weekly_diamond_claimed_${getISOWeekKey(new Date())}`;

async function isWeeklyDiamondClaimed(): Promise<boolean> {
  const { value } = await Preferences.get({ key: weeklyClaimKey() });
  return value === 'true';
}
async function setWeeklyDiamondClaimed(): Promise<void> {
  await Preferences.set({ key: weeklyClaimKey(), value: 'true' });
}

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
  const setDailyStreak = useSettingsStore((s) => s.setDailyStreak);
  const addGems = useSettingsStore((s) => s.addGems);

  const [scores, setScores] = useState<LocalDailyScores | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [weeklyClaimed, setWeeklyClaimedState] = useState(false);
  // F-005: reward flash carries a `weekly` flag so the +7 weekly bonus renders a
  // visually distinct (gold-bg / navy-text) toast vs the normal gold-text float.
  const [reward, setReward] = useState<{ label: string; weekly: boolean } | null>(null);

  // Reload local scores + today's & this-week's claim status on mount (covers
  // returning from a game: React Router remounts this screen, so the effect
  // re-runs and refreshes every card state, the streak map, and both buttons).
  useEffect(() => {
    getLocalDailyScores().then(setScores);
    isDailyDiamondClaimed().then(setClaimed);
    isWeeklyDiamondClaimed().then(setWeeklyClaimedState);
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

  const flashReward = (label: string, weekly = false) => {
    setReward({ label, weekly });
    setTimeout(() => setReward(null), 1300);
  };

  // F-005 Part 3: the once-per-day daily-completion reward (all 3 challenges done)
  // now grants +3 gems (was +1 hint). Persist the claim flag (keyed by date) and
  // mark today complete for the streak map's gold state.
  const claim = async () => {
    if (!allDone || claimed) return; // defensive — covers replay after claim
    await addGems(3);
    await setDailyDiamondClaimed();
    await setLastDailyCompletionDate(today);
    setClaimed(true);
    flashReward(i18n.t('daily.gems_awarded'));
  };

  // F-005 Part 4: weekly bonus — a full 7-day streak (streak % 7 === 0) grants
  // +7 gems (was +3 hints) with a distinct gold-bg toast, then resets the streak.
  const weeklyClaim = async () => {
    if (weeklyClaimed || dailyStreak < 7) return; // defensive
    await addGems(7);
    await setWeeklyDiamondClaimed();
    setWeeklyClaimedState(true);
    flashReward(i18n.t('daily.weekly_bonus'), true);
    await setDailyStreak(0); // streak resets — nodes derive from dailyStreak
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
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>{i18n.t('daily.title')}</h1>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#FFD700' }}>{dailyStreak} 🔥</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 24px', position: 'relative', zIndex: 1 }}>
        {/* —— DAILY CHALLENGES section (T-007 Fix 3: now ABOVE the streak map) —— */}
        <Instructions
          line1={i18n.t('daily.instruction_1')}
          line2={i18n.t('daily.instruction_2')}
        />
        <ChallengeTrack cardScores={cardScores} onPlay={play} />
        <DiamondDisplay claimable={allDone} />
        <ClaimButton allDone={allDone} claimed={claimed} onClaim={claim} />

        {/* —— 7 DAY STREAK section (below the challenge section) —— */}
        <div style={{ marginTop: 24 }}>
          {/* T-008 Part 1.5: single yellow instruction line (no duplicate of the
              challenge line shown above). */}
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#FFD700', marginBottom: 12 }}>
            {i18n.t('daily.streak_goal')}
          </div>
          <StreakMap nodeState={nodeState} isFilled={isFilled} streakComplete={streakComplete} />
          <WeeklyClaimButton streakComplete={streakComplete} claimed={weeklyClaimed} onClaim={weeklyClaim} />
        </div>
      </div>

      {reward && (
        <div
          style={{
            position: 'absolute', top: '40%', left: 0, right: 0, textAlign: 'center', zIndex: 40,
            animation: 'dh-floatUp 1.3s ease-out forwards', pointerEvents: 'none',
          }}
        >
          {reward.weekly ? (
            // F-005 Part 4: distinct weekly-bonus toast — gold background, navy text.
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700,
              color: '#07111F', background: '#FFD700', borderRadius: 10, padding: '10px 18px',
              boxShadow: '0 0 18px rgba(255,215,0,0.6)',
            }}>
              {reward.label}
            </span>
          ) : (
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 30, color: SKIN.gold, textShadow: SKIN.goldGlow,
            }}>
              {reward.label}
            </span>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// —— Instruction block (T-007 Fix 3) ————————————————————————————
// The yellow line IS the heading — no separate "HOW THE STREAK WORKS" label.

function Instructions({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#FFD700', marginBottom: 4 }}>{line1}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#5E7A9C', marginBottom: 12 }}>{line2}</div>
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

// Vertical drop connector between rows — aligned to the centre of the circle on
// the given side (left/right column). Sits at the same horizontal centre as the
// 52px node so the path reads continuously (T-007 Fix 2).
function VConn({ gold, align }: { gold: boolean; align: 'left' | 'right' }) {
  return (
    <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <div style={{ width: NODE, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 0, height: 20, borderLeft: gold ? '2px solid #FFD700' : '2px dashed rgba(255,255,255,0.15)' }} />
      </div>
    </div>
  );
}

// CLAIM node — same 52px circle, 💎 inside, locked grey / claimable gold.
function ClaimNode({ claimable }: { claimable: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: NODE }}>
      <div
        style={{
          width: NODE, height: NODE, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          background: claimable ? 'linear-gradient(145deg, #FFD700, #C8A800)' : 'rgba(10,26,46,0.5)',
          border: claimable ? '2px solid #FFD700' : '2px solid rgba(94,122,156,0.4)',
          boxShadow: claimable ? '0 0 16px rgba(255,215,0,0.5)' : 'none',
          filter: claimable ? 'none' : 'grayscale(1) opacity(0.4)',
          animation: claimable ? 'dh-pulseGlow 2s ease-in-out infinite' : undefined,
        }}
      >
        💎
      </div>
      <div style={{ fontSize: 7, color: SKIN.muted, fontFamily: "'Space Mono', monospace", marginTop: 4 }}>{i18n.t('daily.claim')}</div>
    </div>
  );
}

// 4+4 S-grid (T-008 Part 1): 8 nodes in 2 rows of 4.
//   Row 1 (L→R):         Day1 → Day2 → Day3 → Day4
//   Row 2 (row-reverse):  Day5 → Day6 → Day7 → CLAIM  (visual L→R: CLAIM,7,6,5)
// Day index i (0-based) = Day (i+1). isFilled(i)/nodeState(i) drive colour.
function StreakMap({
  nodeState,
  isFilled,
  streakComplete,
}: {
  nodeState: (i: number) => NodeState;
  isFilled: (i: number) => boolean;
  streakComplete: boolean;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      {/* Row 1 — Day 1 → Day 2 → Day 3 → Day 4 */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <NodeCell state={nodeState(0)} label={i18n.t('daily.day', { n: 1 })} />
        <HConn gold={isFilled(1)} />
        <NodeCell state={nodeState(1)} label={i18n.t('daily.day', { n: 2 })} />
        <HConn gold={isFilled(2)} />
        <NodeCell state={nodeState(2)} label={i18n.t('daily.day', { n: 3 })} />
        <HConn gold={isFilled(3)} />
        <NodeCell state={nodeState(3)} label={i18n.t('daily.day', { n: 4 })} />
      </div>

      {/* drop from Day 4 (right column) down to Day 5 */}
      <VConn gold={isFilled(4)} align="right" />

      {/* Row 2 — flow Day5 → Day6 → Day7 → CLAIM, row-reverse so visual L→R is
          CLAIM, Day 7, Day 6, Day 5 (Day 5 sits under Day 4 on the right). */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
        <NodeCell state={nodeState(4)} label={i18n.t('daily.day', { n: 5 })} />
        <HConn gold={isFilled(5)} />
        <NodeCell state={nodeState(5)} label={i18n.t('daily.day', { n: 6 })} />
        <HConn gold={isFilled(6)} />
        <NodeCell state={nodeState(6)} label={i18n.t('daily.day', { n: 7 })} />
        <HConn gold={streakComplete} />
        <ClaimNode claimable={streakComplete} />
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
                  {i18n.t('daily.challenge', { n: i + 1 })}
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
        {i18n.t('daily.gem_reward_label')}
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: SKIN.muted, marginTop: 2 }}>
        {i18n.t('daily.gem_reward_sub')}
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
        ✓ DAILY 💎 {i18n.t('daily.claimed')}
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
        💎 {i18n.t('daily.claim_daily')} 💎
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
      💎 {i18n.t('daily.complete_to_claim')}
    </button>
  );
}

// —— Weekly claim button — three states (T-008 Part 2) ————————————————

function WeeklyClaimButton({ streakComplete, claimed, onClaim }: { streakComplete: boolean; claimed: boolean; onClaim: () => void }) {
  // State 3 — already claimed this week
  if (claimed) {
    return (
      <button
        disabled
        style={{
          width: '100%', padding: '14px', marginTop: 4, fontFamily: "'Space Mono', monospace", fontSize: 11,
          letterSpacing: 2, borderRadius: 8, border: '1px solid rgba(46,204,113,0.4)',
          background: SKIN.cardBg, color: SKIN.success, cursor: 'default', fontWeight: 700,
        }}
      >
        ✓ WEEKLY 7 💎 {i18n.t('daily.claimed')}
      </button>
    );
  }
  // State 2 — full 7-day streak, claimable
  if (streakComplete) {
    return (
      <button
        onClick={onClaim}
        style={{
          width: '100%', padding: '14px', marginTop: 4, fontFamily: "'Space Mono', monospace", fontSize: 11,
          letterSpacing: 2, borderRadius: 8, border: 'none', background: SKIN.btnGold,
          color: '#07111F', boxShadow: SKIN.btnGoldShadow, cursor: 'pointer', fontWeight: 700,
        }}
      >
        💎 {i18n.t('daily.claim_weekly')} 💎
      </button>
    );
  }
  // State 1 — streak incomplete
  return (
    <button
      disabled
      style={{
        width: '100%', padding: '14px', marginTop: 4, fontFamily: "'Space Mono', monospace", fontSize: 11,
        letterSpacing: 1, borderRadius: 8, border: 'none', background: 'rgba(10,26,46,0.6)',
        color: SKIN.muted, cursor: 'default',
      }}
    >
      💎 {i18n.t('daily.complete_7')}
    </button>
  );
}
