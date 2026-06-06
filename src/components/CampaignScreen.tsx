// CampaignScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 6 (T-013) · Sprint 4 (F-001)
//
// Campaign map. Campaign 1 = the original 100 levels (3 packs, unchanged).
// F-001 adds Campaign 2 (101–200, Pro/Descending, 1.5×) and Campaign 3
// (201–300, Expert/Random, 2×) as full level grids behind a COMMUNITY GATE:
// a campaign unlocks once enough players finished the previous one (Supabase
// counts via campaignGateService) OR the player bought Early Access (Preferences
// flag). A static "Coming Soon" card teases Campaign 4 (301–400).
//
// recordCompletion (AC10): the natural trigger (level-100 completion) lives in
// ResultScreen, which is outside this brief's permitted files — so we record
// campaign completions here on mount, derived from saved completedLevels. The
// Supabase upsert is idempotent (UNIQUE(player_alias, campaign_id)), so repeated
// opens are harmless.

import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import type { Difficulty } from '../game/GridEngine';
import { LevelManager } from '../game/LevelManager';
import levelsData from '../game/levels.json';
import {
  getCompletionCount,
  getGateThreshold,
  isPurchased,
  recordCompletion,
} from '../services/campaignGateService';
import { setLocalTier } from '../services/tierService';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';

type MiniLevel = { id: number; grid: number };
const ALL_LEVELS = (levelsData as { levels: MiniLevel[] }).levels;
const levelsInRange = (lo: number, hi: number) => ALL_LEVELS.filter((l) => l.id >= lo && l.id <= hi);

interface GateState {
  count: number; // completions of the PREVIOUS campaign
  total: number; // unlock threshold
  unlocked: boolean; // community gate met
  purchased: boolean; // Early Access bought
}
const INITIAL_GATE: GateState = { count: 0, total: 1000, unlocked: false, purchased: false };

export function CampaignScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completedLevels, alias } = useSettingsStore();
  const { startLevel } = useGameStore();

  const packs = [1, 2, 3] as const;
  const packNames = ['Pack 1 — Learn', 'Pack 2 — Rise', 'Pack 3 — Master'];

  const [gate2, setGate2] = useState<GateState>(INITIAL_GATE);
  const [gate3, setGate3] = useState<GateState>(INITIAL_GATE);

  // Load the community-gate state for C2 + C3 (defensive: falls back to 0/1000
  // locked if Supabase tables aren't there yet).
  useEffect(() => {
    let alive = true;
    (async () => {
      const [c2c, c2t, c2p, c3c, c3t, c3p] = await Promise.all([
        getCompletionCount(1), getGateThreshold(2), isPurchased(2),
        getCompletionCount(2), getGateThreshold(3), isPurchased(3),
      ]);
      if (!alive) return;
      setGate2({ count: c2c, total: c2t, unlocked: c2c >= c2t, purchased: c2p });
      setGate3({ count: c3c, total: c3t, unlocked: c3c >= c3t, purchased: c3p });
    })();
    return () => { alive = false; };
  }, []);

  // AC10: record campaign completions (idempotent) when fully cleared.
  useEffect(() => {
    if (!alias) return;
    const isCampaignDone = (lo: number, hi: number) => {
      for (let id = lo; id <= hi; id++) if ((completedLevels[id] ?? 0) < 1) return false;
      return true;
    };
    if (isCampaignDone(1, 100)) void recordCompletion(alias, 1);
    if (isCampaignDone(101, 200)) void recordCompletion(alias, 2);
    if (isCampaignDone(201, 300)) void recordCompletion(alias, 3);
    // F-001b: cache the local player tier (expert outranks pro; never downgrades).
    if (isCampaignDone(101, 200)) setLocalTier('expert');
    else if (isCampaignDone(1, 100)) setLocalTier('pro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Campaign 1 tap (unchanged behaviour — easy/ascending via the level's config).
  const handleLevelTap = (levelId: number) => {
    const maxCompleted = Math.max(0, ...Object.keys(completedLevels).map(Number));
    const isUnlocked = levelId <= maxCompleted + 1;
    if (!isUnlocked) return;
    startLevel(levelId, 'campaign');
    navigate('/game');
  };

  // C2/C3 tap — the difficulty drives the engine: pro = descending + 1.5×,
  // expert = random sequence + 2×. The level's own direction is overridden.
  const playGated = (levelId: number, difficulty: Difficulty) => {
    startLevel(levelId, 'campaign', difficulty);
    navigate('/game');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-dots" />
      <ParticleCanvas />

      {/* Header */}
      <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '48px 20px 16px', gap: 16, zIndex: 10, borderBottom: '1px solid rgba(30,139,195,0.2)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2 }}>{t('campaign.title')}</h1>
      </div>

      {/* Level map */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', position: 'relative', zIndex: 1 }}>
        {/* —— Campaign 1 — original 3 packs (unchanged) —— */}
        {packs.map((pack, pi) => {
          const levels = LevelManager.getPack(pack);
          const completedInPack = levels.filter((l) => completedLevels[l.id] >= 1).length;
          const packProgress = Math.round((completedInPack / levels.length) * 100);

          return (
            <div key={pack} style={{ marginBottom: 28 }}>
              {/* Pack header */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--gold)', letterSpacing: 1, marginBottom: 4 }}>{packNames[pi]}</div>
                <div style={{ height: 3, background: 'var(--navy-border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: 'var(--gold)', width: `${packProgress}%`, transition: 'width 0.4s ease', boxShadow: '0 0 6px rgba(255,215,0,0.4)' }} />
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                  {completedInPack}/{levels.length} · {packProgress}%
                </div>
              </div>

              {/* Level grid — 5 per row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {levels.map((level) => {
                  const maxCompleted = Math.max(0, ...Object.keys(completedLevels).map(Number));
                  const isUnlocked = level.id <= maxCompleted + 1;
                  const levelStars = completedLevels[level.id] ?? 0;
                  const isDone = levelStars >= 1;

                  return (
                    <button
                      key={level.id}
                      onClick={() => handleLevelTap(level.id)}
                      disabled={!isUnlocked}
                      style={tileStyle(isDone, isUnlocked)}
                    >
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: isDone ? 'var(--success)' : isUnlocked ? 'var(--white)' : 'var(--muted)' }}>{level.id}</span>
                      {isDone && <span style={{ fontSize: 8 }}>{'⭐'.repeat(levelStars)}</span>}
                      {!isUnlocked && <span style={{ fontSize: 9, color: 'var(--muted)' }}>🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* —— Campaign 2 — Pro (101–200) —— */}
        <GatedCampaign
          campaign={2}
          difficulty="pro"
          titleKey="campaign.pro_title"
          subKey="campaign.pro_gate_sub"
          unlockKey="campaign.unlock_pro"
          gate={gate2}
          levels={levelsInRange(101, 200)}
          completedLevels={completedLevels}
          onPlay={(id) => playGated(id, 'pro')}
          onUnlock={() => navigate('/iap')}
          t={t}
        />

        {/* —— Campaign 3 — Expert (201–300) —— */}
        <GatedCampaign
          campaign={3}
          difficulty="expert"
          titleKey="campaign.expert_title"
          subKey="campaign.expert_gate_sub"
          unlockKey="campaign.unlock_expert"
          gate={gate3}
          levels={levelsInRange(201, 300)}
          completedLevels={completedLevels}
          onPlay={(id) => playGated(id, 'expert')}
          onUnlock={() => navigate('/iap')}
          t={t}
        />

        {/* —— Coming Soon — Campaign 4 (301–400), static —— */}
        <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(10,26,46,0.5)', border: '1px dashed rgba(30,139,195,0.2)', borderRadius: 10 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)', letterSpacing: 2, marginBottom: 6 }}>🔒 {t('campaign.coming_soon')}</div>
          <div style={{ fontSize: 12, color: 'rgba(107,132,168,0.5)' }}>{t('campaign.coming_soon_sub')}</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

// —— Shared tile style ————————————————————————————————————————————————
function tileStyle(isDone: boolean, isUnlocked: boolean): React.CSSProperties {
  return {
    aspectRatio: '1',
    background: isDone
      ? 'linear-gradient(145deg,#0d2a1a,#091f12)'
      : isUnlocked
        ? 'linear-gradient(145deg,#0F2A48,#0A1E38)'
        : 'rgba(10,20,35,0.5)',
    border: `1px solid ${isDone ? 'rgba(46,204,113,0.4)' : isUnlocked ? 'rgba(30,139,195,0.3)' : 'rgba(30,139,195,0.1)'}`,
    borderRadius: 6,
    cursor: isUnlocked ? 'pointer' : 'default',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: 4,
  };
}

// —— Gated campaign section (C2 / C3) ————————————————————————————————
function GatedCampaign({
  titleKey,
  subKey,
  unlockKey,
  gate,
  levels,
  completedLevels,
  onPlay,
  onUnlock,
  t,
}: {
  campaign: 2 | 3;
  difficulty: Difficulty;
  titleKey: string;
  subKey: string;
  unlockKey: string;
  gate: GateState;
  levels: MiniLevel[];
  completedLevels: Record<number, number>;
  onPlay: (levelId: number) => void;
  onUnlock: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const accessible = gate.unlocked || gate.purchased;
  const lo = levels.length ? levels[0].id : 0;
  // Furthest completed level within THIS campaign (progressive unlock).
  let maxDone = lo - 1;
  for (const l of levels) if ((completedLevels[l.id] ?? 0) >= 1) maxDone = l.id;
  const completedInCampaign = levels.filter((l) => (completedLevels[l.id] ?? 0) >= 1).length;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header: title · subtitle · gate progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: accessible ? 'var(--gold)' : 'var(--muted)', letterSpacing: 1 }}>{t(titleKey)}</div>
          {!accessible && <span style={{ fontSize: 11 }}>🔒</span>}
          {gate.purchased && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: 'var(--success)', border: '1px solid rgba(46,204,113,0.4)', borderRadius: 4, padding: '1px 5px' }}>{t('campaign.early_access_badge')}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{t(subKey)}</div>
        {/* F-001b: large right-aligned live gate counter (cyan). */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 26, fontWeight: 700, color: '#00f5ff', textAlign: 'right', marginTop: 6, textShadow: '0 0 10px rgba(0,245,255,0.3)' }}>
          {t('campaign.gate_counter', { count: gate.count.toLocaleString(), total: gate.total.toLocaleString() })}
        </div>
        {accessible && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
            {completedInCampaign}/{levels.length}
          </div>
        )}
      </div>

      {/* Locked: Early Access IAP call-to-action */}
      {!accessible && (
        <button
          className="btn-gold"
          onClick={onUnlock}
          style={{ width: '100%', padding: '12px', fontSize: 11, letterSpacing: 1, marginBottom: 12 }}
        >
          🔓 {t(unlockKey)} · {t('campaign.early_access_badge')}
        </button>
      )}

      {/* Level grid (greyed + non-interactive while locked) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, opacity: accessible ? 1 : 0.35, pointerEvents: accessible ? 'auto' : 'none' }}>
        {levels.map((level) => {
          const isUnlocked = accessible && level.id <= maxDone + 1;
          const stars = completedLevels[level.id] ?? 0;
          const isDone = stars >= 1;
          return (
            <button
              key={level.id}
              onClick={() => isUnlocked && onPlay(level.id)}
              disabled={!isUnlocked}
              style={tileStyle(isDone, isUnlocked)}
            >
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: isDone ? 'var(--success)' : isUnlocked ? 'var(--white)' : 'var(--muted)' }}>{level.id}</span>
              {isDone && <span style={{ fontSize: 8 }}>{'⭐'.repeat(stars)}</span>}
              {!isUnlocked && <span style={{ fontSize: 9, color: 'var(--muted)' }}>🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
