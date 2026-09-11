// src/components/StoryEngine.jsx
// UPDATED — wires Module 7 (DataVizPanel), Module 8 (ShareButton), Module 9 (VoiceToggle)
// Drop into: earthstories-frontend/src/components/StoryEngine.jsx

import { useEffect, useRef, useState } from 'react';
import scrollama from 'scrollama';
import { useChapterState, CHAPTERS } from '../hooks/useChapterState';
import { useVoiceNarration } from '../hooks/useVoiceNarration';
import MapLayer    from './MapLayer';
import DataVizPanel from './DataVizPanel';
import ForecastPanel from './ForecastPanel';
import VoiceToggle  from './VoiceToggle';
import ShareButton  from './ShareButton';

// Map chapter IDs to data-year offsets (years after birthYear)
const CURRENT_YEAR = new Date().getFullYear();
const CHAPTER_YEAR_OFFSET = { 1: 0, 2: 10, 3: 20, 4: 25 };
// Map chapter IDs to chart type for DataVizPanel
const CHAPTER_CHART = { 1: 'insights', 2: 'temp', 3: 'ndvi', 4: 'events', 5: 'summary', 6: 'forecast' };

export default function StoryEngine({ cityData, birthYear, narrations }) {
  const { state, onStepEnter } = useChapterState(birthYear);
  const voice = useVoiceNarration();
  const scrollerRef = useRef(null);

  // Set up Scrollama
  useEffect(() => {
    const scroller = scrollama();
    scroller
      .setup({ step: '.scroll-step', offset: 0.45, debug: false })
      .onStepEnter(onStepEnter);
    scrollerRef.current = scroller;
    return () => scroller.destroy();
  }, [onStepEnter]);

  // Speak narration when chapter changes (if voice enabled)
  useEffect(() => {
    const text = narrations?.[state.activeChapter];
    if (text) voice.speak(text);
  }, [state.activeChapter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="story-container">

      {/* ── Sticky left panel: map + chart overlay ── */}
      <div className="sticky-graphic">
        <MapLayer
          key={`${state.activeChapter}-${state.activeYear}`}
          year={state.activeYear}
          cityData={cityData}
          chapter={state.activeChapter}
          birthYear={birthYear}
        />

        {/* DataVizPanel overlaid in the lower portion of the map area */}
        {state.chartType !== 'none' && (
          <div style={vizOverlayStyle}>
            <DataVizPanel
              type={state.chartType}
              cityData={cityData}
              birthYear={birthYear}
              activeYear={state.activeYear}
            />
          </div>
        )}

        {/* Year indicator badge */}
        <div style={yearBadgeStyle}>
          {state.activeYear}
        </div>
      </div>

      {/* ── Scrollable right panel: chapter steps ── */}
      <div className="scroll-steps">
        {CHAPTERS.map(chapter => {
          const year = chapter.id === 5 ? CURRENT_YEAR
            : chapter.id === 6 ? birthYear + 50
              : birthYear + (CHAPTER_YEAR_OFFSET[chapter.id] || 0);
          const chart = CHAPTER_CHART[chapter.id] || 'none';
          const narration = narrations?.[chapter.id];

          return (
            <div
              key={chapter.id}
              className="scroll-step"
              data-chapter={chapter.id}
              data-year={year}
              data-chart={chart}
            >
              <div className="step-content">
                {/* Chapter label */}
                <p style={chapterLabelStyle}>Chapter {chapter.id} of 6</p>

                {/* Chapter title */}
                <h2 style={chapterTitleStyle}>{chapter.title}</h2>

                {/* Narration text */}
                {narration ? (
                  <p style={narrationStyle}>{narration}</p>
                ) : (
                  <div style={loadingStyle}>
                    <LoadingDots />
                    <span>Writing your story…</span>
                  </div>
                )}

                <ChapterEvidence
                  cityData={cityData}
                  birthYear={birthYear}
                  chapterYear={year}
                  chapter={chapter.id}
                />

                {chapter.id === 6 && <ForecastPanel cityData={cityData} targetYear={year} />}

                {/* Share button only on last chapter */}
                {chapter.id === 6 && narration && (
                  <div style={{ marginTop: 24 }}>
                    <ShareButton cityData={cityData} birthYear={birthYear} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Voice narration toggle (fixed bottom-right) ── */}
      <VoiceToggle voice={voice} />
    </div>
  );
}

function metricSeries(cityData, key) {
  return Object.entries(cityData.metrics?.[key] || {})
    .map(([year, value]) => ({ year: Number(year), value: Number(value) }))
    .filter(point => Number.isFinite(point.year) && Number.isFinite(point.value))
    .sort((a, b) => a.year - b.year);
}

function valueAt(series, year) {
  return series.filter(point => point.year <= year).at(-1) || series[0];
}

function displayNumber(value, digits = 1, suffix = '') {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : 'n/a';
}

function ChapterEvidence({ cityData, birthYear, chapterYear, chapter }) {
  const temperature = metricSeries(cityData, 'temperature_anomaly');
  const vegetation = metricSeries(cityData, 'ndvi_mean');
  const urban = metricSeries(cityData, 'urban_cover_pct');
  const allYears = Array.from(new Set([
    ...temperature.map(point => point.year),
    ...vegetation.map(point => point.year),
    ...urban.map(point => point.year),
  ])).sort((a, b) => a - b);
  const storyYears = allYears.filter(year => year >= birthYear);
  const years = storyYears.length ? storyYears : allYears;
  const initialYear = valueAt(temperature, chapterYear)?.year || years[0];
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const baselineYear = years[0];
  const temp = valueAt(temperature, selectedYear)?.value;
  const green = valueAt(vegetation, selectedYear)?.value;
  const built = valueAt(urban, selectedYear)?.value;
  const baselineGreen = valueAt(vegetation, baselineYear)?.value;
  const baselineBuilt = valueAt(urban, baselineYear)?.value;
  const greenChange = green - baselineGreen;
  const builtChange = built - baselineBuilt;
  const warmer = temp >= 0;
  const greener = greenChange >= 0;

  if (chapter === 6 || !years.length) return null;

  return (
    <section style={evidenceStyle}>
      <div style={evidenceHeaderStyle}>
        <div>
          <p style={evidenceEyebrowStyle}>Explore the evidence</p>
          <h3 style={evidenceTitleStyle}>What was happening in {selectedYear}?</h3>
        </div>
        <span style={evidenceYearStyle}>{selectedYear}</span>
      </div>
      <p style={evidenceIntroStyle}>Select a year to see how the measured landscape changed and what that can mean for life on the ground.</p>
      <div style={yearButtonsStyle}>
        {years.map(year => (
          <button
            key={year}
            type="button"
            onClick={() => setSelectedYear(year)}
            style={{ ...yearButtonStyle, ...(selectedYear === year ? selectedYearButtonStyle : {}) }}
          >
            {year}
          </button>
        ))}
      </div>
      <div style={evidenceStatsStyle}>
        <EvidenceStat label="Temperature anomaly" value={`${temp >= 0 ? '+' : ''}${displayNumber(temp, 1, '°C')}`} detail="compared with the local baseline" />
        <EvidenceStat label="Vegetation signal" value={displayNumber(green, 3)} detail={`${greenChange >= 0 ? '+' : ''}${displayNumber(greenChange * 100, 1, ' points')} since ${baselineYear}`} />
        <EvidenceStat label="Urban cover" value={displayNumber(built, 1, '%')} detail={`${builtChange >= 0 ? '+' : ''}${displayNumber(builtChange, 1, ' points')} since ${baselineYear}`} />
      </div>
      <div style={impactRowStyle}>
        <ImpactText icon="🌱" label="Environment" text={greener ? 'More vegetation can mean more shade, habitat, and water held in the landscape.' : 'Less vegetation can mean hotter exposed ground, less habitat, and faster runoff.'} />
        <ImpactText icon="🏠" label="People" text={warmer ? 'Warmer conditions can increase heat exposure and the need for shade, water, and cooling.' : 'A cooler year may bring relief, but one year does not define the long-term pattern.'} />
        <ImpactText icon="🌍" label="Earth" text="Land-cover changes affect local water and carbon cycles, linking one city to wider planetary systems." />
      </div>
      {chapter === 4 && <p style={eventHintStyle}>The events timeline beside this story marks years when the record shifted noticeably.</p>}
    </section>
  );
}

function EvidenceStat({ label, value, detail }) {
  return <div style={evidenceStatStyle}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function ImpactText({ icon, label, text }) {
  return <div style={impactTextStyle}><span>{icon}</span><div><strong>{label}</strong><p>{text}</p></div></div>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, marginRight: 8 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'rgba(100,180,200,0.6)',
          display: 'inline-block',
          animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────

const vizOverlayStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '0 12px 12px',
  zIndex: 500,
  maxHeight: '45%',
  overflowY: 'auto',
};

const yearBadgeStyle = {
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 600,
  background: 'rgba(8,18,32,0.75)',
  border: '1px solid rgba(100,180,200,0.3)',
  borderRadius: 20,
  padding: '4px 14px',
  color: '#90caf9',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.05em',
  backdropFilter: 'blur(8px)',
};

const chapterLabelStyle = {
  margin: '0 0 6px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#607d6b',
  textTransform: 'uppercase',
};

const chapterTitleStyle = {
  margin: '0 0 14px',
  fontSize: 22,
  fontWeight: 700,
  color: '#1a1a2e',
  lineHeight: 1.25,
};

const narrationStyle = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.75,
  color: '#2c2c2c',
};

const loadingStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: '#7a9090',
  fontStyle: 'italic',
};

const evidenceStyle = {
  marginTop: 22,
  paddingTop: 16,
  borderTop: '1px solid rgba(31,76,57,0.18)',
};

const evidenceHeaderStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 };
const evidenceEyebrowStyle = { margin: 0, color: '#3d8060', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' };
const evidenceTitleStyle = { margin: '4px 0 0', color: '#183d2e', fontSize: 17, lineHeight: 1.2 };
const evidenceYearStyle = { background: '#1f6b4a', color: '#fff', borderRadius: 16, padding: '4px 9px', fontSize: 12, fontWeight: 700 };
const evidenceIntroStyle = { margin: '9px 0', color: '#527065', fontSize: 12, lineHeight: 1.45 };
const yearButtonsStyle = { display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 5 };
const yearButtonStyle = { flexShrink: 0, border: '1px solid #c6d8cd', borderRadius: 5, background: '#f5faf6', color: '#3f6b58', padding: '5px 7px', fontSize: 10, cursor: 'pointer' };
const selectedYearButtonStyle = { background: '#1f6b4a', borderColor: '#1f6b4a', color: '#fff', fontWeight: 700 };
const evidenceStatsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 7, margin: '10px 0' };
const evidenceStatStyle = { display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 7px', background: '#eef6f0', borderRadius: 6, minWidth: 0 };
const impactRowStyle = { display: 'grid', gap: 7, marginTop: 10 };
const impactTextStyle = { display: 'flex', gap: 8, alignItems: 'flex-start', color: '#315847' };
const eventHintStyle = { margin: '10px 0 0', color: '#a05d2b', fontSize: 11, fontStyle: 'italic' };

// Shared element styling keeps the evidence panel scannable on narrow screens.
Object.assign(evidenceStatStyle, {
  color: '#567565',
});