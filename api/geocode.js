// Serverless proxy so the OpenWeatherMap API key never reaches the client.
export default async function handler(req, res) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing OPENWEATHER_API_KEY' });
    return;
  }

  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    res.status(400).json({ error: 'Provide a query of at least 2 characters' });
    return;
  }

  const params = new URLSearchParams({ q, limit: '5', appid: apiKey });

  try {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?${params}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach geocoding provider' });
  }
}
