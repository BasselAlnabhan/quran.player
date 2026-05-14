export type ScrollEngineOptions = {
  getScrollY: () => number;
  setScrollY: (y: number) => void;
  /** No longer used inside tick() — kept optional for callers that already pass it. */
  getContentHeight?: () => number;
  /** No longer used inside tick() — kept optional for callers that already pass it. */
  getViewportHeight?: () => number;
  /** Pixels advanced per animation frame. Default: 0.5 */
  initialSpeed?: number;
  /**
   * When true, start() becomes a no-op — satisfies the prefers-reduced-motion
   * accessibility requirement from CLAUDE.md. The hook that creates this engine
   * re-creates it when the media query changes, so we don't expose a setter.
   */
  prefersReducedMotion?: boolean;
};

export type ScrollEngine = {
  start: () => void;
  stop: () => void;
  setSpeed: (pxPerFrame: number) => void;
  isRunning: () => boolean;
  destroy: () => void;
};

// setInterval fires in a separate task queue from requestAnimationFrame.
// On iOS/Safari WebKit, rAF writes to scrollTop can be coalesced or silently
// swallowed. setInterval sidesteps that browser quirk entirely.
const FRAME_MS = 16; // ~60fps

// Number of consecutive no-change ticks before the engine concludes it has
// reached the bottom. 30 ticks ≈ 0.5 s — enough to absorb fractional-speed
// integer-rounding without false-positiving.
const STUCK_THRESHOLD = 30;

export function createScrollEngine(opts: ScrollEngineOptions): ScrollEngine {
  const {
    getScrollY,
    setScrollY,
    // getContentHeight and getViewportHeight are optional dead parameters — tick()
    // uses no-change detection instead of explicit maxScroll math, so these are
    // kept only for API compatibility with existing callers.
    getContentHeight,
    getViewportHeight,
    initialSpeed = 0.5,
    prefersReducedMotion = false,
  } = opts;

  // Suppress "unused variable" lint for the kept-but-unused options.
  void getContentHeight;
  void getViewportHeight;

  let speed = initialSpeed;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  // True only when the setInterval loop is actively firing.
  // isRunning() returns false while the tab is hidden, even if the engine will
  // resume when the tab becomes visible again. This matches "the loop is not
  // actively scheduling frames" — the cleaner semantic for callers showing a
  // play/pause button, since showing "playing" while the tab is invisible would
  // be misleading.
  let _isRunning = false;

  // Set to true when a tab-hidden event pauses a running engine so the
  // visibilitychange handler knows to resume on tab-visible.
  let pausedByVisibility = false;

  // Tracks consecutive ticks where scrollTop did not change after our write.
  // Reset on start() so a fresh start always gets a full grace period.
  let stuckCount = 0;

  function tick(): void {
    if (!_isRunning) return;

    // Speed of 0 is a deliberate freeze — skip no-change accounting entirely.
    // The engine stays "running" so the caller's play/pause button stays in sync;
    // when speed is raised again, motion resumes immediately on the next tick.
    if (speed <= 0) return;

    const before = getScrollY();
    setScrollY(before + speed);
    const after = getScrollY();

    // If the actual scroll position didn't move after our write, we may have
    // reached the bottom (or the scroll API isn't responding). Allow
    // STUCK_THRESHOLD ticks of grace because fractional speed (e.g. 0.5)
    // accumulates to one whole pixel only every other tick on browsers that
    // round scrollTop to integers.
    if (after === before) {
      stuckCount++;
      if (stuckCount >= STUCK_THRESHOLD) {
        _isRunning = false;
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    } else {
      stuckCount = 0;
    }
  }

  function start(): void {
    if (destroyed || prefersReducedMotion || _isRunning) return;
    stuckCount = 0;
    _isRunning = true;
    intervalId = setInterval(tick, FRAME_MS);
  }

  function stop(): void {
    if (destroyed) return;
    _isRunning = false;
    pausedByVisibility = false;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function handleVisibilityChange(): void {
    if (destroyed) return;

    if (document.visibilityState === 'hidden') {
      if (_isRunning) {
        // Pause without calling stop() so external callers don't see a
        // permanent stop — they see isRunning() === false while hidden, but
        // the engine will resume transparently when the tab is visible again.
        pausedByVisibility = true;
        _isRunning = false;
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    } else {
      // Tab became visible again.
      if (pausedByVisibility) {
        pausedByVisibility = false;
        stuckCount = 0;
        _isRunning = true;
        intervalId = setInterval(tick, FRAME_MS);
      }
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  function destroy(): void {
    if (destroyed) return; // idempotent
    destroyed = true;
    _isRunning = false;
    pausedByVisibility = false;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    start,
    stop,
    setSpeed: (pxPerFrame: number) => {
      speed = pxPerFrame;
    },
    isRunning: () => _isRunning,
    destroy,
  };
}
