// LeaderboardScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 16 | Task FL-S3-016 (VD-08)
//
// UI shell with 3 tabs and mock rows. Real Supabase queries are Sprint 4.

import { useState } from 'react';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { BottomNav } from './BottomNav';
import { flagOf } from './CountrySelector';

const GOLD = '#FFD700';
const PURPLE_LIGHT = '#ADA7F0';

type Row = { rank: number; uid: string; code: string; alias: string; score: number; moves: number };

// TODO Sprint 4: replace MOCK_ROWS with Supabase query results.
const MOCK_ROWS: Row[] = [
  { rank: 1, uid: 'NT8K2M', code: 'KR', alias: 'Jisu', score: 920, moves: 38 },
  { rank: 2, uid: 'NTA3X9', code: 'DE', alias: 'Klaus', score: 890, moves: 41 },
  { rank: 3, uid: 'NT7B4Q', code: 'GB', alias: 'Emma', score: 870, moves: 43 },
  { rank: 4, uid: 'NT2C8V', code: 'FR', alias: 'Laurent', score: 845, moves: 45 },
  { rank: 5, uid: 'NT9R1P', code: 'BR', alias: 'Ana', score: 830, moves: 47 },
];

type Tab = 'daily' | 'timed' | 'alltime';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'daily', label: 'DAILY' },
  { key: 'timed', label: 'TIMED' },
  { key: 'alltime', label: 'ALL-TIME' },
];

function LeaderRow({ row, isPlayer }: { row: Row; isPlayer?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderBottom: '1px solid rgba(127,119,221,0.12)',
        background: isPlayer ? 'rgba(255,215,0,0.08)' : 'none',
      }}
    >
      <span style={{ fontFamily: skin.fontDisplay, fontSize: 10, color: skin.muted, minWidth: 26 }}>
        {isPlayer && row.rank < 0 ? '#--' : `#${row.rank}`}
      </span>
      <span style={{ fontFamily: skin.fontDisplay, fontSize: 9, color: PURPLE_LIGHT, minWidth: 48 }}>{row.uid}</span>
      <span style={{ fontSize: 14 }}>{flagOf(row.code)}</span>
      <span style={{ fontSize: 12, color: skin.white, flex: 1 }}>{row.alias || 'Player'}</span>
      {isPlayer && row.rank < 0 && <span style={{ color: GOLD, fontSize: 12 }}>▶</span>}
      <span style={{ fontFamily: skin.fontDisplay, fontSize: 12, color: GOLD }}>{row.score}</span>
    </div>
  );
}

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>('daily');
  const playerUid = useFlowSettingsStore((s) => s.playerUid);
  const alias = useFlowSettingsStore((s) => s.alias);
  const country = useFlowSettingsStore((s) => s.country);

  const dateLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // TODO Sprint 4: fetch daily / timed / all-time data from Supabase.
  const rows = MOCK_ROWS;
  const playerRow: Row = { rank: -1, uid: playerUid || 'NT------', code: country || 'IN', alias, score: 0, moves: 0 };

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <div style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>LEADERBOARD</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '8px',
              background: tab === t.key ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === t.key ? 'rgba(255,215,0,0.4)' : 'rgba(127,119,221,0.2)'}`,
              borderRadius: 8,
              color: tab === t.key ? GOLD : skin.muted,
              fontFamily: skin.fontDisplay,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div style={{ padding: '0 16px 6px', fontSize: 11, color: skin.muted }}>{dateLabel}</div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {rows.map((r) => (
          <LeaderRow key={r.uid} row={r} />
        ))}
      </div>

      {/* Player's own row pinned at the bottom */}
      <div style={{ padding: '0 16px 8px' }}>
        <LeaderRow row={playerRow} isPlayer />
      </div>

      <BottomNav />
    </div>
  );
}
