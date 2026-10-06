'use client';

import type { FC } from 'react';

interface ArtDecoEyeProps {
  className?: string;
  size?: number;
  /**
   * Tryb animacji:
   * - 'rotating': powolny obrót promieni w tle + pulsowanie Oka
   * - 'gentle': subtelne pulsowanie szmaragdowego blasku
   * - 'static': stały widok
   */
  mode?: 'rotating' | 'gentle' | 'static';
}

/**
 * ArtDecoEye - Kanoniczny symbol Oka Strażnika Tajemnic (Oko Horusa 𓂀).
 * 
 * Odwzorowuje 1:1 oficjalną ikonę aplikacji:
 * - Ciemne tło obsydianowe
 * - Złote promienie Art Déco (repeating-conic-gradient)
 * - Centralny szmaragdowy blask (bloom #11B3A3)
 * - Święty symbol Oka Horusa ze świetlistą poświatą text-shadow
 */
export const ArtDecoEye: FC<ArtDecoEyeProps> = ({
  className = '',
  size = 72,
  mode = 'rotating',
}) => {
  const isRotating = mode === 'rotating';
  const isGentle = mode === 'gentle';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none rounded-2xl overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(75% 75% at 50% 45%, #1A1610 0%, #0A0C0F 66%, #060708 100%)',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(212, 175, 55, 0.15)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
      }}
      aria-label="Symbol Oka Strażnika Tajemnic"
      role="img"
    >
      {/* 1. Złote promienie Art Déco w tle */}
      <div
        className={`absolute -inset-4 pointer-events-none ${
          isRotating
            ? 'animate-[spin_40s_linear_infinite]'
            : isGentle
            ? 'animate-[spin_90s_linear_infinite]'
            : ''
        }`}
        style={{
          background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(212, 175, 55, 0.22) 0deg 1.6deg, transparent 1.6deg 9deg)',
          opacity: 0.85,
        }}
      />

      {/* 2. Szmaragdowy bloom */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isRotating || isGentle ? 'animate-pulse' : ''
        }`}
        style={{
          background: 'radial-gradient(45% 45% at 50% 50%, rgba(17, 179, 163, 0.45) 0%, transparent 70%)',
        }}
      />

      {/* 3. Kanoniczne Oko Horusa */}
      <span
        className={`relative z-10 leading-none select-none text-[#11B3A3] ${
          isRotating || isGentle ? 'animate-glyph-pulse' : ''
        }`}
        style={{
          fontSize: `${Math.round(size * 0.58)}px`,
          textShadow: '0 0 10px rgba(17, 179, 163, 0.9), 0 0 22px rgba(17, 179, 163, 0.5)',
          transform: 'translateY(-2%)',
        }}
      >
        𓂀
      </span>
    </div>
  );
};

export default ArtDecoEye;
