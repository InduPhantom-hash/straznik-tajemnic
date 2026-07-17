/**
 * useTypewriterSound - custom hook (IND-144 Wariant B sesja 130).
 *
 * Animuje typewriter (greeting char-by-char co 50ms) z synchronicznym audio
 * playback (loaded raz przy mount + cloned per animation cycle). IND-149
 * regression guards: drop audio.loop, refs cleanup dla fade-out interval,
 * swallow DOMException w pause() (async race).
 *
 * 1:1 fidelity z inline implementation z WelcomeScreen.tsx (sesja 81
 * IND-149 fix, audited sesja 116 IND-151 testy W2+W3).
 */

import { useState, useEffect, useRef } from 'react';

export function useTypewriterSound(greeting: string): {
  displayedText: string;
  isTyping: boolean;
} {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Dźwięk maszyny do pisania - useRef dla synchronicznego dostępu
  const typewriterSoundRef = useRef<HTMLAudioElement | null>(null);
  // IND-149: ref dla fade-out interval (cleanup zapobiega memory leak gdy
  // user kliknie "Rozpocznij" PODCZAS fade-out - drugi setInterval nie żyje
  // poza React lifecycle i bez clear leciał w tle nieskończoność).
  const fadeOutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [soundReady, setSoundReady] = useState(false);

  // Załaduj dźwięk przy montowaniu
  useEffect(() => {
    const audio = new Audio('/sounds/typewriter.mp3');
    audio.volume = 0.3;
    audio.preload = 'auto';

    const handleCanPlay = () => {
      typewriterSoundRef.current = audio;
      setSoundReady(true);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);

    // Jeśli audio już jest w cache, event może nie wystąpić
    if (audio.readyState >= 3) {
      handleCanPlay();
    }

    // Timeout fallback - jeśli dźwięk nie załaduje się w 2s, startuj bez niego
    const fallbackTimeout = setTimeout(() => {
      if (!typewriterSoundRef.current) {
        setSoundReady(true);
      }
    }, 2000);

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Efekt "maszyny do pisania" z dźwiękiem - synchronizacja
  useEffect(() => {
    // Czekaj aż dźwięk będzie gotowy (lub timeout)
    if (!soundReady) {
      return;
    }

    const fullText = greeting;
    let index = 0;
    const TYPING_SPEED_MS = 50; // ms na znak

    // Reset tekstu przy starcie animacji
    setDisplayedText('');
    setIsTyping(true);

    // Ref do aktywnego audio dla cleanup
    let activeAudio: HTMLAudioElement | null = null;

    // Uruchom ciągły dźwięk maszyny do pisania
    const startTypewriterSound = () => {
      const audio = typewriterSoundRef.current;
      if (!audio) {
        return;
      }

      try {
        // Klonuj audio aby mieć pełną kontrolę
        activeAudio = audio.cloneNode() as HTMLAudioElement;
        activeAudio.volume = 0.25;
        activeAudio.currentTime = 0;
        // IND-149: drop `loop = true`. Typewriter.mp3 ma natural length ~3s,
        // jeśli krótszy niż animation → akceptowalna cisza po końcu mp3.
        // Bez `loop`: gdy `pause()` w cleanup rzuci DOMException, audio i tak
        // skończy się samo (vs `loop=true` które leciałoby nieskończoność).
        activeAudio.play().catch(() => {});
      } catch {}
    };

    // Zatrzymaj dźwięk z płynnym fade-out
    const stopTypewriterSound = () => {
      if (!activeAudio) return;

      const audio = activeAudio;
      const fadeOutDuration = 200; // 200ms fade-out
      const fadeSteps = 10;
      const fadeInterval = fadeOutDuration / fadeSteps;
      const volumeStep = audio.volume / fadeSteps;

      let step = 0;
      const fadeOut = setInterval(() => {
        step++;
        audio.volume = Math.max(0, audio.volume - volumeStep);
        if (step >= fadeSteps) {
          clearInterval(fadeOut);
          fadeOutTimerRef.current = null;
          try {
            audio.pause();
          } catch {
            // IND-149: pause() może rzucić DOMException jeśli audio jeszcze
            // nie zaczęło grać (cloneNode().play() async). Akceptowalne -
            // audio bez `loop` skończy się samo, brak nieskończonej pętli.
          }
        }
      }, fadeInterval);
      // IND-149: zachowaj referencję dla cleanup useEffect, żeby fade-out
      // setInterval nie leciał w tle gdy user kliknie "Rozpocznij" PODCZAS
      // fade-out (drugi setInterval poza React lifecycle bez clear = memory leak).
      fadeOutTimerRef.current = fadeOut;
    };

    // Uruchom dźwięk na starcie animacji
    startTypewriterSound();

    // Animacja tekstu
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        stopTypewriterSound();
      }
    }, TYPING_SPEED_MS);

    return () => {
      clearInterval(timer);
      // IND-149: clear fade-out interval jeśli wciąż leci - bez tego setInterval
      // żyje poza React lifecycle (pre-existing memory leak gdy user kliknie
      // "Rozpocznij" PODCZAS fade-out animacji).
      if (fadeOutTimerRef.current) {
        clearInterval(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
      // Cleanup dźwięku przy unmount
      if (activeAudio) {
        try {
          activeAudio.pause();
        } catch {
          // IND-149: pause() async race - jeśli `play()` jeszcze nie resolve,
          // pause() rzuca DOMException. Bez `loop=true` (IND-149 drop powyżej)
          // audio i tak skończy się samo, więc swallow safe.
        }
        activeAudio = null;
      }
    };
  }, [greeting, soundReady]);

  return { displayedText, isTyping };
}
