import { Hono } from "hono";
import {
  errorHandler,
  requestLogger,
  corsMiddleware,
  createRateLimiter,
  cacheControl,
} from "../dist/middleware/index.js";
import quranRoutes from "../dist/routes/quran.routes.js";

const app = new Hono();

// Global middleware
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

// Backward compatibility without version prefix
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

// Export default handler for Vercel
export default async (req: any, res: any): Promise<void> => {
  try {
    const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      (req.headers.host as string) ||
      "localhost";
    const url = new URL(req.url || "/", `${protocol}://${host}`);

    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body:
        req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });

    const response = await app.fetch(request);

    res.status(response.status);
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    const text = await response.text();
    res.end(text);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
