/**
 * App-level bookmark integration tests.
 *
 * These tests verify that App.tsx correctly integrates with the bookmark lib:
 * resume on mount, debounced scroll saves, immediate save on surah change,
 * and cleanup on unmount.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Quran } from '@/lib/types';
import type { ScrollEngine } from '@/lib/scroll-engine';
import { useQuranData } from '@/hooks/useQuranData';
import { createScrollEngine } from '@/lib/scroll-engine';
import * as bookmarkLib from '@/lib/bookmark';
import App from '@/App';

// Mock hooks/data deps so App renders without real data fetching.
vi.mock('@/hooks/useQuranData');
vi.mock('@/lib/scroll-engine', () => ({
  createScrollEngine: vi.fn(),
}));

const mockUseQuranData = vi.mocked(useQuranData);
const mockCreateScrollEngine = vi.mocked(createScrollEngine);

function makeEngineMock(): ScrollEngine {
  return {
    start: vi.fn<[], void>(),
    stop: vi.fn<[], void>(),
    setSpeed: vi.fn<[number], void>(),
    isRunning: vi.fn<[], boolean>(() => false),
    destroy: vi.fn<[], void>(),
  };
}

// Minimal quran data stub so the picker renders all 114 buttons.
function makeMinimalQuran(): Quran {
  const surahs = Array.from({ length: 114 }, (_, i) => ({
    number: i + 1,
    name: `سورة ${String(i + 1)}`,
    englishName: `Surah ${String(i + 1)}`,
    ayahs: [{ number: 1, text: 'test' }],
  }));
  return { surahs };
}

const quranData = makeMinimalQuran();

beforeEach(() => {
  // Clear localStorage so each test starts clean and isolated.
  localStorage.clear();

  mockUseQuranData.mockReset();
  mockUseQuranData.mockReturnValue({ data: quranData, error: undefined });
  mockCreateScrollEngine.mockReturnValue(makeEngineMock());

  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    setTimeout(() => cb(performance.now()), 16);
    return 0;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  // jsdom doesn't implement window.scrollTo; stub it to silence "not implemented" errors.
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Criterion 8 — App resume on mount
// ---------------------------------------------------------------------------

describe('App — resume from bookmark on mount', () => {
  it('renders the reader for a bookmarked surah instead of the picker', () => {
    bookmarkLib.saveBookmark({ surahNumber: 5, scrollY: 200 });

    render(<App />);

    // The reader renders the back button; picker has 114 surah buttons but no back button.
    expect(screen.getByRole('button', { name: /back to surah list/i })).toBeInTheDocument();
  });

  it('calls window.scrollTo with the saved scrollY after the deferral timeout', () => {
    vi.useFakeTimers();

    bookmarkLib.saveBookmark({ surahNumber: 5, scrollY: 200 });

    render(<App />);

    // Before the 100ms timeout fires, scrollTo should not have been called.
    expect(window.scrollTo).not.toHaveBeenCalled();

    // Advance past the deferral delay. The callback calls window.scrollTo (not
    // a React state update), so act() wrapping is not required here.
    vi.advanceTimersByTime(200);

    expect(window.scrollTo).toHaveBeenCalledWith(0, 200);
  });

  it('does not call window.scrollTo when there is no saved bookmark', () => {
    vi.useFakeTimers();

    render(<App />);

    vi.advanceTimersByTime(200);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('renders the picker when there is no bookmark', () => {
    render(<App />);
    // 114 surah buttons + 1 persistent settings button = 115 total.
    expect(screen.getAllByRole('button')).toHaveLength(115);
  });
});

// ---------------------------------------------------------------------------
// Criterion 9 — Debounced scroll save
// ---------------------------------------------------------------------------

describe('App — debounced scroll save', () => {
  it('does not save after rapid scroll events before debounce window expires', () => {
    vi.useFakeTimers();

    // Start with a selected surah so saving is meaningful.
    bookmarkLib.saveBookmark({ surahNumber: 3, scrollY: 0 });

    render(<App />);

    // Spy on saveBookmark AFTER render to count only scroll-listener saves.
    const saveBookmarkSpy = vi.spyOn(bookmarkLib, 'saveBookmark');

    // Dispatch 5 scroll events rapidly.
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event('scroll'));
    }

    // Advance to 100ms — before the 500ms debounce, no scroll-triggered saves.
    vi.advanceTimersByTime(100);

    expect(saveBookmarkSpy).not.toHaveBeenCalled();

    // Advance to 500ms — exactly one save fires.
    vi.advanceTimersByTime(400);

    expect(saveBookmarkSpy).toHaveBeenCalledTimes(1);
  });

  it('fires exactly one more save per new burst of scroll events', () => {
    vi.useFakeTimers();

    bookmarkLib.saveBookmark({ surahNumber: 3, scrollY: 0 });

    render(<App />);

    const saveBookmarkSpy = vi.spyOn(bookmarkLib, 'saveBookmark');

    // First burst — 5 rapid events, wait for debounce.
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event('scroll'));
    }

    vi.advanceTimersByTime(500);

    expect(saveBookmarkSpy).toHaveBeenCalledTimes(1);

    // Second burst — one event, wait for debounce.
    window.dispatchEvent(new Event('scroll'));

    vi.advanceTimersByTime(500);

    expect(saveBookmarkSpy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Criterion 10 — Immediate save on surah change
// ---------------------------------------------------------------------------

describe('App — immediate save on surah change', () => {
  it('saves the bookmark immediately when a surah is selected from the picker', async () => {
    // Use real timers for user interaction (fake timers cause userEvent timeouts).
    const user = userEvent.setup();

    render(<App />);

    const saveBookmarkSpy = vi.spyOn(bookmarkLib, 'saveBookmark');

    const buttons = screen.getAllByRole('button');
    // Surah 3 is at index 2 in the picker list.
    await user.click(buttons[2]!);

    // saveBookmark should have been called immediately on click (not waiting for debounce).
    expect(saveBookmarkSpy).toHaveBeenCalledWith({ surahNumber: 3, scrollY: 0 });
  });

  it('the saved bookmark contains the correct surahNumber after selection', async () => {
    const user = userEvent.setup();

    render(<App />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[6]!); // surah 7 is at index 6

    const stored = bookmarkLib.loadBookmark();
    expect(stored?.surahNumber).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Criterion 11 — Cleanup on unmount
// ---------------------------------------------------------------------------

describe('App — cleanup on unmount', () => {
  it('does not call saveBookmark after unmount when scroll events are dispatched', () => {
    vi.useFakeTimers();

    bookmarkLib.saveBookmark({ surahNumber: 3, scrollY: 0 });

    const { unmount } = render(<App />);

    const saveBookmarkSpy = vi.spyOn(bookmarkLib, 'saveBookmark');

    unmount();

    // Dispatch scroll events after unmount.
    for (let i = 0; i < 3; i++) {
      window.dispatchEvent(new Event('scroll'));
    }

    // Advance past the debounce window — nothing should fire.
    vi.advanceTimersByTime(600);

    expect(saveBookmarkSpy).not.toHaveBeenCalled();
  });

  it('clears the pending debounce timer on unmount so no save fires afterward', () => {
    vi.useFakeTimers();

    bookmarkLib.saveBookmark({ surahNumber: 3, scrollY: 0 });

    const { unmount } = render(<App />);

    const saveBookmarkSpy = vi.spyOn(bookmarkLib, 'saveBookmark');

    // Trigger a scroll to arm the debounce timer.
    window.dispatchEvent(new Event('scroll'));

    // Unmount before the 500ms debounce window closes.
    unmount();

    // Advance past where the timer would have fired.
    vi.advanceTimersByTime(600);

    // The pending timer should have been cleared on unmount — no save.
    expect(saveBookmarkSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Back to picker — bookmark kept
// ---------------------------------------------------------------------------

describe('App — back to picker', () => {
  it('keeps the bookmark in storage when the back button is pressed', async () => {
    const user = userEvent.setup();

    bookmarkLib.saveBookmark({ surahNumber: 5, scrollY: 200 });

    render(<App />);

    // The reader is shown (bookmark resumed surah 5); press back.
    const backButton = screen.getByRole('button', { name: /back to surah list/i });
    await user.click(backButton);

    await waitFor(() => {
      // After going back, the bookmark must still be in storage.
      const stored = bookmarkLib.loadBookmark();
      expect(stored).toBeDefined();
      expect(stored?.surahNumber).toBe(5);
    });
  });
});
