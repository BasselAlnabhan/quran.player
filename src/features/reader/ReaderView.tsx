import { useEffect } from 'react';
import { useQuranData } from '@/hooks/useQuranData';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { getSurah, splitBasmala } from '@/lib/quran';
import styles from './ReaderView.module.css';

type Props = {
  surahNumber: number;
  onBack: () => void;
  textSizeRem: number;
};

export default function ReaderView({ surahNumber, onBack, textSizeRem }: Props) {
  const { data, error } = useQuranData();

  // Swipe gesture handles the primary back navigation on touch devices.
  useSwipeBack(onBack);

  // Esc key provides a keyboard fallback for sighted users who don't use a
  // pointing device. The listener is on document so it works regardless of
  // which child element has focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.error} role="alert">
          Failed to load Quran data: {error.message}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <p className={styles.status} role="status">
          Loading…
        </p>
      </div>
    );
  }

  const surah = getSurah(data, surahNumber);

  if (!surah) {
    return (
      <div className={styles.container}>
        <p className={styles.error} role="alert">
          Surah {surahNumber} not found. Please select a valid surah (1–114).
        </p>
      </div>
    );
  }

  // Only inspect the first ayah — the Basmala appears mid-text in Surah 27:30
  // (Solomon's letter) and must never be extracted from there.
  const firstAyah = surah.ayahs[0];
  const { basmala, rest: firstRest } = firstAyah
    ? splitBasmala(firstAyah.text)
    : { basmala: null, rest: '' };

  return (
    <div className={styles.container}>
      {/* SR-only button: visually hidden but reachable via Tab for AT users.
          The :focus rule in the CSS reveals it when keyboard-focused (skip-link
          pattern), giving sighted keyboard users a visible target too. */}
      <button type="button" onClick={onBack} className={styles.srOnly}>
        Back to surah list
      </button>
      {/* Basmala is rendered as a centered title when present; omitted for Surah 9. */}
      {basmala !== null && (
        <div
          className={styles.basmala}
          dir="rtl"
          lang="ar"
          style={{ fontSize: `${textSizeRem}rem` }}
        >
          {basmala}
        </div>
      )}
      {/* dir and lang on the text block so auto-scroll engine and AT see the RTL context.
          textSizeRem is applied as inline style so it overrides the CSS default immediately
          without CSS variable plumbing. */}
      <p className={styles.ayahBlock} dir="rtl" lang="ar" style={{ fontSize: `${textSizeRem}rem` }}>
        {surah.ayahs.map((ayah, i) => {
          // First ayah uses the remainder after stripping the Basmala (may be empty for Surah 1).
          const text = basmala !== null && i === 0 ? firstRest : ayah.text;
          return (
            <span key={ayah.number} data-testid="ayah">
              {text}
              {' '}
              <span className={styles.ayahNumber}>({ayah.number})</span>
              {' '}
            </span>
          );
        })}
      </p>
    </div>
  );
}
