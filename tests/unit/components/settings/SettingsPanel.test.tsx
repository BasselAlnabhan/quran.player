import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from '@/components/settings/SettingsPanel';
import App from '@/App';
import { useQuranData } from '@/hooks/useQuranData';
import type { Quran } from '@/lib/types';
import { createScrollEngine } from '@/lib/scroll-engine';
import { intervalMsToPxPerFrame } from '@/lib/speed';

// Mock data-fetching so App renders without dynamic imports.
vi.mock('@/hooks/useQuranData');
vi.mock('@/lib/scroll-engine', () => ({ createScrollEngine: vi.fn() }));

const mockUseQuranData = vi.mocked(useQuranData);
const mockCreateScrollEngine = vi.mocked(createScrollEngine);

function makeMinimalQuran(): Quran {
  const surahs = Array.from({ length: 114 }, (_, i) => ({
    number: i + 1,
    name: `سورة ${String(i + 1)}`,
    englishName: `Surah ${String(i + 1)}`,
    ayahs: [{ number: 1, text: 'test' }],
  }));
  return { surahs };
}

function makeEngineMock() {
  return {
    start: vi.fn<[], void>(),
    stop: vi.fn<[], void>(),
    setSpeed: vi.fn<[number], void>(),
    isRunning: vi.fn<[], boolean>(() => false),
    destroy: vi.fn<[], void>(),
  };
}

beforeEach(() => {
  localStorage.clear();
  mockUseQuranData.mockReturnValue({ data: makeMinimalQuran(), error: undefined });
  mockCreateScrollEngine.mockReturnValue(makeEngineMock());

  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    setTimeout(() => cb(performance.now()), 16);
    return 0;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// AC1 — closed state
// ---------------------------------------------------------------------------

describe('SettingsPanel — closed state', () => {
  it('renders a <dialog> element without the open attribute when open={false}', () => {
    render(
      <SettingsPanel open={false} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    const dialog = document.querySelector('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.hasAttribute('open')).toBe(false);
  });

  it('does not make panel content reachable when open={false}', () => {
    render(
      <SettingsPanel open={false} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.queryByRole('heading', { name: /settings/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC2 — open state
// ---------------------------------------------------------------------------

describe('SettingsPanel — open state', () => {
  it('renders the <dialog> with the open attribute when open={true}', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    const dialog = document.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
  });

  it('makes the Settings heading reachable via DOM query when open={true}', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('marks the dialog as aria-modal for screen readers', () => {
    const { container } = render(
      <SettingsPanel open onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    const dialog = container.querySelector('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// AC3 — Escape key closes panel
// ---------------------------------------------------------------------------

describe('SettingsPanel — Escape key', () => {
  it('calls onClose when Escape is pressed while the panel is open', () => {
    const onClose = vi.fn();
    render(
      <SettingsPanel open={true} onClose={onClose} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose on Escape when the panel is closed', () => {
    const onClose = vi.fn();
    render(
      <SettingsPanel open={false} onClose={onClose} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC4 — backdrop click closes panel; clicking inner content does not
// ---------------------------------------------------------------------------

describe('SettingsPanel — backdrop click', () => {
  it('calls onClose when the dialog element itself is clicked', () => {
    const onClose = vi.fn();
    render(
      <SettingsPanel open={true} onClose={onClose} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );

    const dialog = document.querySelector('dialog')!;
    // Simulate a click whose target is the dialog itself (the backdrop area).
    fireEvent.click(dialog, { target: dialog });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when an inner panel element is clicked', () => {
    const onClose = vi.fn();
    render(
      <SettingsPanel open={true} onClose={onClose} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );

    // Click the heading inside the panel — this is inner content, not the backdrop.
    const heading = screen.getByRole('heading', { name: /settings/i });
    fireEvent.click(heading);

    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC5 — close button calls onClose
// ---------------------------------------------------------------------------

describe('SettingsPanel — close button', () => {
  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SettingsPanel open={true} onClose={onClose} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );

    const closeButton = screen.getByRole('button', { name: /close settings/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('close button is a real <button> element', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    const closeButton = screen.getByRole('button', { name: /close settings/i });
    expect(closeButton.tagName).toBe('BUTTON');
  });
});

// ---------------------------------------------------------------------------
// AC6 — focus moves to close button on open
// ---------------------------------------------------------------------------

describe('SettingsPanel — focus management', () => {
  it('moves focus to the close button when the panel opens', () => {
    const { rerender } = render(
      <SettingsPanel open={false} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );

    rerender(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );

    const closeButton = screen.getByRole('button', { name: /close settings/i });
    expect(document.activeElement).toBe(closeButton);
  });
});

// ---------------------------------------------------------------------------
// AC7 — App-level integration: settings button always present
// ---------------------------------------------------------------------------

describe('App — settings button always visible', () => {
  it('renders the "Open settings" button when the picker is shown', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
  });

  it('renders the "Open settings" button after navigating to a surah', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click the first surah button to enter the reader view.
    const surahButtons = screen.getAllByRole('button', { name: /surah 1/i });
    await user.click(surahButtons[0]!);

    // Settings button must still be present in the reader view.
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC8 — App-level integration: open/close via settings button
// ---------------------------------------------------------------------------

describe('App — settings panel open and close', () => {
  it('shows the dialog with open attribute after clicking "Open settings"', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open settings/i }));

    const dialog = document.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
  });

  it('hides the dialog after clicking the close button inside the panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open settings/i }));
    await user.click(screen.getByRole('button', { name: /close settings/i }));

    const dialog = document.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Font-size control — rendering
// ---------------------------------------------------------------------------

describe('SettingsPanel — font-size control rendering', () => {
  it('renders the current textSizeRem value in the panel', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    // The formatted value should appear in the document (trailing zeros stripped).
    expect(screen.getByText(/1\.5rem/i)).toBeInTheDocument();
  });

  it('decrease button has an accessible name', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: /decrease text size/i }),
    ).toBeInTheDocument();
  });

  it('increase button has an accessible name', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: /increase text size/i }),
    ).toBeInTheDocument();
  });

  it('updates the displayed value when the textSizeRem prop changes', () => {
    const { rerender } = render(
      <SettingsPanel open onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText('1.5rem')).toBeInTheDocument();
    rerender(
      <SettingsPanel open onClose={vi.fn()} textSizeRem={1.625} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText('1.625rem')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Font-size control — clicking + and -
// ---------------------------------------------------------------------------

describe('SettingsPanel — font-size control interactions', () => {
  it('calls onTextSizeChange with current + 0.125 when + is clicked', async () => {
    const user = userEvent.setup();
    const onTextSizeChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={1.5}
        onTextSizeChange={onTextSizeChange}
        scrollIntervalMs={2000}
        onScrollIntervalChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /increase text size/i }));

    expect(onTextSizeChange).toHaveBeenCalledOnce();
    expect(onTextSizeChange).toHaveBeenCalledWith(1.625);
  });

  it('calls onTextSizeChange with current - 0.125 when - is clicked', async () => {
    const user = userEvent.setup();
    const onTextSizeChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={1.5}
        onTextSizeChange={onTextSizeChange}
        scrollIntervalMs={2000}
        onScrollIntervalChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /decrease text size/i }));

    expect(onTextSizeChange).toHaveBeenCalledOnce();
    expect(onTextSizeChange).toHaveBeenCalledWith(1.375);
  });

  it('does not call onTextSizeChange when - is clicked at minimum (1.0)', async () => {
    const user = userEvent.setup();
    const onTextSizeChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={1.0}
        onTextSizeChange={onTextSizeChange}
        scrollIntervalMs={2000}
        onScrollIntervalChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /decrease text size/i }));

    expect(onTextSizeChange).not.toHaveBeenCalled();
  });

  it('does not call onTextSizeChange when + is clicked at maximum (2.5)', async () => {
    const user = userEvent.setup();
    const onTextSizeChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={2.5}
        onTextSizeChange={onTextSizeChange}
        scrollIntervalMs={2000}
        onScrollIntervalChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /increase text size/i }));

    expect(onTextSizeChange).not.toHaveBeenCalled();
  });

  it('- button has the disabled attribute at minimum (1.0)', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.0} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    const decreaseBtn = screen.getByRole('button', { name: /decrease text size/i });
    expect(decreaseBtn).toBeDisabled();
  });

  it('+ button has the disabled attribute at maximum (2.5)', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={2.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    const increaseBtn = screen.getByRole('button', { name: /increase text size/i });
    expect(increaseBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Font-size control — App-level integration
// ---------------------------------------------------------------------------

describe('App — font-size control wired end-to-end', () => {
  it('updates the ayah block font-size when + is clicked in the settings panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Navigate into reader for surah 1.
    const surahButtons = screen.getAllByRole('button', { name: /surah 1/i });
    await user.click(surahButtons[0]!);

    // Confirm the initial inline font-size matches the default setting (1.5rem).
    const ayahBlock = document.querySelector<HTMLElement>('[dir="rtl"][lang="ar"]');
    expect(ayahBlock?.style.fontSize).toBe('1.5rem');

    // Open settings and click Increase text size once.
    await user.click(screen.getByRole('button', { name: /open settings/i }));
    await user.click(screen.getByRole('button', { name: /increase text size/i }));

    // The ayah block font-size should have updated to 1.625rem.
    expect(ayahBlock?.style.fontSize).toBe('1.625rem');
  });
});

// ---------------------------------------------------------------------------
// Scroll-speed control — rendering
// ---------------------------------------------------------------------------

describe('SettingsPanel — scroll-speed control rendering', () => {
  it('renders a labelled "Scroll speed" section', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText(/scroll speed/i)).toBeInTheDocument();
  });

  it('displays the current scrollIntervalMs as X.Ys format', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText('2.0s')).toBeInTheDocument();
  });

  it('updates the displayed value when the scrollIntervalMs prop changes', () => {
    const { rerender } = render(
      <SettingsPanel open onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText('2.0s')).toBeInTheDocument();
    rerender(
      <SettingsPanel open onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2200} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText('2.2s')).toBeInTheDocument();
  });

  it('decrease scroll-interval button has an accessible name', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /decrease scroll interval/i })).toBeInTheDocument();
  });

  it('increase scroll-interval button has an accessible name', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={2000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /increase scroll interval/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Scroll-speed control — clicking + and -
// ---------------------------------------------------------------------------

describe('SettingsPanel — scroll-speed control interactions', () => {
  it('calls onScrollIntervalChange with current + 200 when + (Increase) is clicked', async () => {
    const user = userEvent.setup();
    const onScrollIntervalChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={1.5}
        onTextSizeChange={vi.fn()}
        scrollIntervalMs={2000}
        onScrollIntervalChange={onScrollIntervalChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /increase scroll interval/i }));

    expect(onScrollIntervalChange).toHaveBeenCalledOnce();
    expect(onScrollIntervalChange).toHaveBeenCalledWith(2200);
  });

  it('calls onScrollIntervalChange with current - 200 when - (Decrease) is clicked', async () => {
    const user = userEvent.setup();
    const onScrollIntervalChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={1.5}
        onTextSizeChange={vi.fn()}
        scrollIntervalMs={2000}
        onScrollIntervalChange={onScrollIntervalChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /decrease scroll interval/i }));

    expect(onScrollIntervalChange).toHaveBeenCalledOnce();
    expect(onScrollIntervalChange).toHaveBeenCalledWith(1800);
  });

  it('does not call onScrollIntervalChange when - is clicked at minimum (400ms)', async () => {
    const user = userEvent.setup();
    const onScrollIntervalChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={1.5}
        onTextSizeChange={vi.fn()}
        scrollIntervalMs={400}
        onScrollIntervalChange={onScrollIntervalChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /decrease scroll interval/i }));

    expect(onScrollIntervalChange).not.toHaveBeenCalled();
  });

  it('does not call onScrollIntervalChange when + is clicked at maximum (10000ms)', async () => {
    const user = userEvent.setup();
    const onScrollIntervalChange = vi.fn();
    render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        textSizeRem={1.5}
        onTextSizeChange={vi.fn()}
        scrollIntervalMs={10000}
        onScrollIntervalChange={onScrollIntervalChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /increase scroll interval/i }));

    expect(onScrollIntervalChange).not.toHaveBeenCalled();
  });

  it('- button is disabled at minimum (400ms, displayed as 0.4s)', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={400} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText('0.4s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decrease scroll interval/i })).toBeDisabled();
  });

  it('+ button is disabled at maximum (10000ms, displayed as 10.0s)', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()} textSizeRem={1.5} onTextSizeChange={vi.fn()} scrollIntervalMs={10000} onScrollIntervalChange={vi.fn()} />,
    );
    expect(screen.getByText('10.0s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increase scroll interval/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// App-level integration: scroll-speed control wired end-to-end
// ---------------------------------------------------------------------------

describe('App — scroll-speed control wired end-to-end', () => {
  it('calls engine setSpeed with a new pxPerFrame value after increasing scroll interval in settings', async () => {
    const user = userEvent.setup();
    const engineMock = makeEngineMock();
    mockCreateScrollEngine.mockReturnValue(engineMock);

    render(<App />);

    // Navigate into reader for surah 1.
    const surahButtons = screen.getAllByRole('button', { name: /surah 1/i });
    await user.click(surahButtons[0]!);

    // Capture the initial pxPerFrame forwarded to the engine on mount.
    // Default intervalMs=2000, textSizeRem=1.5 (see useSettings defaults).
    const initialSpeed = engineMock.setSpeed.mock.calls[0]?.[0];
    expect(initialSpeed).toBeGreaterThan(0);

    // Clear calls so we can isolate the post-settings-change call.
    engineMock.setSpeed.mockClear();

    // Open settings and increase scroll interval (slower) once.
    await user.click(screen.getByRole('button', { name: /open settings/i }));
    await user.click(screen.getByRole('button', { name: /increase scroll interval/i }));

    // setSpeed should have been called with the converted pxPerFrame for the new interval.
    expect(engineMock.setSpeed).toHaveBeenCalled();

    // intervalMs went 2000 → 2200; larger interval = slower = smaller pxPerFrame.
    const newSpeed = engineMock.setSpeed.mock.calls.at(-1)?.[0];
    expect(newSpeed).toBeLessThan(initialSpeed!);

    // Also verify the exact converted value (textSizeRem stays 1.5).
    const expectedSpeed = intervalMsToPxPerFrame(2200, 1.5);
    expect(newSpeed).toBeCloseTo(expectedSpeed, 10);
  });
});
