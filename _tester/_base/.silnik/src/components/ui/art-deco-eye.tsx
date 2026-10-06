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
          {/* Gradient polerowanego mosiądzu / jasnego złota Art Déco */}
          <linearGradient id="artDecoGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF275" />
            <stop offset="35%" stopColor="#F6E05E" />
            <stop offset="70%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#FFE082" />
          </linearGradient>

          {/* Intensywny szmaragd z wysokim kontrastem dla źrenicy */}
          <radialGradient id="eyePupilGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="1" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.95" />
            <stop offset="85%" stopColor="#047857" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#022C22" stopOpacity="1" />
          </radialGradient>

          {/* Złota poświata */}
          <radialGradient id="eyeAuraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F6E05E" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>

          {/* Filtr drop-shadow */}
          <filter id="goldGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
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
            r="49"
            stroke="url(#artDecoGold)"
            strokeWidth="1.8"
            strokeDasharray="3 5"
            opacity="0.95"
          />

          {/* Drugi pierścień cienki */}
          <circle
            cx="60"
            cy="60"
            r="43"
            stroke="url(#artDecoGold)"
            strokeWidth="1.2"
            opacity="0.85"
          />

          {/* 8 promieni głównych Art Déco (romboidalne/strzałkowe) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 60 60)`}>
              {/* Główny promień pionowy */}
              <line
                x1="60"
                y1="6"
                x2="60"
                y2="24"
                stroke="url(#artDecoGold)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              {/* Ostrze strzałki na końcu */}
              <polygon
                points="60,2 56.5,12 63.5,12"
                fill="url(#artDecoGold)"
              />
            </g>
          ))}
        </g>

        {/* ========================================================= */}
        {/* WARSTWA 2: Geometria migdała oka i mosiężnych ram Art Déco */}
        {/* ========================================================= */}
        <g>
          {/* Tło migdała oka (głęboki obsydian) */}
          <path
            d="M 14 60 Q 60 18 106 60 Q 60 102 14 60 Z"
            fill="#0E1015"
            stroke="url(#artDecoGold)"
            strokeWidth="2.4"
          />

          {/* Wewnętrzny obrys migdała */}
          <path
            d="M 22 60 Q 60 28 98 60 Q 60 92 22 60 Z"
            fill="none"
            stroke="url(#artDecoGold)"
            strokeWidth="1.4"
            opacity="0.85"
            strokeDasharray="4 2"
          />

          {/* Geometryczne okręgi tęczówki */}
          <circle
            cx="60"
            cy="60"
            r="19"
            stroke="url(#artDecoGold)"
            strokeWidth="2"
            fill="#0A0B0E"
          />
          <circle
            cx="60"
            cy="60"
            r="15"
            stroke="url(#artDecoGold)"
            strokeWidth="1"
            fill="none"
            opacity="0.8"
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
            r="12"
            fill="url(#eyePupilGlow)"
            filter="url(#goldGlowFilter)"
          />

          {/* Wewnętrzny punkt źrenicy (czarny środek) */}
          <ellipse
            cx="60"
            cy="60"
            rx="4.5"
            ry="8"
            fill="#010304"
            stroke="url(#artDecoGold)"
            strokeWidth="1.4"
          />

          {/* Blik świetlny (refleks soczewki) */}
          <circle cx="58" cy="56.5" r="1.8" fill="#FFFFFF" opacity="0.95" />
          <circle cx="62" cy="62.5" r="1" fill="#FFFFFF" opacity="0.75" />
        </g>
      </svg>
    </div>
  );
};

export default ArtDecoEye;
