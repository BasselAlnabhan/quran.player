import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from '@/components/settings/SettingsPanel';
import App from '@/App';
import { useQuranData } from '@/hooks/useQuranData';
import type { Quran } from '@/lib/types';
import { createScrollEngine } from '@/lib/scroll-engine';

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
    render(<SettingsPanel open={false} onClose={vi.fn()} />);
    const dialog = document.querySelector('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.hasAttribute('open')).toBe(false);
  });

  it('does not make panel content reachable when open={false}', () => {
    render(<SettingsPanel open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: /settings/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC2 — open state
// ---------------------------------------------------------------------------

describe('SettingsPanel — open state', () => {
  it('renders the <dialog> with the open attribute when open={true}', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} />);
    const dialog = document.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
  });

  it('makes the Settings heading reachable via DOM query when open={true}', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('renders children inside the panel when provided', () => {
    render(
      <SettingsPanel open={true} onClose={vi.fn()}>
        <p>Panel body</p>
      </SettingsPanel>,
    );
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });

  it('marks the dialog as aria-modal for screen readers', () => {
    const { container } = render(<SettingsPanel open onClose={vi.fn()} />);
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
    render(<SettingsPanel open={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose on Escape when the panel is closed', () => {
    const onClose = vi.fn();
    render(<SettingsPanel open={false} onClose={onClose} />);

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
    render(<SettingsPanel open={true} onClose={onClose} />);

    const dialog = document.querySelector('dialog')!;
    // Simulate a click whose target is the dialog itself (the backdrop area).
    fireEvent.click(dialog, { target: dialog });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when an inner panel element is clicked', () => {
    const onClose = vi.fn();
    render(<SettingsPanel open={true} onClose={onClose} />);

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
    render(<SettingsPanel open={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close settings/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('close button is a real <button> element', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} />);
    const closeButton = screen.getByRole('button', { name: /close settings/i });
    expect(closeButton.tagName).toBe('BUTTON');
  });
});

// ---------------------------------------------------------------------------
// AC6 — focus moves to close button on open
// ---------------------------------------------------------------------------

describe('SettingsPanel — focus management', () => {
  it('moves focus to the close button when the panel opens', () => {
    const { rerender } = render(<SettingsPanel open={false} onClose={vi.fn()} />);

    rerender(<SettingsPanel open={true} onClose={vi.fn()} />);

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
