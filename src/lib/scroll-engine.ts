export type ScrollEngineOptions = {
  getScrollY: () => number;
  setScrollY: (y: number) => void;
  getContentHeight: () => number;
  getViewportHeight: () => number;
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

export function createScrollEngine(opts: ScrollEngineOptions): ScrollEngine {
  const {
    getScrollY,
    setScrollY,
    getContentHeight,
    getViewportHeight,
    initialSpeed = 0.5,
    prefersReducedMotion = false,
  } = opts;

  let speed = initialSpeed;
  let rafId: number | null = null;
  let destroyed = false;

  // True only when the rAF loop is actively scheduling frames.
  // isRunning() returns false while the tab is hidden, even if the engine will
  // resume when the tab becomes visible again. This matches "the loop is not
  // actively scheduling frames" — the cleaner semantic for callers showing a
  // play/pause button, since showing "playing" while the tab is invisible would
  // be misleading.
  let _isRunning = false;

  // Set to true when a tab-hidden event pauses a running engine so the
  // visibilitychange handler knows to resume on tab-visible.
  let pausedByVisibility = false;

  function tick(): void {
    if (!_isRunning) return;

    const current = getScrollY();
    const next = current + speed;
    const contentHeight = getContentHeight();
    const viewportHeight = getViewportHeight();
    const maxScroll = contentHeight - viewportHeight;

    if (next >= maxScroll) {
      // Clamp to the true end-of-scrollable position and halt.
      // maxScroll is negative when content fits in viewport; clamp prevents a negative scrollY.
      setScrollY(Math.max(0, maxScroll));
      _isRunning = false;
      rafId = null;
      return;
    }

    setScrollY(next);
    rafId = requestAnimationFrame(tick);
  }

  function start(): void {
    if (destroyed || prefersReducedMotion || _isRunning) return;
    _isRunning = true;
    rafId = requestAnimationFrame(tick);
  }

  function stop(): void {
    if (destroyed) return;
    _isRunning = false;
    pausedByVisibility = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
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
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    } else {
      // Tab became visible again.
      if (pausedByVisibility) {
        pausedByVisibility = false;
        _isRunning = true;
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  function destroy(): void {
    if (destroyed) return; // idempotent
    destroyed = true;
    _isRunning = false;
    pausedByVisibility = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
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
