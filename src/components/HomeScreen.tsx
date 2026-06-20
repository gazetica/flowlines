// HomeScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-006 (VD-02)
//
// Main hub, rebuilt around the FL-UX-D-004 mode architecture:
//   • Campaign hero card (orange) — anchor mode, independent progression
//   • Classic hero card (purple) — secondary mode, independent progression
//   • Daily + Zen 2-column row
//   • 7-day streak dot row (gold fills, today pulses)
//   • FloatingPathCanvas living background
// Reads flowSettingsStore (never mutates). Shared BottomNav reused as-is.

import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import type { PackModeProgress } from '../store/flowSettingsStore';
import type { Difficulty } from '../types/level';
import { flagOf } from '../data/countries';
import { FloatingPathCanvas } from './FloatingPathCanvas';
import { FlowLinesLogo } from './FlowLinesLogo';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';
const CAMPAIGN_ACCENT = '#E67E22';
const CLASSIC_ACCENT = '#9B8FFF';
const ZEN_ACCENT = '#1ABC9C';

type ModeProgress = Record<number, PackModeProgress>;

interface CurrentPack {
  packId: number;
  levelIndex: number;
  solved: number;
  difficulty: Difficulty;
}

function getDifficultyForLevel(levelIndex: number): Difficulty {
  // FL-5A-030: Registry v1.1 distribution 15/10/15/10 (medium 16-25, hard 26-40, hardest 41-50).
  if (levelIndex <= 15) return 'easy';
  if (levelIndex <= 25) return 'medium';
  if (levelIndex <= 40) return 'hard';
  return 'hardest';
}

// First pack whose campaign/classic progression isn't finished. Defaults to
// Pack 1 · Level 1 for a fresh player; Pack 4 · Level 50 once all done.
function findCurrentPack(progress: ModeProgress): CurrentPack {
  for (const packId of [1, 2, 3, 4]) {
    const p = progress[packId];
    if (!p || p.highestLevelReached < 50) {
      const levelIndex = p ? p.highestLevelReached : 1; // next level to play (1-indexed)
      return { packId, levelIndex, solved: p?.solved ?? 0, difficulty: getDifficultyForLevel(levelIndex) };
    }
  }
  return { packId: 4, levelIndex: 50, solved: 50, difficulty: 'hardest' };
}

function HeroCard({
  label, icon, accent, gradient, cur, ctaRoute, ctaLabel,
}: {
  label: string;
  icon: string;
  accent: string;
  gradient: string;
  cur: CurrentPack;
  ctaRoute: string;
  ctaLabel: string;  // pre-translated CTA, e.g. "▶ PLAY CAMPAIGN"
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pct = Math.min(100, (cur.solved / 50) * 100);

  const badge: CSSProperties = {
    background: `${accent}26`,
    border: `1px solid ${accent}4D`,
    borderRadius: 8,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 700,
    color: accent,
    letterSpacing: 0.5,
  };

  return (
    <div
      style={{
        margin: '0 20px 12px',
        background: gradient,
        border: `1px solid ${accent}59`,
        borderRadius: 16,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: accent, letterSpacing: 1.5 }}>
          {icon} {label}
        </span>
        <span style={badge}>{t(`home.${cur.difficulty}`)}</span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', margin: '6px 0 4px' }}>
        {t('home.pack_level', { pack: cur.packId, level: cur.levelIndex })}
      </div>

      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: 4,
        }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: gradientForBar(accent) }} />
      </div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
        {t('home.levels_progress', { done: cur.solved, total: 50 })}
      </div>

      <button
        onPointerDown={() => navigate(ctaRoute)}
        style={{
          background: accent,
          color: skin.bgDeep,
          border: 'none',
          borderRadius: 10,
          padding: '13px 16px',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1,
          width: '100%',
          cursor: 'pointer',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

// Per-mode fill gradient for the progress bar.
function gradientForBar(accent: string): string {
  if (accent === CAMPAIGN_ACCENT) return 'linear-gradient(90deg, #E67E22, #FFD700)';
  return 'linear-gradient(90deg, #7F77DD, #9B59B6)';
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const alias = useFlowSettingsStore((s) => s.alias);
  const country = useFlowSettingsStore((s) => s.country);
  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const campaignProgress = useFlowSettingsStore((s) => s.campaignProgress);
  const classicProgress = useFlowSettingsStore((s) => s.classicProgress);
  const dailyProgress = useFlowSettingsStore((s) => s.dailyProgress);
  const lastDailyVisitDate = useFlowSettingsStore((s) => s.lastDailyVisitDate);
  const claimDailyVisitGem = useFlowSettingsStore((s) => s.claimDailyVisitGem);

  // FL-UX-D-015: grant +1 gem the first time the app is opened each day. Safe to
  // call every mount (store guards on the date). Status shown below the streak card.
  useEffect(() => { claimDailyVisitGem(); }, [claimDailyVisitGem]);
  const isDailyGemClaimedToday = lastDailyVisitDate === new Date().toISOString().slice(0, 10);

  const campaign = findCurrentPack(campaignProgress);
  const classic = findCurrentPack(classicProgress);

  const { streakCount, campaignChallengeComplete, classicChallengeComplete } = dailyProgress;
  const dailyDone = (campaignChallengeComplete ? 1 : 0) + (classicChallengeComplete ? 1 : 0);

  // Daily status line
  let dailyStatus: string;
  let dailyStatusColour: string;
  if (dailyDone === 0) { dailyStatus = t('home.puzzles_waiting'); dailyStatusColour = 'rgba(255,255,255,0.6)'; }
  else if (dailyDone === 1) { dailyStatus = t('home.one_of_two'); dailyStatusColour = GOLD; }
  else { dailyStatus = t('home.all_done_today'); dailyStatusColour = '#2ECC71'; }

  const remainingForBonus = 7 - streakCount;

  // FL-UX-D-010c Bug 1: rolling 7-day streak row (today = LAST circle), matching
  // DailyScreen's logic so the today circle fills the moment both dailies are done.
  // (Previously filled the FIRST streakCount circles and pulsed i===streakCount as
  // an *upcoming* "today" — so a completed day showed as not-yet-played.)
  const todayDate = new Date();
  const streakDayLetters = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - (6 - i));
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
  });
  const filledFrom = 7 - Math.min(7, streakCount); // indices >= this are filled

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        width: '100%',
        overflowX: 'hidden',
        touchAction: 'pan-y',
        background: '#0D0620',
        fontFamily: skin.fontBody,
      }}
    >
      <FloatingPathCanvas />
      <style>{`@keyframes flHomePulse { 0%,100% { opacity: 1 } 50% { opacity: 0.6 } }`}</style>

      {/* Scrollable content — inner scroll container over the fixed background */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          overflowX: 'hidden',
          paddingBottom: 72,
        }}
      >
        {/* Section 1 — Top Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '16px 20px 12px',
          }}
        >
          <div>
            {/* FL-UX-D-015: logo to the left of the title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FlowLinesLogo size={28} />
              <span
                style={{
                  fontFamily: skin.fontDisplay,
                  fontSize: 22,
                  fontWeight: 700,
                  color: GOLD,
                  letterSpacing: 2,
                }}
              >
                FLOW LINES
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5, marginTop: 2 }}>
              {alias || 'Player'} · {flagOf(country)}
            </div>
          </div>

          <button
            onPointerDown={() => navigate('/store')}
            style={{
              background: 'rgba(255,215,0,0.12)',
              border: '1px solid rgba(255,215,0,0.35)',
              borderRadius: 20,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16 }}>💎</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>{gemBalance}</span>
          </button>
        </div>

        {/* Section 2 — Campaign hero card */}
        <HeroCard
          label={t('home.campaign')}
          icon="🎯"
          accent={CAMPAIGN_ACCENT}
          gradient="linear-gradient(135deg, rgba(230,126,34,0.12) 0%, rgba(255,215,0,0.06) 100%)"
          cur={campaign}
          ctaRoute="/packs?mode=campaign"
          ctaLabel={t('home.play_campaign')}
        />

        {/* Section 3 — Classic hero card */}
        <HeroCard
          label={t('home.classic')}
          icon="♟"
          accent={CLASSIC_ACCENT}
          gradient="linear-gradient(135deg, rgba(127,119,221,0.12) 0%, rgba(155,89,182,0.06) 100%)"
          cur={classic}
          ctaRoute="/packs?mode=classic"
          ctaLabel={t('home.play_classic')}
        />

        {/* Section 4 — Daily + Zen row */}
        <div style={{ margin: '0 20px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Daily */}
          <div
            style={{
              background: 'rgba(255,215,0,0.06)',
              border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: 14,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>📅 {t('home.daily')}</div>
            <div style={{ fontSize: 12, color: dailyStatusColour, margin: '6px 0' }}>{dailyStatus}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              {t('home.day_streak', { count: streakCount })}
            </div>
            <button
              onPointerDown={() => navigate('/daily')}
              style={{
                marginTop: 'auto',
                background: 'rgba(255,215,0,0.15)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: 8,
                padding: 8,
                fontSize: 11,
                fontWeight: 700,
                color: GOLD,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              {t('home.play_daily')}
            </button>
          </div>

          {/* Zen */}
          <div
            style={{
              background: 'rgba(26,188,156,0.06)',
              border: '1px solid rgba(26,188,156,0.25)',
              borderRadius: 14,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: ZEN_ACCENT }}>🧘 {t('home.zen')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 10px' }}>
              {t('home.zen_tagline')}<br />{t('home.zen_tagline2')}
            </div>
            <button
              onPointerDown={() => navigate('/packs?mode=zen')}
              style={{
                marginTop: 'auto',
                background: 'rgba(26,188,156,0.15)',
                border: '1px solid rgba(26,188,156,0.3)',
                borderRadius: 8,
                padding: 8,
                fontSize: 11,
                fontWeight: 700,
                color: ZEN_ACCENT,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              {t('home.explore_zen')}
            </button>
          </div>
        </div>

        {/* Section 5 — Daily streak row */}
        <div
          style={{
            margin: '0 20px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(127,119,221,0.2)',
            borderRadius: 14,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(127,119,221,0.8)', letterSpacing: 1.5 }}>
              {t('home.daily_streak')}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {streakCount > 0 ? t('home.day_of_7', { count: Math.min(streakCount, 7) }) : t('home.start_streak')}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            {Array.from({ length: 7 }, (_, i) => {
              const completed = i >= filledFrom;     // today = last circle (i === 6)
              const isToday = i === 6 && !completed;  // today, not yet done → pulse
              const base: CSSProperties = {
                flex: 1,
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
              };
              if (completed) {
                return (
                  <div key={i} style={{ ...base, background: 'rgba(255,215,0,0.2)', border: '1.5px solid #FFD700', color: GOLD }}>
                    ✓
                  </div>
                );
              }
              if (isToday) {
                return (
                  <div
                    key={i}
                    style={{
                      ...base,
                      background: 'rgba(127,119,221,0.15)',
                      border: '1.5px solid rgba(127,119,221,0.5)',
                      color: 'rgba(255,255,255,0.5)',
                      animation: 'flHomePulse 2s infinite',
                    }}
                  >
                    {streakDayLetters[i]}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  style={{
                    ...base,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  {streakDayLetters[i]}
                </div>
              );
            })}
          </div>

          {streakCount >= 5 && streakCount <= 7 && (
            <div style={{ fontSize: 11, color: GOLD, textAlign: 'center', marginTop: 8 }}>
              {t('home.bonus_days', { count: remainingForBonus })}
            </div>
          )}
        </div>

        {/* FL-UX-D-015b: daily visit-gem status — standalone line below the streak card */}
        <div style={{ textAlign: 'center', fontFamily: skin.fontDisplay, fontSize: 12, margin: '0 20px 8px', color: isDailyGemClaimedToday ? '#2ECC71' : GOLD }}>
          {isDailyGemClaimedToday ? t('home.daily_gem_collected') : t('home.daily_gem_available')}
        </div>
      </div>

      {/* Section 6 — Bottom navigation (pinned over the fixed background) */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
        <BottomNav />
      </div>
    </div>
  );
}

export default HomeScreen;
