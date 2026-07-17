'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { Character } from '@/lib/types';
import { CharacterWizardV2 as CharacterWizard } from './character-wizard';
import { CharacterSheet } from './character-sheet';
import { CharacterDevelopmentPanel } from './character-development-panel';
import { characterImportExport } from '@/lib/character-import-export';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { hydrateCharacterImages } from '@/lib/character-image-store';

interface CharacterManagerProps {
  onClose: () => void;
  onCharactersChange?: (characters: Character[]) => void;
  /**
   * C1 (Hot Seat): wybór postaci z katalogu do gry. Gdy podany, każda karta
   * dostaje przycisk "Graj tą postacią" - klik aktywuje postać i wraca do gry.
   * Bez tego propa katalog działa jak dotąd (tylko edycja/usuwanie/eksport).
   */
  onSelectCharacter?: (character: Character) => void;
}

export function CharacterManager({
  onClose,
  onCharactersChange,
  onSelectCharacter,
}: CharacterManagerProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null
  );
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(
    null
  );
  // Re-roll: postać do "rozdania statystyk na nowo" przez kreator (nowa przygoda).
  const [rerollCharacter, setRerollCharacter] = useState<Character | null>(
    null
  );
  const [developingCharacter, setDevelopingCharacter] =
    useState<Character | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Ładowanie postaci z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('characters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Character[];
        setCharacters(parsed);
        // IND-262: portrety żyją w IndexedDB - dociągnij je do listy.
        hydrateCharacterImages(parsed)
          .then(setCharacters)
          .catch(() => {});
      } catch (error) {
        console.error('Błąd podczas ładowania postaci:', error);
      }
    }
  }, []);

  // Zapisywanie postaci do localStorage
  const saveCharacters = (newCharacters: Character[]) => {
    setCharacters(newCharacters);
    persistCharacters(newCharacters);
    // Wywołaj callback żeby zaktualizować postacie w komponencie nadrzędnym
    if (onCharactersChange) {
      onCharactersChange(newCharacters);
    }
  };

  // Dodawanie nowej postaci
  const handleCharacterCreated = (character: Character) => {
    const newCharacters = [...characters, character];
    saveCharacters(newCharacters);
    setShowCreator(false);
  };

  // Edycja postaci
  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setSelectedCharacter(null);
  };

  // Aktualizacja edytowanej postaci
  const handleCharacterUpdated = (updatedCharacter: Character) => {
    const newCharacters = characters.map((char) =>
      char.id === updatedCharacter.id ? updatedCharacter : char
    );
    saveCharacters(newCharacters);
    setEditingCharacter(null);
  };

  // Rozwój postaci
  const handleCharacterDevelopment = (character: Character) => {
    setDevelopingCharacter(character);
    setSelectedCharacter(null);
  };

  // Aktualizacja rozwoju postaci
  const handleDevelopmentUpdate = (updatedCharacter: Character) => {
    const newCharacters = characters.map((char) =>
      char.id === updatedCharacter.id ? updatedCharacter : char
    );
    saveCharacters(newCharacters);
  };

  // Eksport wszystkich postaci
  const handleExportAll = () => {
    if (characters.length === 0) {
      alert('Brak postaci do eksportu');
      return;
    }

    characterImportExport.exportMultipleCharacters(characters, {
      format: 'json',
      includeHistory: true,
      includePortrait: true,
      includeStats: true,
      notes: 'Backup wszystkich postaci',
    });
  };

  // Eksport pojedynczej postaci
  const handleExportCharacter = (
    character: Character,
    format: 'json' | 'txt' = 'json'
  ) => {
    characterImportExport.exportToFile(character, format, {
      format,
      includeHistory: true,
      includePortrait: true,
      includeStats: true,
    });
  };

  // Import postaci
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;

        // Try multiple character import first
        const multiResult =
          characterImportExport.importMultipleCharacters(content);
        if (multiResult.success && multiResult.characters) {
          const newCharacters = [...characters, ...multiResult.characters];
          saveCharacters(newCharacters);

          let message = `Zaimportowano ${multiResult.characters.length} postaci.`;
          if (multiResult.errors && multiResult.errors.length > 0) {
            message += `\n\nBłędy: ${multiResult.errors.join('\n')}`;
          }
          if (multiResult.warnings && multiResult.warnings.length > 0) {
            message += `\n\nOstrzeżenia: ${multiResult.warnings.join('\n')}`;
          }

          alert(message);
          return;
        }

        // Try single character import
        const singleResult = characterImportExport.importFromJSON(content);
        if (singleResult.success && singleResult.character) {
          const newCharacters = [...characters, singleResult.character];
          saveCharacters(newCharacters);

          let message = `Zaimportowano postać: ${singleResult.character.name}`;
          if (singleResult.warnings && singleResult.warnings.length > 0) {
            message += `\n\nOstrzeżenia: ${singleResult.warnings.join('\n')}`;
          }

          alert(message);
        } else {
          alert(`Błąd importu: ${singleResult.error || 'Nieznany błąd'}`);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // Usuwanie postaci
  const handleDeleteCharacter = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć tę postać?')) {
      const newCharacters = characters.filter((char) => char.id !== id);
      saveCharacters(newCharacters);
      if (selectedCharacter?.id === id) {
        setSelectedCharacter(null);
      }
    }
  };

  // Import postaci z JSON
  const handleImportCharacters = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedCharacters = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedCharacters)) {
          const newCharacters = [...characters, ...importedCharacters];
          saveCharacters(newCharacters);
          alert(`Zaimportowano ${importedCharacters.length} postaci`);
        } else {
          alert('Nieprawidłowy format pliku');
        }
      } catch (error) {
        alert('Błąd podczas importu pliku');
        console.error(error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Export postaci do JSON
  const handleExportCharacters = () => {
    const dataStr = JSON.stringify(characters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'coc7_postacie.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtrowanie postaci
  const filteredCharacters = characters.filter(
    (character) =>
      character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      character.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      character.occupation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Inicjały do miniatury portretu (np. "dr Eleonora Vance" → "EV")
  const getInitials = (name: string): string => {
    const parts = name
      .replace(/^(dr|prof|prof\.|dr\.|mgr|mjr|kpt|ks\.)\s+/i, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Status postaci wyprowadzony z cech pochodnych (brak dedykowanego pola statusu).
  // martwy = HP ≤ 0; obłąkany = SAN ≤ 0; w innym razie żywy.
  const getStatus = (character: Character): 'dead' | 'insane' | 'alive' => {
    if (typeof character.hp === 'number' && character.hp <= 0) return 'dead';
    if (typeof character.san === 'number' && character.san <= 0)
      return 'insane';
    return 'alive';
  };

  // Procent paska stanu (zabezpieczony przed dzieleniem przez 0 i wartościami spoza zakresu).
  const barPct = (value?: number, max?: number): number => {
    if (typeof value !== 'number' || typeof max !== 'number' || max <= 0)
      return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Nagłówek déco: nadtytuł + tytuł + CTA */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-special-elite uppercase tracking-[0.4em] text-[14px] text-primary">
              Kartoteka badaczy
            </div>
            <h2 className="mt-1.5 font-display font-bold uppercase tracking-[0.1em] text-3xl text-foreground">
              Twoi Badacze
            </h2>
          </div>
          <Button
            onClick={() => setShowCreator(true)}
            className="font-display font-semibold uppercase tracking-[0.16em] text-[#04110f] bg-primary border border-primary hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,0.3)]"
          >
            + Nowy badacz
          </Button>
        </div>

        {/* Separator déco */}
        <div className="flex items-center gap-4 my-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
          <span className="w-[7px] h-[7px] bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-r from-gold to-transparent" />
        </div>

        {/* Pasek narzędzi: wyszukiwarka + licznik + akcje zbiorcze */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="⌕ Szukaj badacza..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[320px] bg-[#1f1a14] border border-brass/28 px-3.5 py-2.5 font-serif text-base text-foreground placeholder:text-muted-foreground placeholder:italic focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <span className="font-special-elite text-[14px] tracking-[0.08em] text-primary border border-primary/45 px-3.5 py-2">
            Wszyscy · {filteredCharacters.length}
          </span>
          <Button
            onClick={handleExportAll}
            disabled={characters.length === 0}
            className="font-display font-semibold uppercase tracking-[0.16em] text-brass bg-brass/[0.04] border border-brass/45 hover:bg-brass/10"
          >
            Eksportuj wszystkie
          </Button>
          <Button
            onClick={handleImport}
            className="font-display font-semibold uppercase tracking-[0.16em] text-muted-foreground bg-transparent border border-brass/30 hover:border-brass/60 hover:text-brass"
          >
            Importuj
          </Button>
        </div>

        {/* Siatka kart badaczy (kafle déco) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
          {filteredCharacters.map((character) => {
            const status = getStatus(character);
            const isSelected = selectedCharacter?.id === character.id;
            const isDead = status === 'dead';
            const isInsane = status === 'insane';
            // Tła i ramki kafla wg stanu postaci.
            const cardClass = isSelected
              ? 'border-primary/60 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-[0_0_22px_rgba(13,148,136,0.18)]'
              : isDead
                ? 'border-destructive/30 bg-[#140f0e] opacity-70 hover:opacity-90 hover:border-destructive/50'
                : isInsane
                  ? 'border-brass/18 bg-[#16130f] opacity-90 hover:border-brass/40'
                  : 'border-brass/22 bg-[#16130f] hover:border-brass/45';
            // Raster portretu/miniatury (déco), barwa wg stanu.
            const thumbStyle = isDead
              ? {
                  background:
                    'repeating-linear-gradient(45deg,#1d1311,#1d1311 6px,#160c0b 6px,#160c0b 12px)',
                }
              : {
                  background:
                    'repeating-linear-gradient(45deg,#211c15,#211c15 6px,#1a160f 6px,#1a160f 12px)',
                };
            return (
              <div
                key={character.id}
                onClick={() => setSelectedCharacter(character)}
                className={`relative flex gap-4 p-[18px] border transition-all duration-300 cursor-pointer ${cardClass}`}
              >
                {/* Narożniki déco (tylko dla wyróżnionej / żywej karty) */}
                {!isDead && (
                  <>
                    <span className="absolute top-1.5 left-1.5 w-[13px] h-[13px] border-t-[1.5px] border-l-[1.5px] border-brass" />
                    <span className="absolute bottom-1.5 right-1.5 w-[13px] h-[13px] border-b-[1.5px] border-r-[1.5px] border-brass" />
                  </>
                )}

                {/* Miniatura portretu / inicjały */}
                <div
                  className={`flex-[0_0_88px] w-[88px] h-[110px] flex items-center justify-center overflow-hidden border font-display text-[22px] ${
                    isDead
                      ? 'border-destructive/35 text-[#7a3a36]'
                      : isInsane
                        ? 'border-brass/28 text-[#8a7a2e]'
                        : 'border-brass/45 text-brass'
                  }`}
                  style={thumbStyle}
                >
                  {character.portraitUrl ? (
                    <img
                      src={character.portraitUrl}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : isDead ? (
                    <span>✝</span>
                  ) : (
                    <span>{getInitials(character.name)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Imię + zawód·wiek + odznaka statusu */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div
                        className={`font-display font-bold text-lg tracking-[0.04em] truncate ${
                          isDead
                            ? 'text-[#b8a89a] line-through decoration-destructive/50'
                            : isInsane
                              ? 'text-[#cfc9b9]'
                              : 'text-foreground'
                        }`}
                      >
                        {character.name}
                      </div>
                      <div
                        className={`font-special-elite text-[14px] tracking-[0.12em] uppercase ${
                          isDead
                            ? 'text-[#9a7a72]'
                            : isInsane
                              ? 'text-[#9c8a3a]'
                              : 'text-brass'
                        }`}
                      >
                        {character.occupation}
                        {typeof character.age === 'number' && character.age > 0
                          ? ` · lat ${character.age}`
                          : ''}
                      </div>
                    </div>
                    {isDead ? (
                      <span className="shrink-0 font-special-elite text-[13px] tracking-[0.08em] text-[#d9685f] border border-destructive/50 px-2 py-0.5">
                        ✝ MARTWY
                      </span>
                    ) : isInsane ? (
                      <span className="shrink-0 font-special-elite text-[13px] tracking-[0.08em] text-brass border border-brass/50 px-2 py-0.5">
                        ◐ OBŁĄKANY
                      </span>
                    ) : (
                      <span className="shrink-0 font-special-elite text-[13px] tracking-[0.08em] text-primary border border-primary/50 px-2 py-0.5">
                        ● ŻYWY
                      </span>
                    )}
                  </div>

                  {/* Martwy: epitafium z notatek (jeśli są); żywy/obłąkany: paski stanu */}
                  {isDead && character.notes ? (
                    <div className="font-serif italic text-base text-[#9a7a72] leading-snug my-3.5 line-clamp-2">
                      „{character.notes}”
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[5px] my-3">
                      {/* PŻ / HP - bordo */}
                      <div className="h-[5px] bg-[#1f1a14] border border-destructive/30">
                        <div
                          className="h-full bg-destructive"
                          style={{
                            width: `${barPct(character.hp, character.maxHp ?? character.hp)}%`,
                          }}
                        />
                      </div>
                      {/* PR / SAN - złoto */}
                      <div className="h-[5px] bg-[#1f1a14] border border-brass/30">
                        <div
                          className="h-full bg-brass"
                          style={{
                            width: `${barPct(character.san, character.maxSan ?? character.san)}%`,
                          }}
                        />
                      </div>
                      {/* PM / MP - emerald */}
                      <div className="h-[5px] bg-[#1f1a14] border border-primary/30">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${barPct(character.mp, character.maxMp ?? character.mp)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Akcje karty (zachowane handlery, déco-styl) */}
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {/* C1: wybór postaci do gry (tylko gdy katalog otwarty z gry) */}
                    {!isDead && onSelectCharacter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCharacter(character);
                        }}
                        title="Zagraj tą postacią w bieżącej przygodzie"
                        className="font-special-elite text-[14px] uppercase tracking-[0.08em] text-[#04110f] bg-primary border border-primary px-2.5 py-1 hover:brightness-110 cursor-pointer"
                      >
                        ▶ Graj tą postacią
                      </button>
                    )}
                    {!isDead && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCharacter(character);
                          }}
                          className="font-special-elite text-[14px] text-muted-foreground hover:text-brass cursor-pointer"
                        >
                          Edytuj
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRerollCharacter(character);
                          }}
                          title="Rozdaj statystyki na nowo do nowej przygody (zachowuje imię, zawód i historię)"
                          className="font-special-elite text-[14px] text-primary hover:brightness-125 cursor-pointer"
                        >
                          🎲 Nowa przygoda
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCharacterDevelopment(character);
                          }}
                          className="font-special-elite text-[14px] text-muted-foreground hover:text-brass cursor-pointer"
                        >
                          Rozwój
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportCharacter(character, 'json');
                          }}
                          className="font-special-elite text-[14px] text-muted-foreground hover:text-brass cursor-pointer"
                        >
                          Export
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCharacter(character.id);
                      }}
                      className="font-special-elite text-[14px] text-[#d9685f] hover:brightness-125 cursor-pointer"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Brak postaci */}
        {filteredCharacters.length === 0 && (
          <div className="relative text-center py-16 border border-brass/22 bg-[#16130f]">
            <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/60" />
            <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brass/60" />
            <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brass/60" />
            <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/60" />
            <div className="text-5xl mb-4 text-brass/70">⌖</div>
            <h3 className="font-display uppercase tracking-[0.16em] text-xl text-foreground mb-2">
              Brak badaczy
            </h3>
            <p className="font-serif italic text-base text-muted-foreground mb-5">
              Stwórz swojego pierwszego badacza, aby rozpocząć śledztwo.
            </p>
            <Button
              onClick={() => setShowCreator(true)}
              className="font-display font-semibold uppercase tracking-[0.16em] text-[#04110f] bg-primary border border-primary hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,0.3)]"
            >
              + Nowy badacz
            </Button>
          </div>
        )}
      </div>

      {/* Modal tworzenia postaci - używa tego samego wizarda co strona główna */}
      {showCreator && (
        <CharacterWizard
          onClose={() => setShowCreator(false)}
          onCharacterCreated={handleCharacterCreated}
        />
      )}

      {/* Modal edycji postaci */}
      {editingCharacter && (
        <CharacterSheet
          open={!!editingCharacter}
          onOpenChange={(open) => !open && setEditingCharacter(null)}
          character={editingCharacter}
          onCharacterUpdate={handleCharacterUpdated}
        />
      )}

      {/* Re-roll: kreator z wczytaną postacią - gracz rozdaje statystyki od nowa */}
      {rerollCharacter && (
        <CharacterWizard
          initialCharacter={rerollCharacter}
          onClose={() => setRerollCharacter(null)}
          onCharacterCreated={(c) => {
            handleCharacterUpdated(c);
            setRerollCharacter(null);
          }}
        />
      )}

      {/* Panel rozwoju postaci */}
      {developingCharacter && (
        <CharacterDevelopmentPanel
          character={developingCharacter}
          onCharacterUpdate={handleDevelopmentUpdate}
          onClose={() => setDevelopingCharacter(null)}
        />
      )}
    </div>
  );
}
