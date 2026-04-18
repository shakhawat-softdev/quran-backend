import { Context } from "hono";
import { QuranService } from "../services/quran.service.js";

export const QuranController = {
  /**
   * Get all surahs
   */
  getAllSurahs: (c: Context) => {
    try {
      const surahs = QuranService.getAllSurahs();

      return c.json({
        success: true,
        data: surahs,
        metadata: {
          total: surahs.length,
          cache_status: QuranService.getCacheStatus(),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch surahs",
        },
        500,
      );
    }
  },

  /**
   * Get a specific surah with all ayahs
   */
  getSurah: (c: Context) => {
    try {
      const id = parseInt(c.req.param("id") || "0");

      if (isNaN(id) || id < 1 || id > 114) {
        return c.json(
          {
            success: false,
            error: "Invalid surah ID. Must be between 1 and 114",
          },
          400,
        );
      }

      const surah = QuranService.getSurah(id);

      if (!surah) {
        return c.json(
          {
            success: false,
            error: "Surah not found",
          },
          404,
        );
      }

      return c.json({
        success: true,
        data: surah,
        metadata: {
          ayahs_count: surah.ayahs.length,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch surah",
        },
        500,
      );
    }
  },

  /**
   * Get ayahs by surah with pagination
   */
  getAyahsBySurah: (c: Context) => {
    try {
      const surahId = parseInt(c.req.param("id") || "0");
      const page = parseInt(c.req.query("page") || "1");
      const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100); // Max 100 per page

      if (isNaN(surahId) || surahId < 1 || surahId > 114) {
        return c.json(
          {
            success: false,
            error: "Invalid surah ID. Must be between 1 and 114",
          },
          400,
        );
      }

      if (page < 1) {
        return c.json(
          {
            success: false,
            error: "Page must be greater than 0",
          },
          400,
        );
      }

      const result = QuranService.getAyahsBySurah(surahId, page, limit);

      if (!result.surah) {
        return c.json(
          {
            success: false,
            error: "Surah not found",
          },
          404,
        );
      }

      return c.json({
        success: true,
        data: {
          surah: result.surah,
          ayahs: result.ayahs,
        },
        metadata: {
          total_ayahs: result.total,
          page: result.page,
          total_pages: result.total_pages,
          has_next: result.page < result.total_pages,
          has_prev: result.page > 1,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch ayahs",
        },
        500,
      );
    }
  },

  /**
   * Search ayahs by translation
   */
  searchAyahs: (c: Context) => {
    try {
      const query = c.req.query("q")?.trim();
      const page = parseInt(c.req.query("page") || "1");
      const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100); // Max 100 per page

      if (!query || query.length < 2) {
        return c.json(
          {
            success: false,
            error: "Search query must be at least 2 characters",
          },
          400,
        );
      }

      if (query.length > 100) {
        return c.json(
          {
            success: false,
            error: "Search query must be less than 100 characters",
          },
          400,
        );
      }

      if (page < 1) {
        return c.json(
          {
            success: false,
            error: "Page must be greater than 0",
          },
          400,
        );
      }

      const result = QuranService.searchAyahs(query, page, limit);

      return c.json({
        success: true,
        data: result.results,
        metadata: {
          query,
          total_results: result.total,
          page: result.page,
          limit: result.limit,
          total_pages: result.total_pages,
          has_next: result.page < result.total_pages,
          has_prev: result.page > 1,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Search failed",
        },
        500,
      );
    }
  },

  /**
   * Get specific ayah
   */
  getAyah: (c: Context) => {
    try {
      const surahId = parseInt(c.req.param("id") || "0");
      const ayahNumber = parseInt(c.req.param("ayah") || "0");

      if (isNaN(surahId) || surahId < 1 || surahId > 114) {
        return c.json(
          {
            success: false,
            error: "Invalid surah ID. Must be between 1 and 114",
          },
          400,
        );
      }

      if (isNaN(ayahNumber) || ayahNumber < 1) {
        return c.json(
          {
            success: false,
            error: "Invalid ayah number",
          },
          400,
        );
      }

      const ayah = QuranService.getAyah(surahId, ayahNumber);

      if (!ayah) {
        return c.json(
          {
            success: false,
            error: "Ayah not found",
          },
          404,
        );
      }

      return c.json({
        success: true,
        data: ayah,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch ayah",
        },
        500,
      );
    }
  },

  /**
   * Get API status and metadata
   */
  getStatus: (c: Context) => {
    return c.json({
      success: true,
      status: "online",
      version: "1.0.0",
      cache: QuranService.getCacheStatus(),
      timestamp: new Date().toISOString(),
    });
  },
};
