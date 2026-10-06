'use client';

import type { FC } from 'react';

interface ArtDecoEyeProps {
  className?: string;
  size?: number;
  /**
   * Tryb animacji:
   * - 'rotating': ciągły obrót promieni + pulsowanie źrenicy (dla okna procesu / pobierania)
   * - 'gentle': powolna, majestatyczna pulsacja światła i mikro-rotacja (dla modala)
   * - 'static': stały widok wektorowy
   */
  mode?: 'rotating' | 'gentle' | 'static';
}

/**
 * ArtDecoEye - Komponent wektorowy Oka Strażnika Tajemnic w stylu Dark Art Déco.
 * 
 * 3 warstwy wektorowe:
 * 1. Zewnętrzna aureola ze strzelistymi promieniami i geometryczną tarczą (ciągła rotacja GPU).
 * 2. Środkowy geometryczny migdał oka z mosiężnymi szynami i podwójną obwódką.
 * 3. Źrenica z okultystyczną soczewką, złotą poświatą drop-shadow i subtelnym pulsowaniem.
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
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="Symbol Oka Strażnika Tajemnic"
      role="img"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Gradient mosiądzu / antycznego złota */}
          <linearGradient id="artDecoGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F6E05E" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#AA7C11" />
            <stop offset="100%" stopColor="#E2C974" />
          </linearGradient>

          {/* Głęboki szmaragd / ciemna zieleń okultystyczna dla źrenicy */}
          <radialGradient id="eyePupilGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#047857" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#022C22" stopOpacity="1" />
          </radialGradient>

          {/* Złota poświata */}
          <radialGradient id="eyeAuraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>

          {/* Filtr drop-shadow */}
          <filter id="goldGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Poświata tła */}
        <circle cx="60" cy="60" r="54" fill="url(#eyeAuraGlow)" />

        {/* ========================================================= */}
        {/* WARSTWA 1: Zewnętrzna aureola geometryczna z promieniami */}
        {/* ========================================================= */}
        <g
          className={`origin-center transition-transform ${
            isRotating
              ? 'animate-[spin_24s_linear_infinite]'
              : isGentle
              ? 'animate-[spin_72s_linear_infinite]'
              : ''
          }`}
          style={{ transformOrigin: '60px 60px' }}
        >
          {/* Zewnętrzny pierścień kropkowany/ząbkowany */}
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#artDecoGold)"
            strokeWidth="1.2"
            strokeDasharray="2 6"
            opacity="0.7"
          />

          {/* Drugi pierścień cienki */}
          <circle
            cx="60"
            cy="60"
            r="44"
            stroke="url(#artDecoGold)"
            strokeWidth="0.8"
            opacity="0.5"
          />

          {/* 8 promieni głównych Art Déco (romboidalne/strzałkowe) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 60 60)`}>
              {/* Główny promień pionowy */}
              <line
                x1="60"
                y1="8"
                x2="60"
                y2="24"
                stroke="url(#artDecoGold)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Ostrze strzałki na końcu */}
              <polygon
                points="60,4 57.5,12 62.5,12"
                fill="url(#artDecoGold)"
                opacity="0.85"
              />
              {/* Mały romb pośredni */}
              <polygon
                points="60,18 58.5,21 60,24 61.5,21"
                fill="url(#artDecoGold)"
                opacity="0.7"
              />
            </g>
          ))}

          {/* 8 promieni wtórnych drobnych */}
          {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 60 60)`}>
              <line
                x1="60"
                y1="16"
                x2="60"
                y2="28"
                stroke="url(#artDecoGold)"
                strokeWidth="1"
                opacity="0.6"
              />
              <circle cx="60" cy="14" r="1" fill="url(#artDecoGold)" opacity="0.8" />
            </g>
          ))}
        </g>

        {/* ========================================================= */}
        {/* WARSTWA 2: Geometria migdała oka i mosiężnych ram Art Déco */}
        {/* ========================================================= */}
        <g>
          {/* Tło migdała oka (głęboki obsydian) */}
          <path
            d="M 16 60 Q 60 22 104 60 Q 60 98 16 60 Z"
            fill="#0A0B0D"
            stroke="url(#artDecoGold)"
            strokeWidth="1.8"
          />

          {/* Wewnętrzny obrys migdała */}
          <path
            d="M 24 60 Q 60 30 96 60 Q 60 90 24 60 Z"
            fill="none"
            stroke="url(#artDecoGold)"
            strokeWidth="1"
            opacity="0.65"
            strokeDasharray="4 2"
          />

          {/* Półłuki i łezki w kącikach (charakterystyczne dla Art Déco) */}
          <path
            d="M 16 60 L 26 56 L 26 64 Z"
            fill="url(#artDecoGold)"
            opacity="0.8"
          />
          <path
            d="M 104 60 L 94 56 L 94 64 Z"
            fill="url(#artDecoGold)"
            opacity="0.8"
          />

          {/* Geometryczne okręgi tęczówki */}
          <circle
            cx="60"
            cy="60"
            r="20"
            stroke="url(#artDecoGold)"
            strokeWidth="1.6"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r="16"
            stroke="url(#artDecoGold)"
            strokeWidth="0.8"
            fill="none"
            opacity="0.75"
          />
        </g>

        {/* ========================================================= */}
        {/* WARSTWA 3: Źrenica z pulsującym szmaragdem i soczewką     */}
        {/* ========================================================= */}
        <g
          className={`origin-center ${
            isRotating || isGentle ? 'animate-pulse' : ''
          }`}
          style={{ transformOrigin: '60px 60px' }}
        >
          {/* Źrenica wypełniona szmaragdowo-złotym gradientem */}
          <circle
            cx="60"
            cy="60"
            r="11"
            fill="url(#eyePupilGlow)"
            filter="url(#goldGlowFilter)"
          />

          {/* Wewnętrzny punkt źrenicy (czarny środek) */}
          <ellipse
            cx="60"
            cy="60"
            rx="4.5"
            ry="7.5"
            fill="#030708"
            stroke="url(#artDecoGold)"
            strokeWidth="1"
          />

          {/* Blik świetlny (refleks soczewki) */}
          <circle cx="58" cy="57" r="1.6" fill="#FDF6B6" opacity="0.95" />
          <circle cx="62" cy="62" r="0.8" fill="#FDF6B6" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
};

export default ArtDecoEye;
