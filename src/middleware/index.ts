import { Context, Next } from "hono";

/**
 * Error handling middleware
 */
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error("Error:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      500,
    );
  }
};

/**
 * Request logging middleware
 */
export const requestLogger = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - startTime;
  console.log(
    `[${new Date().toISOString()}] ${method} ${path} - ${duration}ms`,
  );
};

/**
 * CORS middleware
 */
export const corsMiddleware = async (c: Context, next: Next) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const response = (await next()) as any;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "Content-Length, X-Total-Count",
  };

  // Add CORS headers to response
  if (response && response.headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
};

/**
 * Simple in-memory rate limiter
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export const createRateLimiter = (
  maxRequests: number = 100,
  windowMs: number = 60000,
) => {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const key = `${ip}`;
    const now = Date.now();

    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      const record = rateLimitStore[key];

      if (now > record.resetTime) {
        // Reset the counter
        record.count = 1;
        record.resetTime = now + windowMs;
      } else {
        record.count++;

        if (record.count > maxRequests) {
          return c.json(
            {
              success: false,
              error: "Rate limit exceeded",
              retryAfter: Math.ceil((record.resetTime - now) / 1000),
            },
            429,
            {
              "Retry-After": Math.ceil(
                (record.resetTime - now) / 1000,
              ).toString(),
              "X-RateLimit-Limit": maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": record.resetTime.toString(),
            },
          );
        }
      }
    }

    // Add rate limit headers
    const response = (await next()) as any;
    const remaining = Math.max(0, maxRequests - rateLimitStore[key].count);

    if (response && response.headers) {
      response.headers.set("X-RateLimit-Limit", maxRequests.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set(
        "X-RateLimit-Reset",
        rateLimitStore[key].resetTime.toString(),
      );
    }

    return response;
  };
};

/**
 * Validation middleware for API versions
 */
export const validateVersion = (supportedVersions: string[]) => {
  return async (c: Context, next: Next) => {
    const version = c.req.path.split("/")[2];

    if (!supportedVersions.includes(version)) {
      return c.json(
        {
          success: false,
          error: `API version ${version} is not supported`,
          supported_versions: supportedVersions,
        },
        400,
      );
    }

    await next();
  };
};

/**
 * Cache control middleware
 */
export const cacheControl = (maxAge: number = 300) => {
  return async (c: Context, next: Next) => {
    const response = (await next()) as any;
    if (response && response.headers) {
      response.headers.set(
        "Cache-Control",
        `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      );
    }
    return response;
  };
};
