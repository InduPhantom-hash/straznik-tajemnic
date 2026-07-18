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
import { EquipmentDetailDialog } from './equipment-detail-dialog';
import { EquipmentItem } from '@/lib/types';

interface PredefinedCharactersSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: Character) => void;
  currentEra?: 'classic' | 'gaslight' | 'modern' | 'custom';
  targetPlayerName?: string;
  unavailablePresetIds?: string[];
}

const CHARACTERISTIC_LABELS: Record<string, string> = {
  str: 'Siła (SIŁ)',
  con: 'Kondycja (KON)',
  siz: 'Budowa (BUD)',
  dex: 'Zręczność (ZRĘ)',
  app: 'Wygląd (WYG)',
  int: 'Inteligencja (INT)',
  pow: 'Moc (MOC)',
  edu: 'Wykształcenie (WYK)',
  luck: 'Szczęście (SZC)',
};

const STAT_FULL_NAMES: Record<string, string> = {
  str: 'Siła',
  con: 'Kondycja',
  siz: 'Budowa',
  dex: 'Zręczność',
  app: 'Wygląd',
  int: 'Inteligencja',
  pow: 'Moc',
  edu: 'Wykształcenie',
  luck: 'Szczęście',
};

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('; ');
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>)
      .map(asText)
      .filter(Boolean)
      .join(', ');
  return '';
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
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

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
      {viewingCharacter && (() => {
        const isUnavailable = unavailablePresetIds.includes(viewingCharacter.id);
        return (
          <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <div className="deco-corners relative w-full max-w-5xl bg-[#120f0c] border border-brass/50 p-6 md:p-8 my-8">
              <div className="flex justify-between items-start mb-4 border-b border-brass/20 pb-3">
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.2em] text-primary">
                    Opis badacza (Karta Postaci)
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

              {/* Układ 2-kolumnowy (lewa: portret + paski + notatki/wskazówki; prawa: cechy + walka + umiejętności + ekwipunek + biografia) */}
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-10">
                {/* KOLUMNA LEWA */}
                <div className="space-y-6">
                  {/* Portret */}
                  <div className="relative aspect-[3/4] border border-brass/45 bg-gradient-to-b from-[#1a160f] to-[#0c0d0a] flex items-center justify-center overflow-hidden">
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: 'repeating-linear-gradient(45deg,rgba(201,162,39,.03) 0,rgba(201,162,39,.03) 9px,transparent 9px,transparent 18px)'
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        boxShadow: 'inset 0 0 90px 24px rgba(0,0,0,.7)'
                      }}
                    />
                    <span className="pointer-events-none absolute top-1.5 left-1.5 w-4 h-4 border-t border-l border-brass" />
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-4 h-4 border-b border-r border-brass" />

                    {viewingCharacter.portraitUrl ? (
                      <img
                        src={viewingCharacter.portraitUrl}
                        alt={viewingCharacter.name}
                        className="relative w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="relative text-center font-special-elite text-muted-foreground/60 text-[14px] tracking-[0.14em]">
                        <span className="text-5xl opacity-40 block mb-2">👤</span>[ PORTRET ]
                      </div>
                    )}
                  </div>

                  {/* Etykieta podstawowa */}
                  <div className="text-center">
                    <div className="font-special-elite text-[14px] text-brass tracking-[0.18em] uppercase mt-1.5">
                      {viewingCharacter.occupation || '-'}
                      {viewingCharacter.age ? ` · lat ${viewingCharacter.age}` : ''}
                      {viewingCharacter.gender === 'male' ? ' · Mężczyzna' : viewingCharacter.gender === 'female' ? ' · Kobieta' : ''}
                    </div>
                  </div>

                  {/* Paski stanu */}
                  <div className="flex flex-col gap-3.5">
                    {/* ŻYCIE */}
                    <div className="p-3 bg-[#16130f] border border-brass/20">
                      <div className="flex justify-between items-center font-special-elite text-[14px] tracking-[0.1em] mb-2">
                        <span className="text-[#d9685f]">
                          <span>PŻ</span>
                          <span className="text-muted-foreground/60"> · ŻYCIE</span>
                        </span>
                        <span className="text-muted-foreground">{viewingCharacter.hp} / {viewingCharacter.maxHp || viewingCharacter.hp}</span>
                      </div>
                      <div className="h-2.5 bg-[#1f1a14] border border-[#b3322c]/30">
                        <div
                          className="h-full"
                          style={{
                            width: `${(viewingCharacter.hp / (viewingCharacter.maxHp || viewingCharacter.hp)) * 100}%`,
                            background: 'linear-gradient(90deg,#7a221d,#b3322c)',
                            boxShadow: '0 0 10px rgba(179,50,44,.4)'
                          }}
                        />
                      </div>
                    </div>

                    {/* POCZYTALNOŚĆ */}
                    <div className="p-3 bg-[#16130f] border border-brass/20">
                      <div className="flex justify-between items-center font-special-elite text-[14px] tracking-[0.1em] mb-2">
                        <span className="text-brass">
                          <span>PR</span>
                          <span className="text-muted-foreground/60"> · POCZYTALNOŚĆ</span>
                        </span>
                        <span className="text-muted-foreground">{viewingCharacter.san} / {viewingCharacter.maxSan || 99}</span>
                      </div>
                      <div className="h-2.5 bg-[#1f1a14] border border-brass/30">
                        <div
                          className="h-full"
                          style={{
                            width: `${(viewingCharacter.san / (viewingCharacter.maxSan || 99)) * 100}%`,
                            background: 'linear-gradient(90deg,#8a6f12,#c9a227)',
                            boxShadow: '0 0 10px rgba(201,162,39,.4)'
                          }}
                        />
                      </div>
                    </div>

                    {/* MOC */}
                    <div className="p-3 bg-[#16130f] border border-brass/20">
                      <div className="flex justify-between items-center font-special-elite text-[14px] tracking-[0.1em] mb-2">
                        <span className="text-primary">
                          <span>PM</span>
                          <span className="text-muted-foreground/60"> · MOC</span>
                        </span>
                        <span className="text-muted-foreground">{viewingCharacter.mp} / {viewingCharacter.maxMp || viewingCharacter.mp}</span>
                      </div>
                      <div className="h-2.5 bg-[#1f1a14] border border-primary/30">
                        <div
                          className="h-full"
                          style={{
                            width: `${(viewingCharacter.mp / (viewingCharacter.maxMp || viewingCharacter.mp)) * 100}%`,
                            background: 'linear-gradient(90deg,#0a6b62,#0d9488)',
                            boxShadow: '0 0 10px rgba(13,148,136,.4)'
                          }}
                        />
                      </div>
                    </div>

                    {/* SZCZĘŚCIE */}
                    <div className="p-3 bg-[#16130f] border border-brass/20">
                      <div className="flex justify-between items-center font-special-elite text-[14px] tracking-[0.1em] mb-2">
                        <span className="text-brass">
                          <span>SZC</span>
                          <span className="text-muted-foreground/60"> · SZCZĘŚCIE</span>
                        </span>
                        <span className="text-muted-foreground">{viewingCharacter.luck}</span>
                      </div>
                      <div className="h-2.5 bg-[#1f1a14] border border-brass/30">
                        <div
                          className="h-full"
                          style={{
                            width: `${(viewingCharacter.luck / 99) * 100}%`,
                            background: 'linear-gradient(90deg,#8a6f12,#c9a227)',
                            boxShadow: '0 0 10px rgba(201,162,39,.4)'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {viewingCharacter.notes && (
                    <div className="border border-brass/20 bg-[#16130f] p-4">
                      <span className="font-special-elite text-xs text-brass uppercase tracking-[0.1em] block mb-2">
                        Notatki MG / Wskazówki
                      </span>
                      <p className="font-serif text-sm text-brass/90 italic leading-relaxed whitespace-pre-line">
                        {viewingCharacter.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-4 border-t border-brass/10">
                    <button
                      onClick={() => {
                        onSelectCharacter(viewingCharacter);
                        setViewingCharacter(null);
                      }}
                      disabled={isUnavailable}
                      className="cursor-pointer bg-primary w-full py-2.5 font-display text-xs font-semibold uppercase tracking-[0.16em] text-[#04110f] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 text-center"
                    >
                      {isUnavailable ? 'Przypisana' : 'Wybierz tę postać'}
                    </button>
                    <Button
                      onClick={() => setViewingCharacter(null)}
                      variant="outline"
                      className="font-display text-xs uppercase tracking-[0.16em] border-brass/20 text-muted-foreground hover:border-brass/50 hover:text-brass w-full"
                    >
                      Wróć do listy
                    </Button>
                  </div>
                </div>

                {/* KOLUMNA PRAWA */}
                <div className="space-y-8 border-t lg:border-t-0 lg:border-l border-brass/15 pt-6 lg:pt-0 lg:pl-8">
                  {/* Cechy */}
                  <div>
                    <h4 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4">
                      Cechy badacza
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(CHARACTERISTIC_LABELS).map(([key, label]) => {
                        const val = (viewingCharacter as any)[key] || 50;
                        const half = Math.floor(val / 2);
                        const fifth = Math.floor(val / 5);
                        return (
                          <div key={key} className="border border-brass/28 bg-[#16130f] p-3 text-center">
                            <div className="font-display text-sm uppercase tracking-[0.08em] text-foreground">
                              {STAT_FULL_NAMES[key] || key.toUpperCase()}
                            </div>
                            <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mt-0.5">
                              {key.toUpperCase()}
                            </div>
                            <div className="font-display font-bold text-2xl text-brass mt-1 leading-tight">{val}</div>
                            <div className="font-special-elite text-xs text-primary mt-1">
                              {half} / {fifth}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Walka */}
                  <div>
                    <h4 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4">
                      Walka
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
                        <div className="font-special-elite text-xs text-muted-foreground tracking-[0.1em] uppercase">
                          Bonus DMG
                        </div>
                        <div className="font-display font-bold text-2xl text-foreground mt-1">
                          {viewingCharacter.damageBonus || '+0'}
                        </div>
                      </div>
                      <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
                        <div className="font-special-elite text-xs text-muted-foreground tracking-[0.1em] uppercase">
                          Krzepa
                        </div>
                        <div className="font-display font-bold text-2xl text-foreground mt-1">
                          {viewingCharacter.build !== undefined ? (viewingCharacter.build >= 0 ? `+${viewingCharacter.build}` : viewingCharacter.build) : '0'}
                        </div>
                      </div>
                      <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
                        <div className="font-special-elite text-xs text-muted-foreground tracking-[0.1em] uppercase">
                          Ruch
                        </div>
                        <div className="font-display font-bold text-2xl text-foreground mt-1">
                          {viewingCharacter.move || '8'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Umiejętności */}
                  {viewingCharacter.skills && Object.keys(viewingCharacter.skills).length > 0 && (
                    <div>
                      <h4 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4">
                        Umiejętności
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-2.5">
                        {Object.entries(viewingCharacter.skills)
                          .sort(([a], [b]) => a.localeCompare(b, 'pl'))
                          .map(([skill, val]) => {
                            const actualVal = typeof val === 'number' ? val : val.value;
                            const isOccupational = viewingCharacter.occupationalSkills?.includes(skill);
                            const mythos = /mit|mythos|cthulhu/i.test(skill);
                            const accent = mythos ? 'text-[#d9685f]' : 'text-brass';
                            return (
                              <div key={skill}>
                                <div className="flex justify-between items-baseline mb-1">
                                  <span className={`font-serif text-base truncate pr-2 ${mythos ? 'text-[#d9685f]' : 'text-foreground'}`}>
                                    {isOccupational && <span className="text-brass mr-1">★</span>}
                                    {skill}
                                  </span>
                                  <span className={`font-special-elite text-xs flex-none ${accent}`}>
                                    {actualVal}%
                                  </span>
                                </div>
                                <div className="h-[5px] bg-[#1f1a14]">
                                  <div
                                    className="h-full"
                                    style={
                                      mythos
                                        ? {
                                            width: `${actualVal}%`,
                                            background: '#b3322c',
                                            boxShadow: '0 0 8px rgba(179,50,44,.5)',
                                          }
                                        : { width: `${actualVal}%`, background: '#c9a227' }
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Ekwipunek */}
                  {viewingCharacter.equipment && viewingCharacter.equipment.length > 0 && (
                    <div>
                      <h4 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4">
                        Ekwipunek
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {viewingCharacter.equipment.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="cursor-pointer flex items-center gap-4 border border-brass/25 hover:border-brass/45 bg-[#181410] p-4 rounded-sm transition-all duration-200"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-serif text-lg text-foreground font-medium truncate leading-tight">
                                  {item.name}
                                </span>
                                <span className="font-special-elite text-[11px] uppercase tracking-[0.1em] text-brass/50 flex-none">
                                  {item.category}
                                </span>
                              </div>
                              {item.description && (
                                <div className="font-special-elite text-sm text-muted-foreground/80 tracking-[0.04em] mt-1.5 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Biografia i tło */}
                  <div>
                    <h4 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4">
                      Biografia
                    </h4>
                    <div className="space-y-3">
                      {viewingCharacter.characterConcept && (
                        <div className="border border-primary/30 bg-[#0e1413] p-4">
                          <span className="font-special-elite text-[14px] text-primary tracking-[0.12em] uppercase block mb-1.5">
                            🎭 Koncept Postaci
                          </span>
                          <p className="font-serif text-foreground text-base leading-relaxed">
                            {viewingCharacter.characterConcept}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {viewingCharacter.birthplace && (
                          <div className="border border-brass/20 bg-[#16130f] p-3">
                            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-1.5">🏠 Miejsce urodzenia</span>
                            <p className="font-serif text-foreground text-base leading-relaxed">{viewingCharacter.birthplace}</p>
                          </div>
                        )}
                        {viewingCharacter.description && (
                          <div className="border border-brass/20 bg-[#16130f] p-3">
                            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-1.5">👤 Wygląd</span>
                            <p className="font-serif text-foreground text-base leading-relaxed">{viewingCharacter.description}</p>
                          </div>
                        )}
                        {viewingCharacter.ideology && (
                          <div className="border border-brass/20 bg-[#16130f] p-3">
                            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-1.5">💭 Ideologia / Przekonania</span>
                            <p className="font-serif text-foreground text-base leading-relaxed">{viewingCharacter.ideology}</p>
                          </div>
                        )}
                        {viewingCharacter.significantPerson && (
                          <div className="border border-brass/20 bg-[#16130f] p-3">
                            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-1.5">👥 Ważna osoba</span>
                            <p className="font-serif text-foreground text-base leading-relaxed">{asText(viewingCharacter.significantPerson)}</p>
                          </div>
                        )}
                        {viewingCharacter.meaningfulLocation && (
                          <div className="border border-brass/20 bg-[#16130f] p-3">
                            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-1.5">📍 Znaczące miejsce</span>
                            <p className="font-serif text-foreground text-base leading-relaxed">{asText(viewingCharacter.meaningfulLocation)}</p>
                          </div>
                        )}
                        {viewingCharacter.treasuredPossession && (
                          <div className="border border-brass/20 bg-[#16130f] p-3">
                            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-1.5">💎 Cenny przedmiot</span>
                            <p className="font-serif text-foreground text-base leading-relaxed">{asText(viewingCharacter.treasuredPossession)}</p>
                          </div>
                        )}
                      </div>

                      {viewingCharacter.traits && viewingCharacter.traits.length > 0 && (
                        <div className="border border-brass/20 bg-[#16130f] p-3">
                          <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-2">✨ Cechy charakteru</span>
                          <div className="flex flex-wrap gap-2">
                            {viewingCharacter.traits.map((trait: string, i: number) => (
                              <span key={i} className="text-xs border border-brass/35 text-foreground bg-[#1a160f] px-2 py-1 rounded">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(viewingCharacter.backstory || viewingCharacter.background) && (
                        <div className="relative border border-brass/20 bg-[#16130f] p-5">
                          <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-brass/50" />
                          <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-brass/50" />
                          <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-2">
                            📜 {viewingCharacter.backstory ? 'Kluczowa więź' : 'Tło Postaci'}
                          </span>
                          <p className="font-serif text-foreground text-base leading-relaxed whitespace-pre-line">
                            {viewingCharacter.backstory || viewingCharacter.background}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {selectedItem && (
        <EquipmentDetailDialog
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
