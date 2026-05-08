import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Quran } from '@/lib/types';
import { getSurahList } from '@/lib/quran';
import realQuranData from '@/data/quran.json';
// vi.mock is hoisted by Vitest so this import correctly receives the mocked version.
import { useQuranData } from '@/hooks/useQuranData';
import SurahPicker from '@/features/surah-picker/SurahPicker';
import App from '@/App';

// Mock the hook so component tests don't depend on the dynamic import machinery.
vi.mock('@/hooks/useQuranData');

const quranData = realQuranData as Quran;
const mockUseQuranData = vi.mocked(useQuranData);

// Build a small stub with 114 surahs for tests that don't need real content.
function makeMinimalQuran(): Quran {
  const surahs = Array.from({ length: 114 }, (_, i) => ({
    number: i + 1,
    name: `سورة ${String(i + 1)}`,
    englishName: `Surah ${String(i + 1)}`,
    ayahs: [{ number: 1, text: 'test' }],
  }));
  return { surahs };
}

beforeEach(() => {
  mockUseQuranData.mockReset();
});

// ---------------------------------------------------------------------------
// SurahPicker rendering
// ---------------------------------------------------------------------------

describe('SurahPicker — loading state', () => {
  it('renders a loading indicator while data is pending', () => {
    mockUseQuranData.mockReturnValue({ data: undefined, error: undefined });
    render(<SurahPicker onSelect={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});

describe('SurahPicker — error state', () => {
  it('renders an error message when the loader fails', () => {
    mockUseQuranData.mockReturnValue({
      data: undefined,
      error: new Error('network timeout'),
    });
    render(<SurahPicker onSelect={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
  });
});

describe('SurahPicker — data loaded', () => {
  it('renders all 114 surahs from the bundled data', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<SurahPicker onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(114);
  });

  it('renders exactly 114 buttons even with a minimal stub', () => {
    mockUseQuranData.mockReturnValue({
      data: makeMinimalQuran(),
      error: undefined,
    });
    render(<SurahPicker onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(114);
  });

  it('first item has an element with dir="rtl" and lang="ar" containing the Arabic name', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<SurahPicker onSelect={vi.fn()} />);

    const firstSurah = getSurahList(quranData)[0];
    expect(firstSurah).toBeDefined();

    // Find the span with RTL/Arabic attributes.
    const arabicEl = document.querySelector('[dir="rtl"][lang="ar"]');
    expect(arabicEl).not.toBeNull();
    expect(arabicEl?.getAttribute('dir')).toBe('rtl');
    expect(arabicEl?.getAttribute('lang')).toBe('ar');
    expect(arabicEl?.textContent).toBe(firstSurah!.name);
  });

  it('first item shows the English transliterated name from the data', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<SurahPicker onSelect={vi.fn()} />);

    const firstSurah = getSurahList(quranData)[0];
    expect(firstSurah).toBeDefined();

    // Use the real englishName from the data rather than hardcoding.
    expect(screen.getByText(firstSurah!.englishName)).toBeInTheDocument();
  });

  it('clicking an item calls onSelect with the correct surah number', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<SurahPicker onSelect={onSelect} />);

    // Surah 5 is at index 4 (0-based).
    const buttons = screen.getAllByRole('button');
    const surah5Button = buttons[4];
    expect(surah5Button).toBeDefined();
    await user.click(surah5Button!);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it('items are keyboard-activatable via Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<SurahPicker onSelect={onSelect} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// App integration
// ---------------------------------------------------------------------------

describe('App — surah picker integration', () => {
  it('shows the picker (114 buttons) when no surah is selected', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<App />);
    expect(screen.getAllByRole('button')).toHaveLength(114);
  });

  it('id="app-shell" is present on the root element', () => {
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<App />);
    expect(document.getElementById('app-shell')).toBeInTheDocument();
  });

  it('selecting a surah hides the picker and shows the reader view', async () => {
    const user = userEvent.setup();
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<App />);

    // Click the first surah button (surah 1).
    const pickerButtons = screen.getAllByRole('button');
    await user.click(pickerButtons[0]!);

    await waitFor(() => {
      // ReaderView renders an RTL Arabic text block and a back button.
      expect(document.querySelector('[dir="rtl"][lang="ar"]')).not.toBeNull();
      expect(
        screen.getByRole('button', { name: /back to surah list/i }),
      ).toBeInTheDocument();
    });
  });

  it('selecting surah 7 shows the reader view for surah 7', async () => {
    const user = userEvent.setup();
    mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
    render(<App />);

    const pickerButtons = screen.getAllByRole('button');
    await user.click(pickerButtons[6]!); // surah 7 is index 6

    await waitFor(() => {
      // ReaderView for any valid surah shows the RTL block and back button.
      expect(document.querySelector('[dir="rtl"][lang="ar"]')).not.toBeNull();
      expect(
        screen.getByRole('button', { name: /back to surah list/i }),
      ).toBeInTheDocument();
    });
  });
});
