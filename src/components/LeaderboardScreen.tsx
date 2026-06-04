// LeaderboardScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 5 | Task T-012b | VD-06
//
// Live Supabase leaderboard with daily / endless / all-time tabs. Anonymous.

import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchLeaderboard } from '../services/supabase';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import type { ScoreRow, LeaderboardTab } from '../services/supabase';
import { useSettingsStore } from '../store/settingsStore';

export function LeaderboardScreen() {
  const { t } = useTranslation();
  const { alias } = useSettingsStore();
  const [tab, setTab] = useState<LeaderboardTab>('alltime');
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(tab).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [tab]);

  const TABS: { key: LeaderboardTab; label: string }[] = [
    { key: 'daily', label: t('leaderboard.tab_daily') },
    { key: 'endless', label: t('leaderboard.tab_endless') },
    { key: 'alltime', label: t('leaderboard.tab_alltime') },
  ];

  const RANK_COLOURS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <ScreenShell title={t('leaderboard.title')}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(30,139,195,0.15)' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: 1,
              color: tab === key ? 'var(--gold)' : 'var(--muted)',
              borderBottom: tab === key ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'color 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rows */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
          {t('leaderboard.loading')}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
          {t('leaderboard.empty')}
        </div>
      ) : (
        rows.map((row, i) => {
          const rank = i + 1;
          const isMe = row.alias === alias;
          return (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                gap: 12,
                borderBottom: '1px solid rgba(30,139,195,0.08)',
                background: isMe ? 'rgba(255,215,0,0.05)' : 'transparent',
              }}
            >
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, width: 28, textAlign: 'center', color: RANK_COLOURS[rank] ?? 'var(--muted)' }}>
                {rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}
              </span>
              <span style={{ flex: 1, fontSize: 14, color: isMe ? 'var(--gold)' : 'var(--white)' }}>
                {isMe ? `${row.alias} (${t('leaderboard.you')})` : row.alias}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 8 }}>{row.country}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: isMe ? 'var(--gold)' : 'var(--white)' }}>
                {row.score.toLocaleString()}
              </span>
            </div>
          );
        })
      )}

      <p style={{ padding: '12px 20px', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>{t('leaderboard.anonymous_note')}</p>
    </ScreenShell>
  );
}

// —— Local shell ——————————————————————————————————————————————————

function ScreenShell({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-dots" />
      <ParticleCanvas />
      <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '48px 20px 16px', gap: 16, zIndex: 10, borderBottom: '1px solid rgba(30,139,195,0.2)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>{title}</h1>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>{children}</div>
      <BottomNav active="leaderboard" />
    </div>
  );
}
