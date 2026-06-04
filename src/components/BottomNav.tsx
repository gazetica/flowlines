// BottomNav.tsx
// Numtap | Gazetica Studio | Sprint 4 | Task T-004A | Fix 6
//
// Standard 4-icon footer (Home / Board / Settings / About), extracted from the
// HomeScreen inline nav so every non-onboarding/non-game screen shares one bar.
// `active` highlights the current destination in gold; pass nothing on screens
// that aren't a nav destination (Campaign, IAP, Result).

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type NavKey = 'home' | 'leaderboard' | 'settings' | 'about';

const ITEMS: { key: NavKey; icon: string; route: string }[] = [
  { key: 'home', icon: '🏠', route: '/home' },
  { key: 'leaderboard', icon: '🏆', route: '/leaderboard' },
  { key: 'settings', icon: '⚙️', route: '/settings' },
  { key: 'about', icon: 'ℹ️', route: '/about' },
];

export function BottomNav({ active }: { active?: NavKey }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div
      className="glass"
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 8px 24px',
        borderTop: '1px solid rgba(30,139,195,0.15)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.route)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 8px' }}
          >
            <div style={{ fontSize: 18, marginBottom: 2, filter: isActive ? 'drop-shadow(0 0 4px rgba(255,215,0,0.6))' : 'none' }}>
              {item.icon}
            </div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                color: isActive ? 'var(--gold)' : 'var(--muted)',
                letterSpacing: 0.5,
              }}
            >
              {t(`nav.${item.key}`)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
