import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mock createScrollEngine so tests can inspect start/stop/setSpeed/destroy.
// vi.mock is hoisted to the top of the file by Vitest, so this import
// receives the mocked version automatically.
// ---------------------------------------------------------------------------
vi.mock('@/lib/scroll-engine', () => {
  return {
    createScrollEngine: vi.fn(),
  };
});

import { createScrollEngine } from '@/lib/scroll-engine';
import ScrollControls from '@/features/reader/ScrollControls';

// ---------------------------------------------------------------------------
// rAF stub — we don't need to tick frames in these tests; we just need the
// functions to exist so the engine constructor doesn't crash.
// ---------------------------------------------------------------------------

// Returns an object satisfying ScrollEngine whose methods are vi.fn() spies.
// We use `satisfies` pattern: cast to unknown then ScrollEngine so callers can
// pass it to mockCreateScrollEngine, but we keep a typed reference for spy calls.
type EngineMock = {
  _isRunning: boolean;
  start: ReturnType<typeof vi.fn<[], void>>;
  stop: ReturnType<typeof vi.fn<[], void>>;
  setSpeed: ReturnType<typeof vi.fn<[number], void>>;
  isRunning: ReturnType<typeof vi.fn<[], boolean>>;
  destroy: ReturnType<typeof vi.fn<[], void>>;
};

function makeEngineMock(): EngineMock {
  let _isRunning = false;
  const mock = {
    _isRunning,
    start: vi.fn(() => {
      _isRunning = true;
      mock._isRunning = true;
    }),
    stop: vi.fn(() => {
      _isRunning = false;
      mock._isRunning = false;
    }),
    setSpeed: vi.fn(),
    isRunning: vi.fn(() => _isRunning),
    destroy: vi.fn(),
  };
  return mock;
}

const mockCreateScrollEngine = vi.mocked(createScrollEngine);

// ---------------------------------------------------------------------------
// matchMedia helpers
// ---------------------------------------------------------------------------

function mockMatchMediaReducedMotion(matches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_type: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.push(fn);
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
    _listeners: listeners,
    _triggerChange: (newMatches: boolean) => {
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

let engineMock: ReturnType<typeof makeEngineMock>;

beforeEach(() => {
  engineMock = makeEngineMock();
  mockCreateScrollEngine.mockReturnValue(engineMock);

  // Default: no reduced motion preference.
  mockMatchMediaReducedMotion(false);

  // Stub rAF so the engine constructor doesn't fail in jsdom.
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    setTimeout(() => cb(performance.now()), 16);
    return 0;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // Restore default matchMedia stub from tests/setup.ts.
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
// AC1: Play/pause click
// ---------------------------------------------------------------------------

describe('ScrollControls — play/pause click', () => {
  it('calls engine start() when the play button is clicked', async () => {
    const user = userEvent.setup();
    render(<ScrollControls pxPerFrame={0.5} />);

    const playButton = screen.getByRole('button', { name: /start auto-scroll/i });
    await user.click(playButton);

    expect(engineMock.start).toHaveBeenCalledOnce();
  });

  it('calls engine stop() when clicked again after starting', async () => {
    const user = userEvent.setup();
    render(<ScrollControls pxPerFrame={0.5} />);

    const playButton = screen.getByRole('button', { name: /start auto-scroll/i });
    await user.click(playButton);

    // After clicking play, the button label flips to "Stop auto-scroll".
    const pauseButton = screen.getByRole('button', { name: /stop auto-scroll/i });
    await user.click(pauseButton);

    expect(engineMock.stop).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// AC7: Aria label updates
// ---------------------------------------------------------------------------

describe('ScrollControls — aria-label updates', () => {
  it('shows "Start auto-scroll" aria-label when the engine is stopped', () => {
    render(<ScrollControls pxPerFrame={0.5} />);
    const btn = screen.getByRole('button', { name: /start auto-scroll/i });
    expect(btn).toBeInTheDocument();
  });

  it('shows "Stop auto-scroll" aria-label after clicking play', async () => {
    const user = userEvent.setup();
    render(<ScrollControls pxPerFrame={0.5} />);

    await user.click(screen.getByRole('button', { name: /start auto-scroll/i }));

    expect(screen.getByRole('button', { name: /stop auto-scroll/i })).toBeInTheDocument();
  });

  it('reverts to "Start auto-scroll" after clicking stop', async () => {
    const user = userEvent.setup();
    render(<ScrollControls pxPerFrame={0.5} />);

    await user.click(screen.getByRole('button', { name: /start auto-scroll/i }));
    await user.click(screen.getByRole('button', { name: /stop auto-scroll/i }));

    expect(screen.getByRole('button', { name: /start auto-scroll/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC2: Spacebar toggle
// ---------------------------------------------------------------------------

describe('ScrollControls — spacebar toggle', () => {
  it('toggles play when spacebar is pressed on document', () => {
    render(<ScrollControls pxPerFrame={0.5} />);

    fireEvent.keyDown(document, { key: ' ' });

    // toggle() calls engine.start() when not running.
    expect(engineMock.start).toHaveBeenCalledOnce();
  });

  it('does not toggle when space is pressed inside an <input>', () => {
    render(
      <>
        <ScrollControls pxPerFrame={0.5} />
        <input data-testid="search-input" />
      </>,
    );

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, { key: ' ' });

    expect(engineMock.start).not.toHaveBeenCalled();
    expect(engineMock.stop).not.toHaveBeenCalled();
  });

  it('does not toggle when space is pressed inside a <textarea>', () => {
    render(
      <>
        <ScrollControls pxPerFrame={0.5} />
        <textarea data-testid="notes" />
      </>,
    );

    const ta = screen.getByTestId('notes');
    fireEvent.keyDown(ta, { key: ' ' });

    expect(engineMock.start).not.toHaveBeenCalled();
    expect(engineMock.stop).not.toHaveBeenCalled();
  });

  it('does not start the engine via spacebar when reduced-motion is preferred and user has not opted in', () => {
    mockMatchMediaReducedMotion(true);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<ScrollControls pxPerFrame={0.5} />);

    fireEvent.keyDown(document, { key: ' ' });

    expect(engineMock.start).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// pxPerFrame prop forwarding
// ---------------------------------------------------------------------------

describe('ScrollControls — pxPerFrame prop forwarding', () => {
  it('calls engine setSpeed() with the pxPerFrame prop value on mount', () => {
    render(<ScrollControls pxPerFrame={0.4} />);

    expect(engineMock.setSpeed).toHaveBeenCalledWith(0.4);
  });

  it('calls engine setSpeed() again when the pxPerFrame prop changes', () => {
    const { rerender } = render(<ScrollControls pxPerFrame={0.4} />);

    engineMock.setSpeed.mockClear();

    rerender(<ScrollControls pxPerFrame={0.8} />);

    expect(engineMock.setSpeed).toHaveBeenCalledWith(0.8);
  });

  it('does not render an <input type="range"> slider', () => {
    render(<ScrollControls pxPerFrame={0.5} />);

    expect(document.querySelector('input[type="range"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC4: Reduced-motion default
// ---------------------------------------------------------------------------

describe('ScrollControls — reduced-motion default', () => {
  it('renders the "Enable auto-scroll" button when reduced-motion is preferred', () => {
    mockMatchMediaReducedMotion(true);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<ScrollControls pxPerFrame={0.5} />);

    expect(screen.getByRole('button', { name: /enable auto-scroll/i })).toBeInTheDocument();
  });

  it('hides the play button when reduced-motion is preferred and user has not opted in', () => {
    mockMatchMediaReducedMotion(true);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<ScrollControls pxPerFrame={0.5} />);

    expect(screen.queryByRole('button', { name: /start auto-scroll/i })).not.toBeInTheDocument();
  });

  it('shows visible text explaining the reduced-motion setting', () => {
    mockMatchMediaReducedMotion(true);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<ScrollControls pxPerFrame={0.5} />);

    expect(screen.getByText(/reduced motion/i)).toBeInTheDocument();
  });

  it('does not render a clickable play button when reduced-motion is preferred and user has not opted in', () => {
    mockMatchMediaReducedMotion(true);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<ScrollControls pxPerFrame={0.5} />);

    // The play button must not be present — the only way for the user to
    // interact with the engine in reduced-motion mode is via "Enable auto-scroll".
    expect(screen.queryByRole('button', { name: /start auto-scroll/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop auto-scroll/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC5: Opt-in flow
// ---------------------------------------------------------------------------

describe('ScrollControls — opt-in to auto-scroll', () => {
  it('shows the play button after clicking "Enable auto-scroll"', async () => {
    const user = userEvent.setup();
    mockMatchMediaReducedMotion(true);

    // First engine (built with reduced-motion: true).
    const firstEngine = makeEngineMock();
    // Second engine (built after opt-in, reduced-motion: false).
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    render(<ScrollControls pxPerFrame={0.5} />);

    await user.click(screen.getByRole('button', { name: /enable auto-scroll/i }));

    expect(screen.getByRole('button', { name: /start auto-scroll/i })).toBeInTheDocument();
  });

  it('allows starting the engine after opting in', async () => {
    const user = userEvent.setup();
    mockMatchMediaReducedMotion(true);

    const firstEngine = makeEngineMock();
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    render(<ScrollControls pxPerFrame={0.5} />);

    await user.click(screen.getByRole('button', { name: /enable auto-scroll/i }));
    await user.click(screen.getByRole('button', { name: /start auto-scroll/i }));

    expect(secondEngine.start).toHaveBeenCalledOnce();
  });

  it('creates the engine a second time after opt-in', async () => {
    const user = userEvent.setup();
    mockMatchMediaReducedMotion(true);

    const firstEngine = makeEngineMock();
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    render(<ScrollControls pxPerFrame={0.5} />);
    expect(mockCreateScrollEngine).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /enable auto-scroll/i }));

    expect(mockCreateScrollEngine).toHaveBeenCalledTimes(2);
  });

  it('destroys the first engine when opting in', async () => {
    const user = userEvent.setup();
    mockMatchMediaReducedMotion(true);

    const firstEngine = makeEngineMock();
    const secondEngine = makeEngineMock();
    mockCreateScrollEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    render(<ScrollControls pxPerFrame={0.5} />);

    await user.click(screen.getByRole('button', { name: /enable auto-scroll/i }));

    expect(firstEngine.destroy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// AC6: Unmount cleanup
// ---------------------------------------------------------------------------

describe('ScrollControls — unmount cleanup', () => {
  it('calls engine destroy() exactly once on unmount', () => {
    const { unmount } = render(<ScrollControls pxPerFrame={0.5} />);

    unmount();

    expect(engineMock.destroy).toHaveBeenCalledOnce();
  });

  it('does not call engine start/stop after unmount when spacebar is pressed', () => {
    const { unmount } = render(<ScrollControls pxPerFrame={0.5} />);

    unmount();

    // Reset to make the assertions unambiguous.
    engineMock.start.mockClear();
    engineMock.stop.mockClear();

    fireEvent.keyDown(document, { key: ' ' });

    expect(engineMock.start).not.toHaveBeenCalled();
    expect(engineMock.stop).not.toHaveBeenCalled();
  });

  it('removes the matchMedia change listener on unmount', () => {
    // Capture the mql object that the hook will use.
    const mql = mockMatchMediaReducedMotion(false);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    const { unmount } = render(<ScrollControls pxPerFrame={0.5} />);

    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// AC4 / AC9: createScrollEngine is called with prefersReducedMotion matching
// the OS preference
// ---------------------------------------------------------------------------

describe('ScrollControls — engine creation options', () => {
  it('creates the engine with prefersReducedMotion: false when OS has no preference', () => {
    mockMatchMediaReducedMotion(false);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<ScrollControls pxPerFrame={0.5} />);

    const lastCall = mockCreateScrollEngine.mock.calls[0];
    const opts = lastCall?.[0];
    expect(opts?.prefersReducedMotion).toBe(false);
  });

  it('creates the engine with prefersReducedMotion: true when OS prefers reduced motion', () => {
    mockMatchMediaReducedMotion(true);
    engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<ScrollControls pxPerFrame={0.5} />);

    const lastCall = mockCreateScrollEngine.mock.calls[0];
    const opts = lastCall?.[0];
    expect(opts?.prefersReducedMotion).toBe(true);
  });
});
