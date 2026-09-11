// Shared metric-series helpers.
// These were previously duplicated (with subtly different behaviour) across
// narration.js, climateForecast.js, StoryEngine.jsx and DataVizPanel.jsx.

/** Convert a { "2001": 0.68, ... } metric object into a sorted, finite series. */
export function toSeries(metric = {}) {
  return Object.entries(metric || {})
    // Number(null) is 0, so nulls must be rejected before coercion —
    // otherwise a missing reading silently becomes a measured zero.
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([year, value]) => ({ year: Number(year), value: Number(value) }))
    .filter(point => Number.isFinite(point.year) && Number.isFinite(point.value))
    .sort((a, b) => a.year - b.year);
}

/** Series for one metric key on a city profile. */
export function metricSeries(cityData, key) {
  return toSeries(cityData?.metrics?.[key]);
}

/**
 * Value at `year`, using the latest reading at or before it.
 *
 * If the requested year predates the archive (the common case — the record
 * starts in 2001 but users are born as early as 1970) this falls *forward*
 * to the earliest reading rather than returning nothing.
 */
export function valueAt(series, year) {
  if (!series.length) return null;
  return series.filter(point => point.year <= year).at(-1) || series[0];
}

/** Convenience: numeric value of `key` at `year`, or null. */
export function valueForYear(cityData, key, year) {
  return valueAt(metricSeries(cityData, key), year)?.value ?? null;
}

/** First year for which this city has any measurement at all. */
export function archiveStartYear(cityData) {
  const years = Object.values(cityData?.metrics || {})
    .flatMap(metric => toSeries(metric).map(point => point.year));
  return years.length ? Math.min(...years) : null;
}

/** Last year for which this city has any measurement at all. */
export function archiveEndYear(cityData) {
  const years = Object.values(cityData?.metrics || {})
    .flatMap(metric => toSeries(metric).map(point => point.year));
  return years.length ? Math.max(...years) : null;
}

/** Format a number for display, or 'n/a' when it is missing. */
export function displayNumber(value, digits = 1, suffix = '') {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : 'n/a';
}

/** Format a change with an explicit sign, e.g. "+1.4°C". */
export function formatChange(value, unit = '', digits = 1) {
  if (!Number.isFinite(value)) return 'not enough data';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}${unit}`;
}

/** Format a signed absolute value, e.g. "-0.4°C" (not "+-0.4°C"). */
export function formatSigned(value, unit = '', digits = 1) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${unit}`;
}
