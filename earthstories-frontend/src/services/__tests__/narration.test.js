import { describe, it, expect } from 'vitest';
import { buildChapterPrompt, getFallbackNarration } from '../narration';

const city = {
  city: 'Kampala, Uganda',
  city_key: 'kampala',
  metrics: {
    ndvi_mean: { 2001: 0.68, 2010: 0.65, 2022: 0.58 },
    urban_cover_pct: { 2001: 8.17, 2011: 10.4, 2022: 14.2 },
    surface_water_km2: { 2001: 204.57, 2021: 198.3 },
    temperature_mean: { 2001: 27.38, 2022: 28.6 },
    temperature_anomaly: { 2001: -0.37, 2022: 1.2 },
  },
  events: [{ year: 2016, description: 'Unusually hot year (+1.6°C above baseline)' }],
};

describe('buildChapterPrompt', () => {
  it('uses real numbers for a reader born before the archive starts', () => {
    // Regression: chapter 1 used to render "urban cover unknown%,
    // vegetation index unknown" for anyone born before 2001.
    const prompt = buildChapterPrompt(1, city, 1985);
    expect(prompt).not.toMatch(/unknown/);
    expect(prompt).toContain('8.17');
    expect(prompt).toContain('0.68');
    expect(prompt).toContain('204.57');
  });

  it('tells the narrator the record starts after the birth year', () => {
    const prompt = buildChapterPrompt(1, city, 1985);
    expect(prompt).toContain('record for this city begins in 2001');
    expect(prompt).toContain('never present them as measurements taken in 1985');
  });

  it('does not add the caveat when the reader was born inside the archive', () => {
    const prompt = buildChapterPrompt(1, city, 2010);
    expect(prompt).not.toContain('record for this city begins in 2001');
  });

  it('builds a prompt for every chapter', () => {
    for (let chapter = 1; chapter <= 6; chapter++) {
      expect(typeof buildChapterPrompt(chapter, city, 1998)).toBe('string');
    }
  });

  it('includes detected events in chapter 4', () => {
    expect(buildChapterPrompt(4, city, 1998)).toContain('2016: Unusually hot year');
  });
});

describe('getFallbackNarration', () => {
  it('returns readable text naming the city for every chapter', () => {
    for (let chapter = 1; chapter <= 6; chapter++) {
      const text = getFallbackNarration(chapter, city, 1998);
      expect(text).toContain('Kampala');
      expect(text.length).toBeGreaterThan(50);
    }
  });
});
