'use client';

import type { FC } from 'react';

interface CthulhuLogoProps {
  className?: string;
  size?: number;
}

/**
 * FEATURE:#15 - Sylwetka Cthulhu jako logo
 * Minimalistyczna sylwetka Cthulhu w stylu Lovecrafta
 */
export const CthulhuLogo: FC<CthulhuLogoProps> = ({ 
  className = '', 
  size = 32 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cthulhu Logo"
    >
      {/* Głowa - ośmiornicowy kształt */}
      <ellipse 
        cx="50" 
        cy="35" 
        rx="30" 
        ry="25" 
        fill="currentColor" 
        opacity="0.9"
      />
      
      {/* Oczy - świecące, nieludzkie */}
      <ellipse cx="38" cy="30" rx="6" ry="8" fill="#10b981" opacity="0.9" />
      <ellipse cx="62" cy="30" rx="6" ry="8" fill="#10b981" opacity="0.9" />
      <ellipse cx="38" cy="30" rx="3" ry="4" fill="#0f0f0f" />
      <ellipse cx="62" cy="30" rx="3" ry="4" fill="#0f0f0f" />
      
      {/* Macki - główne */}
      <path
        d="M30 50 Q20 60 15 75 Q12 85 18 90"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M38 52 Q30 68 25 82 Q22 92 28 95"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 55 Q50 70 50 85 Q50 95 50 98"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M62 52 Q70 68 75 82 Q78 92 72 95"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M70 50 Q80 60 85 75 Q88 85 82 90"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Macki - mniejsze po bokach */}
      <path
        d="M25 45 Q15 50 10 60 Q8 70 12 75"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M75 45 Q85 50 90 60 Q92 70 88 75"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      
      {/* Skrzydła - stylizowane */}
      <path
        d="M20 35 Q5 25 8 15 Q12 8 25 12 Q30 15 28 25"
        stroke="currentColor"
        strokeWidth="3"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M80 35 Q95 25 92 15 Q88 8 75 12 Q70 15 72 25"
        stroke="currentColor"
        strokeWidth="3"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
};

export default CthulhuLogo;
