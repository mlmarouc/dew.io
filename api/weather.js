// Both geocoding and forecast come from Open-Meteo, so this endpoint needs
// no API key. WMO weather codes are mapped to a short description and a
// Google Material Symbols icon name for the frontend to render directly.
const WMO_WEATHER = {
  0: { description: 'Clear Sky', icon: 'sunny' },
  1: { description: 'Mainly Clear', icon: 'partly_cloudy_day' },
  2: { description: 'Partly Cloudy', icon: 'partly_cloudy_day' },
  3: { description: 'Overcast', icon: 'cloud' },
  45: { description: 'Fog', icon: 'foggy' },
  48: { description: 'Rime Fog', icon: 'foggy' },
  51: { description: 'Light Drizzle', icon: 'rainy' },
  53: { description: 'Drizzle', icon: 'rainy' },
  55: { description: 'Dense Drizzle', icon: 'rainy' },
  56: { description: 'Light Freezing Drizzle', icon: 'rainy' },
  57: { description: 'Freezing Drizzle', icon: 'rainy' },
  61: { description: 'Light Rain', icon: 'rainy' },
  63: { description: 'Rain', icon: 'rainy' },
  65: { description: 'Heavy Rain', icon: 'rainy' },
  66: { description: 'Light Freezing Rain', icon: 'rainy' },
  67: { description: 'Freezing Rain', icon: 'rainy' },
  71: { description: 'Light Snow', icon: 'ac_unit' },
  73: { description: 'Snow', icon: 'ac_unit' },
  75: { description: 'Heavy Snow', icon: 'ac_unit' },
  77: { description: 'Snow Grains', icon: 'ac_unit' },
  80: { description: 'Light Rain Showers', icon: 'rainy' },
  81: { description: 'Rain Showers', icon: 'rainy' },
  82: { description: 'Violent Rain Showers', icon: 'rainy' },
  85: { description: 'Light Snow Showers', icon: 'ac_unit' },
  86: { description: 'Heavy Snow Showers', icon: 'ac_unit' },
  95: { description: 'Thunderstorm', icon: 'thunderstorm' },
  96: { description: 'Thunderstorm with Hail', icon: 'thunderstorm' },
  99: { description: 'Severe Thunderstorm', icon: 'thunderstorm' },
};

function describeWeatherCode(code) {
  return WMO_WEATHER[code] || { description: 'Unknown', icon: 'cloud' };
}

export default async function handler(req, res) {
  const { q, zip, lat, lon } = req.query;
  let latitude = lat;
  let longitude = lon;
  let place = null;

  try {
    if (!latitude || !longitude) {
      const query = q || zip;
      if (!query) {
        res.status(400).json({ error: 'Provide q, zip, or lat/lon' });
        return;
      }

      const geoParams = new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' });
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${geoParams}`);
      const geoData = await geoResponse.json();
      const result = geoData.results?.[0];

      if (!result) {
        res.status(404).json({ error: 'Location not found' });
        return;
      }

      latitude = result.latitude;
      longitude = result.longitude;
      place = { name: result.name, state: result.admin1, country: result.country_code };
    }

    const forecastParams = new URLSearchParams({
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,dew_point_2m',
      temperature_unit: 'fahrenheit',
      timezone: 'auto',
    });
    const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams}`);
    const forecastData = await forecastResponse.json();

    if (!forecastResponse.ok) {
      res.status(forecastResponse.status).json({ error: forecastData.reason || 'Failed to fetch weather' });
      return;
    }

    const { description, icon } = describeWeatherCode(forecastData.current.weather_code);

    res.status(200).json({
      temperature: forecastData.current.temperature_2m,
      apparentTemperature: forecastData.current.apparent_temperature,
      humidity: forecastData.current.relative_humidity_2m,
      dewPoint: forecastData.current.dew_point_2m,
      description,
      icon,
      ...(place ? { name: place.name, state: place.state, country: place.country } : {}),
    });
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach weather provider' });
  }
}
