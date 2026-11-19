export const APP_USER_AGENT = 'TankApp/1.0 (+https://github.com/fotiosl/tankapp)';

const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const MAX_RATE_LIMIT_KEYS = 1000;

/** @type {Map<string, number[]>} */
const rateLimitStore = new Map();

export function resetRateLimits() {
  rateLimitStore.clear();
}

export function isProductionRuntime() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

export function getSingleQueryParam(value) {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

export function getAllowedOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin || typeof origin !== 'string') return null;

  const rawHost = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const host = typeof rawHost === 'string' ? rawHost.split(',')[0]?.trim() : '';
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return origin;
  }

  if (!isProductionRuntime() && LOCALHOST_ORIGIN_REGEX.test(origin)) {
    return origin;
  }

  const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (extraOrigins.includes(origin)) {
    return origin;
  }

  return null;
}

export function setSecurityAndCorsHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin');

  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
}

function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  const remote = req.socket?.remoteAddress;
  if (typeof remote === 'string' && remote.trim()) {
    return remote.trim();
  }
  return 'unknown';
}

export function checkRateLimit(req, { bucket, limit, windowMs }) {
  const now = Date.now();
  const key = `${bucket}:${getClientIp(req)}`;
  const cutoff = now - windowMs;

  const existing = rateLimitStore.get(key) || [];
  const recent = existing.filter((ts) => ts > cutoff);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitStore.set(key, recent);
    return { allowed: false, retryAfterSeconds };
  }

  if (rateLimitStore.size >= MAX_RATE_LIMIT_KEYS && !rateLimitStore.has(key)) {
    const firstKey = rateLimitStore.keys().next().value;
    if (firstKey !== undefined) {
      rateLimitStore.delete(firstKey);
    }
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}
