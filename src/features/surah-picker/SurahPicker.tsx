import { useQuranData } from '@/hooks/useQuranData';
import { getSurahList } from '@/lib/quran';
import styles from './SurahPicker.module.css';

type Props = {
  onSelect: (surahNumber: number) => void;
};

export default function SurahPicker({ onSelect }: Props) {
  const { data, error } = useQuranData();

  if (error) {
    return (
      <p className={styles.error} role="alert">
        Failed to load Quran data: {error.message}
      </p>
    );
  }

  if (!data) {
    return (
      <p className={styles.loading} role="status">
        Loading…
      </p>
    );
  }

  const surahs = getSurahList(data);

  return (
    <ul className={styles.list} aria-label="Surah list">
      {surahs.map((surah) => (
        <li key={surah.number}>
          <button
            type="button"
            className={styles.item}
            onClick={() => onSelect(surah.number)}
          >
            <span
              className={styles.arabicName}
              dir="rtl"
              lang="ar"
            >
              {surah.name}
            </span>
            <span className={styles.englishName}>{surah.englishName}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
