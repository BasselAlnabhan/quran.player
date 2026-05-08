import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScrollEngine } from '@/lib/scroll-engine';
import type { ScrollEngineOptions } from '@/lib/scroll-engine';

// ---------------------------------------------------------------------------
// rAF faking
//
// Vitest 1.6 does NOT support vi.advanceTimersToNextFrame(). Instead, we:
//   1. Use vi.useFakeTimers() for setTimeout/etc.
//   2. Spy on window.requestAnimationFrame so it wraps the callback in a
//      setTimeout(..., 16). This lets vi.runOnlyPendingTimers() fire exactly
//      one rAF tick at a time.
//   3. Spy on window.cancelAnimationFrame so it cancels the underlying timer.
//
// We use a simple counter for rAF IDs that maps to the timer handle returned
// by setTimeout, enabling cancelAnimationFrame to work correctly.
// ---------------------------------------------------------------------------

// Map from rAF ID (our counter) → timer handle returned by fake setTimeout.
const rafHandles = new Map<number, ReturnType<typeof setTimeout>>();
let rafCounter = 0;

function setupRafMock(): void {
  vi.useFakeTimers();

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCounter += 1;
    const id = rafCounter;
    const handle = setTimeout(() => cb(performance.now()), 16);
    rafHandles.set(id, handle);
    return id;
  });

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    const handle = rafHandles.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      rafHandles.delete(id);
    }
  });
}

/** Advance rAF by exactly N frames, one at a time. */
function advanceFrames(n: number): void {
  for (let i = 0; i < n; i++) {
    vi.runOnlyPendingTimers();
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
  rafHandles.clear();
  rafCounter = 0;
  setupRafMock();
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
  it('advances scroll position after one frame', () => {
    const opts = makeOpts({ initialSpeed: 2 });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceFrames(1);

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
    const rafSpy = vi.mocked(window.requestAnimationFrame);
    const engine = createScrollEngine(makeOpts());

    engine.start();
    const callsBefore = rafSpy.mock.calls.length;
    engine.start(); // second call — must be a no-op
    const callsAfter = rafSpy.mock.calls.length;

    expect(callsAfter).toBe(callsBefore);
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
    advanceFrames(1); // scrollY is now 1

    engine.stop();
    const positionAfterStop = scrollY;
    advanceFrames(3); // loop is dead — should not advance

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
    advanceFrames(5);

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
    advanceFrames(5);

    // setScrollY is called each frame but always with 0 + 0 = 0 (same value).
    // Scroll must not have advanced beyond 0.
    expect(scrollY).toBe(0);
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// Mid-scroll speed change
// ---------------------------------------------------------------------------

describe('createScrollEngine — mid-scroll speed change', () => {
  it('applies the new speed on the very next frame after setSpeed()', () => {
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
    advanceFrames(2); // scrollY = 2

    engine.setSpeed(5);
    advanceFrames(1); // scrollY = 2 + 5 = 7

    expect(scrollY).toBe(7);
    engine.destroy();
  });
});

// ---------------------------------------------------------------------------
// End of content
// ---------------------------------------------------------------------------

describe('createScrollEngine — end of content', () => {
  it('stops scrolling when the bottom of the content is reached', () => {
    let scrollY = 495;
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY: (y) => {
        scrollY = y;
      },
      getContentHeight: () => 1000,
      getViewportHeight: () => 500,
      initialSpeed: 10,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceFrames(1); // 495 + 10 = 505 >= 500 (maxScroll) → clamp to 500

    expect(scrollY).toBe(500);
    expect(engine.isRunning()).toBe(false);
    engine.destroy();
  });

  it('clamps to maxScroll exactly at the boundary', () => {
    let scrollY = 490;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      getContentHeight: () => 1000,
      getViewportHeight: () => 500,
      initialSpeed: 20,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceFrames(1); // 490 + 20 = 510 >= 500 → clamp to 500

    const lastCall = setScrollY.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(500);
    expect(engine.isRunning()).toBe(false);
    engine.destroy();
  });

  it('does not call setScrollY again after stopping at end of content', () => {
    let scrollY = 495;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      getContentHeight: () => 1000,
      getViewportHeight: () => 500,
      initialSpeed: 10,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceFrames(1);
    const callsAfterEnd = setScrollY.mock.calls.length;

    advanceFrames(5); // loop stopped — no more calls
    expect(setScrollY.mock.calls.length).toBe(callsAfterEnd);
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
    advanceFrames(5);

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
    advanceFrames(1); // one frame of scrolling, scrollY = 1

    // Simulate tab going hidden.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    const callsWhileHiddenStart = setScrollY.mock.calls.length;
    advanceFrames(5); // rAF loop is cancelled — no new calls
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
    advanceFrames(1); // scrollY = 1

    // Hide the tab.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    advanceFrames(3); // no movement while hidden

    // Restore the tab.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    const callsBeforeResume = setScrollY.mock.calls.length;
    advanceFrames(1); // should tick again
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
    advanceFrames(1);

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
    advanceFrames(3);
    expect(setScrollY.mock.calls.length).toBe(callsAfterVisible);
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
  it('cancels rAF and stops scrolling after destroy()', () => {
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
    advanceFrames(1);

    engine.destroy();
    const callsAfterDestroy = setScrollY.mock.calls.length;
    advanceFrames(5);

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
    advanceFrames(1); // one tick to confirm it was running

    engine.destroy();
    // Clear calls recorded before destroy so assertions below are unambiguous.
    setScrollY.mockClear();

    // Simulate tab going hidden after destroy — engine must not respond.
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    advanceFrames(3);
    expect(setScrollY).not.toHaveBeenCalled();

    // Simulate tab becoming visible again — engine must still not respond.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    advanceFrames(3);
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
    engine.start(); // must not throw or schedule rAF
    advanceFrames(3);

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
// ---------------------------------------------------------------------------

describe('createScrollEngine — very small viewport', () => {
  it('stops immediately when content fits in viewport (maxScroll <= 0)', () => {
    let scrollY = 0;
    const setScrollY = vi.fn((y: number) => {
      scrollY = y;
    });
    // contentHeight (300) < viewportHeight (500) → maxScroll = -200 → clamp to max(0, -200) = 0
    const opts = makeOpts({
      getScrollY: () => scrollY,
      setScrollY,
      getContentHeight: () => 300,
      getViewportHeight: () => 500,
      initialSpeed: 1,
    });
    const engine = createScrollEngine(opts);

    engine.start();
    advanceFrames(1);

    // Engine should stop immediately with scroll clamped to 0.
    expect(engine.isRunning()).toBe(false);
    expect(setScrollY).toHaveBeenCalledWith(0);
    expect(setScrollY).toHaveBeenCalledTimes(1);
    expect(scrollY).toBe(0);
  });
});
