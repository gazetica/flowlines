// PackSelectScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-007 (VD-03)
//
// Mode-aware pack chooser. Reads ?mode=campaign|classic|zen.
//   campaign / classic — 4 progression pack cards (completed/active/locked)
//                         + IAP row (Hint Pack / Remove Ads).
//   zen                 — a session-configuration card (grid/difficulty/timer/
//                         move limit), persisted to flowSettingsStore.zenConfig.
// In-flow layout (position:relative, minHeight:100dvh) + FloatingPathCanvas, per
// the FL-UX-D-006d/006e layout decisions (no position:fixed).

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import type { ZenConfig } from '../store/flowSettingsStore';
import type { Difficulty } from '../types/level';
import { FloatingPathCanvas } from './FloatingPathCanvas';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';

type Mode = 'campaign' | 'classic' | 'zen';

const PACK_META = [
  { packId: 1, grid: 6, label: 'Pack 1' },
  { packId: 2, grid: 7, label: 'Pack 2' },
  { packId: 3, grid: 8, label: 'Pack 3' },
  { packId: 4, grid: 9, label: 'Pack 4' },
];

const MODE_CFG: Record<Mode, {
  icon: string; name: string; accent: string; tint: string; border: string;
  title: string; tagline: string; barGradient: string; cta: string; ctaBg: string;
}> = {
  campaign: {
    icon: '🎯', name: 'CAMPAIGN', accent: '#E67E22',
    tint: 'rgba(230,126,34,0.08)', border: 'rgba(230,126,34,0.2)',
    title: 'CAMPAIGN PACKS', tagline: 'Time pressure · 4 parameters · level fails on timeout',
    barGradient: 'linear-gradient(90deg, #E67E22, #FFD700)', cta: '▶ CONTINUE CAMPAIGN', ctaBg: '#E67E22',
  },
  classic: {
    icon: '♟', name: 'CLASSIC', accent: '#9B8FFF',
    tint: 'rgba(127,119,221,0.08)', border: 'rgba(127,119,221,0.2)',
    title: 'CLASSIC PACKS', tagline: 'Move budget · 4 parameters · level fails on move limit',
    barGradient: 'linear-gradient(90deg, #7F77DD, #9B59B6)', cta: '▶ CONTINUE CLASSIC', ctaBg: '#7F77DD',
  },
  zen: {
    icon: '🧘', name: 'ZEN', accent: '#1ABC9C',
    tint: 'rgba(26,188,156,0.08)', border: 'rgba(26,188,156,0.2)',
    title: 'ZEN MODE', tagline: 'No limits · your pace · choose any grid',
    barGradient: 'linear-gradient(90deg, #1ABC9C, #2ECC71)', cta: '▶ EXPLORE', ctaBg: '#1ABC9C',
  },
};

function difficultyForLevel(levelIndex: number): Difficulty {
  if (levelIndex <= 15) return 'easy';
  if (levelIndex <= 30) return 'medium';
  if (levelIndex <= 42) return 'hard';
  return 'hardest';
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Segmented selector used by the Zen config card ───────────────────────────
function Segmented<T extends string | number>({
  options, value, onChange, accent, labelOf,
}: {
  options: T[]; value: T; onChange: (v: T) => void; accent: string; labelOf?: (v: T) => string;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={String(opt)}
            onPointerDown={() => onChange(opt)}
            style={{
              flex: '1 1 auto',
              minWidth: 56,
              background: active ? `${accent}26` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? accent : 'rgba(127,119,221,0.2)'}`,
              borderRadius: 8,
              padding: '8px 6px',
              fontSize: 12,
              fontWeight: 700,
              color: active ? accent : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
            }}
          >
            {labelOf ? labelOf(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

export default function PackSelectScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const rawMode = searchParams.get('mode');
  // No ?mode param == bottom-nav entry: show a Campaign/Classic tab switcher and
  // let the player toggle. Direct entry (?mode=…) hides the switcher.
  const isBottomNavEntry = !rawMode;
  const [activeTab, setActiveTab] = useState<'campaign' | 'classic'>(
    (rawMode as 'campaign' | 'classic') ?? 'campaign',
  );
  // Zen only arrives via ?mode=zen (HomeScreen EXPLORE); otherwise use the tab.
  const mode: Mode = rawMode === 'zen' ? 'zen' : activeTab;
  const cfg = MODE_CFG[mode] ?? MODE_CFG.campaign;

  // i18n: translate the mode-dependent labels (MODE_CFG keeps styling only).
  const modeTitle = mode === 'zen' ? t('zen.title') : t(mode === 'classic' ? 'packs.title_classic' : 'packs.title_campaign');
  const modeName = t(mode === 'classic' ? 'home.classic' : mode === 'zen' ? 'home.zen' : 'home.campaign');
  const modeTagline = mode === 'zen' ? t('zen.tagline') : t(mode === 'classic' ? 'packs.classic_desc' : 'packs.campaign_desc');
  const modeCta = t(mode === 'classic' ? 'packs.continue_classic' : 'packs.continue_campaign');

  const campaignProgress = useFlowSettingsStore((s) => s.campaignProgress);
  const classicProgress = useFlowSettingsStore((s) => s.classicProgress);
  const isPackUnlocked = useFlowSettingsStore((s) => s.isPackUnlocked);
  const zenConfig = useFlowSettingsStore((s) => s.zenConfig);
  const setZenConfig = useFlowSettingsStore((s) => s.setZenConfig);

  // zen shares campaign's pack structure as a fallback (not actually shown in zen)
  const modeProgress = mode === 'classic' ? classicProgress : campaignProgress;

  const headerRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
      <button
        onPointerDown={() => navigate(-1)}
        style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', background: 'none', border: 'none', color: GOLD, fontSize: 24, cursor: 'pointer' }}
      >
        ‹
      </button>
      <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>{modeTitle}</span>
    </div>
  );

  const heroBanner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', background: cfg.tint, borderBottom: `1px solid ${cfg.border}` }}>
      <span style={{ fontSize: 12, color: cfg.accent, fontWeight: 700, letterSpacing: 1.5 }}>{cfg.icon} {modeName}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto', textAlign: 'right' }}>{modeTagline}</span>
    </div>
  );

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        width: '100%',
        background: '#0D0620',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: skin.fontBody,
      }}
    >
      <FloatingPathCanvas />
      <style>{`@keyframes flLevelPulse {
        0%,100% { box-shadow: 0 0 0 2px rgba(230,126,34,0.4); }
        50%     { box-shadow: 0 0 0 4px rgba(230,126,34,0.2); }
      }`}</style>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y', paddingBottom: 16 }}>
        {headerRow}

        {isBottomNavEntry && (
          <div
            style={{
              margin: '8px 20px 0',
              display: 'flex',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(127,119,221,0.2)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {([
              { key: 'campaign', icon: '🎯', labelKey: 'packs.tab_campaign', bg: 'rgba(230,126,34,0.25)', color: '#E67E22' },
              { key: 'classic', icon: '♟', labelKey: 'packs.tab_classic', bg: 'rgba(127,119,221,0.25)', color: '#9B8FFF' },
            ] as const).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onPointerDown={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: '11px 8px',
                    textAlign: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    background: active ? tab.bg : 'transparent',
                    color: active ? tab.color : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {tab.icon} {t(tab.labelKey)}
                </button>
              );
            })}
          </div>
        )}

        {heroBanner}

        {mode === 'zen' ? (
          <ZenConfigCard cfg={cfg} zenConfig={zenConfig} setZenConfig={setZenConfig} navigate={navigate} />
        ) : (
          <>
            <div style={{ marginTop: 12 }}>
              {PACK_META.map((meta) => {
                const p = modeProgress[meta.packId];
                const solved = p?.solved ?? 0;
                const highest = p?.highestLevelReached ?? 1;
                const unlocked = isPackUnlocked(meta.packId, mode === 'classic' ? 'classic' : 'campaign');
                const state: 'completed' | 'active' | 'locked' = !unlocked ? 'locked' : solved >= 50 ? 'completed' : 'active';
                const threeStars = Object.values(p?.stars ?? {}).filter((v) => v === 3).length;
                const allThree = solved >= 50 && threeStars >= 50;

                const goLevels = () => navigate(`/levels/${meta.packId}?mode=${mode}`);

                if (state === 'locked') {
                  return (
                    <div
                      key={meta.packId}
                      style={{
                        margin: '0 20px 12px', borderRadius: 14, padding: 16,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(127,119,221,0.1)',
                        opacity: 0.45, pointerEvents: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
                          {t('packs.pack_title', { number: meta.packId, grid: `${meta.grid}×${meta.grid}` })}
                        </span>
                        <span style={{ fontSize: 18 }}>🔒</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                        {meta.packId === 2 && t('packs.unlock_pack2')}
                        {meta.packId === 3 && t('packs.unlock_pack3')}
                        {meta.packId === 4 && t('packs.unlock_pack4')}
                      </div>
                    </div>
                  );
                }

                if (state === 'completed') {
                  return (
                    <div
                      key={meta.packId}
                      onPointerDown={goLevels}
                      style={{
                        margin: '0 20px 12px', borderRadius: 14, padding: 16, cursor: 'pointer',
                        background: 'rgba(255,215,0,0.06)', border: '1.5px solid rgba(255,215,0,0.4)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                          {t('packs.pack_title', { number: meta.packId, grid: `${meta.grid}×${meta.grid}` })}
                        </span>
                        <span style={{ fontSize: 13, color: allThree ? GOLD : 'rgba(255,255,255,0.6)' }}>★★★ {solved}/50</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '6px 0 8px' }}>
                        {t('packs.all_complete', { count: solved })}
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,215,0,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '100%', background: GOLD }} />
                      </div>
                    </div>
                  );
                }

                // active
                const pct = Math.min(100, (solved / 50) * 100);
                return (
                  <div
                    key={meta.packId}
                    style={{
                      margin: '0 20px 12px', borderRadius: 14, padding: 16,
                      background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(127,119,221,0.5)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                        PACK {meta.packId} · {meta.grid}×{meta.grid} Grid
                      </span>
                      <span style={{
                        background: `${cfg.accent}26`, border: `1px solid ${cfg.accent}4D`, borderRadius: 8,
                        padding: '3px 8px', fontSize: 10, fontWeight: 700, color: cfg.accent,
                      }}>
                        {cap(difficultyForLevel(highest))}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 8px' }}>
                      {t('packs.pack_progress', { done: solved, total: 50 })} · {t('packs.level_next', { level: highest })}
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 14 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: cfg.barGradient }} />
                    </div>
                    <button
                      onPointerDown={goLevels}
                      style={{
                        width: '100%', background: cfg.ctaBg, color: skin.bgDeep, border: 'none',
                        borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {modeCta}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* IAP row — campaign / classic only */}
            <div style={{ margin: '0 20px 16px', display: 'flex', gap: 12 }}>
              {[
                { icon: '💡', label: t('packs.hint_pack'), price: '$1.99' },
                { icon: '🚫', label: t('packs.remove_ads'), price: '$2.99' },
              ].map((iap) => (
                <button
                  key={iap.label}
                  onPointerDown={() => navigate('/store')}
                  style={{
                    flex: 1, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)',
                    borderRadius: 12, padding: '14px 12px', textAlign: 'center', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 22 }}>{iap.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: GOLD, marginTop: 4 }}>{iap.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{iap.price}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>
    </div>
  );
}

// ─── Zen configuration card ───────────────────────────────────────────────────
function ZenConfigCard({
  cfg, zenConfig, setZenConfig, navigate,
}: {
  cfg: typeof MODE_CFG[Mode];
  zenConfig: ZenConfig;
  setZenConfig: (c: Partial<ZenConfig>) => void;
  navigate: (to: string) => void;
}) {
  const [grid, setGrid] = useState<ZenConfig['grid']>(zenConfig.grid);
  const [difficulty, setDifficulty] = useState<Difficulty>(zenConfig.difficulty);
  const [timerOn, setTimerOn] = useState(zenConfig.timerSeconds > 0);
  const [timerSeconds, setTimerSeconds] = useState(zenConfig.timerSeconds > 0 ? zenConfig.timerSeconds : 60);
  const [moveOn, setMoveOn] = useState(zenConfig.moveLimit > 0);
  const [moveLimit, setMoveLimit] = useState(zenConfig.moveLimit > 0 ? zenConfig.moveLimit : 40);
  const { t } = useTranslation();

  const accent = cfg.accent;
  const sectionLabel: CSSProperties = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, margin: '14px 0 6px' };
  const onOffLabel = (v: string) => t(v === 'On' ? 'zen.on' : 'zen.off');

  const start = () => {
    const ts = timerOn ? timerSeconds : 0;
    const m = moveOn ? moveLimit : 0;
    setZenConfig({ grid, difficulty, timerSeconds: ts, moveLimit: m });
    navigate(`/game?mode=zen&grid=${grid}&difficulty=${difficulty}&timer=${ts}&moves=${m}`);
  };

  return (
    <div style={{ margin: '12px 20px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.border}`, borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>{t('zen.configure')}</div>

      <div style={sectionLabel}>{t('zen.grid_size')}</div>
      <Segmented options={[6, 7, 8, 9] as ZenConfig['grid'][]} value={grid} onChange={setGrid} accent={accent} labelOf={(v) => `${v}×${v}`} />

      <div style={sectionLabel}>{t('zen.difficulty')}</div>
      <Segmented
        options={['easy', 'medium', 'hard', 'hardest'] as Difficulty[]}
        value={difficulty} onChange={setDifficulty} accent={accent} labelOf={(v) => t(`zen.${v}`)}
      />

      <div style={sectionLabel}>{t('zen.timer')}</div>
      <Segmented options={['Off', 'On']} value={timerOn ? 'On' : 'Off'} onChange={(v) => setTimerOn(v === 'On')} accent={accent} labelOf={onOffLabel} />
      {timerOn && (
        <div style={{ marginTop: 6 }}>
          <Segmented options={[60, 90, 120]} value={timerSeconds} onChange={setTimerSeconds} accent={accent} labelOf={(v) => `${v}s`} />
        </div>
      )}

      <div style={sectionLabel}>{t('zen.move_limit')}</div>
      <Segmented options={['Off', 'On']} value={moveOn ? 'On' : 'Off'} onChange={(v) => setMoveOn(v === 'On')} accent={accent} labelOf={onOffLabel} />
      {moveOn && (
        <div style={{ marginTop: 6 }}>
          <Segmented options={[30, 40, 50]} value={moveLimit} onChange={setMoveLimit} accent={accent} labelOf={(v) => `${v} moves`} />
        </div>
      )}

      <button
        onPointerDown={start}
        style={{
          width: '100%', marginTop: 18, background: cfg.ctaBg, color: skin.bgDeep, border: 'none',
          borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
        }}
      >
        {t('zen.start')}
      </button>
    </div>
  );
}
