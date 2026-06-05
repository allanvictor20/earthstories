const NARRATION_CACHE = {};

function buildChapterPrompt(chapter, cityData, birthYear) {
  const m = cityData.metrics;
  const byYear = (key, yr) => m[key]?.[String(yr)] ?? m[key]?.[String(yr + 1)] ?? 'unknown';

  const endYear = Math.min(birthYear + 20, 2022);
  const ndviStart  = byYear('ndvi_mean', birthYear);
  const ndviEnd    = byYear('ndvi_mean', endYear);
  const tempAnom   = byYear('temperature_anomaly', endYear);
  const urbanStart = byYear('urban_cover_pct', birthYear);
  const urbanEnd   = byYear('urban_cover_pct', Math.min(birthYear + 20, 2022));
  const waterStart = byYear('surface_water_km2', birthYear);
  const waterEnd   = byYear('surface_water_km2', Math.min(birthYear + 18, 2021));
  const events     = cityData.events?.map(e => `${e.year}: ${e.description}`).join('; ') || 'none detected';

  const base = `You are the narrator of a personal environmental documentary about ${cityData.city}.
Write in second person ("you", "your"). Use warm, human language.
Never use words like "crisis", "catastrophe", "alarming", or "devastating".
Use phrases like "changed", "shifted", "grew", "the data shows", "during your lifetime".
Frame everything as documented history, not warnings. Be specific with the numbers given.`;

  const prompts = {
    1: `${base}\nWrite 150-180 words for Chapter 1: "The World You Were Born Into".\nThe person was born in ${birthYear} in ${cityData.city}.\nData at birth: urban cover ${urbanStart}%, vegetation index (NDVI) ${ndviStart}, surface water ${waterStart} km².\nDescribe what the satellite data shows about their city the year they arrived. Make it feel like opening a documentary.`,
    2: `${base}\nWrite 150-180 words for Chapter 2: "Growing Up Together".\nYears ${birthYear} to ${birthYear + 10} in ${cityData.city}.\nDuring this period urban cover went from ${urbanStart}% toward ${byYear('urban_cover_pct', birthYear + 10)}%.\nDescribe the city growing alongside the person during their childhood years.`,
    3: `${base}\nWrite 150-180 words for Chapter 3: "The Hidden Changes".\nFocus on vegetation (NDVI). In ${birthYear} it was ${ndviStart}. By ${endYear} it was ${ndviEnd}.\nExplain what NDVI measures in plain language, then describe what the trend means for ${cityData.city}.`,
    4: `${base}\nWrite 150-180 words for Chapter 4: "Events That Shaped Your Home".\nSignificant events detected by satellite data in ${cityData.city}: ${events}.\nDescribe these as moments when the data shifted noticeably.`,
    5: `${base}\nWrite 180-220 words for Chapter 5: "What Changed While You Were Alive".\nFull summary for ${cityData.city} from ${birthYear} to ${endYear}.\nUrban cover: ${urbanStart}% → ${urbanEnd}%. Vegetation (NDVI): ${ndviStart} → ${ndviEnd}.\nSurface water: ${waterStart} → ${waterEnd} km². Temperature anomaly by ${endYear}: ${tempAnom}°C.\nEnd with one sentence about what this data means for the people who call this city home.`,
  };

  return prompts[chapter];
}

export async function generateNarration(chapter, cityData, birthYear, apiKey) {
  // ── DEBUG ──────────────────────────────────────────────────────
  console.log(`[narration] Chapter ${chapter} | city: ${cityData.city} | key: ${apiKey ? apiKey.slice(0, 8) + '...' : 'MISSING'}`);
  // ──────────────────────────────────────────────────────────────

  const cacheKey = `${cityData.city_key}-${birthYear}-ch${chapter}`;
  if (NARRATION_CACHE[cacheKey]) {
    console.log(`[narration] Chapter ${chapter} served from cache`);
    return NARRATION_CACHE[cacheKey];
  }

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: buildChapterPrompt(chapter, cityData, birthYear) }],
          max_tokens: 400,
          temperature: 0.8
        })
      }
    );

    const data = await response.json();

    // ── DEBUG ──────────────────────────────────────────────────────
    console.log(`[narration] Chapter ${chapter} raw response:`, data);
    // ──────────────────────────────────────────────────────────────

    if (data.error) {
      console.error(`[narration] Chapter ${chapter} Groq error:`, data.error);
      return getFallbackNarration(chapter, cityData, birthYear);
    }

    const text = data.choices[0].message.content;
    console.log(`[narration] Chapter ${chapter} success, length: ${text.length} chars`);
    NARRATION_CACHE[cacheKey] = text;
    return text;

  } catch (err) {
    console.error(`[narration] Chapter ${chapter} network error:`, err);
    return getFallbackNarration(chapter, cityData, birthYear);
  }
}

function getFallbackNarration(chapter, cityData, birthYear) {
  const city = cityData.city.split(',')[0];
  const fallbacks = {
    1: `The year was ${birthYear}. You came into the world in ${city}, a city already in motion — growing, breathing, changing. From 700 kilometres above the Earth, NASA satellites had been watching your home for years before you arrived.`,
    2: `As you grew, so did ${city}. Year by year, the satellite record quietly documented what was happening below — changes in the land, the water, the temperature.`,
    3: `Scientists measure vegetation health using a value called NDVI — a number between 0 and 1 that tells how green and alive the land is. The data shows how that number shifted across your lifetime in ${city}.`,
    4: `The satellite record doesn't just show gradual trends. It shows years when things shifted noticeably — moments when the data changed in ways that reflected what was happening on the ground in ${city}.`,
    5: `This is the full picture of what the satellites documented during your lifetime in ${city}. The changes are real, measured, and part of the story of this city — and your story too.`,
  };
  return fallbacks[chapter];
}