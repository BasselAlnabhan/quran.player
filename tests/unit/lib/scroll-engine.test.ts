import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScrollEngine } from '@/lib/scroll-engine';
import type { ScrollEngineOptions } from '@/lib/scroll-engine';

// ---------------------------------------------------------------------------
// setInterval faking
//
// The engine uses setInterval(tick, 16) instead of requestAnimationFrame.
// We use vi.useFakeTimers() to control time. vi.advanceTimersByTime(16) fires
// one tick, since the interval is registered with ms=16.
// ---------------------------------------------------------------------------

// FRAME_MS must match the constant in scroll-engine.ts.
const FRAME_MS = 16;

/** Advance the fake clock by exactly n interval ticks. */
function advanceTicks(n: number): void {
  for (let i = 0; i < n; i++) {
    vi.advanceTimersByTime(FRAME_MS);
  }
}

function makeOpts(overrides: Partial<ScrollEngineOptions> = {}): ScrollEngineOptions {
  return {
    getScrollY: vi.fn(() => 0),
    setScrollY: vi.fn(),
    getContentHeight: vi.fn(() => 1000),
    getViewportHeight: vi.fn(() => 500),
    initialSpeed: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Restore visibilityState in case a test changed it.
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Basic start
// ---------------------------------------------------------------------------

describe('createScrollEngine — start', () => {
  it('advances scroll position after one tick', () => {
    const opts = makeOpts({ initialSpeed: 2 });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1);

    expect(opts.setScrollY).toHaveBeenCalledWith(2);
    engine.destroy();
  });

  it('sets isRunning() to true immediately after start()', () => {
    const engine = createScrollEngine(makeOpts());
    engine.start();
    expect(engine.isRunning()).toBe(true);
    engine.destroy();
  });

  it('does not double-schedule when start() is called while already running', () => {
    let scrollY = 0;
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY: (y) => {
        scrollY = y;
      },
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    engine.start(); // second call while running — must be a no-op
    advanceTicks(1); // if double-scheduled, scrollY would jump by 2 not 1

    // A single tick with speed=1 should yield scrollY=1, not 2.
    expect(scrollY).toBe(1);
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// Stop
// ---------------------------------------------------------------------------

describe('createScrollEngine — stop', () => {
  it('halts scroll after stop() is called', () => {
    let scrollY = 0;
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY: (y) => {
        scrollY = y;
      },
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1); // scrollY is now 1

    engine.stop();
    const positionAfterStop = scrollY;
    advanceTicks(3); // loop is dead — should not advance

    expect(scrollY).toBe(positionAfterStop);
    engine.destroy();
  });

  it('sets isRunning() to false after stop()', () => {
    const engine = createScrollEngine(makeOpts());
    engine.start();
    engine.stop();
    expect(engine.isRunning()).toBe(false);
    engine.destroy();
  });

  it('stop() when not running is a no-op (idempotent)', () => {
    const engine = createScrollEngine(makeOpts());
    expect(() => engine.stop()).not.toThrow();
    expect(engine.isRunning()).toBe(false);
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// Speed = 0 while running
// ---------------------------------------------------------------------------

describe('createScrollEngine — speed = 0', () => {
  it('keeps isRunning() true when setSpeed(0) is called mid-scroll', () => {
    let scrollY = 0;
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY: (y) => {
        scrollY = y;
      },
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    engine.setSpeed(0);
    // tick() returns early when speed<=0, so no-change accounting is skipped.
    // Advance well past STUCK_THRESHOLD to confirm the engine does not auto-stop.
    advanceTicks(40);

    expect(engine.isRunning()).toBe(true);
    engine.destroy();
  });

  it('does not advance scroll position when speed is 0', () => {
    let scrollY = 0;
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY: (y) => {
        scrollY = y;
      },
      initialSpeed: 0,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    // tick() returns early at speed=0, so setScrollY is never called.
    advanceTicks(40);

    expect(scrollY).toBe(0);
    engine.destroy();
  });

  it('holds running state indefinitely at speed=0 (no false auto-stop)', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    engine.setSpeed(0);

    // Advance STUCK_THRESHOLD + 10 ticks — engine must remain running.
    advanceTicks(40);

    expect(engine.isRunning()).toBe(true);
    // tick() returns early at speed<=0, so setScrollY is never called at speed=0.
    expect(setScrollY).not.toHaveBeenCalled();
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// Mid-scroll speed change
// ---------------------------------------------------------------------------

describe('createScrollEngine — mid-scroll speed change', () => {
  it('applies the new speed on the very next tick after setSpeed()', () => {
    let scrollY = 0;
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY: (y) => {
        scrollY = y;
      },
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(2); // scrollY = 2

    engine.setSpeed(5);
    advanceTicks(1); // scrollY = 2 + 5 = 7

    expect(scrollY).toBe(7);
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// End of content — no-change detection
//
// The engine uses no-change detection (STUCK_THRESHOLD = 30 ticks) rather
// than computing maxScroll. Tests simulate a clamped setScrollY so the actual
// scroll position stops changing at the ceiling.
// ---------------------------------------------------------------------------

describe('createScrollEngine — end of content', () => {
  it('stops scrolling after STUCK_THRESHOLD consecutive no-change ticks', () => {
    const CEILING = 500;
    let scrollY = 490;
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY: (y) => {
        // Clamp at ceiling to simulate bottom of page.
        scrollY = Math.min(y, CEILING);
      },
      initialSpeed: 10,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    // First tick: 490 + 10 = 500 (at ceiling, scrollY changes to 500).
    advanceTicks(1);
    expect(scrollY).toBe(CEILING);
    expect(engine.isRunning()).toBe(true); // not yet stuck

    // Advance 30 more ticks — each writes 510 but gets clamped to 500 (no change).
    advanceTicks(30);

    expect(engine.isRunning()).toBe(false);
  });

  it('does not call setScrollY again after stopping at end of content', () => {
    const CEILING = 500;
    let scrollY = 490;
    const setScrollY = vi.fn((y: number) => {
      scrollY = Math.min(y, CEILING);
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 10,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1 + 30); // 1 tick to reach ceiling + 30 stuck ticks to stop

    const callsAtStop = setScrollY.mock.calls.length;
    advanceTicks(5); // interval is cleared — no more calls
    expect(setScrollY.mock.calls.length).toBe(callsAtStop);
    engine.destroy();
  });

  it('resets stuckCount on start() so a fresh start after auto-stop works', () => {
    const CEILING = 500;
    let scrollY = 490;
    const setScrollY = vi.fn((y: number) => {
      scrollY = Math.min(y, CEILING);
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 10,
    });
    const engine = createScrollEngine(opts);

    // Run to auto-stop.
    engine.start();
    advanceTicks(1 + 30);
    expect(engine.isRunning()).toBe(false);

    // Manually reset position so there is room to scroll again.
    scrollY = 0;

    // Restart — stuckCount must be 0 so the engine doesn't immediately re-stop.
    engine.start();
    expect(engine.isRunning()).toBe(true);
    advanceTicks(1);
    expect(scrollY).toBe(10); // scrolled forward
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// prefersReducedMotion
// ---------------------------------------------------------------------------

describe('createScrollEngine — prefersReducedMotion', () => {
  it('start() is a no-op when prefersReducedMotion is true', () => {
    const opts = makeOpts({ prefersReducedMotion: true });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(5);

    expect(opts.setScrollY).not.toHaveBeenCalled();
    expect(engine.isRunning()).toBe(false);
    engine.destroy();
  });

  it('setSpeed() does not cause errors when prefersReducedMotion is true', () => {
    const engine = createScrollEngine(makeOpts({ prefersReducedMotion: true }));
    expect(() => engine.setSpeed(10)).not.toThrow();
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// Tab visibility pause / resume
// ---------------------------------------------------------------------------

describe('createScrollEngine — tab visibility', () => {
  it('pauses the scroll loop when the tab becomes hidden', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1); // one tick of scrolling, scrollY = 1

    // Simulate tab going hidden.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    const callsWhileHiddenStart = setScrollY.mock.calls.length;
    advanceTicks(5); // interval is cleared — no new calls
    expect(setScrollY.mock.calls.length).toBe(callsWhileHiddenStart);
    engine.destroy();
  });

  it('sets isRunning() to false while the tab is hidden', () => {
    const engine = createScrollEngine(makeOpts());
    engine.start();

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(engine.isRunning()).toBe(false);
    engine.destroy();
  });

  it('resumes scrolling when the tab becomes visible again', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1); // scrollY = 1

    // Hide the tab.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    advanceTicks(3); // no movement while hidden

    // Restore the tab.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    const callsBeforeResume = setScrollY.mock.calls.length;
    advanceTicks(1); // should tick again
    expect(setScrollY.mock.calls.length).toBeGreaterThan(callsBeforeResume);
    engine.destroy();
  });

  it('does not resume if stop() was called before the tab became visible', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1);

    // Hide then explicitly stop.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    engine.stop(); // explicit stop clears pausedByVisibility

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    const callsAfterVisible = setScrollY.mock.calls.length;
    advanceTicks(3);
    expect(setScrollY.mock.calls.length).toBe(callsAfterVisible);
    engine.destroy();
  });

  it('resets stuckCount when resumed after tab visibility change', () => {
    // Simulate: engine is near the bottom (clamped scroll), tab hides, then
    // the tab becomes visible again. The stuckCount must be cleared on resume
    // so the engine gets a fresh STUCK_THRESHOLD grace period rather than
    // immediately auto-stopping on the first tick.
    const CEILING = 500;
    let scrollY = 499;
    const setScrollY = vi.fn((y: number) => {
      scrollY = Math.min(y, CEILING);
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 10,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    // First tick: 499 + 10 = 509 clamped to 500. scrollY changes — stuckCount stays 0.
    advanceTicks(1);
    expect(scrollY).toBe(CEILING);

    // Advance 10 ticks at ceiling — stuckCount accumulates to 10 (< STUCK_THRESHOLD).
    advanceTicks(10);
    expect(engine.isRunning()).toBe(true);

    // Tab hides — engine pauses.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.isRunning()).toBe(false);

    // Tab becomes visible — engine resumes with stuckCount reset to 0.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.isRunning()).toBe(true);

    // Advance exactly STUCK_THRESHOLD ticks. If stuckCount was NOT reset, the
    // engine would have had 10 + 30 = 40 > 30 ticks and would have stopped.
    // With a proper reset, 30 ticks exactly hits the threshold and stops at the end.
    advanceTicks(30);
    // Engine should only now stop (fresh 30-tick grace period from resume).
    expect(engine.isRunning()).toBe(false);

    engine.destroy();
  });

  it('does not pause on visibilitychange when the engine was not running', () => {
    const engine = createScrollEngine(makeOpts());
    // Never called start().

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    // Engine was never started, so it should not auto-resume.
    expect(engine.isRunning()).toBe(false);
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('createScrollEngine — destroy', () => {
  it('clears the interval and stops scrolling after destroy()', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1);

    engine.destroy();
    const callsAfterDestroy = setScrollY.mock.calls.length;
    advanceTicks(5);

    expect(setScrollY.mock.calls.length).toBe(callsAfterDestroy);
  });

  it('removes the visibilitychange event listener on destroy()', () => {
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');
    const engine = createScrollEngine(makeOpts());

    engine.destroy();

    const calls = removeListenerSpy.mock.calls.filter((c) => c[0] === 'visibilitychange');
    expect(calls.length).toBeGreaterThan(0);
  });

  it('ignores visibility changes after destroy()', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceTicks(1); // one tick to confirm it was running

    engine.destroy();
    // Clear calls recorded before destroy so assertions below are unambiguous.
    setScrollY.mockClear();

    // Simulate tab going hidden after destroy — engine must not respond.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    advanceTicks(3);
    expect(setScrollY).not.toHaveBeenCalled();

    // Simulate tab becoming visible again — engine must still not respond.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    advanceTicks(3);
    expect(setScrollY).not.toHaveBeenCalled();
  });

  it('destroy() is idempotent — calling it twice does not throw', () => {
    const engine = createScrollEngine(makeOpts());
    engine.start();
    expect(() => {
      engine.destroy();
      engine.destroy();
    }).not.toThrow();
  });

  it('start() after destroy() is a safe no-op', () => {
    const opts = makeOpts();
    const engine = createScrollEngine(opts);

    engine.destroy();
    engine.start(); // must not throw or schedule an interval
    advanceTicks(3);

    expect(opts.setScrollY).not.toHaveBeenCalled();
    expect(engine.isRunning()).toBe(false);
  });

  it('stop() after destroy() is a safe no-op', () => {
    const engine = createScrollEngine(makeOpts());
    engine.destroy();
    expect(() => engine.stop()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Very small viewport (edge case from CLAUDE.md)
//
// When content fits in the viewport, getScrollY() always returns 0 and the
// browser refuses to move. The engine stops after STUCK_THRESHOLD ticks.
// ---------------------------------------------------------------------------

describe('createScrollEngine — very small viewport', () => {
  it('stops after STUCK_THRESHOLD ticks when content fits in viewport', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      // Browser refuses to scroll past 0 when content fits in viewport.
      scrollY = Math.max(0, Math.min(y, 0));
    });
    // contentHeight (300) < viewportHeight (500) — no scrollable space.
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      getContentHeight: () => 300,
      getViewportHeight: () => 500,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    // STUCK_THRESHOLD = 30 ticks before auto-stop.
    advanceTicks(30);

    expect(engine.isRunning()).toBe(false);
    expect(scrollY).toBe(0);
  });
});
