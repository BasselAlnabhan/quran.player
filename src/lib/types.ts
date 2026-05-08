export type Ayah = {
  number: number;
  text: string;
};

export type Surah = {
  number: number;
  name: string;
  englishName: string;
  ayahs: Array<Ayah>;
};

export type Quran = {
  surahs: Array<Surah>;
};
