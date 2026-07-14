import { injectSpeedInsights } from '@vercel/speed-insights';
import './weather.js';

// Initialize Vercel Speed Insights
injectSpeedInsights({
  debug: false,
});
