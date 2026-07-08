# Dew You Really Want to Run?

Tells runners how bad the dew point is where they are (or any city/zip they search), with commentary on how miserable a run will feel.

## Setup

Deployed on Vercel. Weather and geocoding both come from [Open-Meteo](https://open-meteo.com/), which is free and requires no API key.

- `index.html`, `styles.css`, and `weather.js` are served as static files.
- `api/weather.js` resolves a city/zip to coordinates (Open-Meteo geocoding) and fetches current conditions (Open-Meteo forecast).
- `api/geocode.js` powers the city autocomplete dropdown.

## Local development

```
npm i -g vercel
vercel dev
```
