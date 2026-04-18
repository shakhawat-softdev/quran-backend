import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SurahMetadata {
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

interface RawAyah {
  translation: string;
  [key: string]: any;
}

interface Ayah {
  number: number;
  surah: number;
  numberInSurah: number;
  text: string;
  translation: string;
}

interface AllQuranData {
  [surahNumber: string]: RawAyah[];
}

let quranDataAll: AllQuranData | null = null;
let surahMetadata: SurahMetadata[] | null = null;
let lastLoadTime = 0;

const loadSurahMetadata = (): SurahMetadata[] => {
  if (surahMetadata) {
    return surahMetadata;
  }

  const metadataPath = join(__dirname, "../data/quran-data.json");
  const data = JSON.parse(readFileSync(metadataPath, "utf-8"));
  surahMetadata = data.surahs || [];
  return surahMetadata as SurahMetadata[];
};

const loadQuranDataAll = (): AllQuranData => {
  // Cache for 1 hour in production
  const now = Date.now();
  if (quranDataAll && now - lastLoadTime < 3600000) {
    return quranDataAll;
  }

  const dataPath = join(__dirname, "../data/quran-data-all.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  quranDataAll = data;
  lastLoadTime = now;
  return data;
};

/**
 * Transform surah metadata to API format
 */
const transformSurah = (metadata: SurahMetadata): Surah => ({
  number: metadata.id,
  name: metadata.name_arabic,
  englishName: metadata.name,
  englishNameTranslation: metadata.name,
  numberOfAyahs: metadata.total_ayahs,
  revelationType: metadata.revelation_type,
});

/**
 * Transform raw ayah to API format
 */
const transformAyah = (
  surahId: number,
  ayahNumber: number,
  rawAyah: RawAyah,
): Ayah => ({
  number: ayahNumber,
  surah: surahId,
  numberInSurah: ayahNumber,
  text: rawAyah.arabic_text || "",
  translation: rawAyah.translation,
});

export const QuranService = {
  /**
   * Get all surahs
   */
  getAllSurahs: (): Surah[] => {
    const metadata = loadSurahMetadata();
    return metadata.map(transformSurah);
  },

  /**
   * Get a specific surah with all its ayahs
   */
  getSurah: (surahId: number): (Surah & { ayahs: Ayah[] }) | null => {
    const metadata = loadSurahMetadata();
    const data = loadQuranDataAll();

    const surahMeta = metadata.find((s) => s.id === surahId);
    if (!surahMeta) {
      return null;
    }

    const rawAyahs = data[surahId.toString()] || [];
    const ayahs = rawAyahs.map((rawAyah, index) =>
      transformAyah(surahId, index + 1, rawAyah),
    );

    return {
      ...transformSurah(surahMeta),
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
    const metadata = loadSurahMetadata();
    const data = loadQuranDataAll();
    const lowerQuery = query.toLowerCase();

    // Collect all matching ayahs
    const matchedAyahs: (Ayah & {
      surahNumber: number;
      surahName: string;
      surahEnglishName: string;
    })[] = [];

    Object.entries(data).forEach(([surahIdStr, ayahs]) => {
      const surahId = parseInt(surahIdStr);
      const surahMeta = metadata.find((s) => s.id === surahId);

      ayahs.forEach((rawAyah, index) => {
        if (rawAyah.translation.toLowerCase().includes(lowerQuery)) {
          const ayah = transformAyah(surahId, index + 1, rawAyah);
          matchedAyahs.push({
            ...ayah,
            surahNumber: surahId,
            surahName: surahMeta?.name_arabic || "Unknown",
            surahEnglishName: surahMeta?.name || "Unknown",
          });
        }
      });
    });

    // Paginate results
    const total = matchedAyahs.length;
    const total_pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const results = matchedAyahs.slice(startIndex, endIndex);

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
    const metadata = loadSurahMetadata();
    const data = loadQuranDataAll();

    const surahMeta = metadata.find((s) => s.id === surahId);
    const rawAyahs = data[surahId.toString()] || [];

    const ayahs = rawAyahs.map((rawAyah, index) =>
      transformAyah(surahId, index + 1, rawAyah),
    );

    const total = ayahs.length;
    const total_pages = Math.ceil(total / limit);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      surah: surahMeta ? transformSurah(surahMeta) : null,
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
    const data = loadQuranDataAll();
    const rawAyahs = data[surahId.toString()];

    if (!rawAyahs || ayahNumber < 1 || ayahNumber > rawAyahs.length) {
      return null;
    }

    const rawAyah = rawAyahs[ayahNumber - 1];
    return transformAyah(surahId, ayahNumber, rawAyah);
  },

  /**
   * Get cache status
   */
  getCacheStatus: () => {
    const metadata = loadSurahMetadata();
    const data = loadQuranDataAll();

    let totalAyahs = 0;
    Object.values(data).forEach((ayahs) => {
      totalAyahs += ayahs.length;
    });

    return {
      cached: quranDataAll !== null,
      total_surahs: metadata.length,
      total_ayahs: totalAyahs,
      last_load_time: new Date(lastLoadTime).toISOString(),
    };
  },
};
