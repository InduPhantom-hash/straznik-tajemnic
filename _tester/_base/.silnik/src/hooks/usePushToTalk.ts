'use client';

/**
 * usePushToTalk - hook obsługujący nagrywanie dźwięku (Push-to-Talk)
 *
 * Wspiera dwa tryby:
 * 1. Hold-to-Talk (Spacja poza aktywnym polem edycji - nagrywa dopóki spacja jest wciśnięta)
 * 2. Toggle (kliknięcie ikony mikrofonu - włącza/wyłącza nagrywanie ciągłe)
 *
 * Zgodny z kanonem Zew Cthulhu 7e: bez dźwięków SFX, z dyskretnymi toastami i zwrotem fokusu.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getApiKeyHeaders } from '@/lib/api-keys-service';

export interface UsePushToTalkOptions {
  onTranscriptionSuccess: (result: {
    text: string;
    segments?: Array<{ speaker: string; text: string }>;
    mode: 'solo' | 'duet';
  }) => void;
  mode?: 'solo' | 'duet';
  investigators?: Array<string | { name?: string; characterName?: string; playerName?: string }>;
  sceneNpcs?: string[];
  location?: string;
  language?: string;
  disabled?: boolean;
  onFocusInput?: () => void;
  tMicPermissionDenied?: string;
  tApiKeyMissing?: string;
  tTranscribeError?: string;
}

export function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    el.isContentEditable === true ||
    el.contentEditable === 'true' ||
    el.getAttribute('contenteditable') === 'true' ||
    el.getAttribute('contenteditable') === '' ||
    el.getAttribute('role') === 'textbox'
  );
}

export function usePushToTalk({
  onTranscriptionSuccess,
  mode = 'solo',
  investigators = [],
  sceneNpcs = [],
  location,
  language = 'pl',
  disabled = false,
  onFocusInput,
  tMicPermissionDenied = 'Brak uprawnień do mikrofonu. Zezwól na dostęp w przeglądarce.',
  tApiKeyMissing = 'Brak klucza API Gemini. Wklej klucz w Ustawieniach.',
  tTranscribeError = 'Błąd rozpoznawania mowy. Spróbuj ponownie lub wpisz tekst ręcznie.',
}: UsePushToTalkOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isHoldMode, setIsHoldMode] = useState(false);

  const isRecordingRef = useRef(false);
  const isHoldModeRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const sendAudioForTranscription = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'speech.webm');
        formData.append('mode', mode);
        formData.append('language', language);
        if (investigators.length > 0) {
          formData.append('investigators', JSON.stringify(investigators));
        }
        if (sceneNpcs.length > 0) {
          formData.append('sceneNpcs', JSON.stringify(sceneNpcs));
        }
        if (location) {
          formData.append('location', location);
        }

        const headers = getApiKeyHeaders();
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers,
          body: formData,
        });

        const data = await response.json();

        if (response.status === 401 || data.code === 'BYOK_KEY_MISSING') {
          toast({
            variant: 'destructive',
            title: 'Klucz API Gemini',
            description: tApiKeyMissing,
          });
          onFocusInput?.();
          return;
        }

        if (!response.ok || !data.success) {
          console.error('[usePushToTalk] Transcribe error:', data);
          toast({
            variant: 'destructive',
            title: 'Rozpoznawanie mowy',
            description: data.error || tTranscribeError,
          });
          onFocusInput?.();
          return;
        }

        onTranscriptionSuccess({
          text: data.text || '',
          segments: data.segments || [],
          mode: data.mode || mode,
        });

        // Powrót fokusu do klawiatury
        onFocusInput?.();
      } catch (err) {
        console.error('[usePushToTalk] Network/Transcribe failure:', err);
        toast({
          variant: 'destructive',
          title: 'Błąd mikrofonu',
          description: tTranscribeError,
        });
        onFocusInput?.();
      } finally {
        setIsTranscribing(false);
      }
    },
    [
      mode,
      language,
      investigators,
      sceneNpcs,
      location,
      onTranscriptionSuccess,
      onFocusInput,
      tApiKeyMissing,
      tTranscribeError,
    ]
  );

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsHoldMode(false);

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(
    async (isHold: boolean = false) => {
      if (disabled || isRecordingRef.current || isTranscribing) return;

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        toast({
          variant: 'destructive',
          title: 'Mikrofon niedostępny',
          description: tMicPermissionDenied,
        });
        onFocusInput?.();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        streamRef.current = stream;
        audioChunksRef.current = [];

        let mimeType = 'audio/webm;codecs=opus';
        if (
          typeof MediaRecorder !== 'undefined' &&
          !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ) {
          mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';
        }

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const mime = mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });
          cleanupStream();

          if (audioBlob.size > 0) {
            void sendAudioForTranscription(audioBlob);
          } else {
            onFocusInput?.();
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(100);

        isRecordingRef.current = true;
        isHoldModeRef.current = isHold;
        setIsRecording(true);
        setIsHoldMode(isHold);
      } catch (err: unknown) {
        console.warn('[usePushToTalk] getUserMedia error:', err);
        cleanupStream();
        isRecordingRef.current = false;
        setIsRecording(false);
        setIsHoldMode(false);

        toast({
          variant: 'destructive',
          title: 'Dostęp do mikrofonu',
          description: tMicPermissionDenied,
        });
        onFocusInput?.();
      }
    },
    [
      disabled,
      isTranscribing,
      cleanupStream,
      sendAudioForTranscription,
      onFocusInput,
      tMicPermissionDenied,
    ]
  );

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      void startRecording(false);
    }
  }, [startRecording, stopRecording]);

  // Push-to-Talk (Hold-to-Talk): Spacja poza aktywnymi polami tekstowymi
  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !isEditableTarget(e.target) &&
        !disabled
      ) {
        e.preventDefault();
        void startRecording(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditableTarget(e.target)) {
        if (isRecordingRef.current && isHoldModeRef.current) {
          e.preventDefault();
          stopRecording();
        }
      }
    };

    const handleWindowBlur = () => {
      if (isRecordingRef.current && isHoldModeRef.current) {
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [disabled, startRecording, stopRecording]);

  // Sprzątanie przy unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    isRecording,
    isTranscribing,
    isHoldMode,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
