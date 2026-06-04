// CampaignScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 6 | Task T-013
//
// 100-level campaign map: per-pack progress bars, locked/unlocked/completed
// tiles. Tapping an unlocked level starts it. (No useTranslation — labels are
// literal here, so importing `t` would be an unused-local under noUnusedLocals.)

import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { LevelManager } from '../game/LevelManager';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';

export function CampaignScreen() {
  const navigate = useNavigate();
  const { completedLevels } = useSettingsStore();
  const { startLevel } = useGameStore();

  const packs = [1, 2, 3] as const;
  const packNames = ['Pack 1 — Learn', 'Pack 2 — Rise', 'Pack 3 — Master'];

  const handleLevelTap = (levelId: number) => {
    const maxCompleted = Math.max(0, ...Object.keys(completedLevels).map(Number));
    const isUnlocked = levelId <= maxCompleted + 1;
    if (!isUnlocked) return;
    startLevel(levelId, 'campaign');
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
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2 }}>CAMPAIGN</h1>
      </div>

      {/* Level map */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', position: 'relative', zIndex: 1 }}>
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
                      style={{
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
                      }}
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

        {/* Pack 4 teaser */}
        <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(10,26,46,0.5)', border: '1px dashed rgba(30,139,195,0.2)', borderRadius: 10 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)', letterSpacing: 2, marginBottom: 6 }}>PACK 4 — COMING SOON</div>
          <div style={{ fontSize: 12, color: 'rgba(107,132,168,0.5)' }}>More levels on the way</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
