import { NextResponse } from "next/server";

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 10_000;
const PRUNE_AFTER_MS = 60 * 60 * 1000;

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );

  if (hits.length >= limit) {
    const oldest = hits[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    buckets.set(key, hits);
    return { ok: false, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_BUCKETS) {
    prune(now);
  }

  return { ok: true };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: `Too many requests. Try again in ${retryAfterSeconds}s.` },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "local";
  }

  return request.headers.get("x-real-ip") ?? "local";
}

function prune(now: number) {
  const cutoff = now - PRUNE_AFTER_MS;

  for (const [key, hits] of buckets) {
    const latest = hits[hits.length - 1];

    if (latest === undefined || latest <= cutoff) {
      buckets.delete(key);
    }
  }
}
