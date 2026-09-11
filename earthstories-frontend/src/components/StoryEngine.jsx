import { useEffect, useMemo, useState } from 'react';
import scrollama from 'scrollama';
import { useChapterState, CHAPTERS } from '../hooks/useChapterState';
import { useVoiceNarration } from '../hooks/useVoiceNarration';
import { metricSeries, valueAt, displayNumber, formatSigned } from '../utils/metrics';
import MapLayer from './MapLayer';
import DataVizPanel from './DataVizPanel';
import ForecastPanel from './ForecastPanel';
import VoiceToggle from './VoiceToggle';
import ShareButton from './ShareButton';

const CURRENT_YEAR = new Date().getFullYear();

// Single source of truth for per-chapter year offsets and chart types.
// These used to be duplicated in useChapterState.js with conflicting values.
const CHAPTER_YEAR_OFFSET = { 1: 0, 2: 10, 3: 20, 4: 25 };
const CHAPTER_CHART = { 1: 'insights', 2: 'temp', 3: 'ndvi', 4: 'events', 5: 'summary', 6: 'none' };

function chapterYearFor(chapterId, birthYear) {
  if (chapterId === 5) return CURRENT_YEAR;
  if (chapterId === 6) return birthYear + 50;
  return birthYear + (CHAPTER_YEAR_OFFSET[chapterId] || 0);
}

export default function StoryEngine({ cityData, birthYear, narrations }) {
  const { state, onStepEnter } = useChapterState(birthYear);
  const voice = useVoiceNarration();

  useEffect(() => {
    const scroller = scrollama();
    scroller
      .setup({ step: '.scroll-step', offset: 0.45, debug: false })
      .onStepEnter(onStepEnter);
    return () => scroller.destroy();
  }, [onStepEnter]);

  // Speak narration when the chapter changes (if voice is enabled).
  const activeNarration = narrations?.[state.activeChapter];
  useEffect(() => {
    if (activeNarration) voice.speak(activeNarration);
    // voice.speak is stable via useCallback; re-speaking on every narration
    // object identity change would interrupt playback mid-sentence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeChapter]);

  return (
    <div className="story-container">
      {/* ── Sticky left panel: map + chart overlay ── */}
      <div className="sticky-graphic">
        {/* No `key` here on purpose: a changing key remounted Leaflet on every
            scroll step, refetching tiles and discarding the user's scrub year. */}
        <MapLayer
          year={state.activeYear}
          cityData={cityData}
          chapter={state.activeChapter}
          birthYear={birthYear}
        />

        {state.chartType !== 'none' && (
          <div className="viz-overlay">
            <DataVizPanel
              type={state.chartType}
              cityData={cityData}
              birthYear={birthYear}
            />
          </div>
        )}
      </div>

      {/* ── Scrollable right panel: chapter steps ── */}
      <div className="scroll-steps">
        {CHAPTERS.map(chapter => {
          const year = chapterYearFor(chapter.id, birthYear);
          const narration = narrations?.[chapter.id];

          return (
            <section
              key={chapter.id}
              className="scroll-step"
              data-chapter={chapter.id}
              data-year={year}
              data-chart={CHAPTER_CHART[chapter.id] || 'none'}
              aria-labelledby={`chapter-${chapter.id}-title`}
            >
              <div className="step-content">
                <p className="chapter-label">Chapter {chapter.id} of {CHAPTERS.length}</p>
                <h2 className="chapter-title" id={`chapter-${chapter.id}-title`}>{chapter.title}</h2>

                {narration ? (
                  <p className="chapter-narration">{narration}</p>
                ) : (
                  <div className="chapter-loading" role="status" aria-live="polite">
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

                {chapter.id === 6 && narration && (
                  <div style={{ marginTop: 24 }}>
                    <ShareButton cityData={cityData} birthYear={birthYear} />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <VoiceToggle voice={voice} />
    </div>
  );
}

function ChapterEvidence({ cityData, birthYear, chapterYear, chapter }) {
  const { temperature, vegetation, urban, years } = useMemo(() => {
    const temperature = metricSeries(cityData, 'temperature_anomaly');
    const vegetation = metricSeries(cityData, 'ndvi_mean');
    const urban = metricSeries(cityData, 'urban_cover_pct');
    const allYears = Array.from(new Set([
      ...temperature.map(p => p.year),
      ...vegetation.map(p => p.year),
      ...urban.map(p => p.year),
    ])).sort((a, b) => a - b);
    const storyYears = allYears.filter(year => year >= birthYear);
    return { temperature, vegetation, urban, years: storyYears.length ? storyYears : allYears };
  }, [cityData, birthYear]);

  const initialYear = valueAt(temperature, chapterYear)?.year ?? years[0];
  const [selectedYear, setSelectedYear] = useState(initialYear);

  if (chapter === 6 || !years.length) return null;

  const baselineYear = years[0];
  const temp = valueAt(temperature, selectedYear)?.value;
  const green = valueAt(vegetation, selectedYear)?.value;
  const built = valueAt(urban, selectedYear)?.value;
  const greenChange = green - valueAt(vegetation, baselineYear)?.value;
  const builtChange = built - valueAt(urban, baselineYear)?.value;
  const warmer = temp >= 0;
  const greener = greenChange >= 0;

  return (
    <section className="evidence">
      <div className="evidence__header">
        <div>
          <p className="evidence__eyebrow">Explore the evidence</p>
          <h3 className="evidence__title">What was happening in {selectedYear}?</h3>
        </div>
        <span className="evidence__year">{selectedYear}</span>
      </div>

      <p className="evidence__intro">
        Select a year to see how the measured landscape changed and what that can mean for life on the ground.
      </p>

      <div className="year-buttons" role="group" aria-label="Select a year to inspect">
        {years.map(year => (
          <button
            key={year}
            type="button"
            className="year-button"
            aria-pressed={selectedYear === year}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      <div className="evidence__stats">
        <EvidenceStat
          label="Temperature anomaly"
          value={formatSigned(temp, '°C')}
          detail="compared with the local baseline"
        />
        <EvidenceStat
          label="Vegetation signal"
          value={displayNumber(green, 3)}
          detail={`${formatSigned(greenChange * 100, ' points')} since ${baselineYear}`}
        />
        <EvidenceStat
          label="Urban cover"
          value={displayNumber(built, 1, '%')}
          detail={`${formatSigned(builtChange, ' points')} since ${baselineYear}`}
        />
      </div>

      <div className="impact-row">
        <ImpactText
          icon="🌱"
          label="Environment"
          text={greener
            ? 'More vegetation can mean more shade, habitat, and water held in the landscape.'
            : 'Less vegetation can mean hotter exposed ground, less habitat, and faster runoff.'}
        />
        <ImpactText
          icon="🏠"
          label="People"
          text={warmer
            ? 'Warmer conditions can increase heat exposure and the need for shade, water, and cooling.'
            : 'A cooler year may bring relief, but one year does not define the long-term pattern.'}
        />
        <ImpactText
          icon="🌍"
          label="Earth"
          text="Land-cover changes affect local water and carbon cycles, linking one city to wider planetary systems."
        />
      </div>

      {chapter === 4 && (
        <p className="evidence__hint">
          The events timeline beside this story marks years when the record shifted noticeably.
        </p>
      )}
    </section>
  );
}

function EvidenceStat({ label, value, detail }) {
  return (
    <div className="evidence-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ImpactText({ icon, label, text }) {
  return (
    <div className="impact">
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="loading-dots" aria-hidden="true">
      <span /><span /><span />
    </span>
  );
}
