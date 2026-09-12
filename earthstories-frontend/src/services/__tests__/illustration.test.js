import { describe, it, expect } from 'vitest';
import {
  buildScenePrompt,
  buildImageUrl,
  seedFor,
  captionFor,
} from '../illustration';

const kampala = {
  city: 'Kampala, Uganda',
  city_key: 'kampala',
  metrics: {
    ndvi_mean: { 2001: 0.68, 2012: 0.63, 2022: 0.58 },
    urban_cover_pct: { 2001: 8.17, 2012: 10.11, 2022: 14.18 },
    temperature_anomaly: { 2001: -0.37, 2012: 0.07, 2016: 1.55 },
  },
};

const unknownCity = { city: 'Somewhere, Nowhere', city_key: 'atlantis', metrics: {} };

describe('buildScenePrompt', () => {
  it('describes the street, not an aerial view or a percentage', () => {
    const prompt = buildScenePrompt(kampala, 1, 2001);
    expect(prompt).toContain('ground-level');
    expect(prompt).toContain('eye level from the street');
    expect(prompt).not.toMatch(/aerial|satellite view|from above/);
    expect(prompt).not.toMatch(/\d+(\.\d+)?%/);
    expect(prompt).not.toMatch(/NDVI/i);
  });

  it('uses local ground-level detail for the city', () => {
    const prompt = buildScenePrompt(kampala, 1, 2001);
    expect(prompt).toContain('Kampala');
    expect(prompt).toContain('boda-boda');
    expect(prompt).toContain('murram');
  });

  it('never contradicts the data by baking vegetation into the fixed scene', () => {
    // A browning year must not also assert trees and green hills.
    const browning = buildScenePrompt(kampala, 5, 2022);
    expect(browning).toContain('dusty red earth');
    expect(browning).not.toContain('green hills');
    expect(browning).not.toMatch(/banana trees/);
  });

  it('tracks the measured data: denser and less green over time', () => {
    const early = buildScenePrompt(kampala, 1, 2001);
    const late = buildScenePrompt(kampala, 5, 2022);

    expect(early).toContain('scattered houses');
    expect(early).toContain('at their fullest');

    expect(late).toContain('gardens and open plots');
    expect(late).toContain('dusty red earth');
  });

  it('reflects an exceptionally hot year', () => {
    expect(buildScenePrompt(kampala, 4, 2016)).toContain('heat shimmer');
    expect(buildScenePrompt(kampala, 2, 2012)).not.toContain('heat shimmer');
  });

  it('marks chapter 6 as imagined rather than recorded', () => {
    const prompt = buildScenePrompt(kampala, 6, 2048);
    expect(prompt).toContain('imagined in the year 2048');
    expect(prompt).toContain('same ordinary street');
  });

  it('suppresses text rendering in the image', () => {
    const prompt = buildScenePrompt(kampala, 1, 2001);
    expect(prompt).toContain('no text');
  });

  it('falls back gracefully for a city with no scene or no data', () => {
    const prompt = buildScenePrompt(unknownCity, 1, 2001);
    expect(prompt).toContain('African city neighbourhood');
    expect(prompt).toContain('2001');
  });
});

describe('seedFor', () => {
  it('is deterministic for the same story', () => {
    expect(seedFor('kampala', 1998, 3)).toBe(seedFor('kampala', 1998, 3));
  });

  it('differs across chapters, cities and birth years', () => {
    expect(seedFor('kampala', 1998, 3)).not.toBe(seedFor('kampala', 1998, 4));
    expect(seedFor('kampala', 1998, 3)).not.toBe(seedFor('lagos', 1998, 3));
    expect(seedFor('kampala', 1998, 3)).not.toBe(seedFor('kampala', 1999, 3));
  });
});

describe('buildImageUrl', () => {
  it('produces a keyless, deterministic, modestly sized URL', () => {
    const url = buildImageUrl(kampala, 1998, 1, 2001);
    expect(url.startsWith('https://image.pollinations.ai/prompt/')).toBe(true);
    expect(url).not.toMatch(/api[_-]?key|token/i);

    const params = new URL(url).searchParams;
    // Small on purpose: the audience is largely on metered mobile data.
    expect(params.get('width')).toBe('768');
    expect(params.get('height')).toBe('512');
    expect(params.get('seed')).toBe(String(seedFor('kampala', 1998, 1)));
    expect(url).toBe(buildImageUrl(kampala, 1998, 1, 2001));
  });

  it('encodes the prompt safely', () => {
    const url = buildImageUrl(kampala, 1998, 1, 2001);
    expect(() => new URL(url)).not.toThrow();
    expect(url).not.toContain(' ');
  });
});

describe('captionFor', () => {
  it('always says the image is a picture, not a photograph', () => {
    for (let chapter = 1; chapter <= 6; chapter++) {
      expect(captionFor(kampala, chapter, 2010)).toMatch(/not a photograph/);
    }
  });

  it('notes when the year predates the measurements', () => {
    expect(captionFor(kampala, 1, 1985)).toContain('earliest measurements, 2001');
  });

  it('says the future view is not a prediction', () => {
    expect(captionFor(kampala, 6, 2048)).toContain('not a prediction');
  });
});
