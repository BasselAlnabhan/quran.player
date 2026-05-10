import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Quran } from '@/lib/types';
import realQuranData from '@/data/quran.json';
// vi.mock calls are hoisted by Vitest so imports below receive the mocked versions.
import { useQuranData } from '@/hooks/useQuranData';
import { createScrollEngine } from '@/lib/scroll-engine';
import ReaderView from '@/features/reader/ReaderView';

vi.mock('@/hooks/useQuranData');

// Mock the scroll engine so ScrollControls inside ReaderView doesn't try to
// construct a real rAF-driven engine during the test.
vi.mock('@/lib/scroll-engine', () => ({
  createScrollEngine: vi.fn(),
}));

const quranData = realQuranData as Quran;
const mockUseQuranData = vi.mocked(useQuranData);
const mockCreateScrollEngine = vi.mocked(createScrollEngine);

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

beforeEach(() => {
  mockUseQuranData.mockReset();
  mockCreateScrollEngine.mockReturnValue(makeEngineMock());

  // Stub rAF so ScrollControls' engine constructor doesn't fail in jsdom.
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    setTimeout(() => cb(performance.now()), 16);
    return 0;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ReaderView — loading state', () => {
  it('renders a role="status" element while data is pending', () => {
    mockUseQuranData.mockReturnValue({ data: undefined, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status.textContent?.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Out-of-range surah number
// ---------------------------------------------------------------------------

describe('ReaderView — invalid surah number', () => {
  it('shows a role="alert" error for an out-of-range surah number', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={999} onBack={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// RTL / lang attributes
// ---------------------------------------------------------------------------

describe('ReaderView — RTL and lang attributes', () => {
  it('renders an element with dir="rtl" and lang="ar" wrapping the ayah content', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} />);
    const rtlEl = document.querySelector('[dir="rtl"][lang="ar"]');
    expect(rtlEl).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Al-Fatiha (surah 1) — 7 ayahs
// ---------------------------------------------------------------------------

describe('ReaderView — Al-Fatiha (surah 1)', () => {
  it('renders exactly 7 ayah elements for Al-Fatiha', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} />);
    const ayahs = screen.getAllByTestId('ayah');
    expect(ayahs).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// TajweedAyah integration — no raw markers leak into the DOM
// ---------------------------------------------------------------------------

describe('ReaderView — tajweed marker rendering', () => {
  it('renders Al-Fatiha verse 1 without any literal [ or ] characters in the DOM', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} />);
    // The tajweed parser must strip all marker syntax; none should appear in text content.
    const ayahs = screen.getAllByTestId('ayah');
    ayahs.forEach((el) => {
      expect(el.textContent).not.toMatch(/\[/);
      expect(el.textContent).not.toMatch(/\]/);
    });
  });
});

// ---------------------------------------------------------------------------
// Al-Baqarah (surah 2) — 286 ayahs smoke test
// ---------------------------------------------------------------------------

describe('ReaderView — Al-Baqarah (surah 2)', () => {
  it('renders exactly 286 ayah elements for Al-Baqarah without crashing', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={2} onBack={vi.fn()} />);
    const ayahs = screen.getAllByTestId('ayah');
    expect(ayahs).toHaveLength(286);
  });
});

// ---------------------------------------------------------------------------
// Hook-level error branch
// ---------------------------------------------------------------------------

describe('ReaderView — hook error', () => {
  it('renders an error message when the data hook fails to load', () => {
    mockUseQuranData.mockReturnValue({ data: undefined, error: new Error('load failure') });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('load failure');
  });
});

// ---------------------------------------------------------------------------
// Back button
// ---------------------------------------------------------------------------

describe('ReaderView — back button', () => {
  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={onBack} />);

    const backButton = screen.getByRole('button', { name: /back to surah list/i });
    await user.click(backButton);

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('back button is a real <button> element with an accessible label', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} />);
    const backButton = screen.getByRole('button', { name: /back to surah list/i });
    expect(backButton.tagName).toBe('BUTTON');
  });
});

// ---------------------------------------------------------------------------
// ScrollControls integration — both the back button and scroll controls render
// ---------------------------------------------------------------------------

describe('ReaderView — ScrollControls integration', () => {
  it('renders scroll controls alongside the back button in a valid ReaderView', () => {
    mockUseQuranData.mockReturnValue({
      data: {
        surahs: [
          {
            number: 1,
            name: 'الفاتحة',
            englishName: 'Al-Fatiha',
            ayahs: [{ number: 1, text: 'بِسْمِ ٱللَّهِ' }],
          },
        ],
      },
      error: undefined,
    });

    render(<ReaderView surahNumber={1} onBack={vi.fn()} />);

    // The back button must be present.
    expect(screen.getByRole('button', { name: /back to surah list/i })).toBeInTheDocument();

    // ScrollControls must also be rendered inside the reader.
    expect(
      screen.getByRole('button', { name: /start auto-scroll|pause auto-scroll/i }),
    ).toBeInTheDocument();
  });
});
