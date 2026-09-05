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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './accordion';
import { MapPin, Clock, ScrollText, Lock } from 'lucide-react';
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
 * Modal "Więcej szczegółów" przygody (Dark Art Déco).
 *
 * Prezentuje zwięzły, klimatyczny zarys sprawy (haczyk narracyjny) bez spoilerów
 * oraz czytelną metrykę śledztwa (miejsce, epoka, styl, czas i trudność).
 *
 * Pełna intryga, motywy i sugerowana obsada dla Mistrza Gry są ukryte
 * pod rozwijanymi aktami poufnymi ze spoiler-tagiem.
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

  const displayHook =
    adventure.hook?.trim() ||
    adventure.description?.split('.')[0]?.trim() + '.' ||
    '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="wide" className="max-w-3xl overflow-y-auto p-6 sm:p-7">
        {/* Narożniki déco */}
        <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-brass/55" />

        <DialogHeader>
          <div className="font-display text-xs uppercase tracking-[0.3em] text-primary">
            {t('eyebrow')}
          </div>
          <DialogTitle className="mt-1 font-display text-2xl sm:text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
            {adventure.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {adventure.title}
          </DialogDescription>
        </DialogHeader>

        {/* Separator déco */}
        <div className="mt-2 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/70" />
          <span className="h-2 w-2 rotate-45 bg-brass" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/70" />
        </div>

        {/* Haczyk narracyjny / lead (bez spoilerów) */}
        {displayHook && (
          <div className="relative mt-2 border border-brass/35 bg-card/60 p-4 shadow-inner">
            <span className="pointer-events-none absolute -left-1 -top-1 h-2.5 w-2.5 border-l-2 border-t-2 border-gold" />
            <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 border-r-2 border-t-2 border-gold" />
            <span className="pointer-events-none absolute -bottom-1 -left-1 h-2.5 w-2.5 border-b-2 border-l-2 border-gold" />
            <span className="pointer-events-none absolute -bottom-1 -right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-gold" />

            <div className="flex items-center gap-2 mb-2">
              <ScrollText className="h-4 w-4 text-brass shrink-0" />
              <span className="font-display text-[11px] uppercase tracking-[0.2em] text-brass/90 font-semibold">
                {t('narrativeHookTitle')}
              </span>
            </div>
            <p className="font-serif text-base italic leading-relaxed text-foreground/95">
              {displayHook}
            </p>
          </div>
        )}

        {/* Siatka metadanych (4 czytelne kafle Dark Art Déco) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Kafel 1: Miejsce */}
          <div className="border border-brass/25 bg-card/40 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-brass/80 font-display text-[11px] uppercase tracking-wider mb-1">
              <MapPin className="h-3.5 w-3.5 text-brass shrink-0" />
              <span>{t('metaLocation')}</span>
            </div>
            <div
              className="font-serif text-sm font-medium text-foreground/90 truncate"
              title={`${adventure.location}${adventure.country ? `, ${adventure.country}` : ''}`}
            >
              {adventure.location || '-'}
              {adventure.country ? `, ${adventure.country}` : ''}
            </div>
          </div>

          {/* Kafel 2: Epoka */}
          <div className="border border-brass/25 bg-card/40 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-brass/80 font-display text-[11px] uppercase tracking-wider mb-1">
              <span className="inline-flex items-center gap-1.5">
                <EraIcon className="h-3.5 w-3.5 text-brass shrink-0" />
                {t('metaEra')}
              </span>
              <HelpIcon content={tStyles(eraStyle.descriptionKey)} />
            </div>
            <div className="font-serif text-sm font-medium text-foreground/90">
              <span>{tStyles(eraStyle.translationKey)}</span>
              {adventure.yearRange && (
                <span className="text-muted-foreground text-xs ml-1">
                  ({adventure.yearRange})
                </span>
              )}
            </div>
          </div>

          {/* Kafel 3: Styl i nastrój */}
          <div className="border border-brass/25 bg-card/40 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-brass/80 font-display text-[11px] uppercase tracking-wider mb-1">
              <span className="inline-flex items-center gap-1.5">
                <ToneIcon className="h-3.5 w-3.5 text-brass shrink-0" />
                {t('metaTone')}
              </span>
              <HelpIcon content={tStyles(toneStyle.descriptionKey)} />
            </div>
            <div className="font-serif text-sm font-medium text-foreground/90">
              {tStyles(toneStyle.translationKey)}
            </div>
          </div>

          {/* Kafel 4: Czas i wyzwanie */}
          <div className="border border-brass/25 bg-card/40 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-brass/80 font-display text-[11px] uppercase tracking-wider mb-1">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brass shrink-0" />
                {t('metaDifficultySessions')}
              </span>
              <HelpIcon content={tStyles(diffStyle.descriptionKey)} />
            </div>
            <div className="font-serif text-sm font-medium text-foreground/90">
              {adventure.estimatedSessions ? (
                <>
                  {t('estimatedSessions', { count: adventure.estimatedSessions })}
                  <span className="text-brass/60 mx-1">·</span>
                </>
              ) : null}
              {tStyles(diffStyle.translationKey)}
            </div>
          </div>
        </div>

        {/* Akordeon akt poufnych dla Mistrza Gry (Spoilery) */}
        <div className="mt-4 border-t border-brass/20 pt-3">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem
              value="keeper-dossier"
              className="border border-amber-600/30 bg-card/30 rounded-none px-3"
            >
              <AccordionTrigger className="py-2.5 hover:no-underline group">
                <div className="flex items-center gap-2.5 text-left">
                  <Lock className="h-4 w-4 text-amber-500/80 shrink-0 group-hover:text-amber-400 transition-colors" />
                  <div>
                    <div className="font-display text-xs uppercase tracking-[0.14em] text-amber-400 font-bold group-hover:text-amber-300 transition-colors flex items-center gap-2">
                      <span>{t('keeperDossierTitle')}</span>
                    </div>
                    <div className="font-serif text-xs italic text-muted-foreground mt-0.5">
                      {t('keeperDossierSubtitle')}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 space-y-4">
                {/* Pełny opis intrygi */}
                {adventure.description && (
                  <div className="border-l-2 border-amber-500/40 pl-3">
                    <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400/90 block mb-1">
                      {t('keeperPlotTitle')}
                    </span>
                    <p className="font-serif text-sm leading-relaxed text-foreground/85">
                      {adventure.description}
                    </p>
                  </div>
                )}

                {/* Sugerowane zawody i archetypy */}
                {((adventure.suggestedOccupations &&
                  adventure.suggestedOccupations.length > 0) ||
                  (adventure.suggestedArchetypes &&
                    adventure.suggestedArchetypes.length > 0)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {adventure.suggestedOccupations &&
                      adventure.suggestedOccupations.length > 0 && (
                        <div className="border border-brass/20 bg-card/30 p-2.5">
                          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-brass block mb-1">
                            {t('suggestedOccupationsTitle')}
                          </span>
                          <p className="font-serif text-xs italic text-foreground/80">
                            {adventure.suggestedOccupations.join(', ')}
                          </p>
                        </div>
                      )}
                    {adventure.suggestedArchetypes &&
                      adventure.suggestedArchetypes.length > 0 && (
                        <div className="border border-brass/20 bg-card/30 p-2.5">
                          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-brass block mb-1">
                            {t('suggestedArchetypesTitle')}
                          </span>
                          <p className="font-serif text-xs italic text-foreground/80">
                            {adventure.suggestedArchetypes.join(', ')}
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {/* Tagi klimatu */}
                {adventure.themes && adventure.themes.length > 0 && (
                  <div className="pt-1">
                    <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-brass block mb-1.5">
                      {t('themesTitle')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {adventure.themes.map((theme) => (
                        <span
                          key={theme}
                          className="border border-brass/30 bg-brass/10 px-2 py-0.5 font-display text-[11px] tracking-wider text-brass/90"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Przyciski akcji */}
        <div className="mt-4 flex justify-end gap-2 border-t border-brass/20 pt-4">
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
