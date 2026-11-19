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

const RATE_LIMIT_CONFIG = {
  bucket: 'geocode',
  limit: 20,
  windowMs: 60_000,
};

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

  const rateLimit = checkRateLimit(req, RATE_LIMIT_CONFIG);
  if (!rateLimit.allowed) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({
      ok: false,
      message: 'Zu viele Ortssuchen. Bitte kurz warten und erneut versuchen.',
    });
  }

  const rawQuery = getSingleQueryParam(req.query?.q);
  if (!rawQuery || rawQuery.length < 2 || rawQuery.length > 120) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({
      ok: false,
      message: 'Suchbegriff muss zwischen 2 und 120 Zeichen lang sein.',
    });
  }

  const params = new URLSearchParams({
    q: rawQuery,
    format: 'json',
    countrycodes: 'de',
    limit: '5',
    addressdetails: '1',
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'de',
          'User-Agent': APP_USER_AGENT,
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(response.status).json({
        ok: false,
        message: `Ortssuche fehlgeschlagen (HTTP ${response.status}). Bitte kurz warten.`,
      });
    }

    /** @type {unknown} */
    let items;
    try {
      items = await response.json();
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({
        ok: false,
        message: 'Ungültige Antwort vom Geocoding-Dienst.',
      });
    }

    const results = Array.isArray(items)
      ? items
          .map((raw) => {
            if (typeof raw !== 'object' || raw === null) return null;
            /** @type {Record<string, unknown>} */
            const item = raw;
            const rawLat =
              typeof item.lat === 'string' || typeof item.lat === 'number'
                ? String(item.lat)
                : '';
            const rawLng =
              typeof item.lon === 'string' || typeof item.lon === 'number'
                ? String(item.lon)
                : '';
            const lat = Number.parseFloat(rawLat);
            const lng = Number.parseFloat(rawLng);
            const displayName =
              typeof item.display_name === 'string' ? item.display_name : '';
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || !displayName) return null;
            return { lat, lng, displayName };
          })
          .filter((item) => item !== null)
      : [];

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ ok: true, results });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return res.status(504).json({
        ok: false,
        message: 'Zeitüberschreitung bei der Ortssuche. Bitte erneut versuchen.',
      });
    }
    return res.status(502).json({
      ok: false,
      message: 'Verbindungsfehler bei der Ortssuche. Bitte erneut versuchen.',
    });
  }
}
