import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Quran } from '@/lib/types';
import realQuranData from '@/data/quran.json';
// vi.mock calls are hoisted by Vitest so imports below receive the mocked versions.
import { useQuranData } from '@/hooks/useQuranData';
import ReaderView from '@/features/reader/ReaderView';

vi.mock('@/hooks/useQuranData');

const quranData = realQuranData as Quran;
const mockUseQuranData = vi.mocked(useQuranData);

beforeEach(() => {
  mockUseQuranData.mockReset();
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
    render(<ReaderView surahNumber={1} onBack={vi.fn()} textSizeRem={1.5} />);
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
    render(<ReaderView surahNumber={999} onBack={vi.fn()} textSizeRem={1.5} />);
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
    render(<ReaderView surahNumber={1} onBack={vi.fn()} textSizeRem={1.5} />);
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
    render(<ReaderView surahNumber={1} onBack={vi.fn()} textSizeRem={1.5} />);
    const ayahs = screen.getAllByTestId('ayah');
    expect(ayahs).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Ayah text — plain Arabic text rendered directly
// ---------------------------------------------------------------------------

describe('ReaderView — ayah text rendering', () => {
  it('renders Al-Fatiha ayah 1 with non-empty Arabic text in the DOM', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} textSizeRem={1.5} />);
    // Plain Uthmani text renders directly — no annotation markers should appear.
    const ayahs = screen.getAllByTestId('ayah');
    ayahs.forEach((el) => {
      expect(el.textContent?.trim().length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Al-Baqarah (surah 2) — 286 ayahs smoke test
// ---------------------------------------------------------------------------

describe('ReaderView — Al-Baqarah (surah 2)', () => {
  it('renders exactly 286 ayah elements for Al-Baqarah without crashing', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={2} onBack={vi.fn()} textSizeRem={1.5} />);
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
    render(<ReaderView surahNumber={1} onBack={vi.fn()} textSizeRem={1.5} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('load failure');
  });
});

// ---------------------------------------------------------------------------
// Back navigation — SR-only button + Esc keyboard fallback
// ---------------------------------------------------------------------------

describe('ReaderView — back navigation', () => {
  it('SR-only back button is in the DOM with the correct accessible label', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} textSizeRem={1.5} />);
    // The button must exist for AT users; it is visually hidden but in the DOM.
    const backButton = screen.getByRole('button', { name: /back to surah list/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton.tagName).toBe('BUTTON');
  });

  it('calls onBack when Escape is pressed', () => {
    const onBack = vi.fn();
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={onBack} textSizeRem={1.5} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('calls onBack when the SR-only back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={onBack} textSizeRem={1.5} />);

    const backButton = screen.getByRole('button', { name: /back to surah list/i });
    await user.click(backButton);

    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// ScrollControls integration — removed: ScrollControls is now rendered in the
// App-level <footer>, not inside ReaderView. App-level tests cover this.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// textSizeRem prop — inline font-size
// ---------------------------------------------------------------------------

describe('ReaderView — textSizeRem prop', () => {
  it('applies the textSizeRem prop as an inline fontSize on the ayah block', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<ReaderView surahNumber={1} onBack={vi.fn()} textSizeRem={2.0} />);

    const ayahBlock = document.querySelector<HTMLElement>('[dir="rtl"][lang="ar"]');
    expect(ayahBlock).not.toBeNull();
    expect(ayahBlock?.style.fontSize).toBe('2rem');
  });
});
