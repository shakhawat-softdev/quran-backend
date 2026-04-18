/**
 * Format API response
 */
export const formatResponse = (
  success: boolean,
  data: any,
  metadata?: any,
  error?: string,
) => {
  return {
    success,
    ...(success && { data }),
    ...(metadata && { metadata }),
    ...(!success && { error }),
    timestamp: new Date().toISOString(),
  };
};

/**
 * Sanitize search query
 */
export const sanitizeQuery = (query: string): string => {
  return query.trim().replace(/[<>]/g, "").substring(0, 100);
};

/**
 * Validate page number
 */
export const validatePage = (page: any, maxPage: number = 1000): number => {
  const parsed = parseInt(page);
  if (isNaN(parsed) || parsed < 1) return 1;
  if (parsed > maxPage) return maxPage;
  return parsed;
};

/**
 * Validate limit
 */
export const validateLimit = (
  limit: any,
  maxLimit: number = 100,
  minLimit: number = 1,
): number => {
  const parsed = parseInt(limit);
  if (isNaN(parsed)) return 20;
  if (parsed < minLimit) return minLimit;
  if (parsed > maxLimit) return maxLimit;
  return parsed;
};

/**
 * Get client IP
 */
export const getClientIp = (headers: any): string => {
  return (
    headers["x-forwarded-for"]?.split(",")[0] ||
    headers["x-real-ip"] ||
    headers["cf-connecting-ip"] ||
    "unknown"
  );
};
