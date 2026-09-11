import { useEffect, useRef, useState } from 'react';
import { generateShareCard } from '../utils/shareCard';

export default function ShareButton({ cityData, birthYear }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      await generateShareCard(cityData, birthYear);
      setDone(true);
      resetTimer.current = setTimeout(() => setDone(false), 3000);
    } catch (err) {
      // Previously this failed silently apart from a console line.
      setError('Could not generate the card. Please try again.');
      console.error('Share card error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`pill-btn share-btn${done ? ' share-btn--done' : ''}`}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <><Spinner /> Generating card…</>
        ) : done ? (
          <>✓ Card downloaded!</>
        ) : (
          <><DownloadIcon /> Share my Earth Story</>
        )}
      </button>
      {error && <p className="error" role="alert" style={{ marginTop: 8 }}>{error}</p>}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"
      strokeWidth="2.5" strokeLinecap="round" className="spin"
      aria-hidden="true" focusable="false"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
