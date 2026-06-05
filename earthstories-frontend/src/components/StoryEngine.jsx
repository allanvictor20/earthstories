// src/components/StoryEngine.jsx
// UPDATED — wires Module 7 (DataVizPanel), Module 8 (ShareButton), Module 9 (VoiceToggle)
// Drop into: earthstories-frontend/src/components/StoryEngine.jsx

import { useEffect, useRef } from 'react';
import scrollama from 'scrollama';
import { useChapterState, CHAPTERS } from '../hooks/useChapterState';
import { useVoiceNarration } from '../hooks/useVoiceNarration';
import MapLayer    from './MapLayer';
import DataVizPanel from './DataVizPanel';
import VoiceToggle  from './VoiceToggle';
import ShareButton  from './ShareButton';

// Map chapter IDs to data-year offsets (years after birthYear)
const CHAPTER_YEAR_OFFSET = { 1: 0, 2: 6, 3: 12, 4: 18, 5: 22 };
// Map chapter IDs to chart type for DataVizPanel
const CHAPTER_CHART = { 1: 'none', 2: 'none', 3: 'ndvi', 4: 'events', 5: 'summary' };

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
          year={state.activeYear}
          cityData={cityData}
          chapter={state.activeChapter}
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
          const year = birthYear + (CHAPTER_YEAR_OFFSET[chapter.id] || 0);
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
                <p style={chapterLabelStyle}>Chapter {chapter.id} of 5</p>

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

                {/* Share button only on last chapter */}
                {chapter.id === 5 && narration && (
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