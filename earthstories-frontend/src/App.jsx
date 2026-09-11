import { lazy, Suspense, useCallback, useState } from 'react';
import Onboarding from './components/Onboarding';
import { generateNarration } from './services/narration';

// Recharts + Leaflet live behind this boundary — roughly two thirds of the
// bundle — so the onboarding screen no longer waits on them.
const StoryEngine = lazy(() => import('./components/StoryEngine'));

const TOTAL_CHAPTERS = 6;

export default function App() {
  const [userData, setUserData] = useState(null);
  const [cityData, setCityData] = useState(null);
  const [narrations, setNarrations] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async ({ cityKey, birthYear }) => {
    setLoading(true);
    setError('');
    setLoadingMsg('Loading city data...');

    let profile;
    try {
      const response = await fetch(`/data/${cityKey}.json`);
      if (!response.ok) {
        throw new Error(`We could not load the data for this city (${response.status}).`);
      }
      profile = await response.json();
    } catch (err) {
      setError(err.message || 'Something went wrong loading your city data.');
      setLoading(false);
      return;
    }

    setCityData(profile);
    setNarrations({});

    // Chapter 1 gates the UI; the rest stream in behind it while the reader
    // is already scrolling, instead of holding a blank screen for ~15s.
    setLoadingMsg('Writing your opening chapter...');
    try {
      const first = await generateNarration(1, profile, birthYear);
      setNarrations({ 1: first });
    } catch (err) {
      setError(err.message || 'Something went wrong writing your story.');
      setLoading(false);
      return;
    }

    setUserData({ cityKey, birthYear });
    setLoading(false);

    for (let chapter = 2; chapter <= TOTAL_CHAPTERS; chapter++) {
      try {
        const text = await generateNarration(chapter, profile, birthYear);
        setNarrations(prev => ({ ...prev, [chapter]: text }));
      } catch {
        // generateNarration already falls back to pre-written text; a throw
        // here means the request was aborted, so stop filling chapters.
        break;
      }
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError('');
    setUserData(null);
    setCityData(null);
    setNarrations({});
  }, []);

  if (error) {
    return (
      <div className="status-screen" role="alert">
        <p className="status-screen__title">{error}</p>
        <button type="button" className="submit-btn status-screen__action" onClick={handleRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="status-screen" role="status" aria-live="polite">
        <p className="status-screen__title">{loadingMsg}</p>
        <p className="status-screen__subtitle">Generating your personal story...</p>
      </div>
    );
  }

  if (!userData) return <Onboarding onSubmit={handleSubmit} />;

  return (
    <Suspense
      fallback={
        <div className="status-screen" role="status" aria-live="polite">
          <p className="status-screen__title">Opening your story...</p>
        </div>
      }
    >
      <StoryEngine
        cityData={cityData}
        birthYear={userData.birthYear}
        narrations={narrations}
      />
    </Suspense>
  );
}
