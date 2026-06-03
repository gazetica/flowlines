// HomeScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 4 | Task T-012a | VD-02
//
// Main menu: gold title, best-score / streak stats, PLAY NOW (campaign),
// mode buttons (daily/speed/endless), and the bottom nav bar.

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completedLevels, bestScores, dailyStreak } = useSettingsStore();
  const { startLevel } = useGameStore();

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
    startLevel(nextLevel, 'campaign');
    navigate('/game');
  };

  const handleMode = (mode: 'daily' | 'endless' | 'speed') => {
    const levelMap = { daily: 63, endless: 63, speed: 9 };
    startLevel(levelMap[mode], mode);
    navigate('/game');
  };

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

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '0 24px 20px', position: 'relative', zIndex: 1 }}>
        {[
          { label: t('home.best_score'), value: campaignBest.toLocaleString() },
          { label: t('home.day_streak'), value: `${dailyStreak > 0 ? '🔥 ' : ''}${dailyStreak}` },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'rgba(10,26,46,0.8)',
              border: '1px solid rgba(30,139,195,0.25)',
              borderRadius: 8,
              padding: '10px 20px',
              textAlign: 'center',
              boxShadow: 'inset 0 1px 0 rgba(79,174,224,0.08)',
            }}
          >
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: 'var(--gold)', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Play Now button */}
      <div style={{ padding: '0 24px 16px', position: 'relative', zIndex: 1 }}>
        <button className="btn-gold" onClick={handlePlay} style={{ width: '100%', padding: '16px', fontSize: 13, letterSpacing: 2 }}>
          ▶ {t('home.play_now')} · {t('home.classic_mode')}
        </button>
      </div>

      {/* Campaign progress */}
      <div style={{ padding: '0 24px 0', position: 'relative', zIndex: 1 }}>
        <button
          className="btn-outline"
          onClick={() => navigate('/campaign')}
          style={{ width: '100%', padding: '10px', fontSize: 10, marginBottom: 12, letterSpacing: 1 }}
        >
          🗺️ CAMPAIGN PROGRESS
        </button>
      </div>

      {/* Mode buttons */}
      <div style={{ padding: '0 24px 0', position: 'relative', zIndex: 1 }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textAlign: 'center', marginBottom: 10 }}>
          —— {t('home.modes_label')} ——
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {(
            [
              ['daily', t('home.mode_daily'), t('home.mode_daily_sub')],
              ['speed', t('home.mode_speed'), t('home.mode_speed_sub')],
              ['endless', t('home.mode_endless'), t('home.mode_endless_sub')],
            ] as [string, string, string][]
          ).map(([mode, label, sub]) => (
            <button
              key={mode}
              onClick={() => handleMode(mode as 'daily' | 'endless' | 'speed')}
              style={{
                background: 'rgba(10,26,46,0.75)',
                border: '1px solid rgba(30,139,195,0.2)',
                borderRadius: 7,
                padding: '10px 6px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--blue-light)', letterSpacing: 0.5, marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ marginTop: 'auto' }}>
        <div className="glass" style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 8px 24px', borderTop: '1px solid rgba(30,139,195,0.15)' }}>
          {[
            { icon: '🏠', label: t('nav.home'), active: true, route: '/home' },
            { icon: '🏆', label: t('nav.leaderboard'), active: false, route: '/leaderboard' },
            { icon: '⚙️', label: t('nav.settings'), active: false, route: '/settings' },
            { icon: 'ℹ️', label: t('nav.about'), active: false, route: '/about' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 8px' }}
            >
              <div style={{ fontSize: 18, marginBottom: 2, filter: item.active ? 'drop-shadow(0 0 4px rgba(255,215,0,0.6))' : 'none' }}>
                {item.icon}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: item.active ? 'var(--gold)' : 'var(--muted)', letterSpacing: 0.5 }}>
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
