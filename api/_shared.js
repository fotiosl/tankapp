/**
 * @typedef {{
 *   method?: string;
 *   query?: Record<string, string | string[] | undefined>;
 *   headers?: Record<string, string | string[] | undefined>;
 *   socket?: { remoteAddress?: string };
 * }} ApiRequest
 *
 * @typedef {{
 *   setHeader: (name: string, value: string) => void;
 *   status: (code: number) => ApiResponse;
 *   json: (body: unknown) => ApiResponse;
 *   end: () => ApiResponse;
 * }} ApiResponse
 *
 * @typedef {{ bucket: string; limit: number; windowMs: number }} RateLimitConfig
 * @typedef {{ allowed: boolean; retryAfterSeconds: number }} RateLimitResult
 */

export const APP_USER_AGENT = 'TankApp/1.0 (+https://github.com/fotiosl/tankapp)';

const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const MAX_RATE_LIMIT_KEYS = 1000;

/** @type {Map<string, number[]>} */
const rateLimitStore = new Map();

/** @returns {void} */
export function resetRateLimits() {
  rateLimitStore.clear();
}

/** @returns {boolean} */
export function isProductionRuntime() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

/**
 * @param {string | string[] | undefined} value
 * @returns {string | undefined}
 */
export function getSingleQueryParam(value) {
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

/**
 * @param {ApiRequest} req
 * @returns {string | null}
 */
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

/**
 * @param {ApiRequest} req
 * @param {ApiResponse} res
 * @returns {void}
 */
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

/**
 * @param {ApiRequest} req
 * @returns {string}
 */
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

/**
 * @param {ApiRequest} req
 * @param {RateLimitConfig} config
 * @returns {RateLimitResult}
 */
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
