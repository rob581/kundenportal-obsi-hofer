import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit within the window", () => {
    const limiter = createRateLimiter(10_000, 3);
    const now = 1_000_000;

    expect(limiter.check("a", now).allowed).toBe(true);
    expect(limiter.check("a", now + 1).allowed).toBe(true);
    expect(limiter.check("a", now + 2).allowed).toBe(true);
  });

  it("blocks requests once the limit is exceeded", () => {
    const limiter = createRateLimiter(10_000, 3);
    const now = 1_000_000;

    limiter.check("a", now);
    limiter.check("a", now);
    limiter.check("a", now);
    const result = limiter.check("a", now);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const limiter = createRateLimiter(10_000, 1);
    const now = 1_000_000;

    expect(limiter.check("a", now).allowed).toBe(true);
    expect(limiter.check("b", now).allowed).toBe(true);
    expect(limiter.check("a", now).allowed).toBe(false);
  });

  it("resets the count once the window has passed", () => {
    const limiter = createRateLimiter(10_000, 1);
    const now = 1_000_000;

    expect(limiter.check("a", now).allowed).toBe(true);
    expect(limiter.check("a", now + 5_000).allowed).toBe(false);
    expect(limiter.check("a", now + 10_001).allowed).toBe(true);
  });
});
