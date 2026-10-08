'use client';

import { useState, useEffect, useCallback } from 'react';

export type TextScale = 'normal' | 'larger' | 'largest';

export const TEXT_SCALE_KEY = 'straznik_text_scale';
export const TEXT_SCALE_EVENT = 'straznik:text-scale-changed';

export interface TextScaleOption {
  id: TextScale;
  factor: number;
  percentage: string;
}

export const TEXT_SCALES: TextScaleOption[] = [
  { id: 'normal', factor: 1.0, percentage: '100%' },
  { id: 'larger', factor: 1.15, percentage: '115%' },
  { id: 'largest', factor: 1.25, percentage: '125%' },
];

export function applyTextScale(scale: TextScale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-text-scale', scale);
}

export function getInitialTextScale(): TextScale {
  if (typeof window === 'undefined') return 'normal';
  try {
    const saved = localStorage.getItem(TEXT_SCALE_KEY);
    if (saved === 'larger' || saved === 'largest' || saved === 'normal') {
      return saved;
    }
  } catch {
    // localStorage can fail in privacy modes
  }
  return 'normal';
}

export function useTextScale() {
  const [scale, setScaleState] = useState<TextScale>('normal');

  useEffect(() => {
    const initial = getInitialTextScale();
    setScaleState(initial);
    applyTextScale(initial);

    const handleStorageOrEvent = () => {
      const current = getInitialTextScale();
      setScaleState(current);
      applyTextScale(current);
    };

    window.addEventListener(TEXT_SCALE_EVENT, handleStorageOrEvent);
    window.addEventListener('storage', handleStorageOrEvent);

    return () => {
      window.removeEventListener(TEXT_SCALE_EVENT, handleStorageOrEvent);
      window.removeEventListener('storage', handleStorageOrEvent);
    };
  }, []);

  const setScale = useCallback((newScale: TextScale) => {
    setScaleState(newScale);
    try {
      localStorage.setItem(TEXT_SCALE_KEY, newScale);
    } catch {
      // ignore storage error
    }
    applyTextScale(newScale);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TEXT_SCALE_EVENT, { detail: newScale })
      );
    }
  }, []);

  return { scale, setScale, scales: TEXT_SCALES };
}
