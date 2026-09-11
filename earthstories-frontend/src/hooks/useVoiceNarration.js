// src/hooks/useVoiceNarration.js
// Module 9 — Voice Narration (Web Speech API)
// Drop into: earthstories-frontend/src/hooks/useVoiceNarration.js

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useVoiceNarration()
 *
 * Returns:
 *   speak(text)    — speak a string (respects isEnabled toggle)
 *   stop()         — cancel current speech
 *   toggle()       — enable/disable voice
 *   isEnabled      — boolean
 *   isSpeaking     — boolean
 *   isSupported    — boolean (false on unsupported browsers)
 */
export function useVoiceNarration() {
  const [isEnabled,   setIsEnabled]   = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' && 'speechSynthesis' in window
  );
  const utteranceRef = useRef(null);

  // Check browser support once on mount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text) => {
    if (!isEnabled || !isSupported || !text) return;
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = 0.88;
    utterance.pitch = 1.0;
    utterance.lang  = 'en-GB';

    // Try to pick a pleasant voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isEnabled, isSupported, stop]);

  const toggle = useCallback(() => {
    if (isSpeaking) stop();
    setIsEnabled(v => !v);
  }, [isSpeaking, stop]);

  return { speak, stop, toggle, isEnabled, isSpeaking, isSupported };
}