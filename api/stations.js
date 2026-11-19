import {
  APP_USER_AGENT,
  checkRateLimit,
  getSingleQueryParam,
  setSecurityAndCorsHeaders,
} from './_shared.js';

/**
 * @typedef {import('./_shared.js').ApiRequest} ApiRequest
 * @typedef {import('./_shared.js').ApiResponse} ApiResponse
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE_LIMIT_CONFIG = {
  bucket: 'stations',
  limit: 60,
  windowMs: 60_000,
};

/**
 * @param {string} upstreamUrl
 * @param {string} successCacheControl
 * @param {ApiResponse} res
 * @returns {Promise<ApiResponse>}
 */
async function proxyTankerkoenig(upstreamUrl, successCacheControl, res) {
  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': APP_USER_AGENT,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(response.status).json({
        ok: false,
        message: `Tankerkönig Server antwortete mit HTTP ${response.status}`,
      });
    }

    /** @type {unknown} */
    let data;
    try {
      data = await response.json();
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({
        ok: false,
        message: 'Ungültige Antwort vom Tankerkönig-Server.',
      });
    }

    const isOk =
      typeof data === 'object' &&
      data !== null &&
      'ok' in data &&
      /** @type {{ ok?: unknown }} */ (data).ok === true;

    if (isOk) {
      res.setHeader('Cache-Control', successCacheControl);
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }

    return res.status(200).json(data);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return res.status(504).json({
        ok: false,
        message: 'Zeitüberschreitung bei der Anfrage an Tankerkönig.',
      });
    }
    return res.status(502).json({
      ok: false,
      message: 'Verbindungsfehler zu Tankerkönig. Bitte kurz warten und erneut versuchen.',
    });
  }
}

/**
 * @param {ApiRequest} req
 * @param {ApiResponse} res
 * @returns {Promise<ApiResponse>}
 */
export default async function handler(req, res) {
  setSecurityAndCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({
      ok: false,
      message: 'Methode nicht erlaubt. Nur GET wird unterstützt.',
    });
  }

  const query = req.query || {};
  const mode = getSingleQueryParam(query.mode);
  const apiKey = process.env.TANKERKOENIG_API_KEY?.trim();

  if (mode === 'status') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      proxyConfigured: Boolean(apiKey),
    });
  }

  const rateLimit = checkRateLimit(req, RATE_LIMIT_CONFIG);
  if (!rateLimit.allowed) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({
      ok: false,
      message: 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.',
    });
  }

  if (!apiKey) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      ok: false,
      proxyConfigured: false,
      message: 'Server-Konfiguration fehlt: TANKERKOENIG_API_KEY ist nicht gesetzt.',
    });
  }

  // 1. Station-Details abfragen
  if (query.id !== undefined) {
    const stationId = getSingleQueryParam(query.id);
    if (!stationId || !UUID_REGEX.test(stationId)) {
      return res.status(400).json({ ok: false, message: 'Ungültige Tankstellen-ID.' });
    }

    const params = new URLSearchParams({
      id: stationId,
      apikey: apiKey,
    });

    return proxyTankerkoenig(
      `https://creativecommons.tankerkoenig.de/json/detail.php?${params.toString()}`,
      's-maxage=300, stale-while-revalidate=600',
      res
    );
  }

  // 2. Umkreis-Liste abfragen
  const rawLat = getSingleQueryParam(query.lat);
  const rawLng = getSingleQueryParam(query.lng);
  if (!rawLat || !rawLng) {
    return res.status(400).json({ ok: false, message: 'lat und lng oder id erforderlich' });
  }

  const parsedLat = Number(rawLat);
  const parsedLng = Number(rawLng);
  if (
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    return res.status(400).json({ ok: false, message: 'Ungültige Koordinaten (lat/lng).' });
  }

  const rawRad = getSingleQueryParam(query.rad);
  const parsedRad = rawRad ? Number(rawRad) : Number.NaN;
  const clampedRadius = Number.isFinite(parsedRad)
    ? Math.round(Math.min(Math.max(parsedRad, 1), 25))
    : 5;

  const params = new URLSearchParams({
    lat: parsedLat.toFixed(3),
    lng: parsedLng.toFixed(3),
    rad: String(clampedRadius),
    sort: 'dist',
    type: 'all',
    apikey: apiKey,
  });

  return proxyTankerkoenig(
    `https://creativecommons.tankerkoenig.de/json/list.php?${params.toString()}`,
    's-maxage=60, stale-while-revalidate=120',
    res
  );
}
