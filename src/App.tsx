import { useState } from 'react';
import SurahPicker from '@/features/surah-picker/SurahPicker';
import ReaderView from '@/features/reader/ReaderView';

export default function App() {
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);

  return (
    <div id="app-shell">
      {selectedSurah === null ? (
        <SurahPicker onSelect={setSelectedSurah} />
      ) : (
        <ReaderView
          surahNumber={selectedSurah}
          onBack={() => setSelectedSurah(null)}
        />
      )}
    </div>
  );
}
