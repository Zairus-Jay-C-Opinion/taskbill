import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// If Upstash env vars are not set (e.g. local dev), limiters are null
// and applyRateLimit() will allow all requests through gracefully.
function makeLimiter(prefix, requests, window) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
  });
}

// Per-route limits — all keyed by client IP
export const limitAI       = makeLimiter("rl:ai",        4, "1 m");  // 4 AI drafts / min (Gemini free tier caps at 5)
export const limitStripe   = makeLimiter("rl:stripe",   20, "1 h");  // 20 payment links / hr
export const limitCheckout = makeLimiter("rl:checkout",  5, "1 h");  // 5 checkout sessions / hr
export const limitDelete   = makeLimiter("rl:delete",    3, "1 h");  // 3 delete attempts / hr

export async function applyRateLimit(limiter, req, res) {
  if (!limiter) return true; // not configured — allow
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? "127.0.0.1";
  const { success } = await limiter.limit(ip);
  if (!success) {
    res.status(429).json({ error: "Too many requests. Please wait and try again." });
    return false;
  }
  return true;
}
