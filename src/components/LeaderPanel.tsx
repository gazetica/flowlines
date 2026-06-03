// LeaderPanel.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-001 | VDD v1.2 Change C
//
// Two-column YOU vs LEADER panel. Shown below the grid in-game (compact) and on
// the result screen (full). Reads the player's local PB and fetches the level's
// top score from Supabase. Gold accent when the leader is ahead.
//
// NOTE: `LevelLeaderInfo` is a type — imported via `import type` to satisfy the
// project's `verbatimModuleSyntax`. The brief's combined import would not compile.

import { useEffect, useState } from 'react';
import { fetchLevelLeader, getPlayerPB } from '../services/campaignScores';
import type { LevelLeaderInfo } from '../services/campaignScores';
import { useSettingsStore } from '../store/settingsStore';

interface LeaderPanelProps {
  levelId: number;
  compact?: boolean; // true = smaller text for in-game use
}

export function LeaderPanel({ levelId, compact = false }: LeaderPanelProps) {
  const { alias } = useSettingsStore();
  const [leader, setLeader] = useState<LevelLeaderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const playerPB = getPlayerPB(levelId);

  useEffect(() => {
    setLoading(true);
    fetchLevelLeader(levelId).then((data) => {
      setLeader(data);
      setLoading(false);
    });
  }, [levelId]);

  const fs = compact ? { tag: 7, alias: 9, stat: 8 } : { tag: 9, alias: 12, stat: 11 };

  // Determine colour: green if player is ahead, gold if leader is ahead.
  const leaderAhead = leader && leader.score > playerPB.score;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        margin: compact ? '4px 0 0' : '12px 0 0',
      }}
    >
      {/* YOU side */}
      <div
        style={{
          background: 'rgba(10,26,46,0.7)',
          border: `1px solid ${playerPB.score > 0 ? 'rgba(46,204,113,0.25)' : 'rgba(30,139,195,0.15)'}`,
          borderRadius: 6,
          padding: compact ? '5px 7px' : '8px 10px',
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: fs.tag,
            letterSpacing: 1.5,
            color: 'var(--muted)',
            marginBottom: 3,
          }}
        >
          YOU
        </div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: fs.alias,
            color: 'var(--white)',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {alias || 'Player'}
        </div>
        <StatRow
          label="Score"
          value={playerPB.score > 0 ? playerPB.score.toLocaleString() : '—'}
          colour={leaderAhead ? 'var(--white)' : 'var(--success)'}
          fontSize={fs.stat}
        />
        <StatRow
          label="Time"
          value={playerPB.timeSecs !== null ? `${playerPB.timeSecs}s` : '—'}
          colour="var(--white)"
          fontSize={fs.stat}
        />
      </div>

      {/* LEADER side */}
      <div
        style={{
          background: 'rgba(10,26,46,0.7)',
          border: `1px solid ${leaderAhead ? 'rgba(255,215,0,0.2)' : 'rgba(30,139,195,0.15)'}`,
          borderRadius: 6,
          padding: compact ? '5px 7px' : '8px 10px',
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: fs.tag,
            letterSpacing: 1.5,
            color: 'var(--muted)',
            marginBottom: 3,
          }}
        >
          LEADER
        </div>
        {loading ? (
          <div style={{ fontSize: fs.alias, color: 'var(--muted)', fontFamily: "'Space Mono', monospace" }}>—</div>
        ) : leader ? (
          <>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: fs.alias,
                color: leaderAhead ? 'var(--gold)' : 'var(--white)',
                marginBottom: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {leader.alias}
            </div>
            <StatRow
              label="Score"
              value={leader.score.toLocaleString()}
              colour={leaderAhead ? 'var(--gold)' : 'var(--white)'}
              fontSize={fs.stat}
            />
            <StatRow label="Time" value={`${leader.timeSecs}s`} colour="var(--white)" fontSize={fs.stat} />
          </>
        ) : (
          <div style={{ fontSize: fs.alias, color: 'var(--muted)', fontFamily: "'Space Mono', monospace" }}>Be first!</div>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  colour,
  fontSize,
}: {
  label: string;
  value: string;
  colour: string;
  fontSize: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize,
        color: 'var(--muted)',
        marginBottom: 1,
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", color: colour }}>{value}</span>
    </div>
  );
}
