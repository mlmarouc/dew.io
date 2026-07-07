// Serverless proxy so the OpenWeatherMap API key never reaches the client.
export default async function handler(req, res) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing OPENWEATHER_API_KEY' });
    return;
  }

  const { q, zip, lat, lon } = req.query;
  const params = new URLSearchParams({ appid: apiKey });

  if (lat && lon) {
    params.set('lat', lat);
    params.set('lon', lon);
  } else if (zip) {
    params.set('zip', zip);
  } else if (q) {
    params.set('q', q);
  } else {
    res.status(400).json({ error: 'Provide q, zip, or lat/lon' });
    return;
  }

  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach weather provider' });
  }
}
