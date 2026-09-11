import { describe, it, expect } from 'vitest';
import { projectMetric, buildForecast } from '../climateForecast';

describe('projectMetric', () => {
  it('fits a perfect linear trend exactly', () => {
    const metric = { 2015: 1, 2016: 2, 2017: 3, 2018: 4, 2019: 5 };
    const result = projectMetric(metric, 2020);
    expect(result.value).toBeCloseTo(6, 6);
    expect(result.slope).toBeCloseTo(1, 6);
    expect(result.rSquared).toBeCloseTo(1, 6);
    expect(result.reliable).toBe(true);
  });

  it('is not dominated by a single noisy endpoint', () => {
    // A two-point slope (the previous implementation) would read this as a
    // steep downward trend; least squares sees a flat line with one outlier.
    const metric = { 2015: 10, 2016: 10, 2017: 10, 2018: 10, 2019: 4 };
    const result = projectMetric(metric, 2020);
    // The old first-to-last slope read this as -1.5/year; least squares
    // discounts the lone outlier and the margin flags the scatter.
    const twoPointSlope = (4 - 10) / (2019 - 2015);
    expect(result.slope).toBeGreaterThan(twoPointSlope);
    expect(result.margin).toBeGreaterThan(1);
  });

  it('reports low confidence for a scattered record', () => {
    const metric = { 2015: 5, 2016: 1, 2017: 6, 2018: 0, 2019: 5 };
    expect(projectMetric(metric, 2030).reliable).toBe(false);
  });

  it('widens the uncertainty band the further ahead it projects', () => {
    const metric = { 2015: 1, 2016: 2.4, 2017: 2.8, 2018: 4.4, 2019: 5 };
    const near = projectMetric(metric, 2020);
    const far = projectMetric(metric, 2060);
    expect(far.margin).toBeGreaterThan(near.margin);
  });

  it('returns null when there are too few points to fit', () => {
    expect(projectMetric({ 2019: 1, 2020: 2 }, 2030)).toBeNull();
    expect(projectMetric({}, 2030)).toBeNull();
  });
});

describe('buildForecast', () => {
  it('projects every metric and tolerates missing ones', () => {
    const forecast = buildForecast({
      metrics: { temperature_mean: { 2018: 20, 2019: 21, 2020: 22, 2021: 23 } },
    }, 2050);

    expect(forecast.targetYear).toBe(2050);
    expect(forecast.temperature.value).toBeCloseTo(52, 6);
    expect(forecast.ndvi).toBeNull();
    expect(forecast.urban).toBeNull();
  });
});
