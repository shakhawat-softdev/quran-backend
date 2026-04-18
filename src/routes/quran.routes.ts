import { Hono } from "hono";
import { QuranController } from "../controllers/quran.controller.js";

const quranRoutes = new Hono();

/**
 * GET /surahs - Get all surahs
 */
quranRoutes.get("/surahs", QuranController.getAllSurahs);

/**
 * GET /surah/:id - Get specific surah with all ayahs
 */
quranRoutes.get("/surah/:id", QuranController.getSurah);

/**
 * GET /surah/:id/ayahs - Get ayahs by surah with pagination
 */
quranRoutes.get("/surah/:id/ayahs", QuranController.getAyahsBySurah);

/**
 * GET /surah/:id/ayah/:ayah - Get specific ayah
 */
quranRoutes.get("/surah/:id/ayah/:ayah", QuranController.getAyah);

/**
 * GET /search - Search ayahs by translation
 */
quranRoutes.get("/search", QuranController.searchAyahs);

/**
 * GET /status - Get API status
 */
quranRoutes.get("/status", QuranController.getStatus);

export default quranRoutes;
