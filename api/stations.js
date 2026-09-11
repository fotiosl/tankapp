export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { lat, lng, rad } = req.query || {};

  if (!lat || !lng) {
    return res.status(400).json({ ok: false, message: 'lat und lng erforderlich' });
  }

  const apiKey =
    process.env.VITE_TANKERKOENIG_API_KEY ||
    process.env.TANKERKOENIG_API_KEY ||
    '00000000-0000-0000-0000-000000000002';

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
