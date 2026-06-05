// src/components/VoiceToggle.jsx
// Module 9 — Voice Narration Toggle Button
// Drop into: earthstories-frontend/src/components/VoiceToggle.jsx
//
// Usage in StoryEngine.jsx:
//   import VoiceToggle from './VoiceToggle';
//   import { useVoiceNarration } from '../hooks/useVoiceNarration';
//
//   const voice = useVoiceNarration();
//
//   // In each chapter step, after narration loads:
//   useEffect(() => { if (narrations[activeChapter]) voice.speak(narrations[activeChapter]); }, [activeChapter]);
//
//   // In JSX:
//   <VoiceToggle voice={voice} />

export default function VoiceToggle({ voice }) {
  if (!voice.isSupported) return null;

  return (
    <button
      onClick={voice.toggle}
      title={voice.isEnabled ? 'Turn off narration' : 'Turn on narration'}
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        background: voice.isEnabled
          ? 'rgba(78,195,120,0.18)'
          : 'rgba(10,22,40,0.82)',
        border: `1.5px solid ${voice.isEnabled ? 'rgba(78,195,120,0.6)' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 40,
        color: voice.isEnabled ? '#7ecb8f' : 'rgba(255,255,255,0.55)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.25s ease',
        letterSpacing: '0.03em',
      }}
    >
      {/* Animated speaker icon */}
      <SpeakerIcon speaking={voice.isSpeaking} enabled={voice.isEnabled} />
      {voice.isSpeaking ? 'Speaking…' : voice.isEnabled ? 'Narration on' : 'Narration off'}
    </button>
  );
}

function SpeakerIcon({ speaking, enabled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{
        opacity: enabled ? 1 : 0.5,
        animation: speaking ? 'pulse 1.2s ease-in-out infinite' : 'none',
      }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      {enabled && (
        <>
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
            fill="currentColor" opacity={speaking ? 1 : 0.7} />
          <path d="M19 12c0 3.04-1.73 5.68-4.27 7l.93 1.63C18.98 18.71 21 15.55 21 12s-2.02-6.71-5.34-8.63l-.93 1.63C17.27 6.32 19 8.96 19 12z"
            fill="currentColor" opacity={speaking ? 1 : 0.4} />
        </>
      )}
      {!enabled && (
        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" />
      )}
    </svg>
  );
}