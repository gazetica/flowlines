// BottomNav.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 14 | Task FL-S3-014
//
// Shared bottom navigation. Active tab derived from the current route. Takes no
// required props (legacy Numtap callers use <BottomNav />).

import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';

const TABS: Array<{ key: string; icon: string; labelKey: string; route: string }> = [
  { key: 'home', icon: '🏠', labelKey: 'nav.home', route: '/home' },
  { key: 'packs', icon: '🎁', labelKey: 'nav.packs', route: '/packs' },
  { key: 'leaderboard', icon: '🏆', labelKey: 'nav.leaderboard', route: '/leaderboard' },
  { key: 'settings', icon: '⚙️', labelKey: 'nav.settings', route: '/settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        height: 56,
        background: 'rgba(13,6,32,0.95)',
        borderTop: '1px solid rgba(46,26,112,1)',
      }}
    >
      {TABS.map((tab) => {
        const active = location.pathname === tab.route;
        const colour = active ? skin.gold : skin.muted;
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.route)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colour,
            }}
          >
            <span style={{ fontSize: 18, opacity: active ? 1 : 0.7 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, fontFamily: skin.fontBody, color: colour }}>{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BottomNav;
