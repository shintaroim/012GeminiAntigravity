import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, clearRateLimitStore } from "@/lib/security/rate-limiter";

describe("Phase 7: Rate Limiter & Abuse Prevention", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("should allow requests under the limit", () => {
    const res1 = checkRateLimit("test-ip", 3, 10000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit("test-ip", 3, 10000);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit("test-ip", 3, 10000);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("should block requests exceeding the limit and return retryAfterSec", () => {
    checkRateLimit("blocked-ip", 2, 5000);
    checkRateLimit("blocked-ip", 2, 5000);

    const resBlocked = checkRateLimit("blocked-ip", 2, 5000);
    expect(resBlocked.allowed).toBe(false);
    expect(resBlocked.remaining).toBe(0);
    expect(resBlocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("should track different keys separately", () => {
    checkRateLimit("user-a", 1, 5000);
    const resA = checkRateLimit("user-a", 1, 5000);
    expect(resA.allowed).toBe(false);

    const resB = checkRateLimit("user-b", 1, 5000);
    expect(resB.allowed).toBe(true);
  });
});
