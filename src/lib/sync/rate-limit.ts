// Simple in-memory rate limiter for the sync webhook. No external service
// (Upstash) needed — the caller (Power Automate) is a single known source,
// so a per-instance fixed-window counter is enough to blunt abuse of a
// leaked SYNC_API_KEY. Known limitation: the counter resets whenever a new
// serverless instance spins up, so it is not a hard global guarantee.

export function createRateLimiter(windowMs: number, maxRequestsPerWindow: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();

  return {
    check(key: string, now: number = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
      const entry = hits.get(key);

      if (!entry || now - entry.windowStart >= windowMs) {
        hits.set(key, { count: 1, windowStart: now });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (entry.count < maxRequestsPerWindow) {
        entry.count += 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }

      const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    },
  };
}

// Matches the "General API" guidance in docs/production/rate-limiting.md.
const defaultLimiter = createRateLimiter(10_000, 30);

export function checkRateLimit(key: string) {
  return defaultLimiter.check(key);
}

export function rateLimitKeyFor(request: Request): string {
  return request.headers.get("x-forwarded-for") ?? "unknown";
}
