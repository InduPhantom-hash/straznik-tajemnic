'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { HelpIcon } from './tooltip';
import { MapPin, Clock } from 'lucide-react';
import type { AdventureContext } from '@/lib/adventures-data';
import {
  TONE_STYLES,
  ERA_STYLES,
  DIFFICULTY_STYLES,
} from '@/lib/data/adventure-styles';

interface AdventureDetailsModalProps {
  adventure: AdventureContext | null;
  open: boolean;
  onClose: () => void;
  /** Wybór tej przygody (zaznacza ją na liście) i zamknięcie modala. */
  onChoose: (adventure: AdventureContext) => void;
}

/**
 * Modal "Więcej szczegółów" przygody.
 *
 * Prezentuje fabułę, haczyk, sugerowane zawody i archetypy badaczy oraz tagi klimatu.
 * Definicje mechaniczne (ton, era, trudność) są dostępne w dyskretnych tooltipach przy badge'ach.
 */
export function AdventureDetailsModal({
  adventure,
  open,
  onClose,
  onChoose,
}: AdventureDetailsModalProps) {
  const t = useTranslations('AdventureDetailsModal');
  const tStyles = useTranslations('AdventureStyles');
  if (!adventure) return null;

  const toneStyle = TONE_STYLES[adventure.tone] || TONE_STYLES.purist;
  const eraStyle = ERA_STYLES[adventure.era] || ERA_STYLES.custom;
  const diffStyle =
    DIFFICULTY_STYLES[adventure.difficulty] || DIFFICULTY_STYLES.normal;

  const ToneIcon = toneStyle.icon;
  const EraIcon = eraStyle.icon;
  const DiffIcon = diffStyle.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="screen">
        {/* Narożniki déco */}
        <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-brass/55" />

        <DialogHeader>
          <div className="font-display text-xs uppercase tracking-[0.3em] text-primary">
            {t('eyebrow')}
          </div>
          <DialogTitle className="mt-1 font-display text-2xl font-bold uppercase tracking-[0.08em] text-foreground">
            {adventure.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {adventure.title}
          </DialogDescription>

          {/* Badge'e z tooltipami definicji */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 border border-brass/40 px-2.5 py-1 font-display text-xs uppercase tracking-[0.08em] ${toneStyle.color}`}
              >
                <ToneIcon className="h-3.5 w-3.5 shrink-0" />
                {tStyles(toneStyle.translationKey)}
              </span>
              <HelpIcon content={tStyles(toneStyle.descriptionKey)} />
            </div>

            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 border border-brass/40 px-2.5 py-1 font-display text-xs uppercase tracking-[0.08em] ${eraStyle.color}`}
              >
                <EraIcon className="h-3.5 w-3.5 shrink-0" />
                {tStyles(eraStyle.translationKey)}
              </span>
              <HelpIcon content={tStyles(eraStyle.descriptionKey)} />
            </div>

            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 border border-brass/40 px-2.5 py-1 font-display text-xs uppercase tracking-[0.08em] ${diffStyle.color}`}
              >
                <DiffIcon className="h-3.5 w-3.5 shrink-0" />
                {tStyles(diffStyle.translationKey)}
              </span>
              <HelpIcon content={tStyles(diffStyle.descriptionKey)} />
            </div>
          </div>
        </DialogHeader>

        {/* Separator déco */}
        <div className="mt-3 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
          <span className="h-2 w-2 rotate-45 bg-brass" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
        </div>

        {/* Metadane (lokalizacja, liczba sesji) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 font-serif text-sm italic text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brass/70 shrink-0" />
            {adventure.location}
            {adventure.country ? `, ${adventure.country}` : ''}
          </span>
          {adventure.estimatedSessions && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brass/70 shrink-0" />
              {t('estimatedSessions', { count: adventure.estimatedSessions })}
            </span>
          )}
        </div>

        {/* Haczyk fabularny / lead jeśli dostępny */}
        {adventure.hook && (
          <div className="mt-3 border-l-2 border-brass/50 pl-3">
            <p className="font-serif text-base italic text-brass/90 leading-relaxed">
              {adventure.hook}
            </p>
          </div>
        )}

        {/* Główny opis intrygi */}
        <div className="relative mt-3 border border-brass/30 bg-card/60 p-4">
          <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
          <span className="absolute bottom-2 right-2 h-3 w-3 border-b-[1.5px] border-r-[1.5px] border-brass/50" />
          <p className="font-serif text-base leading-relaxed text-foreground/90">
            {adventure.description}
          </p>
        </div>

        {/* Sugerowane zawody i archetypy badaczy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {adventure.suggestedOccupations && adventure.suggestedOccupations.length > 0 && (
            <div className="border border-brass/20 bg-card/30 p-3">
              <span className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass block mb-1">
                {t('suggestedOccupationsTitle')}
              </span>
              <p className="font-serif text-sm italic text-foreground/80">
                {adventure.suggestedOccupations.join(', ')}
              </p>
            </div>
          )}
          {adventure.suggestedArchetypes && adventure.suggestedArchetypes.length > 0 && (
            <div className="border border-brass/20 bg-card/30 p-3">
              <span className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass block mb-1">
                {t('suggestedArchetypesTitle')}
              </span>
              <p className="font-serif text-sm italic text-foreground/80">
                {adventure.suggestedArchetypes.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Tagi klimatu */}
        {adventure.themes && adventure.themes.length > 0 && (
          <div className="mt-4">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass block mb-2">
              {t('themesTitle')}
            </span>
            <div className="flex flex-wrap gap-2">
              {adventure.themes.map((theme) => (
                <span
                  key={theme}
                  className="border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-display text-xs tracking-wider text-primary"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Przyciski akcji */}
        <div className="mt-6 flex justify-end gap-2 border-t border-brass/20 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="font-display font-semibold uppercase tracking-[0.16em]"
          >
            {t('close')}
          </Button>
          <Button
            onClick={() => {
              onChoose(adventure);
              onClose();
            }}
            className="font-display font-semibold uppercase tracking-[0.16em]"
          >
            {t('choose')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdventureDetailsModal;
