import { useState } from 'react';
import Onboarding from './components/Onboarding';
import StoryEngine from './components/StoryEngine';
import { generateNarration } from './services/narration';

export default function App() {
  const [userData, setUserData]   = useState(null);
  const [cityData, setCityData]   = useState(null);
  const [narrations, setNarrations] = useState({});
  const [loading, setLoading]     = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const handleSubmit = async ({ cityKey, birthYear }) => {
    setLoading(true);
    setLoadingMsg('Loading city data...');

    const profile = await fetch(`/data/${cityKey}.json`).then(r => r.json());
    setCityData(profile);

    const apiKey = import.meta.env.VITE_AI_API_KEY;
    const results = {};

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (let ch = 1; ch <= 5; ch++) {
      setLoadingMsg(`Writing chapter ${ch} of 5...`);
      results[ch] = await generateNarration(ch, profile, birthYear, apiKey);
      if (ch < 5) await delay(1000); // wait 10 seconds between chapters
    }

    setNarrations(results);
    setUserData({ cityKey, birthYear });
    setLoading(false);
  };

  if (loading) return (
    <div className="loading">
      <p>{loadingMsg}</p>
      <p style={{ fontSize: '0.9rem', color: '#4a9eda', marginTop: '0.5rem' }}>
        Generating your personal story...
      </p>
    </div>
  );

  if (!userData) return <Onboarding onSubmit={handleSubmit} />;

  return (
    <StoryEngine
      cityData={cityData}
      birthYear={userData.birthYear}
      narrations={narrations}
    />
  );
}