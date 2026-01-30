/**
 * In-memory rate limit: N запросов в окне (минута).
 * Без БД — сброс при рестарте сервера.
 */

const WINDOW_MS = 60 * 1000; // 1 минута
const MAX_REQUESTS = 10;

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;
  return ip ?? "unknown";
}

export function checkRateLimit(req: Request): { ok: true } | { ok: false; retryAfter: number } {
  const key = getKey(req);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}
