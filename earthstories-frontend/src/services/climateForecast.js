const NASA_POWER_URL = 'https://power.larc.nasa.gov/api/temporal/annual/point';

function numericSeries(metric = {}) {
  return Object.entries(metric)
    .map(([year, value]) => ({ year: Number(year), value: Number(value) }))
    .filter(point => Number.isFinite(point.year) && Number.isFinite(point.value))
    .sort((a, b) => a.year - b.year);
}

export function projectMetric(metric, targetYear, windowSize = 10) {
  const series = numericSeries(metric).slice(-windowSize);
  if (series.length < 2) return null;

  const first = series[0];
  const last = series[series.length - 1];
  const slope = (last.value - first.value) / (last.year - first.year);
  const projected = last.value + slope * (targetYear - last.year);

  return {
    value: projected,
    slope,
    sourceStart: first.year,
    sourceEnd: last.year,
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

export async function fetchNasaBaseline(cityData) {
  const url = new URL(NASA_POWER_URL);
  url.searchParams.set('parameters', 'T2M,PRECTOTCORR');
  url.searchParams.set('community', 'AG');
  url.searchParams.set('longitude', cityData.lon);
  url.searchParams.set('latitude', cityData.lat);
  url.searchParams.set('start', '2020');
  url.searchParams.set('end', '2024');
  url.searchParams.set('format', 'JSON');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`NASA POWER request failed: ${response.status}`);
  const payload = await response.json();
  const temperature = numericSeries(payload.properties?.parameter?.T2M);
  const precipitation = numericSeries(payload.properties?.parameter?.PRECTOTCORR);

  return {
    source: 'NASA POWER',
    temperature: temperature.at(-1)?.value ?? null,
    precipitation: precipitation.at(-1)?.value ?? null,
    year: temperature.at(-1)?.year ?? 2024,
  };
}
