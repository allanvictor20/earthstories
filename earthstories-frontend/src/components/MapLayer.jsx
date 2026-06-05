// src/components/MapLayer.jsx
import { useEffect, useRef, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GIBS_LAYERS = {
  default: 'MODIS_Terra_CorrectedReflectance_TrueColor',
  ndvi:    'MODIS_Terra_NDVI_8Day',
};

const MIN_YEAR = 2001;
const MAX_YEAR = 2023;

const GIBS_TEMPLATE =
  '//gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/' +
  '{layer}/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.{ext}';

function buildGibsUrl(layer, year) {
  const isNDVI = layer === GIBS_LAYERS.ndvi;
  return GIBS_TEMPLATE
    .replace('{layer}', layer)
    .replace('{time}',  `${year}-07-04`)
    .replace('{ext}',   isNDVI ? 'png' : 'jpg');
}

function GIBSTileLayer({ year, chapter }) {
  const map     = useMap();
  const gibsRef = useRef(null);
  const baseRef = useRef(null);
  const fadeRef = useRef(null);

  useEffect(() => {
    // Clear any running fade interval
    if (fadeRef.current) clearInterval(fadeRef.current);

    // Remove previous GIBS layer
    if (gibsRef.current) {
      map.removeLayer(gibsRef.current);
      gibsRef.current = null;
    }

    // Add OSM base only once
    if (!baseRef.current) {
      baseRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 18, opacity: 0.3 }
      ).addTo(map);
    }

    const layerName = chapter === 3 ? GIBS_LAYERS.ndvi : GIBS_LAYERS.default;
    const clampedYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));

    const gibs = L.tileLayer(buildGibsUrl(layerName, clampedYear), {
      subdomains:      'abc',
      maxNativeZoom:   9,
      maxZoom:         18,
      tileSize:        256,
      noWrap:          true,
      continuousWorld: false,
      bounds: [
        [-85.0511287776, -179.999999975],
        [ 85.0511287776,  179.999999975],
      ],
      opacity:    0,  // start invisible
      attribution:
        '<a href="https://wiki.earthdata.nasa.gov/display/GIBS">NASA EOSDIS GIBS</a>',
    });

    // Fade in once all tiles are loaded
    gibs.on('load', () => {
      let op = 0;
      fadeRef.current = setInterval(() => {
        op += 0.05;
        gibs.setOpacity(op);
        if (op >= 0.92) {
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

function YearScrubber({ year, birthYear, onYearChange }) {
  return (
    <div style={scrubberStyle}>
      <span style={labelStyle}>{MIN_YEAR}</span>

      <div style={{ flex: 1, position: 'relative' }}>
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={year}
          onChange={e => onYearChange(parseInt(e.target.value))}
          style={sliderStyle}
        />
        <div style={{
          ...birthMarkerStyle,
          left: `${((birthYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
        }}>
          <div style={birthDotStyle} />
          <span style={birthLabelStyle}>Born</span>
        </div>
      </div>

      <span style={labelStyle}>{MAX_YEAR}</span>
    </div>
  );
}

export default function MapLayer({ year: chapterYear, cityData, chapter, birthYear }) {
  const [scrubYear, setScrubYear] = useState(chapterYear);

  useEffect(() => {
    setScrubYear(chapterYear);
  }, [chapterYear]);

  if (!cityData?.lat || !cityData?.lon) return null;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>

      <div style={yearBadgeStyle}>{scrubYear}</div>

      <div style={chapterBadgeStyle}>
        {chapter === 3 ? '🌿 NDVI View' : '🛰 True Color'}
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

      <div style={scrubberContainerStyle}>
        <YearScrubber
          year={scrubYear}
          birthYear={birthYear || 1998}
          onYearChange={setScrubYear}
        />
      </div>
    </div>
  );
}

const yearBadgeStyle = {
  position:       'absolute',
  top:            16,
  left:           16,
  zIndex:         1000,
  background:     'rgba(8,18,32,0.82)',
  border:         '1px solid rgba(100,180,200,0.4)',
  borderRadius:   20,
  padding:        '4px 16px',
  color:          '#90caf9',
  fontSize:       16,
  fontWeight:     700,
  letterSpacing:  '0.05em',
  backdropFilter: 'blur(8px)',
};

const chapterBadgeStyle = {
  position:       'absolute',
  top:            16,
  right:          16,
  zIndex:         1000,
  background:     'rgba(8,18,32,0.75)',
  border:         '1px solid rgba(255,255,255,0.12)',
  borderRadius:   20,
  padding:        '4px 14px',
  color:          '#c8e6c9',
  fontSize:       12,
  fontWeight:     600,
  backdropFilter: 'blur(8px)',
};

const scrubberContainerStyle = {
  position:   'absolute',
  bottom:     0,
  left:       0,
  right:      0,
  zIndex:     1000,
  background: 'linear-gradient(transparent, rgba(6,14,26,0.92))',
  padding:    '24px 20px 14px',
};

const scrubberStyle = {
  display:    'flex',
  alignItems: 'center',
  gap:        10,
};

const labelStyle = {
  color:     'rgba(255,255,255,0.45)',
  fontSize:  11,
  fontWeight: 600,
  minWidth:  32,
  textAlign: 'center',
};

const sliderStyle = {
  width:        '100%',
  appearance:   'none',
  height:       4,
  borderRadius: 2,
  background:   'rgba(255,255,255,0.2)',
  outline:      'none',
  cursor:       'pointer',
};

const birthMarkerStyle = {
  position:      'absolute',
  top:           -22,
  transform:     'translateX(-50%)',
  display:       'flex',
  flexDirection: 'column',
  alignItems:    'center',
  pointerEvents: 'none',
};

const birthDotStyle = {
  width:        8,
  height:       8,
  borderRadius: '50%',
  background:   '#4fc3f7',
  boxShadow:    '0 0 6px #4fc3f7',
};

const birthLabelStyle = {
  fontSize:      9,
  color:         '#4fc3f7',
  fontWeight:    700,
  marginTop:     2,
  letterSpacing: '0.05em',
};