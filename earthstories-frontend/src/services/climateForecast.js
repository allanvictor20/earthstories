import { toSeries } from '../utils/metrics';

const NASA_POWER_URL = 'https://power.larc.nasa.gov/api/temporal/annual/point';

// One in-flight/resolved request per city for the lifetime of the page.
const BASELINE_CACHE = new Map();

/**
 * Ordinary least-squares fit over the trailing `windowSize` years.
 *
 * The previous implementation used only the first and last points of the
 * window, so a single noisy endpoint swung the entire projection. R² is
 * returned so the UI can hedge when the record is too noisy to project.
 */
export function projectMetric(metric, targetYear, windowSize = 10) {
  const series = toSeries(metric).slice(-windowSize);
  if (series.length < 3) return null;

  const n = series.length;
  const meanYear = series.reduce((sum, p) => sum + p.year, 0) / n;
  const meanValue = series.reduce((sum, p) => sum + p.value, 0) / n;

  const varianceYear = series.reduce((sum, p) => sum + (p.year - meanYear) ** 2, 0);
  if (varianceYear === 0) return null;

  const covariance = series.reduce((sum, p) => sum + (p.year - meanYear) * (p.value - meanValue), 0);
  const slope = covariance / varianceYear;
  const intercept = meanValue - slope * meanYear;

  const totalSS = series.reduce((sum, p) => sum + (p.value - meanValue) ** 2, 0);
  const residualSS = series.reduce((sum, p) => sum + (p.value - (intercept + slope * p.year)) ** 2, 0);
  const rSquared = totalSS === 0 ? 0 : 1 - residualSS / totalSS;

  // Residual standard error, widened over the extrapolation distance, gives a
  // plain-language uncertainty band rather than a falsely precise single value.
  const standardError = n > 2 ? Math.sqrt(residualSS / (n - 2)) : 0;
  const yearsAhead = Math.max(0, targetYear - series.at(-1).year);
  const margin = standardError * (1 + yearsAhead / Math.max(1, n));

  return {
    value: intercept + slope * targetYear,
    slope,
    rSquared,
    margin,
    sourceStart: series[0].year,
    sourceEnd: series.at(-1).year,
    // Below this the scatter dominates the trend; the UI says so out loud.
    reliable: rSquared >= 0.25,
  };
}

export function buildForecast(cityData, targetYear) {
  const metrics = cityData.metrics || {};
  return {
    targetYear,
    temperature: projectMetric(metrics.temperature_mean, targetYear),
    temperatureAnomaly: projectMetric(metrics.temperature_anomaly, targetYear),
    ndvi: projectMetric(metrics.ndvi_mean, targetYear),
    urban: projectMetric(metrics.urban_cover_pct, targetYear),
  };
}

export async function fetchNasaBaseline(cityData, { signal } = {}) {
  const cacheKey = cityData.city_key;
  if (BASELINE_CACHE.has(cacheKey)) return BASELINE_CACHE.get(cacheKey);

  const url = new URL(NASA_POWER_URL);
  url.searchParams.set('parameters', 'T2M,PRECTOTCORR');
  url.searchParams.set('community', 'AG');
  url.searchParams.set('longitude', cityData.lon);
  url.searchParams.set('latitude', cityData.lat);
  url.searchParams.set('start', '2020');
  url.searchParams.set('end', '2024');
  url.searchParams.set('format', 'JSON');

  const request = (async () => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`NASA POWER request failed: ${response.status}`);
    const payload = await response.json();
    const temperature = toSeries(payload.properties?.parameter?.T2M);
    const precipitation = toSeries(payload.properties?.parameter?.PRECTOTCORR);

    return {
      source: 'NASA POWER',
      temperature: temperature.at(-1)?.value ?? null,
      precipitation: precipitation.at(-1)?.value ?? null,
      year: temperature.at(-1)?.year ?? 2024,
    };
  })();

  BASELINE_CACHE.set(cacheKey, request);
  // A failed request should not poison the cache for the rest of the session.
  request.catch(() => BASELINE_CACHE.delete(cacheKey));
  return request;
}
