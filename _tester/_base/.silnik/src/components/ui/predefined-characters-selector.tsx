'use client';

import { useState } from 'react';
import { Character } from '@/lib/types';
import {
  PREDEFINED_CHARACTERS,
  PredefinedCharacterArchetype,
  PredefinedCharacterEra,
} from '@/lib/immersion/predefined-characters';
import { Button } from './button';
import { X, Search } from 'lucide-react';

interface PredefinedCharactersSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: Character) => void;
  currentEra?: 'classic' | 'gaslight' | 'modern' | 'custom';
  targetPlayerName?: string;
  unavailablePresetIds?: string[];
}

const ARCHETYPE_LABELS: Array<{
  value: 'all' | PredefinedCharacterArchetype;
  label: string;
}> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'investigator', label: 'Śledczy' },
  { value: 'scholar', label: 'Uczony' },
  { value: 'action', label: 'Człowiek czynu' },
  { value: 'mystic', label: 'Mistyk' },
  { value: 'healer', label: 'Uzdrowiciel' },
];

const ERA_LABELS: Array<{ value: PredefinedCharacterEra; label: string }> = [
  { value: 'gaslight', label: 'Lata 1890' },
  { value: 'classic', label: 'Lata 20.' },
  { value: 'modern', label: 'Współczesność' },
];

export function PredefinedCharactersSelector({
  isOpen,
  onClose,
  onSelectCharacter,
  currentEra = 'classic',
  targetPlayerName,
  unavailablePresetIds = [],
}: PredefinedCharactersSelectorProps) {
  const [selectedGender, setSelectedGender] = useState<
    'all' | 'male' | 'female'
  >('all');
  const [selectedArchetype, setSelectedArchetype] = useState<
    'all' | PredefinedCharacterArchetype
  >('all');
  const [selectedEra, setSelectedEra] = useState<PredefinedCharacterEra | null>(
    currentEra === 'custom' ? null : currentEra
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

  if (!isOpen) return null;

  // Epoka jest jawnym polem danych. Nie odczytujemy jej z identyfikatora.
  const filtered = PREDEFINED_CHARACTERS.filter((char) => {
    if (!selectedEra || char.era !== selectedEra) return false;

    if (selectedGender !== 'all' && char.gender !== selectedGender)
      return false;
    if (selectedArchetype !== 'all' && char.archetype !== selectedArchetype) {
      return false;
    }

    const query = searchQuery.toLowerCase();
    return (
      char.name.toLowerCase().includes(query) ||
      char.occupation.toLowerCase().includes(query) ||
      char.background.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
        <div className="deco-corners relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#16130f] border border-brass/45 shadow-[0_0_50px_rgba(201,162,39,0.15)] overflow-hidden">
          {/* Narożniki Deco */}
          <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/60 pointer-events-none" />
          <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brass/60 pointer-events-none" />
          <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brass/60 pointer-events-none" />
          <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/60 pointer-events-none" />

          {/* Nagłówek */}
          <div className="flex items-center justify-between p-6 border-b border-brass/20">
            <div>
              <div className="font-special-elite text-xs uppercase tracking-[0.4em] text-primary">
                Gotowi badacze
              </div>
              <h2 className="font-display font-bold uppercase tracking-[0.1em] text-2xl text-foreground mt-1">
                Wybierz predefiniowaną postać
              </h2>
              {targetPlayerName && (
                <p className="mt-1 font-special-elite text-sm text-brass">
                  Postać dla gracza: <strong>{targetPlayerName}</strong>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-brass rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filtry */}
          <div className="space-y-3 border-b border-brass/10 bg-[#1b1713] p-4">
            {currentEra === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-2 font-special-elite text-sm text-brass">
                  Epoka:
                </span>
                {ERA_LABELS.map((era) => (
                  <Button
                    key={era.value}
                    size="sm"
                    variant={selectedEra === era.value ? 'default' : 'outline'}
                    onClick={() => setSelectedEra(era.value)}
                    className="py-1 font-special-elite text-xs tracking-[0.06em]"
                  >
                    {era.label}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-special-elite text-sm text-brass mr-2">
                Płeć:
              </span>
              <Button
                size="sm"
                variant={selectedGender === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedGender('all')}
                className="font-special-elite tracking-[0.06em] text-xs py-1"
              >
                Wszystkie
              </Button>
              <Button
                size="sm"
                variant={selectedGender === 'female' ? 'default' : 'outline'}
                onClick={() => setSelectedGender('female')}
                className="font-special-elite tracking-[0.06em] text-xs py-1"
              >
                Kobiety
              </Button>
              <Button
                size="sm"
                variant={selectedGender === 'male' ? 'default' : 'outline'}
                onClick={() => setSelectedGender('male')}
                className="font-special-elite tracking-[0.06em] text-xs py-1"
              >
                Mężczyźni
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 font-special-elite text-sm text-brass">
                Archetyp:
              </span>
              {ARCHETYPE_LABELS.map((archetype) => (
                <Button
                  key={archetype.value}
                  size="sm"
                  variant={
                    selectedArchetype === archetype.value ? 'default' : 'outline'
                  }
                  onClick={() => setSelectedArchetype(archetype.value)}
                  className="py-1 font-special-elite text-xs tracking-[0.06em]"
                >
                  {archetype.label}
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Szukaj po zawodzie lub opisie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#120f0c] border border-brass/30 px-3 py-2 pl-9 font-serif text-sm text-foreground focus:border-primary focus:outline-none placeholder:italic"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-brass/50" />
            </div>
          </div>

          {/* Lista Postaci */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!selectedEra ? (
              <div className="py-12 text-center font-serif italic text-muted-foreground">
                Epoka tej przygody nie jest określona. Wybierz epokę, aby zobaczyć
                pasujących badaczy.
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-serif italic">
                Nie znaleziono postaci z tej epoki spełniających wybrane kryteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((char) => {
                  const unavailable = unavailablePresetIds.includes(char.id);
                  return (
                    <div
                      key={char.id}
                      onClick={() => setViewingCharacter(char)}
                      className="flex gap-4 p-4 border border-brass/20 bg-[#120f0c] hover:border-brass/50 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex-[0_0_80px] w-20 h-24 border border-brass/35 overflow-hidden">
                        <img
                          src={char.portraitUrl}
                          alt={char.name}
                          className="w-full h-full object-cover grayscale opacity-90"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-bold text-lg text-foreground tracking-[0.04em] truncate">
                            {char.name}
                          </h3>
                          <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-brass">
                            {char.occupation} · lat {char.age}
                          </div>
                          <p className="font-serif text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                            {char.background}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-brass/10">
                          <div className="flex gap-3 text-[11px] font-special-elite text-brass/70">
                            <span>PŻ: {char.hp}</span>
                            <span>PR: {char.san}</span>
                            <span>PM: {char.mp}</span>
                          </div>
                          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                            {unavailable ? 'Przypisana' : 'Szczegóły ➔'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stopka */}
          <div className="p-4 bg-[#1b1713] border-t border-brass/15 flex justify-end">
            <Button
              onClick={onClose}
              className="font-display font-semibold uppercase tracking-[0.16em] text-xs text-muted-foreground bg-transparent border border-brass/20 hover:border-brass/50 hover:text-brass"
            >
              Zamknij
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Szczegółów Postaci */}
      {viewingCharacter && (() => {
        const isUnavailable = unavailablePresetIds.includes(viewingCharacter.id);
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setViewingCharacter(null)}
          >
            <div
              className="deco-corners relative w-full max-w-2xl bg-[#16130f] border border-brass/45 shadow-[0_0_50px_rgba(201,162,39,0.25)] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Narożniki Deco */}
              <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brass/60 pointer-events-none" />
              <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-brass/60 pointer-events-none" />
              <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-brass/60 pointer-events-none" />
              <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brass/60 pointer-events-none" />

              <div className="flex justify-between items-start mb-4 border-b border-brass/20 pb-3">
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.2em] text-primary">
                    Opis badacza
                  </div>
                  <h3 className="font-display font-bold text-2xl text-foreground mt-1 uppercase tracking-[0.06em]">
                    {viewingCharacter.name}
                  </h3>
                </div>
                <button
                  onClick={() => setViewingCharacter(null)}
                  className="p-1 text-muted-foreground hover:text-brass transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-[0_0_150px] w-full sm:w-36 aspect-[3/4] border border-brass/35 overflow-hidden">
                  <img
                    src={viewingCharacter.portraitUrl}
                    alt={viewingCharacter.name}
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="block font-special-elite text-xs text-brass uppercase tracking-[0.1em]">
                      Zawód i wiek
                    </span>
                    <span className="font-serif text-base text-foreground">
                      {viewingCharacter.occupation} · lat {viewingCharacter.age}
                    </span>
                  </div>

                  <div>
                    <span className="block font-special-elite text-xs text-brass uppercase tracking-[0.1em]">
                      Statystyki życiowe
                    </span>
                    <div className="flex gap-4 font-special-elite text-sm text-foreground mt-1">
                      <span>PŻ: <strong>{viewingCharacter.hp}</strong></span>
                      <span>PR: <strong>{viewingCharacter.san}</strong></span>
                      <span>PM: <strong>{viewingCharacter.mp}</strong></span>
                      <span>SZC: <strong>{viewingCharacter.luck}</strong></span>
                    </div>
                  </div>

                  <div>
                    <span className="block font-special-elite text-xs text-brass uppercase tracking-[0.1em]">
                      Opis i historia postaci
                    </span>
                    <p className="font-serif text-sm text-muted-foreground leading-relaxed mt-1">
                      {viewingCharacter.background}
                    </p>
                  </div>

                  {viewingCharacter.notes && (
                    <div>
                      <span className="block font-special-elite text-xs text-brass uppercase tracking-[0.1em]">
                        Notatki MG / Wskazówki do odgrywania
                      </span>
                      <p className="font-serif text-sm text-brass/90 italic leading-relaxed mt-1">
                        {viewingCharacter.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t border-brass/10 pt-4 mt-2">
                    <Button
                      onClick={() => setViewingCharacter(null)}
                      variant="outline"
                      className="font-display text-xs uppercase tracking-[0.16em] border-brass/20 text-muted-foreground hover:border-brass/50 hover:text-brass"
                    >
                      Wróć
                    </Button>
                    <button
                      onClick={() => {
                        onSelectCharacter(viewingCharacter);
                        setViewingCharacter(null);
                      }}
                      disabled={isUnavailable}
                      className="cursor-pointer bg-primary px-5 py-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-[#04110f] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isUnavailable ? 'Przypisana' : 'Wybierz tę postać'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

