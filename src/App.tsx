import { useEffect, useRef, useState } from 'react';
import SurahPicker from '@/features/surah-picker/SurahPicker';
import ReaderView from '@/features/reader/ReaderView';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { loadBookmark, saveBookmark } from '@/lib/bookmark';
import type { Bookmark } from '@/lib/bookmark';
import { useSettings } from '@/hooks/useSettings';
import { intervalMsToPxPerFrame } from '@/lib/speed';
import styles from './App.module.css';

const DEBOUNCE_MS = 500;

export default function App() {
  // Read the bookmark exactly once per App instance. The ref sentinel (undefined)
  // distinguishes "not yet initialised" from null/Bookmark, so React StrictMode
  // double-invocations don't produce a second localStorage read.
  const initialBookmarkRef = useRef<Bookmark | null | undefined>(undefined);
  if (initialBookmarkRef.current === undefined) {
    initialBookmarkRef.current = loadBookmark() ?? null;
  }

  const [selectedSurah, setSelectedSurah] = useState<number | null>(
    initialBookmarkRef.current?.surahNumber ?? null,
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, setTextSize, setScrollInterval } = useSettings();

  // Compute px-per-frame from persisted interval and current text size.
  // This value flows down to ScrollControls which forwards it to the engine.
  const pxPerFrame = intervalMsToPxPerFrame(settings.scrollIntervalMs, settings.textSizeRem);

  // Holds the debounce timer ID so we can cancel it on unmount.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // selectedSurahRef mirrors state so the scroll listener always captures the
  // current value without needing to be re-registered on every state change.
  const selectedSurahRef = useRef<number | null>(selectedSurah);
  useEffect(() => {
    selectedSurahRef.current = selectedSurah;
  });

  // Restore scroll position after a saved bookmark is resumed. We defer by
  // 100ms so the reader's useQuranData hook has had time to fetch and render
  // the surah content (the content height must be in the DOM before scrollTo
  // lands at the right position on real browsers).
  //
  // The effect intentionally runs only on mount. initialBookmarkRef is a ref
  // (stable identity) so the exhaustive-deps rule is satisfied without listing
  // it — reading .current inside an effect is the documented ref pattern.
  useEffect(() => {
    const savedScrollY = initialBookmarkRef.current?.scrollY;
    if (savedScrollY === undefined || savedScrollY === null) return;
    const id = setTimeout(() => {
      window.scrollTo(0, savedScrollY);
    }, 100);
    return () => clearTimeout(id);
  }, []);

  // Register the scroll listener. It saves the bookmark at most once per
  // DEBOUNCE_MS while the user is scrolling.
  useEffect(() => {
    function handleScroll() {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const surah = selectedSurahRef.current;
        if (surah === null) return;
        saveBookmark({ surahNumber: surah, scrollY: window.scrollY });
      }, DEBOUNCE_MS);
    }

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  function handleSelectSurah(surahNumber: number): void {
    setSelectedSurah(surahNumber);
    // Save immediately on surah change rather than waiting for a scroll event
    // so the picked surah is persisted even if the user never scrolls.
    saveBookmark({ surahNumber, scrollY: 0 });
  }

  function handleBack(): void {
    setSelectedSurah(null);
    // Bookmark is intentionally kept in storage on back so reopening the app
    // still resumes the last surah (the user may have tapped back accidentally).
  }

  return (
    <div id="app-shell">
      {selectedSurah === null ? (
        <SurahPicker onSelect={handleSelectSurah} />
      ) : (
        <ReaderView
          surahNumber={selectedSurah}
          onBack={handleBack}
          textSizeRem={settings.textSizeRem}
          pxPerFrame={pxPerFrame}
        />
      )}
      <button
        type="button"
        className={styles.settingsButton}
        aria-label="Open settings"
        onClick={() => setIsSettingsOpen(true)}
      >
        &#x2699;
      </button>
      <SettingsPanel
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        textSizeRem={settings.textSizeRem}
        onTextSizeChange={setTextSize}
        scrollIntervalMs={settings.scrollIntervalMs}
        onScrollIntervalChange={setScrollInterval}
      />
    </div>
  );
}
