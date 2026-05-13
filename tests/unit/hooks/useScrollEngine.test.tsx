import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock createScrollEngine with a controllable spy.
// vi.mock is hoisted to the top of the file by Vitest, so the import below
// receives the mocked version automatically.
// ---------------------------------------------------------------------------
vi.mock('@/lib/scroll-engine', () => ({
  createScrollEngine: vi.fn(),
}));

import { createScrollEngine } from '@/lib/scroll-engine';
import { useScrollEngine } from '@/hooks/useScrollEngine';

// ---------------------------------------------------------------------------
// Engine mock factory — each test gets a fresh instance so spy call counts
// are always unambiguous.
// ---------------------------------------------------------------------------

type EngineMock = {
  start: ReturnType<typeof vi.fn<[], void>>;
  stop: ReturnType<typeof vi.fn<[], void>>;
  setSpeed: ReturnType<typeof vi.fn<[number], void>>;
  isRunning: ReturnType<typeof vi.fn<[], boolean>>;
  destroy: ReturnType<typeof vi.fn<[], void>>;
};

function makeEngineMock(initialRunning = false): EngineMock {
  let _isRunning = initialRunning;
  const mock: EngineMock = {
    start: vi.fn(() => {
      _isRunning = true;
    }),
    stop: vi.fn(() => {
      _isRunning = false;
    }),
    setSpeed: vi.fn(),
    isRunning: vi.fn(() => _isRunning),
    destroy: vi.fn(),
  };
  return mock;
}

const mockCreateScrollEngine = vi.mocked(createScrollEngine);

// ---------------------------------------------------------------------------
// matchMedia helper — mirrors the one in ScrollControls.test.tsx.
// Returns the mql object, which exposes a _triggerChange(matches) test hook
// to simulate OS preference changes.
// ---------------------------------------------------------------------------

function mockMatchMediaReducedMotion(initialMatches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_type: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.push(fn);
    }),
    removeEventListener: vi.fn((_type: string, fn: (e: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false as boolean),
    _listeners: listeners,
    _triggerChange(newMatches: boolean) {
      mql.matches = newMatches;
      const event = { matches: newMatches } as MediaQueryListEvent;
      for (const fn of listeners) fn(event);
    },
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn(() => mql),
  });

  return mql;
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Stub rAF so the engine constructor callbacks don't crash in jsdom.
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    setTimeout(() => cb(performance.now()), 16);
    return 0;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  // Restore the default matchMedia stub from tests/setup.ts so subsequent
  // test files start clean.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

// ---------------------------------------------------------------------------
// setScrollY — regression: must use direct scrollTop assignment, not window.scrollTo
// ---------------------------------------------------------------------------

describe('useScrollEngine — setScrollY uses direct scrollTop assignment, not window.scrollTo', () => {
  it('sets document.documentElement.scrollTop and document.body.scrollTop, never calls window.scrollTo', () => {
    mockMatchMediaReducedMotion(false);

    // Capture the setScrollY callback the hook passes into createScrollEngine.
    let capturedSetScrollY: ((y: number) => void) | undefined;
    mockCreateScrollEngine.mockImplementation((opts) => {
      capturedSetScrollY = opts.setScrollY;
      return makeEngineMock();
    });

    const scrollToSpy = vi.fn();
    vi.stubGlobal('scrollTo', scrollToSpy);

    renderHook(() => useScrollEngine());

    expect(capturedSetScrollY).toBeDefined();

    // Invoke the callback with an arbitrary scroll position.
    capturedSetScrollY!(100);

    // jsdom supports scrollTop assignment — verify both roots are written.
    expect(document.documentElement.scrollTop).toBe(100);
    expect(document.body.scrollTop).toBe(100);

    // Guard against regressing to the broken window.scrollTo pattern.
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleChange — OS prefers-reduced-motion change event
// ---------------------------------------------------------------------------

describe('useScrollEngine — handleChange (prefers-reduced-motion change event)', () => {
  it('rebuilds the engine with prefersReducedMotion true when the OS preference turns on', () => {
    const mql = mockMatchMediaReducedMotion(false);
    const firstEngine = makeEngineMock();
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    renderHook(() => useScrollEngine());

    // On mount the hook builds the engine once with prefersReducedMotion: false.
    expect(mockCreateScrollEngine).toHaveBeenCalledTimes(1);
    expect(mockCreateScrollEngine).toHaveBeenLastCalledWith(
      expect.objectContaining({ prefersReducedMotion: false }),
    );

    act(() => mql._triggerChange(true));

    // handleChange must rebuild with the new OS preference.
    expect(mockCreateScrollEngine).toHaveBeenCalledTimes(2);
    expect(mockCreateScrollEngine).toHaveBeenLastCalledWith(
      expect.objectContaining({ prefersReducedMotion: true }),
    );
  });

  it('rebuilds the engine with prefersReducedMotion false when the OS preference turns off', () => {
    const mql = mockMatchMediaReducedMotion(true);
    const firstEngine = makeEngineMock();
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    renderHook(() => useScrollEngine());

    expect(mockCreateScrollEngine).toHaveBeenLastCalledWith(
      expect.objectContaining({ prefersReducedMotion: true }),
    );

    act(() => mql._triggerChange(false));

    expect(mockCreateScrollEngine).toHaveBeenLastCalledWith(
      expect.objectContaining({ prefersReducedMotion: false }),
    );
  });

  it('calls destroy on the first engine when the OS preference changes', () => {
    const mql = mockMatchMediaReducedMotion(false);
    const firstEngine = makeEngineMock();
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    renderHook(() => useScrollEngine());

    // Confirm destroy has not yet been called.
    expect(firstEngine.destroy).not.toHaveBeenCalled();

    act(() => mql._triggerChange(true));

    expect(firstEngine.destroy).toHaveBeenCalledOnce();
  });

  it('resets isOptedIn to false when the OS preference changes', () => {
    const mql = mockMatchMediaReducedMotion(false);
    // Allow up to 3 engine creations: initial, after enableAutoScroll, after handleChange.
    mockCreateScrollEngine.mockImplementation(() => makeEngineMock());

    const { result } = renderHook(() => useScrollEngine());

    // Opt in so isOptedIn becomes true.
    act(() => {
      result.current.enableAutoScroll();
    });
    expect(result.current.isOptedIn).toBe(true);

    // OS turns on reduced-motion — handleChange must reset isOptedIn.
    act(() => mql._triggerChange(true));

    expect(result.current.isOptedIn).toBe(false);
  });

  it('resets isRunning to false when the OS preference changes', () => {
    const mql = mockMatchMediaReducedMotion(false);
    // The engine mock reports isRunning() true after start() is called.
    const firstEngine = makeEngineMock();
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    const { result } = renderHook(() => useScrollEngine());

    // Make the engine report running so the hook's isRunning state can flip.
    act(() => {
      firstEngine.isRunning.mockReturnValue(true);
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);

    // OS preference changes — handleChange sets isRunning to false.
    act(() => mql._triggerChange(true));

    expect(result.current.isRunning).toBe(false);
  });
});
