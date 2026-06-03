// HowToPlayScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 4 | Task T-012a | VD-11
//
// 3-page onboarding carousel. Page 1: tap-in-order + interactive demo grid.
// Page 2: timer mechanics. Page 3: game modes overview.
// NOTE: per the brief, the numbered step paragraphs use literal English text
// (the how_to_play.stepN i18n keys carry {{tag}} markup that needs a <Trans>
// renderer — deferred). The chrome (badge/title/labels/buttons) is translated.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { ParticleCanvas } from './ParticleCanvas';

const PAGES = 3;

export function HowToPlayScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setOnboardingShown } = useSettingsStore();
  const [page, setPage] = useState(0);
  // Demo grid state — 3x3, numbers 1-9, tracks taps in order
  const [demoTapped, setDemoTapped] = useState<number[]>([]);
  const DEMO_NUMS = [3, 1, 7, 5, 9, 2, 8, 4, 6]; // shuffled display order

  const handleFinish = async () => {
    await setOnboardingShown();
    navigate('/home', { replace: true });
  };

  const handleSkip = async () => {
    await setOnboardingShown();
    navigate('/home', { replace: true });
  };

  const handleDemoTap = (num: number) => {
    const nextExpected = demoTapped.length + 1;
    if (num === nextExpected) {
      const newTapped = [...demoTapped, num];
      setDemoTapped(newTapped);
      if (newTapped.length === 9) {
        setTimeout(() => setDemoTapped([]), 1000);
      }
    }
    // Wrong tap — no state change (silent, no penalty in tutorial)
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: 'var(--navy)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="bg-dots" />
      <ParticleCanvas />

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '32px 24px 16px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: 2,
            padding: '3px 12px',
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            color: 'var(--gold)',
            marginBottom: 10,
          }}
        >
          {t('how_to_play.badge')}
        </div>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: 'var(--white)', marginBottom: 4 }}>
          {t('how_to_play.title')}
        </h1>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>
          {t('how_to_play.sub')}
        </p>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, padding: '0 20px' }}>
        {page === 0 && (
          <div>
            {['step1', 'step2'].map((key, i) => (
              <div
                key={key}
                style={{
                  background: 'rgba(10,26,46,0.75)',
                  border: '1px solid rgba(30,139,195,0.2)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #FFD700, #C8A800)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--navy)',
                    boxShadow: '0 0 8px rgba(255,215,0,0.35)',
                  }}
                >
                  {i + 1}
                </div>
                <p style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.5 }}>
                  {key === 'step1'
                    ? "A grid of shuffled numbers appears. Tap them in order from 1 upward — the HUD shows what's next."
                    : "The HUD shows NEXT — that's your only clue. Scan the grid and find it yourself. Faster = higher score."}
                </p>
              </div>
            ))}

            {/* Interactive demo grid */}
            <div
              style={{
                background: 'rgba(10,26,46,0.75)',
                border: '1px solid rgba(30,139,195,0.2)',
                borderRadius: 8,
                padding: '12px',
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  color: 'var(--muted)',
                  letterSpacing: 1,
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                {"THE HUD TELLS YOU WHAT'S NEXT"}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 6,
                  width: 160,
                  margin: '0 auto 8px',
                }}
              >
                {DEMO_NUMS.map((num) => {
                  const isTapped = demoTapped.includes(num);
                  // Mirrors the real mechanic: only the most-recently tapped tile
                  // is gold (LAST_TAPPED, ✓ — no number). Earlier taps are green ✓.
                  // The next target has NO highlight — find it yourself.
                  const isLast = isTapped && num === demoTapped[demoTapped.length - 1];
                  return (
                    <button
                      key={num}
                      onClick={() => handleDemoTap(num)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 6,
                        background: isLast
                          ? 'linear-gradient(145deg,#FFD700,#C8A800)'
                          : isTapped
                            ? 'linear-gradient(145deg,#0d2a1a,#091f12)'
                            : 'linear-gradient(145deg,#0F2A48,#0A1E38)',
                        border: `1px solid ${isLast ? '#FFD700' : isTapped ? 'rgba(46,204,113,0.5)' : 'rgba(30,139,195,0.3)'}`,
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 13,
                        color: isLast ? '#07111F' : isTapped ? '#2ECC71' : '#EEF4FF',
                        fontWeight: isLast ? 700 : 400,
                        cursor: 'pointer',
                        boxShadow: isLast ? '0 0 10px rgba(255,215,0,0.4)' : 'none',
                      }}
                    >
                      {isTapped ? '✓' : num}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>
                Gold ✓ = last tapped · Green ✓ = done · Find the next one!
              </p>
            </div>
          </div>
        )}

        {page === 1 && (
          <div>
            {['step3', 'step4'].map((key, i) => (
              <div
                key={key}
                style={{
                  background: 'rgba(10,26,46,0.75)',
                  border: '1px solid rgba(30,139,195,0.2)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg,#FFD700,#C8A800)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--navy)',
                    boxShadow: '0 0 8px rgba(255,215,0,0.35)',
                  }}
                >
                  {i + 3}
                </div>
                <p style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.5 }}>
                  {key === 'step3'
                    ? 'Wrong tap? −100 points. Accuracy matters. Grids grow from 3×3 up to 7×7 — harder to scan every time.'
                    : 'Stuck? Tap HINT — watch a short ad and the target lights up gold for 5 seconds.'}
                </p>
              </div>
            ))}
            {/* Timer visual example */}
            <div
              style={{
                background: 'rgba(10,26,46,0.75)',
                border: '1px solid rgba(30,139,195,0.2)',
                borderRadius: 8,
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>
                  TIMER
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, color: 'var(--white)' }}>24</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Normal</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>
                  TIMER
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 28,
                    color: 'var(--danger)',
                    textShadow: '0 0 10px rgba(224,80,80,0.5)',
                  }}
                >
                  08
                </div>
                <div style={{ fontSize: 10, color: 'var(--danger)' }}>Danger!</div>
              </div>
            </div>
          </div>
        )}

        {page === 2 && (
          <div>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: 1,
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              {t('home.modes_label')}
            </p>
            {[
              { name: 'CAMPAIGN', desc: '100 levels · 3×3 to 7×7 · 3-star rating', icon: '🎯' },
              { name: 'DAILY', desc: '1 puzzle per day · Global leaderboard', icon: '📅' },
              { name: 'ENDLESS', desc: 'How many rounds in 3 minutes?', icon: '♾️' },
              { name: 'SPEED', desc: '4×4 · Halved timer · 2× score', icon: '⚡' },
            ].map((mode) => (
              <div
                key={mode.name}
                style={{
                  background: 'rgba(10,26,46,0.75)',
                  border: '1px solid rgba(30,139,195,0.2)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 22 }}>{mode.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--gold)' }}>{mode.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{mode.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0', position: 'relative', zIndex: 1 }}>
        {Array.from({ length: PAGES }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: i === page ? 'var(--gold)' : 'var(--navy-border)',
              boxShadow: i === page ? '0 0 6px rgba(255,215,0,0.5)' : 'none',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {/* CTAs */}
      <div style={{ padding: '8px 20px 40px', position: 'relative', zIndex: 1 }}>
        {page < PAGES - 1 ? (
          <button
            className="btn-gold"
            onClick={() => setPage((p) => p + 1)}
            style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2 }}
          >
            NEXT →
          </button>
        ) : (
          <button
            className="btn-gold"
            onClick={handleFinish}
            style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2 }}
          >
            {t('how_to_play.btn_play')}
          </button>
        )}
        <button
          className="btn-outline"
          onClick={handleSkip}
          style={{ width: '100%', padding: '10px', fontSize: 10, marginTop: 10 }}
        >
          {t('how_to_play.btn_skip')}
        </button>
      </div>
    </div>
  );
}
