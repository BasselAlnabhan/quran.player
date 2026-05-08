import { useState } from 'react';
import SurahPicker from '@/features/surah-picker/SurahPicker';

export default function App() {
  const [selectedSurah, setSelectedSurah] = useState<number | undefined>(
    undefined,
  );

  return (
    <div id="app-shell">
      {selectedSurah === undefined ? (
        <SurahPicker onSelect={setSelectedSurah} />
      ) : (
        <div data-testid="reader-placeholder">Surah {selectedSurah}</div>
      )}
    </div>
  );
}
