'use client';

import { useTranslations } from 'next-intl';
import { useTextScale, type TextScale } from '@/hooks/useTextScale';

export function TypographySettings() {
  const t = useTranslations('TypographySettings');
  const { scale, setScale, scales } = useTextScale();

  return (
    <div
      data-testid="typography-settings-section"
      className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-5 mb-6 shadow-[0_0_22px_rgba(13,148,136,0.08)]"
    >
      <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/60" />
      <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/60" />

      <div className="font-special-elite text-[14px] uppercase tracking-[0.32em] text-primary">
        {t('eyebrow')}
      </div>
      <h3 className="font-display uppercase text-brass text-xl font-bold tracking-[0.1em] mt-1.5">
        {t('title')}
      </h3>
      <p className="font-serif italic text-base text-muted-foreground mt-1.5 mb-5">
        {t('description')}
      </p>

      {/* Siatka 3 przycisków wyboru skali */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {scales.map((option) => {
          const isSelected = scale === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setScale(option.id)}
              className={`relative p-4 border text-left transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'border-primary bg-[#0e1413] shadow-[0_0_22px_rgba(13,148,136,0.2)]'
                  : 'border-brass/25 bg-[#16130f] hover:border-primary/50 hover:bg-[#0e1413]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className={`font-display font-bold text-base tracking-[0.12em] ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t(`scales.${option.id}.label`)}
                </span>
                <span
                  className={`font-special-elite text-xs uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isSelected
                      ? 'bg-primary text-[#04110f] border-primary font-bold shadow'
                      : 'bg-brass/10 text-brass border-brass/30'
                  }`}
                >
                  {option.percentage}
                </span>
              </div>
              <p className="font-serif italic text-sm text-muted-foreground leading-snug">
                {t(`scales.${option.id}.description`)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Karta podglądu czytelności */}
      <div className="border border-brass/25 bg-[#120f0c] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-special-elite text-xs uppercase tracking-[0.2em] text-brass/80">
            {t('previewTitle')}
          </span>
          <span className="font-special-elite text-[11px] text-primary">
            {scales.find((s) => s.id === scale)?.percentage || '100%'}
          </span>
        </div>
        <p className="font-serif italic text-base leading-relaxed text-foreground/90">
          {t('previewText')}
        </p>
      </div>
    </div>
  );
}
