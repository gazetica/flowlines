// HomeScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 4 | Task T-012a | VD-02
//
// Main menu: gold title, best-score / streak stats, PLAY NOW (campaign),
// mode buttons (daily/speed/endless), and the bottom nav bar.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';

// T-006 Part 1.3: three equal SQUARE mode cards (replaces the old small
// rectangular row). Endless/Speed go through the difficulty pre-screen; Free
// Play has its own config screen.
type ModeCardKey = 'endless' | 'freeplay' | 'speed';
// B-001a: labels are i18n keys resolved with t() in render (existing keys reused).
const MODE_CARDS: { key: ModeCardKey; icon: string; labelKey: string; sub: string; accent: string; iconColour: string }[] = [
  { key: 'endless', icon: '∞', labelKey: 'home.mode_endless', sub: '5×5 · 3min', accent: 'rgba(147,51,234,0.4)', iconColour: '#9333EA' },
  { key: 'freeplay', icon: '▦', labelKey: 'home.freePlayLabel', sub: 'Your rules', accent: 'rgba(59,130,246,0.4)', iconColour: '#3B82F6' },
  { key: 'speed', icon: '⚡', labelKey: 'home.mode_speed', sub: '4×4 · 2×pt', accent: 'rgba(245,158,11,0.4)', iconColour: '#F59E0B' },
];

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completedLevels, bestScores, dailyStreak, hintCount, claimDailyGems } = useSettingsStore();
  // Gold border flash on tap before navigating (T-006 Part 1.3).
  const [flashCard, setFlashCard] = useState<ModeCardKey | null>(null);
  // F-005 Part 2: once-per-UTC-day daily-visit gem reward. On mount, claim it; if it
  // was granted now (new day), float a "+3 💎" over the gem card for ~1.5s.
  const [gemFloat, setGemFloat] = useState(false);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
    claimDailyGems(today).then((granted) => {
      if (!granted) return;
      setGemFloat(true);
      setTimeout(() => setGemFloat(false), 1600);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best score across all campaign levels
  const campaignBest = Math.max(
    0,
    ...Object.entries(bestScores)
      .filter(([k]) => k.startsWith('campaign_'))
      .map(([, v]) => v)
  );

  const handlePlay = () => {
    // First incomplete level, or replay level 1
    const allLevels = Array.from({ length: 100 }, (_, i) => i + 1);
    const nextLevel = allLevels.find((id) => !(completedLevels[id] >= 1)) ?? 1;
    // T-005: Campaign routes DIRECTLY to the game — the difficulty pre-screen is
    // Speed/Endless only now (it defines campaign via the level config).
    useGameStore.getState().startLevel(nextLevel, 'campaign');
    navigate('/game');
  };

  const handleMode = (mode: 'daily' | 'endless' | 'speed') => {
    // T-004A Fix 3: Speed is 4×4 per the card label (home.mode_speed_sub "4×4 · 2× pts")
    // and all VDD/design docs. It was incorrectly mapped to level 9 (3×3); level 10 is
    // the first 4×4 ('none'), so the in-game grid now matches the card. (The "2× pts"/
    // halved-timer speed scoring is engine work deferred to T-004B.)
    const levelMap = { daily: 63, endless: 63, speed: 10 };
    // T-004B: Speed/Endless go through the difficulty pre-screen first.
    navigate('/difficulty', { state: { levelId: levelMap[mode], mode } });
  };

  // T-005: Daily card opens the Daily Hub (3 challenges), not a single game.
  const handleDaily = () => navigate('/daily');

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: 'var(--navy)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="bg-dots" />
      <ParticleCanvas />

      {/* Title area */}
      <div style={{ textAlign: 'center', padding: '48px 24px 20px', position: 'relative', zIndex: 1 }}>
        <h1
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--gold)',
            textShadow: '0 0 20px rgba(255,215,0,0.3)',
            letterSpacing: 4,
            marginBottom: 4,
          }}
        >
          {t('app.name').toUpperCase()}
        </h1>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 2 }}>
          {t('app.tagline')}
        </p>
      </div>

      {/* Stats row — Best Score · Day Streak · Gems (F-005 Part 2). */}
      <style>{`@keyframes home-gemFloat { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-34px); } }`}</style>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '0 24px 20px', position: 'relative', zIndex: 1 }}>
        {[
          { label: t('home.best_score'), value: campaignBest.toLocaleString() },
          { label: t('home.day_streak'), value: `${dailyStreak > 0 ? '🔥 ' : ''}${dailyStreak}` },
          { label: t('home.gems_label'), value: `💎 ${hintCount}`, gem: true },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              // F-005-FIX: all three stat cards equal width (flex:1) in one row.
              flex: 1,
              minWidth: 0,
              position: 'relative',
              background: 'rgba(10,26,46,0.8)',
              border: '1px solid rgba(30,139,195,0.25)',
              borderRadius: 8,
              padding: '10px 8px',
              textAlign: 'center',
              boxShadow: 'inset 0 1px 0 rgba(79,174,224,0.08)',
            }}
          >
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: 'var(--gold)', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{stat.label}</div>
            {/* F-005: +3 💎 float rises from the gem card on the daily award. */}
            {stat.gem && gemFloat && (
              <div
                style={{
                  position: 'absolute', top: -6, left: 0, right: 0, textAlign: 'center',
                  fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: 'var(--gold)',
                  textShadow: '0 0 8px rgba(255,215,0,0.6)', animation: 'home-gemFloat 1.5s ease-out forwards',
                  pointerEvents: 'none', zIndex: 5,
                }}
              >
                {t('home.daily_reward')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Play Now button */}
      <div style={{ padding: '0 24px 16px', position: 'relative', zIndex: 1 }}>
        <button className="btn-gold" onClick={handlePlay} style={{ width: '100%', padding: '16px', fontSize: 13, letterSpacing: 2 }}>
          ▶ {t('home.play_now')} · {t('home.classic_mode')}
        </button>
      </div>

      {/* Campaign progress (full-width dark, unchanged) */}
      <div style={{ padding: '0 24px 12px', position: 'relative', zIndex: 1 }}>
        <button
          className="btn-outline"
          onClick={() => navigate('/campaign')}
          style={{ width: '100%', padding: '10px', fontSize: 10, letterSpacing: 1 }}
        >
          🗺️ {t('home.campaign_progress')}
        </button>
      </div>

      {/* Daily Challenge — full-width TEAL card (T-006 Part 1.2) */}
      <div style={{ padding: '0 24px 12px', position: 'relative', zIndex: 1 }}>
        <button
          onClick={handleDaily}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'linear-gradient(145deg, #0F2A48 0%, #0A1E38 100%)',
            border: '1px solid rgba(239,68,68,0.6)',
            borderRadius: 10,
            boxShadow: '0 0 16px rgba(239,68,68,0.1), 0 4px 12px rgba(0,0,0,0.4)',
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#00D2C8', letterSpacing: 1 }}>
              {t('daily.title')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{t('home.daily_sub')}</div>
          </div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#00D2C8' }}>
            {t('daily.streak_label')} {dailyStreak} 🔥
          </span>
        </button>
      </div>

      {/* Three SQUARE mode cards (T-006 Part 1.3) */}
      <div style={{ padding: '0 24px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {MODE_CARDS.map((card) => {
            const isFlashing = flashCard === card.key;
            return (
              <button
                key={card.key}
                onClick={() => {
                  setFlashCard(card.key);
                  setTimeout(() => {
                    if (card.key === 'freeplay') navigate('/free-play-config');
                    else handleMode(card.key);
                  }, 160);
                }}
                style={{
                  background: 'linear-gradient(145deg, #0F2A48 0%, #0A1E38 100%)',
                  // Issue 2: all 3 mode cards use gold borders; tap flashes brighter gold.
                  border: `1px solid ${isFlashing ? 'var(--gold)' : 'rgba(255,215,0,0.4)'}`,
                  boxShadow: '0 0 12px rgba(255,215,0,0.08)',
                  borderRadius: 10,
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'border-color 0.3s',
                }}
              >
                <span style={{ fontSize: 28, color: card.iconColour, lineHeight: 1 }}>{card.icon}</span>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--white)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {t(card.labelKey)}
                </div>
                <div style={{ fontSize: 8, color: 'var(--muted)' }}>{card.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* F-001c: tier achievement cards (taglines removed). Expert first, Pro below.
          flex:1 container fills the space between the mode cards and the footer. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 16px 0', position: 'relative', zIndex: 1 }}>
        {/* F-006 Change 2: daily-gem claim info pill — cyan solid border, no dot/circle.
            Informational only (no navigation). */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            width: '80%', alignSelf: 'center', minHeight: 64, borderRadius: 999,
            border: '1px solid #00f5ff', background: 'rgba(0,245,255,0.06)',
            padding: '12px 22px', marginBottom: 12, textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#FFD700', letterSpacing: 1 }}>
            💎 {t('home.daily_pill_title')}
          </div>
          <div style={{ fontSize: 11, color: '#00f5ff' }}>{t('home.daily_pill_sub')}</div>
        </div>

        {/* F-006 Change 3: split PRO / EXPERT pill — gold solid border, centre divider,
            no dot/circle. Both halves navigate to the Campaign screen. */}
        <div
          style={{
            display: 'flex', width: '80%', alignSelf: 'center', minHeight: 64,
            borderRadius: 24, border: '1px solid #FFD700', overflow: 'hidden', marginBottom: 12,
          }}
        >
          <button
            onClick={() => navigate('/campaign')}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '10px' }}
          >
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#9B59B6', letterSpacing: 1 }}>⚡ {t('home.pro_pill_title')}</div>
            <div style={{ fontSize: 10, color: '#FFFFFF' }}>{t('home.pro_pill_sub')}</div>
          </button>
          <div style={{ width: 1, alignSelf: 'center', height: '60%', background: '#FFD700' }} />
          <button
            onClick={() => navigate('/campaign')}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '10px' }}
          >
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#00f5ff', letterSpacing: 1 }}>★ {t('home.expert_pill_title')}</div>
            <div style={{ fontSize: 10, color: '#FFFFFF' }}>{t('home.expert_pill_sub')}</div>
          </button>
        </div>
      </div>

      {/* Bottom nav (shared component — T-004A Fix 6) */}
      <BottomNav active="home" />
    </div>
  );
}
