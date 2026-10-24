export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { lat, lng, rad, id } = req.query || {};

  const apiKey =
    process.env.TANKERKOENIG_API_KEY ||
    process.env.VITE_TANKERKOENIG_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ ok: false, message: 'Server-Konfiguration fehlt: TANKERKOENIG_API_KEY nicht gesetzt.' });
  }

  // 1. Station Details abfragen
  if (id) {
    const detailUrl = `https://creativecommons.tankerkoenig.de/json/detail.php?id=${encodeURIComponent(id)}&apikey=${apiKey}`;
    try {
      const response = await fetch(detailUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TankApp/1.0',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          message: `Tankerkönig Server antwortete mit HTTP ${response.status}`,
        });
      }

      const data = await response.json();
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({
        ok: false,
        message: err.message || 'Verbindungsfehler zu Tankerkönig',
      });
    }
  }

  // 2. Umkreis-Liste abfragen
  if (!lat || !lng) {
    return res.status(400).json({ ok: false, message: 'lat und lng oder id erforderlich' });
  }

  const clampedRadius = Math.min(Math.max(Number(rad) || 5, 1), 25);
  const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${clampedRadius}&sort=dist&type=all&apikey=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TankApp/1.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: `Tankerkönig Server antwortete mit HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message || 'Verbindungsfehler zu Tankerkönig',
    });
  }
}
