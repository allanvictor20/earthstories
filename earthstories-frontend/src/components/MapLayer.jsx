import { useEffect, useRef, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GIBS_LAYERS = {
  default: 'MODIS_Terra_CorrectedReflectance_TrueColor',
  ndvi: 'MODIS_Terra_NDVI_8Day',
};

const MIN_ARCHIVE_YEAR = 2001;
// The GIBS archive tracks real time; hard-coding an end year silently goes stale.
const MAX_ARCHIVE_YEAR = new Date().getFullYear();

const GIBS_TEMPLATE =
  '//gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/' +
  '{layer}/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.{ext}';

function buildGibsUrl(layer, year) {
  const isNDVI = layer === GIBS_LAYERS.ndvi;
  return GIBS_TEMPLATE
    .replace('{layer}', layer)
    .replace('{time}', `${year}-07-04`)
    .replace('{ext}', isNDVI ? 'png' : 'jpg');
}

function GIBSTileLayer({ year, chapter }) {
  const map = useMap();
  const gibsRef = useRef(null);
  const baseRef = useRef(null);
  const fadeRef = useRef(null);

  useEffect(() => {
    if (fadeRef.current) clearInterval(fadeRef.current);

    if (gibsRef.current) {
      map.removeLayer(gibsRef.current);
      gibsRef.current = null;
    }

    if (!baseRef.current) {
      baseRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 18, opacity: 0.3 }
      ).addTo(map);
    }

    const layerName = chapter === 3 ? GIBS_LAYERS.ndvi : GIBS_LAYERS.default;
    const clampedYear = Math.max(MIN_ARCHIVE_YEAR, Math.min(MAX_ARCHIVE_YEAR, year));

    const gibs = L.tileLayer(buildGibsUrl(layerName, clampedYear), {
      subdomains: 'abc',
      maxNativeZoom: 9,
      maxZoom: 18,
      tileSize: 256,
      noWrap: true,
      continuousWorld: false,
      bounds: [
        [-85.0511287776, -179.999999975],
        [85.0511287776, 179.999999975],
      ],
      opacity: 0,
      attribution:
        '<a href="https://wiki.earthdata.nasa.gov/display/GIBS">NASA EOSDIS GIBS</a>',
    });

    // Respect a reduced-motion preference: show the layer immediately rather
    // than animating a fade.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    gibs.on('load', () => {
      if (prefersReducedMotion) {
        gibs.setOpacity(0.92);
        return;
      }
      let opacity = 0;
      fadeRef.current = setInterval(() => {
        opacity += 0.05;
        gibs.setOpacity(opacity);
        if (opacity >= 0.92) {
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }, 30);
    });

    gibs.addTo(map);
    gibsRef.current = gibs;

    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, [year, chapter, map]);

  return null;
}

function YearScrubber({ year, birthYear, minYear, maxYear, onYearChange }) {
  const span = Math.max(1, maxYear - minYear);

  return (
    <div className="scrubber">
      <span className="scrubber__bound">{minYear}</span>

      <div className="scrubber__track">
        <input
          className="scrubber__input"
          type="range"
          min={minYear}
          max={maxYear}
          value={year}
          onChange={e => onYearChange(Number.parseInt(e.target.value, 10))}
          aria-label="Scrub the satellite imagery year"
          aria-valuetext={`Year ${year}`}
        />
        <div
          className="scrubber__birth"
          style={{ left: `${((birthYear - minYear) / span) * 100}%` }}
        >
          <div className="scrubber__birth-dot" />
          <span className="scrubber__birth-label">Born</span>
        </div>
      </div>

      <span className="scrubber__bound">{maxYear}</span>
    </div>
  );
}

export default function MapLayer({ year: chapterYear, cityData, chapter, birthYear }) {
  const [scrubYear, setScrubYear] = useState(chapterYear);
  const [lastChapterYear, setLastChapterYear] = useState(chapterYear);

  // The map no longer remounts per chapter, so follow the chapter year
  // explicitly. Adjusting during render (rather than in an effect) avoids the
  // extra commit and the cascading-render warning.
  if (chapterYear !== lastChapterYear) {
    setLastChapterYear(chapterYear);
    setScrubYear(chapterYear);
  }

  if (!cityData?.lat || !cityData?.lon) return null;

  const minYear = birthYear || MIN_ARCHIVE_YEAR;
  const maxYear = Math.max(minYear + 1, new Date().getFullYear());
  const outsideArchive = scrubYear < MIN_ARCHIVE_YEAR || scrubYear > MAX_ARCHIVE_YEAR;

  return (
    <div className="map">
      <div className="map__badge">{scrubYear}</div>

      <div className="map__context">
        {chapter === 3 ? '🌿 Vegetation signal' : '🛰 What the city looks like'}
      </div>

      <MapContainer
        center={[cityData.lat, cityData.lon]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
      >
        <GIBSTileLayer year={scrubYear} chapter={chapter} />
      </MapContainer>

      <div className="map__scrubber-wrap">
        <YearScrubber
          year={scrubYear}
          birthYear={birthYear || minYear}
          minYear={minYear}
          maxYear={maxYear}
          onYearChange={setScrubYear}
        />
        {outsideArchive && (
          <p className="map__archive-note">
            Imagery archive: {MIN_ARCHIVE_YEAR}–{MAX_ARCHIVE_YEAR}. {scrubYear} uses the nearest available scene.
          </p>
        )}
      </div>
    </div>
  );
}
