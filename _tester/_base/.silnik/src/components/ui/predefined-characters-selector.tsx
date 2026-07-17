'use client';

import { useState } from 'react';
import { Character } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { Button } from './button';
import { X, Search } from 'lucide-react';

interface PredefinedCharactersSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (character: Character) => void;
  currentEra?: 'classic' | 'gaslight' | 'modern' | 'custom';
}

export function PredefinedCharactersSelector({
  isOpen,
  onClose,
  onSelectCharacter,
  currentEra = 'classic',
}: PredefinedCharactersSelectorProps) {
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Era mapping: 'classic' -> 1920s, 'gaslight' -> 1890s, 'modern' -> modern, 'custom' -> map to 1920s
  const mappedEra = currentEra === 'gaslight' ? '1890s' : currentEra === 'modern' ? 'modern' : '1920s';

  // Filter predefined characters by mapped era, gender, and search query
  const filtered = PREDEFINED_CHARACTERS.filter((char) => {
    // 1. Era filter
    const matchesEra = char.id.includes(mappedEra);
    if (!matchesEra) return false;

    // 2. Gender filter
    if (selectedGender !== 'all' && char.gender !== selectedGender) return false;

    // 3. Search query filter
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      char.name.toLowerCase().includes(query) ||
      char.occupation.toLowerCase().includes(query) ||
      char.background.toLowerCase().includes(query);
    
    return matchesSearch;
  });

  return (
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
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-brass rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filtry */}
        <div className="p-4 bg-[#1b1713] border-b border-brass/10 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-special-elite text-sm text-brass mr-2">Płeć:</span>
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

          <div className="relative w-64">
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
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-serif italic">
              Nie znaleziono predefiniowanych postaci dla ery: {mappedEra} spełniających kryteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((char) => (
                <div
                  key={char.id}
                  className="flex gap-4 p-4 border border-brass/20 bg-[#120f0c] hover:border-brass/50 transition-all duration-200"
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
                      <button
                        onClick={() => onSelectCharacter(char)}
                        className="font-display font-semibold uppercase tracking-[0.16em] text-[11px] py-1.5 px-3 text-[#04110f] bg-primary hover:brightness-110 cursor-pointer"
                      >
                        Wybierz
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
  );
}
