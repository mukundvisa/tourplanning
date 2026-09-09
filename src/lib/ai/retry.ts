/**
 * AI Provider Retry Helper with Exponential Backoff
 * Handles transient failures (503 High Demand, 429 Rate Limits, Network Timeouts)
 * while fast-failing on permanent 400-level client errors (invalid key, bad payload, etc.).
 */

export interface RetryOptions {
  providerName: string;
  maxAttempts?: number;
  delaysMs?: number[]; // default: [1000, 2000, 4000]
  onRetry?: (attempt: number, delayMs: number, error: any) => void;
}

/**
 * Checks if an error is transient and safe to retry.
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const status = error?.status || error?.statusCode || error?.response?.status;
  const message = (error?.message || error?.toString() || "").toLowerCase();
  const code = error?.code || "";

  // 1. Explicit Non-Retryable 400-level Client Errors (except 429 Too Many Requests)
  if (status) {
    const numStatus = Number(status);
    if (numStatus === 429 || numStatus === 503 || numStatus === 502 || numStatus === 504 || numStatus === 500) {
      return true;
    }
    if (numStatus >= 400 && numStatus < 500) {
      return false; // 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable
    }
    if (numStatus >= 500) {
      return true;
    }
  }

  // 2. Keyword & Network/Timeout inspection
  const retryableKeywords = [
    "503",
    "429",
    "rate limit",
    "too many requests",
    "high demand",
    "service unavailable",
    "temporarily unavailable",
    "timeout",
    "timed out",
    "econnreset",
    "econnrefused",
    "fetch failed",
    "network error",
    "abort",
    "overloaded",
    "capacity",
    "resource exhausted",
    "gateway timeout",
    "server error",
  ];

  for (const keyword of retryableKeywords) {
    if (message.includes(keyword) || code.toLowerCase().includes(keyword)) {
      return true;
    }
  }

  // Check for non-retryable keywords
  const nonRetryableKeywords = [
    "invalid api key",
    "unauthorized",
    "forbidden",
    "permission denied",
    "bad request",
    "invalid argument",
    "not found",
    "quota exceeded for this month", // billing expired
  ];

  for (const keyword of nonRetryableKeywords) {
    if (message.includes(keyword)) {
      return false;
    }
  }

  // If unknown error without status code, treat connection/network style errors as retryable
  return false;
}

/**
 * Executes an async operation with exponential backoff retry.
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    providerName,
    maxAttempts = 3,
    delaysMs = [1000, 2000, 4000],
    onRetry,
  } = options;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const retryable = isRetryableError(error);
      const isLastAttempt = attempt >= maxAttempts;

      const errorMsg = error?.message || String(error);
      const errorStatus = error?.status || error?.statusCode || "N/A";

      if (!retryable) {
        console.warn(
          `[AI Provider: ${providerName}] Attempt ${attempt}/${maxAttempts} encountered non-retryable error (Status: ${errorStatus}): ${errorMsg}. Fast-failing.`
        );
        throw error;
      }

      if (isLastAttempt) {
        console.error(
          `[AI Provider: ${providerName}] Exhausted all ${maxAttempts} attempts. Final error (Status: ${errorStatus}): ${errorMsg}`
        );
        throw error;
      }

      // Determine backoff delay: 1s -> 2s -> 4s (or custom array)
      const delayMs = delaysMs[attempt - 1] ?? 4000;

      console.warn(
        `[AI Provider: ${providerName}] Attempt ${attempt}/${maxAttempts} failed (Status: ${errorStatus}): ${errorMsg}. Retrying in ${delayMs}ms (exponential backoff)...`
      );

      if (onRetry) {
        onRetry(attempt, delayMs, error);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
