// Open-Meteo's geocoding is free, keyless, and ranks by population, which
// OpenWeatherMap's geocoding doesn't do (it returned obscure villages ahead
// of well-known cities for partial queries). Response is normalized to the
// { name, state, country, lat, lon } shape the frontend expects.
export default async function handler(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    res.status(400).json({ error: 'Provide a query of at least 2 characters' });
    return;
  }

  const params = new URLSearchParams({ name: q, count: '5', language: 'en', format: 'json' });

  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    const data = await response.json();
    const results = (data.results || []).map((r) => ({
      name: r.name,
      state: r.admin1,
      country: r.country_code,
      lat: r.latitude,
      lon: r.longitude,
    }));
    res.status(200).json(results);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach geocoding provider' });
  }
}
