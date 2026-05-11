import { useEffect } from 'react';
import { useQuranData } from '@/hooks/useQuranData';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { getSurah } from '@/lib/quran';
import ScrollControls from './ScrollControls';
import TajweedAyah from './TajweedAyah';
import styles from './ReaderView.module.css';

type Props = {
  surahNumber: number;
  onBack: () => void;
  textSizeRem: number;
  pxPerFrame: number;
};

export default function ReaderView({ surahNumber, onBack, textSizeRem, pxPerFrame }: Props) {
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

  return (
    <div className={styles.container}>
      {/* SR-only button: visually hidden but reachable via Tab for AT users.
          The :focus rule in the CSS reveals it when keyboard-focused (skip-link
          pattern), giving sighted keyboard users a visible target too. */}
      <button type="button" onClick={onBack} className={styles.srOnly}>
        Back to surah list
      </button>
      {/* dir and lang on the text block so auto-scroll engine and AT see the RTL context.
          textSizeRem is applied as inline style so it overrides the CSS default immediately
          without CSS variable plumbing. */}
      <p className={styles.ayahBlock} dir="rtl" lang="ar" style={{ fontSize: `${textSizeRem}rem` }}>
        {surah.ayahs.map((ayah) => (
          <span key={ayah.number} data-testid="ayah">
            <TajweedAyah text={ayah.text} />
            {' '}
            <span className={styles.ayahNumber}>({ayah.number})</span>
            {' '}
          </span>
        ))}
      </p>
      <ScrollControls pxPerFrame={pxPerFrame} />
    </div>
  );
}
