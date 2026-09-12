import { metricSeries, valueAt, archiveStartYear } from '../utils/metrics';

const NARRATION_ENDPOINT = '/api/narrate';
const CACHE_PREFIX = 'earthstories:narration:';
const MAX_ATTEMPTS = 3;

// In-memory cache, backed by sessionStorage so a page refresh costs no tokens.
const NARRATION_CACHE = new Map();

function cacheKey(cityKey, birthYear, chapter) {
  return `${CACHE_PREFIX}${cityKey}-${birthYear}-ch${chapter}`;
}

function readCache(key) {
  if (NARRATION_CACHE.has(key)) return NARRATION_CACHE.get(key);
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) NARRATION_CACHE.set(key, stored);
    return stored;
  } catch {
    return null; // private mode / storage disabled
  }
}

function writeCache(key, text) {
  NARRATION_CACHE.set(key, text);
  try {
    sessionStorage.setItem(key, text);
  } catch {
    // Storage unavailable or full — the in-memory cache still applies.
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function buildChapterPrompt(chapter, cityData, birthYear) {
  const at = (key, year) => valueAt(metricSeries(cityData, key), year)?.value ?? 'unknown';

  const currentYear = new Date().getFullYear();
  const endYear = currentYear;
  const archiveStart = archiveStartYear(cityData) ?? birthYear;

  // The satellite record starts well after most users were born, so the
  // "at birth" figures are really the earliest measured values. Say so rather
  // than implying a measurement exists for the birth year itself.
  const recordStart = Math.max(birthYear, archiveStart);
  const bornBeforeArchive = birthYear < archiveStart;
  const originNote = bornBeforeArchive
    ? `The satellite record for this city begins in ${archiveStart}, which is after ${birthYear}. The figures below are therefore the earliest measured values, from ${recordStart}. State this plainly — say the record opens in ${archiveStart} — and never present them as measurements taken in ${birthYear}.`
    : `The figures below are measured values from ${recordStart}.`;

  const ndviStart = at('ndvi_mean', recordStart);
  const ndviEnd = at('ndvi_mean', endYear);
  const tempAnom = at('temperature_anomaly', endYear);
  const urbanStart = at('urban_cover_pct', recordStart);
  const urbanEnd = at('urban_cover_pct', endYear);
  const waterStart = at('surface_water_km2', recordStart);
  const waterEnd = at('surface_water_km2', endYear);
  const urbanDecade = at('urban_cover_pct', Math.max(recordStart + 10, recordStart));

  const events = cityData.events?.map(e => `${e.year}: ${e.description}`).join('; ') || 'none detected';

  const temperatureSeries = metricSeries(cityData, 'temperature_mean');
  const anomalySeries = metricSeries(cityData, 'temperature_anomaly');
  const averageTemp = temperatureSeries.length
    ? (temperatureSeries.reduce((sum, p) => sum + p.value, 0) / temperatureSeries.length).toFixed(2)
    : 'unknown';
  const byAnomaly = [...anomalySeries].sort((a, b) => b.value - a.value);
  const warmest = byAnomaly[0] || { year: 'unknown', value: 'unknown' };
  const coolest = byAnomaly.at(-1) || { year: 'unknown', value: 'unknown' };

  const base = `You are the narrator of a personal environmental documentary about ${cityData.city}.
Write in second person ("you", "your"). Use warm, human language.
Never use words like "crisis", "catastrophe", "alarming", or "devastating".
Use phrases like "changed", "shifted", "grew", "the data shows", "during your lifetime".
Frame everything as documented history, not warnings. Be specific with the numbers given.
Avoid generic statements that could describe any city. Every chapter must include at least two supplied numbers, one comparison, and one concrete interpretation. If a metric is unavailable, say so plainly; never invent humidity or rainfall values.
${originNote}`;

  const prompts = {
    1: `${base}\nWrite 150-180 words for Chapter 1: "The World You Were Born Into".\nThe person was born in ${birthYear} in ${cityData.city}.\nEarliest measured data (${recordStart}): urban cover ${urbanStart}%, vegetation index (NDVI) ${ndviStart}, surface water ${waterStart} km².\nDescribe what the satellite data shows about their city at the opening of the record. Make it feel like opening a documentary.`,
    2: `${base}\nWrite 150-180 words for Chapter 2: "Growing Up Together".\nYears ${recordStart} to ${recordStart + 10} in ${cityData.city}.\nDuring this period urban cover went from ${urbanStart}% toward ${urbanDecade}%. The measured annual temperature average across the archive is ${averageTemp}°C.\nDescribe the city growing alongside the person during their childhood years, and explain what built-up land looks like in a true-colour satellite image.`,
    3: `${base}\nWrite 150-180 words for Chapter 3: "The Hidden Changes".\nFocus on vegetation (NDVI). In ${recordStart} it was ${ndviStart}. By ${endYear} it was ${ndviEnd}.\nExplain what NDVI measures in plain language, then describe the rise or fall and what a greener or less-green signal can mean for ${cityData.city}.`,
    4: `${base}\nWrite 150-180 words for Chapter 4: "Events That Shaped Your Home".\nSignificant events detected by satellite data in ${cityData.city}: ${events}.\nDescribe these as moments when the data shifted noticeably.`,
    5: `${base}\nWrite 180-220 words for Chapter 5: "Your Story So Far".\nSummarize ${cityData.city} from ${recordStart} to the present year ${endYear}.\nUrban cover: ${urbanStart}% → ${urbanEnd}%. Vegetation (NDVI): ${ndviStart} → ${ndviEnd}.\nSurface water: ${waterStart} → ${waterEnd} km². Temperature anomaly by the latest available year: ${tempAnom}°C. Across the archive, the warmest anomaly was ${warmest.value}°C in ${warmest.year}, and the coolest was ${coolest.value}°C in ${coolest.year}.\nEnd with one sentence that hands the story back to the person living in this city now.`,
    6: `${base}\nWrite 180-220 words for Chapter 6: "Your Next Chapter".\nThe person will turn 50 in ${birthYear + 50}. Use the recent direction of the measured data in ${cityData.city} as a cautious scenario, not a prediction or certainty.\nExplain that a trend continuation can help us imagine conditions, while choices and policies can change the path. Mention the city metrics without inventing precise future events. End with an invitation to imagine what they want this next chapter to hold.`,
  };

  return prompts[chapter];
}

/**
 * Generate one chapter of narration.
 *
 * Retries transient failures (rate limits, upstream 5xx) with exponential
 * backoff before falling back to pre-written text, so a single 429 no longer
 * silently downgrades the story.
 */
export async function generateNarration(chapter, cityData, birthYear, { signal } = {}) {
  const key = cacheKey(cityData.city_key, birthYear, chapter);
  const cached = readCache(key);
  if (cached) return cached;

  const prompt = buildChapterPrompt(chapter, cityData, birthYear);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(NARRATION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal,
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        return getFallbackNarration(chapter, cityData, birthYear);
      }

      const data = await response.json();
      if (!response.ok || !data.text) {
        return getFallbackNarration(chapter, cityData, birthYear);
      }

      writeCache(key, data.text);
      return data.text;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return getFallbackNarration(chapter, cityData, birthYear);
    }
  }

  return getFallbackNarration(chapter, cityData, birthYear);
}

export function getFallbackNarration(chapter, cityData, birthYear) {
  const city = cityData.city.split(',')[0];
  const fallbacks = {
    1: `The year was ${birthYear}. You came into the world in ${city}, a city already in motion — growing, breathing, changing. From 700 kilometres above the Earth, NASA satellites had been watching your home for years before you arrived.`,
    2: `As you grew, so did ${city}. Year by year, the satellite record quietly documented what was happening below — changes in the land, the water, the temperature.`,
    3: `Scientists measure vegetation health using a value called NDVI — a number between 0 and 1 that tells how green and alive the land is. The data shows how that number shifted across your lifetime in ${city}.`,
    4: `The satellite record doesn't just show gradual trends. It shows years when things shifted noticeably — moments when the data changed in ways that reflected what was happening on the ground in ${city}.`,
    5: `This is the picture the satellites have documented in ${city} up to the present. The changes are measured, and your story is still unfolding in this city.`,
    6: `At 50, ${city} will carry forward some of the directions visible today — unless people choose to change them. The future is not a verdict. It is a chapter you can still help write.`,
  };
  return fallbacks[chapter];
}
