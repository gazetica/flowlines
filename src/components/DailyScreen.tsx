// DailyScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-010 (VD-07)
//
// Daily Challenge — TWO runtime-generated puzzles per UTC day (not from any pack):
//   Challenge 1 — Campaign (120s timer)   · mode=daily_campaign
//   Challenge 2 — Classic  (12-move budget) · mode=daily_classic  (locked until C1 attempted)
// Completing BOTH bumps the streak and unlocks a manually-claimable 3-gem reward.
// Puzzle generation lives in utils/dailyPuzzleGenerator; completion/score is recorded
// on the ResultScreen. This screen drives launch, status, claim and streak display.

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { BottomNav } from './BottomNav';
import { FloatingPathCanvas } from './FloatingPathCanvas';

const GOLD = '#FFD700';
type Challenge = 'campaign' | 'classic';
type Status = 'locked' | 'pending' | 'complete' | 'failed';

export default function DailyScreen() {
  const navigate = useNavigate();

  const dailyProgress = useFlowSettingsStore((s) => s.dailyProgress);
  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const resetDailyIfNewDay = useFlowSettingsStore((s) => s.resetDailyIfNewDay);
  const incrementDailyRetry = useFlowSettingsStore((s) => s.incrementDailyRetry);
  const claimDailyGemReward = useFlowSettingsStore((s) => s.claimDailyGemReward);

  // Roll the day over on entry (resets per-day flags / stale streak).
  useEffect(() => { resetDailyIfNewDay(); }, [resetDailyIfNewDay]);

  const {
    campaignChallengeComplete: c1Done,
    classicChallengeComplete: c2Done,
    campaignRetryCount: c1Attempts,
    classicRetryCount: c2Attempts,
    streakCount,
    gemRewardClaimed,
  } = dailyProgress;

  const bothComplete = c1Done && c2Done;
  const c2Unlocked = c1Attempts >= 1; // C2 unlocks once C1 attempted (pass or fail)

  const statusOf = (ch: Challenge): Status => {
    const done = ch === 'campaign' ? c1Done : c2Done;
    const attempts = ch === 'campaign' ? c1Attempts : c2Attempts;
    if (done) return 'complete';
    if (ch === 'classic' && !c2Unlocked) return 'locked';
    if (attempts >= 3) return 'failed'; // exhausted: 1 attempt + 2 retries, none won
    return 'pending';
  };

  // Launch (or retry) a challenge. Each launch counts as an attempt; the 2nd+
  // launch carries &retry=true so the ResultScreen caps its submitted score at 80%.
  const launch = (ch: Challenge) => {
    const attempts = ch === 'campaign' ? c1Attempts : c2Attempts;
    if (attempts >= 3) return;
    const isRetry = attempts >= 1;
    incrementDailyRetry(ch);
    const mode = ch === 'campaign' ? 'daily_campaign' : 'daily_classic';
    navigate(`/game?mode=${mode}${isRetry ? '&retry=true' : ''}`);
  };

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ─── 7-day rolling streak row (fill the last `streakCount` circles) ──────────
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()] };
  });
  const filledFrom = 7 - Math.min(7, streakCount); // indices >= this are filled

  return (
    <div style={{ position: 'relative', height: '100dvh', width: '100%', background: skin.bgDeep, overflowX: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <FloatingPathCanvas />

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>DAILY CHALLENGE</span>
      </div>

      {/* Scroll body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1, padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14, touchAction: 'pan-y' }}>
        <div style={{ textAlign: 'center', color: skin.white, fontSize: 14 }}>{dateLabel}</div>
        <div style={{ textAlign: 'center', color: GOLD, fontFamily: skin.fontDisplay, fontSize: 14 }}>
          🔥 {streakCount} day{streakCount === 1 ? '' : 's'}
        </div>

        <ChallengeCard
          title="CHALLENGE 1 · CAMPAIGN" mode="⏱ Time Mode"
          status={statusOf('campaign')} attempts={c1Attempts}
          onLaunch={() => launch('campaign')}
        />
        <ChallengeCard
          title="CHALLENGE 2 · CLASSIC" mode="🎯 Move Mode"
          status={statusOf('classic')} attempts={c2Attempts}
          onLaunch={() => launch('classic')}
        />

        <RewardCard
          bothComplete={bothComplete} claimed={gemRewardClaimed}
          onClaim={claimDailyGemReward}
        />

        {/* 7-day streak progress */}
        <div style={{ ...cardBase, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(127,119,221,0.7)', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' }}>7-DAY STREAK PROGRESS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {days.map((d, i) => {
              const filled = i >= filledFrom;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: filled ? 'rgba(46,204,113,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${filled ? 'rgba(46,204,113,0.6)' : 'rgba(255,255,255,0.12)'}`,
                    color: filled ? '#2ECC71' : 'rgba(255,255,255,0.3)', fontSize: 13,
                  }}>{filled ? '✓' : ''}</div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>💎 {gemBalance} gems</div>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}><BottomNav /></div>
    </div>
  );
}

// ─── Challenge card ──────────────────────────────────────────────────────────
function ChallengeCard({ title, mode, status, attempts, onLaunch }: {
  title: string; mode: string; status: Status; attempts: number; onLaunch: () => void;
}) {
  const pill = PILLS[status];
  const retriesRemaining = Math.max(0, 2 - Math.max(0, attempts - 1)); // 2 retries max
  const dim = status === 'locked';

  return (
    <div style={{ ...cardBase, padding: 16, opacity: dim ? 0.55 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, ...pill.style }}>{pill.label}</span>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>{mode}</div>

      {status === 'locked' && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Unlocks after Challenge 1 is attempted.</div>
      )}

      {status !== 'complete' && status !== 'locked' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>RETRIES</span>
          <span style={{ fontSize: 14, color: GOLD, letterSpacing: 2 }}>
            {'●'.repeat(retriesRemaining)}<span style={{ color: 'rgba(255,255,255,0.2)' }}>{'●'.repeat(2 - retriesRemaining)}</span>
          </span>
        </div>
      )}

      {/* CTA */}
      {status === 'locked' && <CtaDisabled label="🔒 LOCKED" />}
      {status === 'failed' && <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '10px 0' }}>NO RETRIES LEFT</div>}
      {status === 'pending' && (
        <button onPointerDown={onLaunch} style={goldCta}>
          {attempts >= 1 ? '↺  RETRY' : '▶  PLAY NOW'}
        </button>
      )}
      {/* complete → status pill only, no CTA */}
    </div>
  );
}

// ─── Reward card ─────────────────────────────────────────────────────────────
function RewardCard({ bothComplete, claimed, onClaim }: { bothComplete: boolean; claimed: boolean; onClaim: () => void; }) {
  const active = bothComplete && !claimed;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16,
      border: `1px solid ${active ? 'rgba(255,215,0,0.45)' : 'rgba(255,215,0,0.15)'}`,
      opacity: bothComplete ? 1 : 0.55, textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,215,0,0.7)', letterSpacing: 1.5, marginBottom: 10 }}>TODAY'S REWARD</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: claimed ? '#2ECC71' : GOLD, marginBottom: 6, animation: active ? 'flStarBounce 700ms ease-in-out infinite alternate' : 'none' }}>
        💎 3 Hint Gems
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: active ? 12 : 0 }}>
        {claimed ? 'Reward collected — back tomorrow!' : bothComplete ? 'Both challenges complete!' : 'Complete both challenges to unlock'}
      </div>
      {active && <button onPointerDown={onClaim} style={goldCta}>CLAIM REWARD</button>}
      {claimed && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#2ECC71' }}>✓ CLAIMED</div>}
    </div>
  );
}

function CtaDisabled({ label }: { label: string }) {
  return (
    <div style={{ width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700 }}>{label}</div>
  );
}

const cardBase: CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 14,
};
const goldCta: CSSProperties = {
  width: '100%', background: GOLD, color: '#0D0620', border: 'none', borderRadius: 12,
  padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer',
};

const PILLS: Record<Status, { label: string; style: CSSProperties }> = {
  locked: { label: '🔒 LOCKED', style: { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' } },
  pending: { label: 'PENDING', style: { background: 'rgba(133,100,4,0.4)', color: '#FFD75E' } },
  complete: { label: '✓ DONE', style: { background: 'rgba(20,83,45,0.45)', color: '#4ADE80' } },
  failed: { label: '✕ FAILED', style: { background: 'rgba(120,30,30,0.45)', color: '#F87171' } },
};
