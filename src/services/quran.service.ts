import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface InternalSurah {
  id: number;
  name: string;
  name_arabic: string;
  total_ayahs: number;
  revelation_type: string;
}

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface InternalAyah {
  surah_id: number;
  ayah_number: number;
  arabic_text: string;
  translation: string;
}

interface Ayah {
  number: number;
  surah: number;
  numberInSurah: number;
  text: string;
  translation: string;
}

interface QuranData {
  surahs: InternalSurah[];
  ayahs: InternalAyah[];
}

let quranData: QuranData | null = null;
let lastLoadTime = 0;

const loadQuranData = (): QuranData => {
  // Cache for 1 hour in production
  const now = Date.now();
  if (quranData && now - lastLoadTime < 3600000) {
    return quranData;
  }

  const dataPath = join(__dirname, "../data/quran-data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  quranData = data;
  lastLoadTime = now;
  return data;
};

/**
 * Transform internal surah format to API format
 */
const transformSurah = (internalSurah: InternalSurah): Surah => ({
  number: internalSurah.id,
  name: internalSurah.name_arabic,
  englishName: internalSurah.name,
  englishNameTranslation: internalSurah.name,
  numberOfAyahs: internalSurah.total_ayahs,
  revelationType: internalSurah.revelation_type,
});

/**
 * Transform internal ayah format to API format
 */
const transformAyah = (internalAyah: InternalAyah): Ayah => ({
  number: internalAyah.ayah_number,
  surah: internalAyah.surah_id,
  numberInSurah: internalAyah.ayah_number,
  text: internalAyah.arabic_text,
  translation: internalAyah.translation,
});

export const QuranService = {
  /**
   * Get all surahs
   */
  getAllSurahs: (): Surah[] => {
    const data = loadQuranData();
    return data.surahs.map(transformSurah);
  },

  /**
   * Get a specific surah with all its ayahs
   */
  getSurah: (surahId: number): (Surah & { ayahs: Ayah[] }) | null => {
    const data = loadQuranData();
    const surah = data.surahs.find((s) => s.id === surahId);

    if (!surah) {
      return null;
    }

    const ayahs = data.ayahs
      .filter((a) => a.surah_id === surahId)
      .map(transformAyah);

    return {
      ...transformSurah(surah),
      ayahs,
    };
  },

  /**
   * Search ayahs by translation text
   */
  searchAyahs: (
    query: string,
    page: number = 1,
    limit: number = 20,
  ): {
    results: (Ayah & {
      surahNumber: number;
      surahName: string;
      surahEnglishName: string;
    })[];
    total: number;
    page: number;
    total_pages: number;
    limit: number;
  } => {
    const data = loadQuranData();
    const lowerQuery = query.toLowerCase();

    // Filter ayahs matching the search query
    const matchedAyahs = data.ayahs.filter((ayah) =>
      ayah.translation.toLowerCase().includes(lowerQuery),
    );

    // Enrich with surah information
    const enrichedResults = matchedAyahs.map((ayah) => {
      const surah = data.surahs.find((s) => s.id === ayah.surah_id);
      return {
        ...transformAyah(ayah),
        surahNumber: surah?.id || 0,
        surahName: surah?.name_arabic || "Unknown",
        surahEnglishName: surah?.name || "Unknown",
      };
    });

    // Paginate results
    const total = enrichedResults.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const results = enrichedResults.slice(startIndex, endIndex);

    return {
      results,
      total,
      page,
      total_pages,
      limit,
    };
  },

  /**
   * Get ayahs by surah with pagination
   */
  getAyahsBySurah: (
    surahId: number,
    page: number = 1,
    limit: number = 20,
  ): {
    surah: Surah | null;
    ayahs: Ayah[];
    total: number;
    page: number;
    total_pages: number;
  } => {
    const data = loadQuranData();
    const surah = data.surahs.find((s) => s.id === surahId);

    const ayahs = data.ayahs
      .filter((a) => a.surah_id === surahId)
      .map(transformAyah);
    const total = ayahs.length;
    const total_pages = Math.ceil(total / limit);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      surah: surah ? transformSurah(surah) : null,
      ayahs: ayahs.slice(startIndex, endIndex),
      total,
      page,
      total_pages,
    };
  },

  /**
   * Get specific ayah
   */
  getAyah: (surahId: number, ayahNumber: number): Ayah | null => {
    const data = loadQuranData();
    const ayah = data.ayahs.find(
      (a) => a.surah_id === surahId && a.ayah_number === ayahNumber,
    );
    return ayah ? transformAyah(ayah) : null;
  },

  /**
   * Get cache status
   */
  getCacheStatus: () => {
    return {
      cached: quranData !== null,
      total_surahs: quranData?.surahs.length || 0,
      total_ayahs: quranData?.ayahs.length || 0,
      last_load_time: new Date(lastLoadTime).toISOString(),
    };
  },
};
