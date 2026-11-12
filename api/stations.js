const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function getAllowedOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return null;

  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
    return origin;
  }

  if (LOCALHOST_ORIGIN_REGEX.test(origin)) {
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

function setCorsHeaders(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
}

async function proxyTankerkoenig(upstreamUrl, successCacheControl, res) {
  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TankApp/1.0',
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

    const data = await response.json();
    if (data && data.ok === true) {
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
      message: err instanceof Error ? err.message : 'Verbindungsfehler zu Tankerkönig',
    });
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ ok: false, message: 'Methode nicht erlaubt. Nur GET wird unterstützt.' });
  }

  const { lat, lng, rad, id, mode } = req.query || {};
  const apiKey = process.env.TANKERKOENIG_API_KEY?.trim();

  if (mode === 'status') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      proxyConfigured: Boolean(apiKey),
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
  if (id !== undefined) {
    const stationId = String(id).trim();
    if (!UUID_REGEX.test(stationId)) {
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
  if (lat === undefined || lng === undefined || lat === '' || lng === '') {
    return res.status(400).json({ ok: false, message: 'lat und lng oder id erforderlich' });
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
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

  const parsedRad = Number(rad);
  const clampedRadius = Number.isFinite(parsedRad)
    ? Math.min(Math.max(parsedRad, 1), 25)
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
