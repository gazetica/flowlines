// PageTransition.tsx
// Flow Lines | Gazetica Studio | UX Sprint A | Task FL-UX-A.4 (+ fixes)
//
// Re-triggers an enter animation on the already-rendered route content (no
// remount → no blank flash). /result fades up from below; /game is excluded
// (heavy Phaser canvas must appear instantly); everything else fades in (no
// horizontal slide — FL-UX-D-006e removed slideInRight, which left a lingering
// translateX transform that broke fixed layout + collided with the Android 13
// predictive-back edge gesture). The container itself is animated.

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const isGame = location.pathname.startsWith('/game');
  const isResult = location.pathname.startsWith('/result');

  useEffect(() => {
    const el = ref.current;
    if (!el || isGame) return;
    el.style.animation = 'none';
    void el.offsetHeight; // force reflow so the animation restarts
    el.style.animation = isResult
      ? 'fadeUpIn 280ms ease-out forwards'
      : 'flPageFadeIn 180ms ease-out forwards';
  }, [location.pathname, isGame, isResult]);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

export default PageTransition;
