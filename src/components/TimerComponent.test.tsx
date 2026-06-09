// TimerComponent.test.tsx
// Numtap | Gazetica Studio | Sprint 2 Day 2 | Task T-004
//
// Vitest + React Testing Library tests for TimerComponent. Tests timer LOGIC
// (countdown, callbacks, pause/resume, cleanup, reset) and the colour/danger
// state — not visual appearance. Time is controlled with fake timers.

import { render, screen, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimerComponent } from './TimerComponent';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Advance N whole seconds, one tick at a time, each inside its own act() so
// React flushes the setRemaining updater (and its clearInterval-at-zero logic)
// between ticks — exactly as real 1s intervals behave. Advancing all N seconds
// in a single call would fire every interval callback before React flushes any
// updater, which is a fake-timer batching artifact, not real runtime behaviour.
function advanceSeconds(seconds: number): void {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe('TimerComponent', () => {
  // ---------------------------------------------------------------------
  // Group 1: Rendering
  // ---------------------------------------------------------------------
  describe('rendering', () => {
    it('renders the initial duration as a number', () => {
      render(
        <TimerComponent durationSeconds={30} onTick={vi.fn()} onExpire={vi.fn()} paused={true} />
      );
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('does not render decimals (30, not 30.0)', () => {
      render(
        <TimerComponent durationSeconds={30} onTick={vi.fn()} onExpire={vi.fn()} paused={true} />
      );
      expect(screen.getByText('30').textContent).toBe('30');
      expect(screen.queryByText('30.0')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // Group 2: Countdown behaviour
  // ---------------------------------------------------------------------
  describe('countdown', () => {
    it('decrements by 1 each second when not paused', () => {
      render(
        <TimerComponent durationSeconds={30} onTick={vi.fn()} onExpire={vi.fn()} paused={false} />
      );
      advanceSeconds(1);
      expect(screen.getByText('29')).toBeInTheDocument();
      advanceSeconds(1);
      expect(screen.getByText('28')).toBeInTheDocument();
    });

    it('calls onTick with the correct remaining value each second', () => {
      const onTick = vi.fn();
      render(
        <TimerComponent durationSeconds={30} onTick={onTick} onExpire={vi.fn()} paused={false} />
      );
      advanceSeconds(3);
      expect(onTick.mock.calls).toEqual([[29], [28], [27]]);
    });

    it('does NOT call onTick with 0 — onExpire fires instead', () => {
      const onTick = vi.fn();
      const onExpire = vi.fn();
      render(
        <TimerComponent durationSeconds={2} onTick={onTick} onExpire={onExpire} paused={false} />
      );
      advanceSeconds(2); // ticks: 1, then boundary -> expire
      expect(onTick).toHaveBeenCalledTimes(1);
      expect(onTick).toHaveBeenCalledWith(1);
      expect(onTick).not.toHaveBeenCalledWith(0);
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('calls onExpire exactly once when reaching 0', () => {
      const onExpire = vi.fn();
      render(
        <TimerComponent durationSeconds={3} onTick={vi.fn()} onExpire={onExpire} paused={false} />
      );
      advanceSeconds(3);
      expect(onExpire).toHaveBeenCalledTimes(1);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('does NOT go below 0 (stays at 0, onExpire not re-fired)', () => {
      const onExpire = vi.fn();
      render(
        <TimerComponent durationSeconds={2} onTick={vi.fn()} onExpire={onExpire} paused={false} />
      );
      advanceSeconds(10); // way past expiry
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(onExpire).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------
  // Group 3: Pause behaviour
  // ---------------------------------------------------------------------
  describe('pause', () => {
    it('freezes the countdown when paused=true', () => {
      const onTick = vi.fn();
      render(
        <TimerComponent durationSeconds={30} onTick={onTick} onExpire={vi.fn()} paused={true} />
      );
      advanceSeconds(5);
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(onTick).not.toHaveBeenCalled();
    });

    it('resumes from the frozen value when paused goes false->true->false', () => {
      const onTick = vi.fn();
      const props = {
        durationSeconds: 30,
        onTick,
        onExpire: vi.fn(),
      };
      const { rerender } = render(<TimerComponent {...props} paused={false} />);
      advanceSeconds(3); // 30 -> 27
      expect(screen.getByText('27')).toBeInTheDocument();

      rerender(<TimerComponent {...props} paused={true} />);
      advanceSeconds(5); // frozen at 27
      expect(screen.getByText('27')).toBeInTheDocument();

      rerender(<TimerComponent {...props} paused={false} />);
      advanceSeconds(1); // resumes 27 -> 26
      expect(screen.getByText('26')).toBeInTheDocument();
    });

    it('does NOT call onTick while paused', () => {
      const onTick = vi.fn();
      render(
        <TimerComponent durationSeconds={20} onTick={onTick} onExpire={vi.fn()} paused={true} />
      );
      advanceSeconds(10);
      expect(onTick).not.toHaveBeenCalled();
    });

    // F-008 FIX 1: the live getPaused gate must freeze the clock even when the `paused`
    // prop is false and the interval is still running — the case where a rewarded ad
    // held the WebView in the background and the pause-commit that would clear the
    // interval never ran. No decrement, no onTick, no onExpire while it returns true.
    it('getPaused()=true freezes the countdown even with paused prop false', () => {
      const onTick = vi.fn();
      const onExpire = vi.fn();
      render(
        <TimerComponent
          durationSeconds={5}
          onTick={onTick}
          onExpire={onExpire}
          paused={false}
          getPaused={() => true}
        />
      );
      advanceSeconds(10); // interval fires, but every tick is gated off
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(onTick).not.toHaveBeenCalled();
      expect(onExpire).not.toHaveBeenCalled();
    });

    it('resumes ticking when getPaused() flips back to false', () => {
      const onTick = vi.fn();
      let frozen = true;
      const { rerender } = render(
        <TimerComponent
          durationSeconds={30}
          onTick={onTick}
          onExpire={vi.fn()}
          paused={false}
          getPaused={() => frozen}
        />
      );
      advanceSeconds(5); // gated — stays at 30
      expect(screen.getByText('30')).toBeInTheDocument();
      frozen = false;
      rerender(
        <TimerComponent
          durationSeconds={30}
          onTick={onTick}
          onExpire={vi.fn()}
          paused={false}
          getPaused={() => frozen}
        />
      );
      advanceSeconds(2); // now ticks: 30 -> 28
      expect(screen.getByText('28')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------
  // Group 4: Colour / danger state
  // ---------------------------------------------------------------------
  describe('colour / danger state', () => {
    it('remaining > 10: text colour is #EEF4FF', () => {
      render(
        <TimerComponent durationSeconds={30} onTick={vi.fn()} onExpire={vi.fn()} paused={true} />
      );
      expect(screen.getByText('30')).toHaveStyle({ color: '#EEF4FF' });
    });

    it('remaining <= 10: text colour is #E05050', () => {
      render(
        <TimerComponent durationSeconds={10} onTick={vi.fn()} onExpire={vi.fn()} paused={true} />
      );
      expect(screen.getByText('10')).toHaveStyle({ color: '#E05050' });
    });

    it('transitions to danger colour as it crosses 10', () => {
      render(
        <TimerComponent durationSeconds={12} onTick={vi.fn()} onExpire={vi.fn()} paused={false} />
      );
      advanceSeconds(1); // 11 -> still white
      expect(screen.getByText('11')).toHaveStyle({ color: '#EEF4FF' });
      advanceSeconds(1); // 10 -> danger
      expect(screen.getByText('10')).toHaveStyle({ color: '#E05050' });
    });
  });

  // ---------------------------------------------------------------------
  // Group 5: Cleanup
  // ---------------------------------------------------------------------
  describe('cleanup', () => {
    it('clears the interval on unmount (no calls after unmount)', () => {
      const onTick = vi.fn();
      const onExpire = vi.fn();
      const { unmount } = render(
        <TimerComponent durationSeconds={30} onTick={onTick} onExpire={onExpire} paused={false} />
      );
      advanceSeconds(2); // 30 -> 28, two ticks
      expect(onTick).toHaveBeenCalledTimes(2);

      unmount();
      onTick.mockClear();
      advanceSeconds(10); // no interval should be running anymore
      expect(onTick).not.toHaveBeenCalled();
      expect(onExpire).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------
  // Group 6: durationSeconds change
  // ---------------------------------------------------------------------
  describe('durationSeconds change', () => {
    it('resets remaining to the new value when durationSeconds prop changes', () => {
      const props = { onTick: vi.fn(), onExpire: vi.fn(), paused: false };
      const { rerender } = render(<TimerComponent durationSeconds={30} {...props} />);
      advanceSeconds(3); // 30 -> 27
      expect(screen.getByText('27')).toBeInTheDocument();

      rerender(<TimerComponent durationSeconds={50} {...props} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });
});
