import { describe, it, expect } from 'vitest';
import {
  toSeries,
  valueAt,
  valueForYear,
  archiveStartYear,
  archiveEndYear,
  displayNumber,
  formatChange,
  formatSigned,
} from '../metrics';

const city = {
  city: 'Kampala, Uganda',
  city_key: 'kampala',
  metrics: {
    ndvi_mean: { 2001: 0.68, 2002: 0.66, 2003: null, 2004: 0.65 },
    urban_cover_pct: { 2001: 8.17, 2002: 8.19 },
  },
};

describe('toSeries', () => {
  it('sorts by year and drops null/non-numeric readings', () => {
    expect(toSeries(city.metrics.ndvi_mean)).toEqual([
      { year: 2001, value: 0.68 },
      { year: 2002, value: 0.66 },
      { year: 2004, value: 0.65 },
    ]);
  });

  it('returns an empty series for a missing metric', () => {
    expect(toSeries(undefined)).toEqual([]);
  });
});

describe('valueAt', () => {
  const series = toSeries(city.metrics.ndvi_mean);

  it('uses the latest reading at or before the requested year', () => {
    expect(valueAt(series, 2003).year).toBe(2002);
    expect(valueAt(series, 2002).value).toBe(0.66);
  });

  it('falls forward to the earliest reading for pre-archive years', () => {
    // Regression: users born before 2001 previously got "unknown" for every
    // chapter-1 metric, because the lookup only ever walked backwards.
    expect(valueAt(series, 1985)).toEqual({ year: 2001, value: 0.68 });
  });

  it('returns null for an empty series', () => {
    expect(valueAt([], 2010)).toBeNull();
  });
});

describe('valueForYear', () => {
  it('reads a metric off a city profile', () => {
    expect(valueForYear(city, 'urban_cover_pct', 2002)).toBe(8.19);
  });

  it('returns null when the metric does not exist', () => {
    expect(valueForYear(city, 'surface_water_km2', 2002)).toBeNull();
  });
});

describe('archive bounds', () => {
  it('finds the first and last measured year across all metrics', () => {
    expect(archiveStartYear(city)).toBe(2001);
    expect(archiveEndYear(city)).toBe(2004);
  });

  it('returns null when there is no data at all', () => {
    expect(archiveStartYear({ metrics: {} })).toBeNull();
  });
});

describe('formatting', () => {
  it('formats missing values as n/a rather than NaN', () => {
    expect(displayNumber(undefined)).toBe('n/a');
    expect(displayNumber(1.234, 2, '%')).toBe('1.23%');
  });

  it('adds an explicit sign to changes', () => {
    expect(formatChange(1.44, '°C')).toBe('+1.4°C');
    expect(formatChange(-1.44, '°C')).toBe('-1.4°C');
    expect(formatChange(NaN)).toBe('not enough data');
  });

  it('never emits a doubled sign for negatives', () => {
    // Regression: the summary panel printed "+-0.4°C".
    expect(formatSigned(-0.4, '°C')).toBe('-0.4°C');
    expect(formatSigned(0.4, '°C')).toBe('+0.4°C');
    expect(formatSigned(0, '°C')).toBe('0.0°C');
  });
});
