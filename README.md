# Dew You Really Want to Run?

Tells runners how bad the dew point is where they are (or any city/zip they search), with commentary on how miserable a run will feel.

## Setup

Deployed on Vercel. The OpenWeatherMap API key is kept server-side in `api/weather.js`, which the frontend calls instead of hitting OpenWeatherMap directly.

1. Get an API key at https://openweathermap.org/api
2. In the Vercel project settings, add an environment variable `OPENWEATHER_API_KEY` with that key.
3. Deploy. `index.html`, `styles.css`, and `weather.js` are served as static files; `api/weather.js` runs as a serverless function.

## Local development

```
npm i -g vercel
vercel dev
```
