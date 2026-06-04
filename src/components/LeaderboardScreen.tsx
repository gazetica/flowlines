// LeaderboardScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 (T-012b) · redesigned T-005 Part 2
//
// Three tabs — CAMPAIGN (sum of best score per level), DAILY (today's daily
// total), ALL-TIME (campaign + daily combined). No difficulty filters; country
// flag beside every alias. Campaign/All-Time come from Supabase RPCs.

import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchCampaignLeaderboard, fetchAllTimeLeaderboard } from '../services/supabase';
import { fetchDailyLeaderboard } from '../services/dailyScores';
import { getTodayDateString } from '../game/DailyChallenge';
import { countryFlag } from '../utils/countryFlag';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { useSettingsStore } from '../store/settingsStore';

type Tab = 'campaign' | 'daily' | 'alltime';
interface Row {
  alias: string;
  country: string;
  score: number;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'campaign', label: 'CAMPAIGN' },
  { key: 'daily', label: 'DAILY' },
  { key: 'alltime', label: 'ALL-TIME' },
];

const RANK_COLOURS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardScreen() {
  const { t } = useTranslation();
  const { alias } = useSettingsStore();
  const [tab, setTab] = useState<Tab>('alltime');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = async (): Promise<Row[]> => {
      if (tab === 'campaign') {
        return (await fetchCampaignLeaderboard()).map((r) => ({ alias: r.alias, country: r.country, score: r.total_campaign_score }));
      }
      if (tab === 'daily') {
        return (await fetchDailyLeaderboard(getTodayDateString())).map((r) => ({ alias: r.alias, country: r.country, score: r.totalScore }));
      }
      return (await fetchAllTimeLeaderboard()).map((r) => ({ alias: r.alias, country: r.country, score: r.alltime_score }));
    };
    let active = true;
    load().then((data) => {
      if (active) {
        setRows(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [tab]);

  return (
    <ScreenShell title={t('leaderboard.title')}>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{t('leaderboard.loading')}</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{t('leaderboard.empty')}</div>
      ) : (
        rows.map((row, i) => {
          const rank = i + 1;
          const isMe = row.alias === alias;
          return (
            <div
              key={`${row.alias}-${i}`}
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
              <span style={{ fontSize: 20 }}>{countryFlag(row.country)}</span>
              <span style={{ flex: 1, fontSize: 14, color: isMe ? 'var(--gold)' : 'var(--white)' }}>
                {isMe ? `${row.alias} (${t('leaderboard.you')})` : row.alias}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: rank === 1 ? 'var(--gold)' : 'var(--white)' }}>{row.score.toLocaleString()}</span>
            </div>
          );
        })
      )}

      <p style={{ padding: '12px 20px', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>{t('leaderboard.anonymous_note')}</p>
    </ScreenShell>
  );
}

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
