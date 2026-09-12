import { metricSeries, valueAt, archiveStartYear } from '../utils/metrics';

// Free, open-source, no API key and no signup: the image is just a URL.
// Swapping to a keyed provider (e.g. a Cloudflare Workers AI function at
// /api/illustrate) means changing only buildImageUrl below.
const POLLINATIONS_URL = 'https://image.pollinations.ai/prompt';

/**
 * Ground-level visual vocabulary for each city.
 *
 * Earth Stories exists to turn climate data into something a Ugandan or
 * African reader recognises, so these describe the street people actually
 * live on — the trees, the roofs, the transport — not an aerial view with
 * percentages printed over it. A satellite photograph is already on the map
 * beside the story; this is the same data at human height.
 *
 * `ground` deliberately holds no vegetation: greenery comes only from `green`
 * or `bare`, chosen by the measurements. Otherwise the fixed text contradicts
 * the data ("less green than before ... banana trees, green hills behind").
 */
const CITY_SCENES = {
  kampala: {
    place: 'a Kampala neighbourhood in Uganda',
    ground: 'red murram earth road, boda-boda motorcycles, iron-sheet roofs, rolling hills behind',
    green: 'banana gardens and dense jackfruit trees',
    bare: 'dusty red earth with few remaining trees',
  },
  nairobi: {
    place: 'a Nairobi neighbourhood in Kenya',
    ground: 'matatu minibuses, corrugated iron roofs, red soil verges',
    green: 'acacia shade and green roadside grass',
    bare: 'dry cracked red soil and thinning trees',
  },
  lagos: {
    place: 'a Lagos neighbourhood in Nigeria',
    ground: 'yellow danfo buses, low-rise concrete buildings, lagoon water nearby, busy street market',
    green: 'tall palms and green roadside growth',
    bare: 'bare sandy ground between dense concrete buildings',
  },
  accra: {
    place: 'an Accra neighbourhood in Ghana',
    ground: 'tro-tro minibuses, colourful painted shopfronts, coastal light',
    green: 'coconut palms and green verges',
    bare: 'dry dusty harmattan ground with sparse palms',
  },
  dar_es_salaam: {
    place: 'a Dar es Salaam neighbourhood in Tanzania',
    ground: 'dala-dala minibuses, whitewashed walls, Indian Ocean humidity and haze',
    green: 'thick coconut palms and mango trees',
    bare: 'sun-bleached sandy ground with few palms',
  },
  cairo: {
    place: 'a Cairo neighbourhood in Egypt',
    ground: 'sand-coloured apartment blocks, the Nile nearby, desert edge, dust in the air',
    green: 'irrigated date palms and green Nile-side fields',
    bare: 'dry desert sand reaching the edge of the buildings',
  },
  johannesburg: {
    place: 'a Johannesburg neighbourhood in South Africa',
    ground: 'brick houses, mine dumps on the horizon, wide highveld sky',
    green: 'flowering jacarandas and green highveld grass',
    bare: 'dry brown winter highveld grass',
  },
  addis_ababa: {
    place: 'an Addis Ababa neighbourhood in Ethiopia',
    ground: 'corrugated iron roofs, highland hills, thin clear mountain light',
    green: 'dense eucalyptus stands and green hillsides',
    bare: 'bare highland slopes with scattered eucalyptus',
  },
};

const FALLBACK_SCENE = {
  place: 'an African city neighbourhood',
  ground: 'a residential street with low buildings',
  green: 'green trees along the street',
  bare: 'dry bare ground with few trees',
};

const STYLE = 'ground-level documentary photograph, eye level from the street, natural daylight, ordinary everyday scene, photorealistic, no text, no words, no letters, no captions';

function sceneFor(cityKey) {
  return CITY_SCENES[cityKey] || FALLBACK_SCENE;
}

/** Describe built density in words a reader pictures, not a percentage. */
function describeDensity(urbanPct) {
  if (!Number.isFinite(urbanPct)) return 'a mix of houses and open ground';
  if (urbanPct < 10) return 'only a few scattered houses with wide open ground between them';
  if (urbanPct < 18) return 'houses spread along the road with gardens and open plots between them';
  if (urbanPct < 28) return 'closely packed houses with little open ground left';
  return 'densely built-up, buildings on every side and almost no open ground';
}

/** Describe vegetation relative to this city's own range, not an absolute NDVI. */
function describeGreenness(scene, ndvi, range) {
  if (!Number.isFinite(ndvi) || !range) return scene.ground;
  const { min, max } = range;
  const span = max - min;
  const position = span > 0 ? (ndvi - min) / span : 0.5;
  // Phrased relative to this city's own range: Cairo at its greenest is not
  // "lush", it is a Nile corridor at its fullest.
  if (position > 0.66) return `${scene.green}, at their fullest`;
  if (position > 0.33) return `${scene.green}, noticeably thinner`;
  return scene.bare;
}

function describeHeat(anomaly) {
  if (!Number.isFinite(anomaly)) return '';
  if (anomaly >= 1.0) return ', hot hazy air, strong midday heat shimmer';
  if (anomaly <= -0.5) return ', softer cooler light';
  return '';
}

/**
 * Build the scene prompt for one chapter from that city's measurements.
 *
 * The prompt is built from the DATA, not from the narrator's prose: 180 words
 * of second-person documentary writing makes a muddy image prompt, whereas
 * the metrics make the illustration actually track the story — the street
 * gets more built-up and less green exactly as the record says it did.
 */
export function buildScenePrompt(cityData, chapter, year) {
  const scene = sceneFor(cityData.city_key);
  const ndviSeries = metricSeries(cityData, 'ndvi_mean');
  const ndviValues = ndviSeries.map(p => p.value);
  const range = ndviValues.length
    ? { min: Math.min(...ndviValues), max: Math.max(...ndviValues) }
    : null;

  const ndvi = valueAt(ndviSeries, year)?.value;
  const urban = valueAt(metricSeries(cityData, 'urban_cover_pct'), year)?.value;
  const anomaly = valueAt(metricSeries(cityData, 'temperature_anomaly'), year)?.value;

  const density = describeDensity(urban);
  const greenness = describeGreenness(scene, ndvi, range);
  const heat = describeHeat(anomaly);

  if (chapter === 6) {
    // Clearly an imagined future, and phrased so the model does not render a
    // sci-fi city: it is the same street, continuing its measured direction.
    return `${scene.place}, imagined in the year ${year}, the same ordinary street continuing its current direction: ${density}, ${greenness}${heat}. ${scene.ground}. ${STYLE}`;
  }

  return `${scene.place} in the year ${year}, ${density}, ${greenness}${heat}. ${scene.ground}. ${STYLE}`;
}

/** Deterministic seed so the same story always produces the same images. */
export function seedFor(cityKey, birthYear, chapter) {
  let hash = 2166136261;
  const text = `${cityKey}-${birthYear}-${chapter}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 1000000;
}

/**
 * URL for one chapter illustration.
 *
 * Kept deliberately small (768x512): the intended audience is largely on
 * metered mobile data, where a multi-megabyte hero image is a real cost.
 */
export function buildImageUrl(cityData, birthYear, chapter, year, { width = 768, height = 512 } = {}) {
  const prompt = buildScenePrompt(cityData, chapter, year);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seedFor(cityData.city_key, birthYear, chapter)),
    model: 'flux',
    nologo: 'true',
  });
  return `${POLLINATIONS_URL}/${encodeURIComponent(prompt)}?${params}`;
}

/** Plain-language caption. This is an illustration, and it should say so. */
export function captionFor(cityData, chapter, year) {
  const city = cityData.city.split(',')[0];
  const start = archiveStartYear(cityData);
  if (chapter === 6) {
    return `An imagined view of ${city} in ${year}, drawn from where the measurements are heading. A picture, not a photograph — and not a prediction.`;
  }
  const measured = Number.isFinite(start) && year < start
    ? ` (drawn from the earliest measurements, ${start})`
    : '';
  return `An illustration of ${city} in ${year}${measured}, drawn from the satellite measurements — a picture, not a photograph of this street.`;
}

/**
 * True when the browser signals a metered or slow connection.
 *
 * Much of the intended audience browses on paid-by-the-megabyte mobile data,
 * so images are offered rather than forced in that case.
 */
export function prefersReducedData() {
  if (typeof navigator === 'undefined') return false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
}
