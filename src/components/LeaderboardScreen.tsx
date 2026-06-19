// LeaderboardScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-011 (CF-013 / VD-08)
//
// Rebuilt from the Sprint-3 scaffold (Daily | Timed | All-Time) to the confirmed
// final tab set: CAMPAIGN | CLASSIC | DAILY.
//   • Campaign — flowlines_scores, mode='campaign', score DESC, pack filter
//   • Classic  — flowlines_scores, mode='classic',  moves ASC,  pack filter
//   • Daily    — flowlines_daily_scores, date=today, score DESC, no pack filter
// Per-tab/per-pack session cache, loading + error + empty states, pinned player
// row, FloatingPathCanvas background, BottomNav. Reads identity from flowSettingsStore.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { fetchCampaignLeaderboard, fetchClassicLeaderboard } from '../services/flCampaignScores';
import { fetchDailyLeaderboard } from '../services/flDailyScores';
import { flagOf } from '../data/countries';
import { FloatingPathCanvas } from './FloatingPathCanvas';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';
const UID_PURPLE = '#ADA7F0';

type Tab = 'campaign' | 'classic' | 'daily';
const TABS: Array<{ key: Tab; labelKey: string }> = [
  { key: 'campaign', labelKey: 'leaderboard.tab_campaign' },
  { key: 'classic', labelKey: 'leaderboard.tab_classic' },
  { key: 'daily', labelKey: 'leaderboard.tab_daily' },
];

// Normalised row for rendering — `value` is the score (Campaign/Daily) or the
// move count (Classic), already chosen per tab.
interface Row {
  player_uid: string;
  alias: string;
  country: string;
  value: number;
}

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const playerUid = useFlowSettingsStore((s) => s.playerUid);
  const alias = useFlowSettingsStore((s) => s.alias);
  const country = useFlowSettingsStore((s) => s.country);

  const [tab, setTab] = useState<Tab>('campaign');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Session cache keyed by tab so re-visiting a tab doesn't re-fetch.
  const cache = useRef<Record<string, Row[]>>({});

  useEffect(() => {
    if (cache.current[tab]) {
      setRows(cache.current[tab]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async (): Promise<Row[]> => {
      if (tab === 'campaign') {
        const data = await fetchCampaignLeaderboard();
        return data.map((r) => ({ player_uid: r.player_uid, alias: r.alias, country: r.country, value: r.score }));
      }
      if (tab === 'classic') {
        const data = await fetchClassicLeaderboard();
        return data.map((r) => ({ player_uid: r.player_uid, alias: r.alias, country: r.country, value: r.score }));
      }
      const data = await fetchDailyLeaderboard();
      return data.map((r) => ({ player_uid: r.player_uid, alias: r.alias, country: r.country, value: r.score }));
    };

    run()
      .then((data) => {
        if (cancelled) return;
        cache.current[tab] = data;
        setRows(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('common.error_load'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tab, reloadKey]);

  const retry = () => {
    delete cache.current[tab];
    setReloadKey((k) => k + 1);
  };

  // Player's own pinned row: best (= first) appearance in the sorted list. All
  // tabs are score-DESC, so the first hit is the player's best.
  const playerIdx = rows.findIndex((r) => r.player_uid === playerUid);
  const playerRank = playerIdx >= 0 ? playerIdx + 1 : -1;
  const playerValue = playerIdx >= 0 ? rows[playerIdx].value : 0;

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ position: 'relative', height: '100dvh', width: '100%', background: skin.bgDeep, overflowX: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <FloatingPathCanvas />
      <style>{`@keyframes flLbSpin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>{t('leaderboard.title')}</span>
      </div>

      {/* Tab bar */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '0 16px 8px', position: 'relative', zIndex: 1 }}>
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 8, cursor: 'pointer',
                fontFamily: skin.fontDisplay, fontSize: 11, letterSpacing: 0.5,
                background: active ? GOLD : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.2)'}`,
                color: active ? '#0D0620' : 'rgba(255,255,255,0.4)',
                fontWeight: active ? 700 : 500,
              }}
            >
              {t(tb.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Date header (Daily only) */}
      {tab === 'daily' && (
        <div style={{ flexShrink: 0, padding: '0 16px 8px', fontFamily: skin.fontDisplay, fontSize: 12, color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}>
          {dateLabel}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', position: 'relative', zIndex: 1, touchAction: 'pan-y' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid rgba(255,215,0,0.25)`, borderTopColor: GOLD, animation: 'flLbSpin 0.8s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 14 }}>{t('common.error_load')}</div>
            <button onClick={retry} style={{ background: GOLD, color: '#0D0620', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t('common.retry_btn')}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '40px 0' }}>{t('common.no_scores')}</div>
        ) : (
          rows.map((r, i) => (
            <LeaderRow key={`${r.player_uid}-${i}`} rank={i + 1} row={r} isPlayer={r.player_uid === playerUid} />
          ))
        )}
      </div>

      {/* Pinned player row */}
      <div style={{ flexShrink: 0, padding: '6px 16px 8px', position: 'relative', zIndex: 1 }}>
        <LeaderRow
          rank={playerRank}
          row={{ player_uid: playerUid || 'NT------', alias: alias || t('common.player_fallback'), country: country || 'IN', value: playerValue }}
          isPlayer
          pinned
        />
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}><BottomNav /></div>
    </div>
  );
}

function LeaderRow({ rank, row, isPlayer, pinned }: {
  rank: number; row: Row; isPlayer?: boolean; pinned?: boolean;
}) {
  const { t } = useTranslation();
  const topThree = rank >= 1 && rank <= 3;
  const rankColour = topThree ? GOLD : 'rgba(255,255,255,0.5)';
  const rankLabel = rank < 0 ? '#--' : `#${rank}`;
  const aliasText = (row.alias || t('common.player_fallback')).slice(0, 12);

  const wrap: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
    borderRadius: pinned ? 10 : 0,
    borderBottom: pinned ? 'none' : '1px solid rgba(127,119,221,0.12)',
    background: isPlayer ? 'rgba(255,215,0,0.05)' : 'none',
    border: isPlayer ? '1px solid rgba(255,215,0,0.4)' : undefined,
  };

  return (
    <div style={wrap}>
      <span style={{ fontFamily: skin.fontDisplay, fontSize: 12, color: rankColour, minWidth: 28, fontWeight: topThree ? 700 : 500 }}>{rankLabel}</span>
      {/* UID — differentiates players who share an alias */}
      <span style={{ fontFamily: skin.fontDisplay, fontSize: 9, color: UID_PURPLE, minWidth: 56, letterSpacing: 0.5 }}>{row.player_uid || 'NT------'}</span>
      <span style={{ fontSize: 16 }}>{flagOf(row.country || 'IN')}</span>
      <span style={{ fontSize: 13, color: skin.white, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {aliasText}
      </span>
      {isPlayer && rank < 0 && <span style={{ color: GOLD, fontSize: 12 }}>▶</span>}
      <span style={{ fontFamily: skin.fontDisplay, fontSize: 14, fontWeight: 700, color: topThree ? GOLD : 'rgba(255,255,255,0.85)' }}>
        {row.value}
      </span>
    </div>
  );
}
