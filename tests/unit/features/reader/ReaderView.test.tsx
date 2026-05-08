import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Quran } from '@/lib/types';
import realQuranData from '@/data/quran.json';
// vi.mock is hoisted by Vitest so this import correctly receives the mocked version.
import { useQuranData } from '@/hooks/useQuranData';
import ReaderView from '@/features/reader/ReaderView';

vi.mock('@/hooks/useQuranData');

const quranData = realQuranData as Quran;
const mockUseQuranData = vi.mocked(useQuranData);

beforeEach(() => {
  mockUseQuranData.mockReset();
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
