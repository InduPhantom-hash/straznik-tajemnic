'use client';

/**
 * @file game-over-card.tsx
 * Diegetyczny komponent ostatecznego kresu postaci gracza (CoC 7e RAW s. 119-123 i s. 171-186).
 * Wyświetlany w czacie po emisji znacznika [GAME_OVER:...].
 * Renderuje:
 * - Wycinek z kroniki kryminalnej "The Arkham Advertiser" (przy śmierci badacza)
 * - Oficjalną kartę przyjęcia do Arkham Sanitarium (przy trwałym obłędzie)
 * Oferuje podwójny diegetyczny wybór:
 * 1. Zakończ śledztwo (Porażka / Triumf zła)
 * 2. Kontynuuj śledztwo (Dziedzictwo / Nowy Badacz dziedziczący Dossier)
 */

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Skull,
  Brain,
  FileText,
  UserCheck,
  Archive,
  AlertOctagon,
  Clock,
  MapPin,
  Flame,
} from 'lucide-react';
import type { Character, GameOverEventData } from '@/lib/types';

export interface GameOverCardProps {
  gameOverEvent: GameOverEventData;
  activeCharacter?: Character | null;
  characters?: Character[];
  onFinishInvestigation?: (event: GameOverEventData) => void;
  onContinueWithLegacy?: (event: GameOverEventData, chosenCharacterId?: string) => void;
  onSendChat?: (message: string) => void;
  completed?: boolean;
}

export function GameOverCard({
  gameOverEvent,
  activeCharacter,
  characters = [],
  onFinishInvestigation,
  onContinueWithLegacy,
  onSendChat,
  completed = false,
}: GameOverCardProps) {
  const t = useTranslations('GameOverCard');
  const locale = useLocale();

  const [selectedSuccessorId, setSelectedSuccessorId] = useState<string>('');
  const [decisionMade, setDecisionMade] = useState<boolean>(completed);

  const isDeath = gameOverEvent.type === 'death';
  const characterName = gameOverEvent.characterName || activeCharacter?.name || t('defaultInvestigator');
  const dateStr = gameOverEvent.date || new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'pl-PL');
  const locationStr = gameOverEvent.location || 'Arkham, Massachusetts';

  // Dostępni sojusznicy do przejęcia płomienia
  const eligibleSuccessors = characters.filter(
    (c) => c.id !== activeCharacter?.id && !c.isDead && c.insanityState !== 'permanent'
  );

  const handleFinish = () => {
    setDecisionMade(true);
    onFinishInvestigation?.(gameOverEvent);
    const text = isDeath
      ? t('finishDeclarationDeath', { name: characterName })
      : t('finishDeclarationInsane', { name: characterName });
    onSendChat?.(text);
  };

  const handleContinue = () => {
    setDecisionMade(true);
    onContinueWithLegacy?.(gameOverEvent, selectedSuccessorId || undefined);
    const chosen = characters.find((c) => c.id === selectedSuccessorId);
    const successorName = chosen?.name || t('newInvestigatorDefault');
    const text = t('continueDeclaration', {
      previous: characterName,
      successor: successorName,
    });
    onSendChat?.(text);
  };

  return (
    <Card className="my-4 overflow-hidden border-2 border-amber-900/60 bg-stone-950/95 shadow-2xl transition-all">
      {/* Ozdobny nagłówek w stylu Dark Art Déco */}
      <div className="border-b border-amber-900/40 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isDeath ? (
              <Skull className="h-5 w-5 text-rose-500 animate-pulse" />
            ) : (
              <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
            )}
            <span className="font-display text-base font-bold uppercase tracking-widest text-amber-200">
              {isDeath ? t('newspaperHeader') : t('sanitariumHeader')}
            </span>
            <Badge className="border-amber-700/50 bg-amber-950/40 font-mono text-[10px] text-amber-400">
              CoC 7e RAW
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {dateStr}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {locationStr}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 p-5">
        {/* Diegetyczny dokument: Gazeta lub Karta Medyczna */}
        {isDeath ? (
          /* WYCINEK PRASOWY: THE ARKHAM ADVERTISER */
          <div className="rounded border border-stone-800 bg-[#14120e] p-5 font-serif text-stone-300 shadow-inner">
            <div className="border-b border-stone-800 pb-2 text-center">
              <h2 className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
                The Arkham Advertiser — Wydanie Nadzwyczajne
              </h2>
              <h1 className="mt-1 font-serif text-xl font-bold uppercase tracking-tight text-amber-100/90">
                {gameOverEvent.newspaperSnippet?.headline || t('defaultDeathHeadline')}
              </h1>
            </div>

            <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-300/90 text-justify first-letter:float-left first-letter:mr-2 first-letter:text-3xl first-letter:font-bold first-letter:text-amber-500">
              <p>
                {gameOverEvent.newspaperSnippet?.body ||
                  t('defaultDeathBody', {
                    name: characterName,
                    reason: gameOverEvent.reason,
                    location: locationStr,
                  })}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-stone-800/80 pt-2 text-[11px] italic text-stone-500">
              <span>{t('policeInquestOngoing')}</span>
              <span>{t('caseFiledInArchives')}</span>
            </div>
          </div>
        ) : (
          /* KARTA SZPITALNA: ARKHAM SANITARIUM */
          <div className="rounded border border-stone-800 bg-[#0d1117] p-5 font-mono text-stone-300 shadow-inner">
            <div className="border-b border-stone-800 pb-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>ARKHAM SANITARIUM — ODDZIAŁ ZAMKNIĘTY</span>
                <span>AKT NR: {gameOverEvent.sanitariumRecord?.admissionNo || 'AS-7109'}</span>
              </div>
              <h1 className="mt-1 font-display text-lg font-bold text-purple-200">
                KARTA PRZYJĘCIA PACJENTA: {characterName}
              </h1>
            </div>

            <div className="mt-3 space-y-2 text-xs leading-relaxed text-stone-300">
              <div>
                <strong className="text-purple-300">{t('attendingPhysician')}:</strong>{' '}
                {gameOverEvent.sanitariumRecord?.physicianName || 'dr Eric Harden'}
              </div>
              <div>
                <strong className="text-purple-300">{t('clinicalDiagnosis')}:</strong>{' '}
                <span className="italic text-stone-200">
                  {gameOverEvent.sanitariumRecord?.diagnosis || gameOverEvent.reason}
                </span>
              </div>
              <div className="rounded bg-stone-950/80 p-3 border border-purple-900/30">
                <strong className="text-purple-400 block mb-1">{t('recordedObsession')}:</strong>
                <p className="font-serif text-sm italic text-purple-200/90">
                  „{gameOverEvent.sanitariumRecord?.lastWords || 'Tekeli-li! Tekeli-li!'}”
                </p>
              </div>
            </div>

            <div className="mt-3 border-t border-stone-800/80 pt-2 text-[11px] text-stone-500">
              {t('sanitariumPrognosis')}
            </div>
          </div>
        )}

        {/* Sekcja Wyboru Gracza */}
        {!decisionMade ? (
          <div className="space-y-4 rounded-lg border border-amber-900/30 bg-stone-900/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <AlertOctagon className="h-4 w-4 text-amber-400" />
              <span>{t('chooseFateHeader')}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Opcja 1: Zamknięcie Śledztwa */}
              <div className="flex flex-col justify-between rounded border border-stone-800 bg-stone-950 p-4 transition-all hover:border-rose-900/50">
                <div className="space-y-2">
                  <span className="flex items-center gap-1.5 font-display text-sm font-bold text-rose-400">
                    <Archive className="h-4 w-4" />
                    {t('optionFinishTitle')}
                  </span>
                  <p className="font-serif text-xs text-stone-400 leading-relaxed">
                    {t('optionFinishLore')}
                  </p>
                </div>
                <Button
                  onClick={handleFinish}
                  variant="destructive"
                  size="sm"
                  className="mt-4 w-full font-mono text-xs"
                >
                  <Flame className="mr-1.5 h-3.5 w-3.5" />
                  {t('buttonFinish')}
                </Button>
              </div>

              {/* Opcja 2: Kontynuacja Nowym Badaczem */}
              <div className="flex flex-col justify-between rounded border border-stone-800 bg-stone-950 p-4 transition-all hover:border-amber-700/50">
                <div className="space-y-2">
                  <span className="flex items-center gap-1.5 font-display text-sm font-bold text-amber-300">
                    <UserCheck className="h-4 w-4" />
                    {t('optionContinueTitle')}
                  </span>
                  <p className="font-serif text-xs text-stone-400 leading-relaxed">
                    {t('optionContinueLore')}
                  </p>

                  {/* Wybór sojusznika jeśli jest dostępny */}
                  {eligibleSuccessors.length > 0 && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-mono text-stone-400 mb-1">
                        {t('selectSuccessorLabel')}:
                      </label>
                      <select
                        value={selectedSuccessorId}
                        onChange={(e) => setSelectedSuccessorId(e.target.value)}
                        className="w-full rounded border border-stone-800 bg-stone-900 px-2 py-1 text-xs text-amber-200"
                      >
                        <option value="">{t('newInvestigatorPrompt')}</option>
                        {eligibleSuccessors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.characterConcept || s.occupation || 'Sojusznik'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleContinue}
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full border-amber-600/50 bg-amber-950/30 font-mono text-xs text-amber-200 hover:bg-amber-900/50"
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  {t('buttonContinue')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded border border-stone-800/80 bg-stone-950 p-3 text-center text-xs font-mono text-stone-400">
            {t('decisionRecorded')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
