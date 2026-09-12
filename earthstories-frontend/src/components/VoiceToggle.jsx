export default function VoiceToggle({ voice }) {
  if (!voice.isSupported) return null;

  const label = voice.isSpeaking
    ? 'Speaking…'
    : voice.isEnabled ? 'Narration on' : 'Narration off';

  return (
    <button
      type="button"
      className="pill-btn voice-toggle"
      onClick={voice.toggle}
      aria-pressed={voice.isEnabled}
      aria-label={voice.isEnabled ? 'Turn off voice narration' : 'Turn on voice narration'}
      title={voice.isEnabled ? 'Turn off narration' : 'Turn on narration'}
    >
      <SpeakerIcon speaking={voice.isSpeaking} enabled={voice.isEnabled} />
      {label}
    </button>
  );
}

function SpeakerIcon({ speaking, enabled }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      aria-hidden="true" focusable="false"
      className={speaking ? 'speaker-icon--speaking' : undefined}
      style={{ opacity: enabled ? 1 : 0.5 }}
    >
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      {enabled && (
        <>
          <path
            d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
            fill="currentColor" opacity={speaking ? 1 : 0.7}
          />
          <path
            d="M19 12c0 3.04-1.73 5.68-4.27 7l.93 1.63C18.98 18.71 21 15.55 21 12s-2.02-6.71-5.34-8.63l-.93 1.63C17.27 6.32 19 8.96 19 12z"
            fill="currentColor" opacity={speaking ? 1 : 0.4}
          />
        </>
      )}
      {!enabled && (
        <line
          x1="4" y1="4" x2="20" y2="20" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round"
        />
      )}
    </svg>
  );
}
