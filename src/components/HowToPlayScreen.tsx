// HowToPlayScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-002
//
// 3-page paginated tutorial (eyebrow pill → title → content → dot pagination →
// fixed NEXT button), FL purple theme. Page 1 has a PURE-REACT 6×6 teaching grid
// (NOT Phaser — GameScene is permanently locked; this is a visual aid only).
// FL-UX-D-020: this screen is the END of onboarding — LET'S PLAY! and Skip both
// call completeFirstLaunch() (persisted) so quitting mid-tutorial resumes onboarding.

import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { FloatingPathCanvas } from './FloatingPathCanvas';

const GOLD = '#FFD700';
const DARK = '#0D0620'; // FL bg-deep (button text on gold)

const GRID_SIZE = 6;

const DOTS: Record<string, [[number, number], [number, number]]> = {
  red: [[0, 0], [5, 0]],
  blue: [[0, 4], [3, 5]],
  green: [[1, 2], [4, 3]],
  orange: [[2, 1], [5, 4]],
  purple: [[0, 2], [4, 0]],
};

const COLOURS: Record<string, string> = {
  red: '#E74C3C',
  blue: '#3498DB',
  green: '#2ECC71',
  orange: '#E67E22',
  purple: '#9B59B6',
};

// FL-UX-D-014: colour → in-dot letter, matching the live GameScene dot letters.
const COLOUR_LETTER: Record<string, string> = {
  red: 'R', blue: 'B', green: 'G', yellow: 'Y',
  violet: 'V', purple: 'V', orange: 'O', teal: 'T', pink: 'P',
};

// FL-UX-D-014 Fix 4 (revised): the ACTUAL solved board for Pack 1 · Level 01 (p1_001),
// transcribed from real gameplay. Each entry is the ORDERED cell path [row,col] from
// one dot to its partner — drawn as a rounded line so it shows HOW to draw the path.
// Real dots: purple (0,0)-(2,0), blue (0,5)-(2,5), green (3,2)-(3,5), yellow (0,3)-(5,1),
// red (4,1)-(3,3). Verified full cover: 36/36 cells, each path contiguous end-to-end.
const SOLVED_PATHS: Array<{ colour: string; cells: Array<[number, number]> }> = [
  { colour: 'purple', cells: [[0, 0], [1, 0], [2, 0]] },
  { colour: 'blue', cells: [[0, 5], [1, 5], [2, 5]] },
  { colour: 'yellow', cells: [[0, 3], [0, 4], [1, 4], [1, 3], [1, 2], [0, 2], [0, 1], [1, 1], [2, 1], [3, 1], [3, 0], [4, 0], [5, 0], [5, 1]] },
  { colour: 'green', cells: [[3, 2], [2, 2], [2, 3], [2, 4], [3, 4], [3, 5]] },
  { colour: 'red', cells: [[4, 1], [4, 2], [5, 2], [5, 3], [5, 4], [5, 5], [4, 5], [4, 4], [4, 3], [3, 3]] },
];

// Cell → colour tint map, derived from the paths (single source of truth).
const SOLVED_CELL: Record<string, string> = {};
for (const p of SOLVED_PATHS) for (const [r, c] of p.cells) SOLVED_CELL[`${r},${c}`] = p.colour;

/** Which colour (if any) has a dot at [row,col]. */
function dotColourAt(row: number, col: number): string | null {
  for (const [colour, [[r1, c1], [r2, c2]]] of Object.entries(DOTS)) {
    if ((row === r1 && col === c1) || (row === r2 && col === c2)) return colour;
  }
  return null;
}

function isAdjacent([r1, c1]: [number, number], [r2, c2]: [number, number]): boolean {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

type Cell = [number, number];
type PathMap = Record<string, Cell[]>;

// ─── Interactive 6×6 teaching grid (pure React) ──────────────────────────────
// Capacitor Android WebView drops elementFromPoint / sibling pointerEnter during
// an active pointer capture. The reliable pattern is: cells are visual-only
// (pointerEvents:none) and a single invisible overlay handles every pointer
// event, mapping clientX/Y → cell via getBoundingClientRect.

function InteractiveGrid() {
  const [paths, setPaths] = useState<PathMap>({ red: [[0, 0], [1, 0]] }); // red pre-drawn
  const dragging = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  function cellFromPoint(clientX: number, clientY: number): Cell | null {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / (rect.width / GRID_SIZE));
    const row = Math.floor((clientY - rect.top) / (rect.height / GRID_SIZE));
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return [row, col];
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    const colour = dotColourAt(cell[0], cell[1]);
    if (!colour) return; // must start on a dot
    dragging.current = colour;
    setPaths((prev) => ({ ...prev, [colour]: [cell] })); // start fresh from this dot
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const colour = dragging.current;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    const [row, col] = cell;

    setPaths((prev) => {
      const path = prev[colour] ?? [];
      if (path.length === 0) return prev;
      const last = path[path.length - 1];
      if (last[0] === row && last[1] === col) return prev;      // same cell
      if (!isAdjacent(last, [row, col])) return prev;            // not adjacent

      // Retract onto an earlier cell of our own path.
      const ownIdx = path.findIndex(([r, c]) => r === row && c === col);
      if (ownIdx !== -1 && ownIdx < path.length - 1) {
        return { ...prev, [colour]: path.slice(0, ownIdx + 1) };
      }

      // Drawing over another colour erases it from that cell onward.
      const next: PathMap = { ...prev };
      for (const other of Object.keys(next)) {
        if (other === colour) continue;
        const idx = next[other].findIndex(([r, c]) => r === row && c === col);
        if (idx !== -1) next[other] = next[other].slice(0, idx);
      }
      next[colour] = [...path, [row, col]];
      return next;
    });
  }

  function handlePointerUp() {
    dragging.current = null;
  }

  // "row,col" → colour for the filled cells.
  const filled: Record<string, string> = {};
  for (const [colour, path] of Object.entries(paths)) {
    for (const [r, c] of path) filled[`${r},${c}`] = colour;
  }

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1', margin: '0 auto' }}>
      {/* Visual cells — no pointer events */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: 3, width: '100%', height: '100%', pointerEvents: 'none',
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          const fill = filled[`${row},${col}`];
          const dot = dotColourAt(row, col);
          return (
            <div
              key={i}
              style={{
                backgroundColor: fill ? `${COLOURS[fill]}4D` : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(127,119,221,0.15)',
                borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {dot && (
                <div
                  style={{
                    width: '60%', height: '60%', borderRadius: '50%', backgroundColor: COLOURS[dot], flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: skin.fontDisplay, fontWeight: 400, color: 'rgba(255,255,255,0.9)',
                    fontSize: 'clamp(11px, 4.2vw, 20px)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
                  }}
                >
                  {COLOUR_LETTER[dot]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invisible overlay — handles every pointer event */}
      <div
        style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

// ─── Shared building blocks ──────────────────────────────────────────────────

function InstructionCard({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(127,119,221,0.2)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)',
          color: GOLD, fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

const titleStyle: CSSProperties = { fontSize: 28, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: 4 };
const subtitleStyle: CSSProperties = { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20 };

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div style={titleStyle}>{title}</div>
      <div style={subtitleStyle}>{subtitle}</div>
    </>
  );
}

// ─── FL-UX-D-014: static solved-board illustration + in-game help cards ───────

function SolvedGrid() {
  const { t } = useTranslation();
  const hexOf = (colour: string) => skin.pathColors[colour as keyof typeof skin.pathColors] ?? COLOURS[colour];
  const cx = (c: number) => c + 0.5;
  const cy = (r: number) => r + 0.5;

  return (
    <div style={{ margin: '4px 0 2px' }}>
      <div style={{ position: 'relative', width: 264, maxWidth: '100%', aspectRatio: '1', margin: '0 auto', padding: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(127,119,221,0.25)', borderRadius: 12, boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Faint colour-tinted cells (transparent fill — the line is the focus) */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 1fr)' }}>
            {Array.from({ length: 36 }, (_, i) => {
              const colour = SOLVED_CELL[`${Math.floor(i / 6)},${i % 6}`];
              return (
                <div
                  key={i}
                  style={{
                    border: '1px solid rgba(13,6,32,0.55)', borderRadius: 4, boxSizing: 'border-box',
                    backgroundColor: colour ? `${hexOf(colour)}26` : 'rgba(255,255,255,0.04)',
                  }}
                />
              );
            })}
          </div>

          {/* Prominent rounded path lines + endpoint dots (SVG over the cells) */}
          <svg viewBox="0 0 6 6" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {SOLVED_PATHS.map((p) => (
              <polyline
                key={`line-${p.colour}`}
                points={p.cells.map(([r, c]) => `${cx(c)},${cy(r)}`).join(' ')}
                fill="none" stroke={hexOf(p.colour)} strokeWidth={0.42}
                strokeLinecap="round" strokeLinejoin="round"
              />
            ))}
            {SOLVED_PATHS.flatMap((p) => [p.cells[0], p.cells[p.cells.length - 1]].map(([r, c], k) => (
              <g key={`dot-${p.colour}-${k}`}>
                <circle cx={cx(c)} cy={cy(r)} r={0.34} fill={hexOf(p.colour)} stroke="rgba(255,255,255,0.95)" strokeWidth={0.06} />
                <text x={cx(c)} y={cy(r)} fontSize={0.42} fill="#fff" fontFamily="'Space Mono', monospace" textAnchor="middle" dominantBaseline="central">
                  {COLOUR_LETTER[p.colour]}
                </text>
              </g>
            )))}
          </svg>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
        {t('howtoplay.page2_caption')}
      </div>
    </div>
  );
}

function HelpCard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(127,119,221,0.2)',
        borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

const helpHeading: CSSProperties = { fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: 1, margin: '20px 0 4px' };

// ─── Pages ───────────────────────────────────────────────────────────────────

function Page1() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeading title={t('howtoplay.page1_title')} subtitle={t('howtoplay.page1_sub')} />
      <div style={{ marginBottom: 20 }}>
        <InteractiveGrid />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <InstructionCard n={1}>{t('howtoplay.page1_rule1')}</InstructionCard>
        <InstructionCard n={2}>{t('howtoplay.page1_rule2')}</InstructionCard>
      </div>
    </>
  );
}

function Page2() {
  const { t } = useTranslation();
  const ruleKeys = ['page2_rule1', 'page2_rule2', 'page2_rule3', 'page2_rule4', 'page2_rule5'];
  return (
    <>
      <PageHeading title={t('howtoplay.page2_title')} subtitle={t('howtoplay.page2_sub')} />

      {/* FL-UX-D-014 (revised): the solved board comes FIRST, then the explanation */}
      <SolvedGrid />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {ruleKeys.map((k, i) => <InstructionCard key={k} n={i + 1}>{t(`howtoplay.${k}`)}</InstructionCard>)}
      </div>

      {/* FL-UX-D-014 Fix 3: rescue mechanics */}
      <div style={helpHeading}>{t('howtoplay.page2_help_title')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <HelpCard icon="💡" title={t('howtoplay.page2_hint_title')} sub={t('howtoplay.page2_hint_desc')} />
        <HelpCard icon="🎯" title={t('howtoplay.page2_clue_title')} sub={t('howtoplay.page2_clue_desc')} />
        <HelpCard icon="⏱" title={t('howtoplay.page2_timeext_title')} sub={t('howtoplay.page2_timeext_desc')} />
        <HelpCard icon="➕" title={t('howtoplay.page2_moveext_title')} sub={t('howtoplay.page2_moveext_desc')} />
      </div>
    </>
  );
}

function Page3() {
  const { t } = useTranslation();
  const modes = [
    { icon: '⏱', name: t('howtoplay.page3_campaign_title'), desc: t('howtoplay.page3_campaign_desc') },
    { icon: '🎯', name: t('howtoplay.page3_classic_title'), desc: t('howtoplay.page3_classic_desc') },
    { icon: '📅', name: t('howtoplay.page3_daily_title'), desc: t('howtoplay.page3_daily_desc') },
    { icon: '🧘', name: t('howtoplay.page3_zen_title'), desc: t('howtoplay.page3_zen_desc') },
  ];
  return (
    <>
      <PageHeading title={t('howtoplay.page3_title')} subtitle={t('howtoplay.page3_sub')} />
      <div>
        {modes.map((m) => (
          <div
            key={m.name}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(127,119,221,0.2)',
              borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(127,119,221,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {m.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: GOLD, marginBottom: 3 }}>{m.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function HowToPlayScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const completeFirstLaunch = useFlowSettingsStore((s) => s.completeFirstLaunch);
  const [page, setPage] = useState(0); // 0,1,2

  // FL-UX-D-020: finishing the tutorial (LET'S PLAY! on page 3 or Skip on any page)
  // marks onboarding complete (persisted) and lands on Home.
  const finishOnboarding = () => { completeFirstLaunch(); navigate('/home'); };
  const goNext = () => { if (page < 2) setPage((p) => p + 1); else finishOnboarding(); };
  const goBack = () => { if (page > 0) setPage((p) => p - 1); else navigate(-1); };
  const skip = finishOnboarding;

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden',
        background: '#0D0620',
        display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody,
      }}
    >
      <FloatingPathCanvas />
      <style>{`@keyframes htpFade { from { opacity: 0 } to { opacity: 1 } }`}</style>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
        <div
          onPointerDown={goBack}
          style={{
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: GOLD, fontSize: 24, fontWeight: 700,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ‹
        </div>
        <span style={{ border: '1px solid rgba(255,215,0,0.5)', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, background: 'rgba(255,215,0,0.08)' }}>
          {t('howtoplay.title')}
        </span>
        {page < 2 ? (
          <button onClick={skip} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', width: 40, textAlign: 'right' }}>{t('howtoplay.skip')}</button>
        ) : (
          <span style={{ width: 40 }} />
        )}
      </div>

      {/* Scrollable body (fades on page change) */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '12px 20px 8px' }}>
        <div key={page} style={{ maxWidth: 480, margin: '0 auto', animation: 'htpFade 200ms ease-in' }}>
          {page === 0 && <Page1 />}
          {page === 1 && <Page2 />}
          {page === 2 && <Page3 />}
        </div>
      </div>

      {/* Pagination dots */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0 12px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: i === page ? 20 : 8, height: 8, borderRadius: i === page ? 4 : '50%',
              background: i === page ? GOLD : 'rgba(255,255,255,0.2)',
              transition: 'width 200ms ease',
            }}
          />
        ))}
      </div>

      {/* Bottom buttons */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={goNext}
          style={{ background: GOLD, color: DARK, border: 'none', borderRadius: 12, padding: 17, fontSize: 16, fontWeight: 700, letterSpacing: 1.5, width: '100%', cursor: 'pointer', fontFamily: skin.fontDisplay }}
        >
          {page === 2 ? t('howtoplay.lets_play') : t('howtoplay.next_btn')}
        </button>
        {page < 2 && (
          <button
            onClick={skip}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, fontSize: 14, color: 'rgba(255,255,255,0.4)', width: '100%', cursor: 'pointer' }}
          >
            {t('common.skip_tutorial')}
          </button>
        )}
      </div>
    </div>
  );
}

export default HowToPlayScreen;
