import { useQuranData } from '@/hooks/useQuranData';
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

  if (error) {
    return (
      <div className={styles.container}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          Back to surah list
        </button>
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
        <button type="button" className={styles.backButton} onClick={onBack}>
          Back to surah list
        </button>
        <p className={styles.error} role="alert">
          Surah {surahNumber} not found. Please select a valid surah (1–114).
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backButton} onClick={onBack}>
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
