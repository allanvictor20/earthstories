const NARRATION_CACHE = {};

function buildChapterPrompt(chapter, cityData, birthYear) {
  const m = cityData.metrics;
  const byYear = (key, yr) => {
    const metric = m[key] || {};
    const exact = metric[String(yr)] ?? metric[String(yr + 1)];
    if (exact != null) return exact;

    const availableYears = Object.keys(metric).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    const latestYear = availableYears.filter(year => year <= yr).at(-1);
    return latestYear == null ? 'unknown' : metric[String(latestYear)];
  };

  const currentYear = new Date().getFullYear();
  const endYear = currentYear;
  const ndviStart  = byYear('ndvi_mean', birthYear);
  const ndviEnd    = byYear('ndvi_mean', endYear);
  const tempAnom   = byYear('temperature_anomaly', endYear);
  const urbanStart = byYear('urban_cover_pct', birthYear);
  const urbanEnd   = byYear('urban_cover_pct', Math.min(birthYear + 20, 2022));
  const waterStart = byYear('surface_water_km2', birthYear);
  const waterEnd   = byYear('surface_water_km2', Math.min(birthYear + 18, 2021));
  const events     = cityData.events?.map(e => `${e.year}: ${e.description}`).join('; ') || 'none detected';
  const temperatureValues = Object.values(m.temperature_mean || {}).filter(Number.isFinite);
  const anomalyValues = Object.entries(m.temperature_anomaly || {}).filter(([, value]) => Number.isFinite(value));
  const averageTemp = temperatureValues.length ? temperatureValues.reduce((sum, value) => sum + value, 0) / temperatureValues.length : 'unknown';
  const warmest = anomalyValues.sort((a, b) => b[1] - a[1])[0] || ['unknown', 'unknown'];
  const coolest = anomalyValues.sort((a, b) => a[1] - b[1])[0] || ['unknown', 'unknown'];

  const base = `You are the narrator of a personal environmental documentary about ${cityData.city}.
Write in second person ("you", "your"). Use warm, human language.
Never use words like "crisis", "catastrophe", "alarming", or "devastating".
Use phrases like "changed", "shifted", "grew", "the data shows", "during your lifetime".
Frame everything as documented history, not warnings. Be specific with the numbers given.
Avoid generic statements that could describe any city. Every chapter must include at least two supplied numbers, one comparison, and one concrete interpretation. If a metric is unavailable, say so plainly; never invent humidity or rainfall values.`;

  const prompts = {
    1: `${base}\nWrite 150-180 words for Chapter 1: "The World You Were Born Into".\nThe person was born in ${birthYear} in ${cityData.city}.\nData at birth: urban cover ${urbanStart}%, vegetation index (NDVI) ${ndviStart}, surface water ${waterStart} km².\nDescribe what the satellite data shows about their city the year they arrived. Make it feel like opening a documentary.`,
    2: `${base}\nWrite 150-180 words for Chapter 2: "Growing Up Together".\nYears ${birthYear} to ${birthYear + 10} in ${cityData.city}.\nDuring this period urban cover went from ${urbanStart}% toward ${byYear('urban_cover_pct', birthYear + 10)}%. The measured annual temperature average across the archive is ${averageTemp}°C.\nDescribe the city growing alongside the person during their childhood years, and explain what built-up land looks like in a true-colour satellite image.`,
    3: `${base}\nWrite 150-180 words for Chapter 3: "The Hidden Changes".\nFocus on vegetation (NDVI). In ${birthYear} it was ${ndviStart}. By ${endYear} it was ${ndviEnd}.\nExplain what NDVI measures in plain language, then describe the rise or fall and what a greener or less-green signal can mean for ${cityData.city}.`,
    4: `${base}\nWrite 150-180 words for Chapter 4: "Events That Shaped Your Home".\nSignificant events detected by satellite data in ${cityData.city}: ${events}.\nDescribe these as moments when the data shifted noticeably.`,
    5: `${base}\nWrite 180-220 words for Chapter 5: "Your Story So Far".\nSummarize ${cityData.city} from ${birthYear} to the present year ${endYear}.\nUrban cover: ${urbanStart}% → ${urbanEnd}%. Vegetation (NDVI): ${ndviStart} → ${ndviEnd}.\nSurface water: ${waterStart} → ${waterEnd} km². Temperature anomaly by the latest available year: ${tempAnom}°C. Across the archive, the warmest anomaly was ${warmest[1]}°C in ${warmest[0]}, and the coolest was ${coolest[1]}°C in ${coolest[0]}.\nEnd with one sentence that hands the story back to the person living in this city now.`,
    6: `${base}\nWrite 180-220 words for Chapter 6: "Your Next Chapter".\nThe person will turn 50 in ${birthYear + 50}. Use the recent direction of the measured data in ${cityData.city} as a cautious scenario, not a prediction or certainty.\nExplain that a trend continuation can help us imagine conditions, while choices and policies can change the path. Mention the city metrics without inventing precise future events. End with an invitation to imagine what they want this next chapter to hold.`,
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
    5: `This is the picture the satellites have documented in ${city} up to the present. The changes are measured, and your story is still unfolding in this city.`,
    6: `At 50, ${city} will carry forward some of the directions visible today — unless people choose to change them. The future is not a verdict. It is a chapter you can still help write.`,
  };
  return fallbacks[chapter];
}