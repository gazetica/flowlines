// LeaderboardScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 16 | Task FL-S3-016 (VD-08)
//
// UI shell with 3 tabs and mock rows. Real Supabase queries are Sprint 4.

import { useEffect, useState } from 'react';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { getDailyLeaderboard } from '../services/flDailyScores';
import { getCampaignLeaderboard } from '../services/flCampaignScores';
import { BottomNav } from './BottomNav';
import { flagOf } from './CountrySelector';

const GOLD = '#FFD700';
const PURPLE_LIGHT = '#ADA7F0';

type Row = { rank: number; uid: string; code: string; alias: string; score: number; moves: number };

/** Today's UTC date 'YYYY-MM-DD' (matches the daily-scores `date` column). */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const playerUid = useFlowSettingsStore((s) => s.playerUid);
  const alias = useFlowSettingsStore((s) => s.alias);
  const country = useFlowSettingsStore((s) => s.country);

  const dateLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Fetch real scores from Supabase per active tab. DAILY → today's daily board;
  // ALL-TIME → campaign board; TIMED → campaign board for now (TODO Sprint 5:
  // dedicated timed leaderboard). Fails silently to an empty list.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const data =
        tab === 'daily'
          ? await getDailyLeaderboard(todayUtc(), 20)
          : await getCampaignLeaderboard(20);
      if (cancelled) return;
      const mapped: Row[] = data.map((r, i) => ({
        rank: i + 1,
        uid: r.player_uid || 'NT------',
        code: r.country || 'XX',
        alias: r.alias,
        score: r.score,
        moves: r.moves,
      }));
      setRows(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tab]);

  // Player's own row: real rank if they appear in the results, else '#--'.
  const playerInList = rows.find((r) => r.uid === playerUid);
  const playerRow: Row = playerInList
    ? { ...playerInList }
    : { rank: -1, uid: playerUid || 'NT------', code: country || 'IN', alias, score: 0, moves: 0 };

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
        {loading ? (
          <div style={{ textAlign: 'center', color: skin.muted, fontSize: 13, padding: '32px 0' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: skin.muted, fontSize: 13, padding: '32px 0' }}>No scores yet — be the first!</div>
        ) : (
          rows.map((r) => <LeaderRow key={`${r.uid}-${r.rank}`} row={r} />)
        )}
      </div>

      {/* Player's own row pinned at the bottom */}
      <div style={{ padding: '0 16px 8px' }}>
        <LeaderRow row={playerRow} isPlayer />
      </div>

      <BottomNav />
    </div>
  );
}
