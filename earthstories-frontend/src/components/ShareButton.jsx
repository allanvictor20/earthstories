// src/components/ShareButton.jsx
// Module 8 — Share Card Download Button
// Drop into: earthstories-frontend/src/components/ShareButton.jsx
//
// Usage in StoryEngine.jsx (render in the final chapter or fixed in corner):
//   import ShareButton from './ShareButton';
//   <ShareButton cityData={cityData} birthYear={birthYear} />

import { useState } from 'react';
import { generateShareCard } from '../utils/shareCard';

export default function ShareButton({ cityData, birthYear }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await generateShareCard(cityData, birthYear);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error('Share card error:', err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 22px',
        background: done
          ? 'rgba(78,195,120,0.2)'
          : 'rgba(46,117,182,0.18)',
        border: `1.5px solid ${done ? 'rgba(78,195,120,0.6)' : 'rgba(46,117,182,0.6)'}`,
        borderRadius: 40,
        color: done ? '#7ecb8f' : '#90caf9',
        fontSize: 14,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.25s ease',
        letterSpacing: '0.03em',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <><Spinner /> Generating card…</>
      ) : done ? (
        <>✓ Card downloaded!</>
      ) : (
        <><DownloadIcon /> Share my Earth Story</>
      )}
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}