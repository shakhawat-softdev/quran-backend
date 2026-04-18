import { Hono } from "hono";
import { serve } from "@hono/node-server";
import {
  errorHandler,
  requestLogger,
  corsMiddleware,
  createRateLimiter,
  cacheControl,
} from "./middleware/index.js";
import quranRoutes from "./routes/quran.routes.js";

export const app = new Hono();

// Global middleware - must be added before routes
app.use(errorHandler);
app.use(requestLogger);
app.use(corsMiddleware);

// Rate limiter: 1000 requests per minute per IP
app.use(createRateLimiter(1000, 60000));

// Cache control for GET requests
app.use(cacheControl(300));

// Health check
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Quran API v1.0.0 is running",
    docs: "https://github.com/shakhawat/quran-api",
    endpoints: {
      surahs: "/api/v1/surahs",
      surah: "/api/v1/surah/:id",
      ayahs: "/api/v1/surah/:id/ayahs",
      search: "/api/v1/search?q=keyword",
      status: "/api/v1/status",
    },
  });
});

// API v1 routes
app.route("/api/v1", quranRoutes);

// Backward compatibility without version
app.route("/api", quranRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Endpoint not found",
      available_endpoints: {
        surahs: "/api/v1/surahs",
        surah: "/api/v1/surah/:id",
        search: "/api/v1/search?q=keyword",
      },
    },
    404,
  );
});

// Export for Vercel
export default app;

// Local development server (only runs locally, not on Vercel)
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || "3000");

  console.log(`Starting Quran API server on port ${port}...`);
  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`🚀 Quran API running at http://localhost:${port}`);
  console.log(`📖 API Documentation available at http://localhost:${port}`);
}
