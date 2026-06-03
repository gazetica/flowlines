// skin.ts
// Numtap | Gazetica Studio | Sprint 4 (Pre) | Task T-003 | VDD v1.2
//
// Single source of truth for VDD v1.2 skin constants (React/DOM side).
// New code should import from here rather than hardcoding hex values.
//
// NOTE: index.css :root already defines the canonical CSS custom properties
// (--navy, --gold, --success, --muted, etc.) used by the existing screens since
// T-008. SKIN mirrors those values for TypeScript consumers (ParticleCanvas,
// inline-style props, new surfaces). Phaser tile rendering in GameScene.ts uses
// numeric hex (0xRRGGBB) via fillGradientStyle — CSS gradient strings can't be
// passed to Phaser — so the GameScene keeps its own matching numeric constants
// (the colours are identical to those below). See docs/design-system.md.

export const SKIN = {
  // Backgrounds
  pageBg: '#07111F',
  dotPattern: 'radial-gradient(circle, rgba(30,139,195,0.12) 1px, transparent 1px)',
  dotSize: '18px 18px',
  ambientGlow:
    'radial-gradient(ellipse, rgba(255,215,0,0.07) 0%, rgba(30,139,195,0.05) 40%, transparent 70%)',

  // Tile states (CSS-side; Phaser mirrors these numerically in GameScene)
  tileDefault: 'linear-gradient(145deg, #0F2A48 0%, #0A1E38 100%)',
  tileBorderDefault: 'rgba(30,139,195,0.35)',
  tileLastTapped: 'linear-gradient(145deg, #FFD700 0%, #C8A800 100%)',
  tileBorderGold: '#FFD700',
  tileGoldGlow:
    '0 0 14px rgba(255,215,0,0.45), 0 0 28px rgba(255,215,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
  tileTapped: 'linear-gradient(145deg, #0d2a1a 0%, #091f12 100%)',
  tileBorderGreen: 'rgba(46,204,113,0.5)',
  tileGreenGlow: '0 0 8px rgba(46,204,113,0.15)',

  // Grid container
  gridBg: 'rgba(10,26,46,0.4)',
  gridBorder: 'rgba(30,139,195,0.25)',
  gridShadow: '0 0 20px rgba(30,139,195,0.08), 0 4px 24px rgba(0,0,0,0.5)',

  // HUD
  hudBg: 'rgba(10,26,46,0.9)',
  hudBorder: 'rgba(30,139,195,0.3)',

  // Nav bar
  navBg: 'rgba(8,18,32,0.95)',
  navBorder: 'rgba(30,139,195,0.2)',
  navActive: '#FFD700',
  navInactive: '#5E7A9C',

  // Button
  btnGold: 'linear-gradient(135deg, #FFD700 0%, #C8A800 50%, #FFD700 100%)',
  btnGoldShadow:
    '0 0 16px rgba(255,215,0,0.35), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',

  // Text
  gold: '#FFD700',
  goldGlow: '0 0 10px rgba(255,215,0,0.5)',
  success: '#2ECC71',
  muted: '#5E7A9C',
  white: '#E8F0F8',

  // Card surfaces
  cardBg: 'rgba(15,32,64,0.8)',
  cardBorder: 'rgba(26,53,88,0.8)',
} as const;
