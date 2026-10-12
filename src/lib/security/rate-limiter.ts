interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
}

/**
 * スライディングウィンドウ形式のインメモリレートリミッター。
 * IP または セッションID をキーとしてリクエスト頻度を制限します。
 */
export function checkRateLimit(
  key: string,
  limitPerWindow = parseInt(process.env.RATE_LIMIT_PER_MINUTE || "20", 10),
  windowMs = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [] };

  // ウィンドウ外の古いタイムスタンプを削除
  const validTimestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limitPerWindow) {
    const oldest = validTimestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, retryAfterSec),
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: limitPerWindow - validTimestamps.length,
  };
}

export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
