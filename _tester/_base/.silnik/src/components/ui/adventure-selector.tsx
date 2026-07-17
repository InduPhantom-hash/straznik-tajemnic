'use client';

import type { ChangeEvent, MouseEvent } from 'react';
import { useState, useRef } from 'react';
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
  BUILT_IN_ADVENTURES,
  CUSTOM_ADVENTURE_TEMPLATE,
  AdventureContext,
  CustomAdventure,
} from '@/lib/adventures-data';
import {
  TONE_STYLES,
  ERA_STYLES,
  DIFFICULTY_STYLES,
} from '@/lib/data/adventure-styles';
import { Trash2, Upload, Loader2, FileText, Info } from 'lucide-react';
import { AdventureDetailsModal } from './adventure-details-modal';

/**
 * Wgrywanie własnych przygód (PDF + formularz "bez PDF") + lista własnych przygód.
 * Wersja publiczna „Strażnik Tajemnic AI": gracz wnosi własny scenariusz, więc =true.
 */
const ALLOW_CUSTOM_ADVENTURES = true;

/**
 * Wbudowane scenariusze pokazujemy TYLKO w trybie pełnym/prywatnym
 * (NEXT_PUBLIC_LOCAL_MODE=true). W publicznej (LOCAL_MODE=false) gracz widzi
 * wyłącznie przygody wgrane przez siebie - nie ma dostępu do podręcznikowych
 * scenariuszy bez własnego egzemplarza (plan prawny + UX onboardingu).
 */
const SHOW_BUILT_IN_ADVENTURES = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

interface AdventureSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (adventure: AdventureContext) => void;
  // Nowe propsy dla własnych przygód
  customAdventures?: CustomAdventure[];
  onUploadAdventure?: (file: File) => Promise<CustomAdventure | null>;
  onDeleteAdventure?: (id: string) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  loadingStatus?: string;
}

export function AdventureSelector({
  open,
  onClose,
  onSelect,
  customAdventures = [],
  onUploadAdventure,
  onDeleteAdventure,
  isUploading = false,
  uploadProgress = 0,
  loadingStatus = '',
}: AdventureSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailsAdventure, setDetailsAdventure] =
    useState<AdventureContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom adventure form state
  const [customTitle, setCustomTitle] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [customEra, setCustomEra] = useState<
    'classic' | 'gaslight' | 'modern' | 'custom'
  >('classic');
  const [customYearRange, setCustomYearRange] = useState('1920-1930');
  const [customDescription, setCustomDescription] = useState('');

  const handleSelect = (adventure: AdventureContext) => {
    if (adventure.isCustom && !adventure.pdfUrl) {
      // Własna przygoda bez PDF - pokaż formularz
      setShowCustomForm(true);
      setSelectedId(adventure.id);
    } else {
      setSelectedId(adventure.id);
    }
  };

  const handleConfirm = () => {
    if (showCustomForm) {
      const customAdventure: AdventureContext = {
        ...CUSTOM_ADVENTURE_TEMPLATE,
        title: customTitle || 'Własna Przygoda',
        location: customLocation || 'Nieznana lokalizacja',
        era: customEra,
        eraLabel: ERA_STYLES[customEra]?.label || 'Własna',
        yearRange: customYearRange,
        customDescription: customDescription,
      };
      onSelect(customAdventure);
    } else if (selectedId) {
      // Sprawdź w wbudowanych
      const builtIn = BUILT_IN_ADVENTURES.find((a) => a.id === selectedId);
      if (builtIn) {
        onSelect(builtIn);
      } else {
        // Sprawdź w własnych
        const custom = customAdventures.find((a) => a.id === selectedId);
        if (custom) {
          onSelect(custom);
        }
      }
    }
    onClose();
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAdventure) return;

    const newAdventure = await onUploadAdventure(file);
    if (newAdventure) {
      setSelectedId(newAdventure.id);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onDeleteAdventure) return;

    // Blur aktywnego elementu i użyj window.confirm z opóźnieniem
    // To zapobiega zamknięciu dialogu przez focus management w Radix
    const target = e.currentTarget as HTMLElement;
    target.blur();
    document.body.focus();

    // Dłuższe opóźnienie dla stabilności
    await new Promise((resolve) => setTimeout(resolve, 100));

    const confirmed = window.confirm('Czy na pewno chcesz usunąć tę przygodę?');
    if (!confirmed) return;

    setDeletingId(id);
    await onDeleteAdventure(id);
    setDeletingId(null);

    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const selectedAdventure = selectedId
    ? BUILT_IN_ADVENTURES.find((a) => a.id === selectedId) ||
      customAdventures.find((a) => a.id === selectedId)
    : null;

  // Komponent karty przygody (DRY)
  const AdventureCard = ({
    adventure,
    isCustom = false,
  }: {
    adventure: AdventureContext | CustomAdventure;
    isCustom?: boolean;
  }) => {
    const toneStyle = TONE_STYLES[adventure.tone] || TONE_STYLES.purist;
    const eraStyle = ERA_STYLES[adventure.era] || ERA_STYLES.custom;
    const diffStyle =
      DIFFICULTY_STYLES[adventure.difficulty] || DIFFICULTY_STYLES.normal;
    const isSelected = selectedId === adventure.id;
    const isDeleting = deletingId === adventure.id;
    const customAdv = adventure as CustomAdventure;

    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => handleSelect(adventure)}
          disabled={isDeleting}
          className={`relative p-4 text-left transition-all duration-300 ${
            isSelected
              ? 'border border-primary bg-[#0e1413] shadow-[0_0_18px_rgba(13,148,136,0.22)]'
              : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
          } ${isDeleting ? 'opacity-50' : ''}`}
        >
          {/* Narożnik déco (lewy-górny) */}
          <span
            className={`pointer-events-none absolute left-1.5 top-1.5 h-2.5 w-2.5 border-l-[1.5px] border-t-[1.5px] ${
              isSelected ? 'border-primary' : 'border-brass/45'
            }`}
          />

          {/* Header */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="pr-2 font-display text-lg font-semibold leading-tight tracking-[0.06em] text-foreground">
              {adventure.title}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`border border-brass/35 px-2 py-0.5 font-special-elite text-[13px] uppercase tracking-[0.08em] ${toneStyle.color}`}
              >
                {toneStyle.icon} {toneStyle.label}
              </span>
            </div>
          </div>

          {/* Meta info */}
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-special-elite text-[14px] uppercase tracking-[0.08em]">
            <span className={`${eraStyle.color}`}>
              {eraStyle.icon} {adventure.eraLabel} ({adventure.yearRange})
            </span>
            <span className="text-brass/40">·</span>
            <span className="text-muted-foreground">
              📍 {adventure.location}
            </span>
          </div>

          {/* Hook - klimatyczna zajawka (2 linijki) */}
          <p className="mb-3 line-clamp-2 font-serif text-base italic leading-relaxed text-foreground/80">
            {adventure.hook}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between font-special-elite text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
            <span>🎭 {adventure.playerCount} graczy</span>
            <span>⏱️ {adventure.estimatedSessions} sesji</span>
            <span className={diffStyle.color}>
              {diffStyle.icon} {diffStyle.label}
            </span>
          </div>

          {/* PDF Badge for custom adventures */}
          {isCustom && customAdv.fileName && (
            <div className="mt-2 flex items-center gap-1 font-special-elite text-[14px] uppercase tracking-[0.08em] text-primary">
              <FileText className="h-3 w-3" />
              <span className="max-w-[200px] truncate">
                {customAdv.fileName}
              </span>
            </div>
          )}

          {/* Selected indicator */}
          {isSelected && (
            <div className="absolute right-2 top-2 flex h-6 w-6 rotate-45 items-center justify-center bg-primary shadow-[0_0_12px_rgba(13,148,136,0.5)]">
              <span className="-rotate-45 text-sm text-[#04110f]">✓</span>
            </div>
          )}
        </button>

        {/* Dolne przyciski akcji (poza główną kartą) */}
        <div className="flex items-center justify-between mt-1.5 w-full">
          <button
            type="button"
            onClick={() => setDetailsAdventure(adventure)}
            className="flex items-center gap-1 font-special-elite text-[14px] uppercase tracking-[0.1em] text-primary hover:text-brass transition-colors"
          >
            <Info className="h-4 w-4" />
            Więcej szczegółów
          </button>
          
          {isCustom && onDeleteAdventure && (
            <button
              type="button"
              onClick={(e) => handleDelete(adventure.id, e)}
              disabled={isDeleting}
              className="flex items-center gap-1 font-special-elite text-[14px] uppercase tracking-[0.1em] text-destructive hover:text-red-300 transition-colors p-1"
              title="Usuń przygodę"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>Usuń</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="screen">
          {/* Narożniki déco */}
          <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-brass/55" />
          <span className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-brass/55" />
          <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-brass/55" />
          <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-brass/55" />

          <DialogHeader className="text-center sm:text-center">
            <div className="font-special-elite text-[14px] uppercase tracking-[0.4em] text-primary">
              Wybierz, gdzie zaprowadzi cię ciekawość
            </div>
            <DialogTitle className="mt-1 justify-center text-center font-display-decorative text-3xl font-black uppercase tracking-[0.12em] text-foreground">
              Nowa Przygoda
            </DialogTitle>
            <DialogDescription className="text-center font-serif text-base italic text-muted-foreground">
              Wybierz scenariusz, w którym rozegra się Twoja historia.
              {customAdventures.length > 0 &&
                ` Masz ${customAdventures.length} własnych przygód.`}
            </DialogDescription>
          </DialogHeader>

          {/* Separator déco */}
          <div className="mt-3 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
            <span className="h-2 w-2 rotate-45 bg-brass" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
          </div>

          {!showCustomForm ? (
            <>
              {/* Instrukcja trybu publicznego: brak gotowych scenariuszy -
                  gracz wnosi własny PDF (np. darmowy starter z Black Monk).
                  Gatowane !SHOW_BUILT_IN_ADVENTURES, więc nieobecne w trybie pełnym. */}
              {!SHOW_BUILT_IN_ADVENTURES && ALLOW_CUSTOM_ADVENTURES && (
                <div className="mt-4 flex items-start gap-3 border border-amber-500/40 bg-amber-900/20 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="space-y-1 font-serif text-base italic leading-relaxed text-amber-200/90">
                    <p>
                      Strażnik to <strong>silnik</strong> - nie ma gotowych
                      scenariuszy. Przygodę wnosisz Ty.
                    </p>
                    <p>
                      Masz darmowy starter z Black Monk (lub własny podręcznik)?{' '}
                      <strong>Wgraj jego plik PDF poniżej</strong> - AI odczyta
                      scenariusz i przygotuje przygodę.
                    </p>
                    <p className="text-amber-200/70">
                      Do odczytania PDF potrzebny jest Twój klucz Gemini
                      (Ustawienia).
                    </p>
                  </div>
                </div>
              )}

              {/* Własne przygody (ukryte w becie) */}
              {ALLOW_CUSTOM_ADVENTURES && customAdventures.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-3 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.24em] text-brass">
                    📂 Twoje przygody
                    <span className="font-special-elite text-[14px] tracking-[0.1em] text-muted-foreground">
                      ({customAdventures.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {customAdventures.map((adventure) => (
                      <AdventureCard
                        key={adventure.id}
                        adventure={adventure}
                        isCustom
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Przycisk wgrania nowej przygody z klimatycznym mosiężnym paskiem postępu */}
              {ALLOW_CUSTOM_ADVENTURES && onUploadAdventure && (
                <div className="mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {!isUploading ? (
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      variant="outline"
                      className="w-full border-2 border-dashed border-primary/45 py-6 font-display font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Wgraj przygodę (PDF)
                    </Button>
                  ) : (
                    <div className="relative border border-brass/40 bg-[#16130f] p-4 font-serif rounded-sm">
                      {/* Rogi deco */}
                      <span className="pointer-events-none absolute left-1 top-1 h-2 w-2 border-l border-t border-brass/50" />
                      <span className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-brass/50" />
                      
                      <div className="flex justify-between items-center mb-2 text-sm font-semibold tracking-wider text-brass uppercase font-display">
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Przetwarzanie księgi tajemnic...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>

                      {/* Klimatyczny pasek postępu (mosiądz i złoto) */}
                      <div className="w-full h-3 border border-brass/30 bg-[#0e0c0a] p-[1.5px] rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full bg-gradient-to-r from-brass via-gold to-brass rounded-full shadow-[0_0_8px_rgba(217,119,6,0.5)] transition-all duration-500 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      <p className="text-center font-special-elite text-xs uppercase tracking-wider text-muted-foreground animate-pulse">
                        {loadingStatus || 'AI analizuje przygodę i automatycznie uzupełnia dane...'}
                      </p>
                    </div>
                  )}
                  {!isUploading && (
                    <p className="mt-2 text-center font-special-elite text-[14px] uppercase tracking-[0.1em] text-muted-foreground">
                      np. darmowy starter pobrany z Black Monk
                    </p>
                  )}
                </div>
              )}

              {/* Wbudowane przygody */}
              <div>
                <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.24em] text-brass">
                  🎲 Wybierz scenariusz
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wbudowane scenariusze tylko w trybie pełnym/prywatnym */}
                  {SHOW_BUILT_IN_ADVENTURES &&
                    BUILT_IN_ADVENTURES.map((adventure) => (
                      <AdventureCard key={adventure.id} adventure={adventure} />
                    ))}

                  {/* Własna przygoda bez PDF */}
                  {ALLOW_CUSTOM_ADVENTURES && (
                    <button
                      onClick={() => handleSelect(CUSTOM_ADVENTURE_TEMPLATE)}
                      className={`p-4 text-left transition-all duration-300 ${
                        selectedId === 'custom'
                          ? 'border border-primary bg-[#0e1413] shadow-[0_0_18px_rgba(13,148,136,0.22)]'
                          : 'border border-dashed border-brass/35 bg-[#1f1a14]/40 hover:border-brass/60'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <span className="text-3xl text-primary">✶</span>
                        <div>
                          <h3 className="font-display text-base font-semibold uppercase tracking-[0.06em] text-foreground">
                            Własna Przygoda
                          </h3>
                          <p className="font-special-elite text-[14px] uppercase tracking-[0.1em] text-muted-foreground">
                            Opisz swoją bez PDF
                          </p>
                        </div>
                      </div>
                      <p className="font-serif text-base italic text-muted-foreground">
                        Masz własny scenariusz lub chcesz stworzyć przygodę od
                        zera? Podaj podstawowy kontekst, a AI dostosuje
                        generowanie postaci.
                      </p>
                    </button>
                  )}
                </div>
              </div>

              {/* Szczegóły wybranej przygody */}
              {selectedAdventure && !selectedAdventure.isCustom && (
                <div className="relative mt-6 border border-brass/30 bg-card p-4">
                  <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
                  <span className="absolute bottom-2 right-2 h-3 w-3 border-b-[1.5px] border-r-[1.5px] border-brass/50" />
                  <h4 className="mb-2 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.24em] text-brass">
                    ℹ️ Szczegóły przygody
                    <HelpIcon content="Te informacje zostaną użyte do dopasowania postaci do scenariusza" />
                  </h4>
                  <p className="mb-3 font-serif text-base italic leading-relaxed text-foreground/90">
                    {selectedAdventure.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-special-elite text-[14px] uppercase tracking-[0.12em] text-muted-foreground">
                        Motywy:{' '}
                      </span>
                      <span className="font-serif text-base italic text-foreground">
                        {selectedAdventure.themes.slice(0, 4).join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="font-special-elite text-[14px] uppercase tracking-[0.12em] text-muted-foreground">
                        Sugerowane zawody:{' '}
                      </span>
                      <span className="font-serif text-base italic text-foreground">
                        {selectedAdventure.suggestedOccupations
                          .slice(0, 3)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Formularz własnej przygody (bez PDF) */
            <div className="mt-4 space-y-4">
              <div className="relative border border-brass/30 bg-card p-4">
                <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
                <p className="font-serif text-base italic text-brass">
                  💡 Podaj podstawowe informacje o swojej przygodzie. Im więcej
                  szczegółów, tym lepiej AI dopasuje generowaną postać do
                  kontekstu.
                </p>
              </div>
              <div className="space-y-2">
                <label className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  Tytuł przygody
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="np. Tajemnica Starego Dworu"
                  className="w-full border border-brass/30 bg-[#0e0c08] px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="space-y-2">
                <label className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  Lokalizacja
                </label>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="np. Kraków, Polska"
                  className="w-full border border-brass/30 bg-[#0e0c08] px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                    Era
                  </label>
                  <select
                    value={customEra}
                    onChange={(e) =>
                      setCustomEra(e.target.value as typeof customEra)
                    }
                    className="w-full border border-brass/30 bg-[#0e0c08] px-4 py-3 font-special-elite text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="classic">Klasyczne lata 20.</option>
                    <option value="gaslight">Era wiktoriańska</option>
                    <option value="modern">Współczesność</option>
                    <option value="custom">Inna</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                    Lata
                  </label>
                  <input
                    type="text"
                    value={customYearRange}
                    onChange={(e) => setCustomYearRange(e.target.value)}
                    placeholder="np. 1923-1925"
                    className="w-full border border-brass/30 bg-[#0e0c08] px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  Założenia przygody (opcjonalnie)
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Opisz fabułę, klimat, głównych antagonistów, motywy..."
                  className="h-32 w-full resize-none border border-brass/30 bg-[#0e0c08] px-4 py-3 font-serif text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCustomForm(false)}
                className="w-full font-display font-semibold uppercase tracking-[0.16em]"
              >
                ← Wróć do listy przygód
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between border-t border-brass/20 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="font-display font-semibold uppercase tracking-[0.16em]"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedId && !showCustomForm}
              className="font-display font-semibold uppercase tracking-[0.16em]"
            >
              {showCustomForm ? 'Użyj tej przygody' : 'Wybierz i kontynuuj →'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AdventureDetailsModal
        adventure={detailsAdventure}
        open={!!detailsAdventure}
        onClose={() => setDetailsAdventure(null)}
        onChoose={(adventure) => handleSelect(adventure)}
      />
    </>
  );
}

export default AdventureSelector;
