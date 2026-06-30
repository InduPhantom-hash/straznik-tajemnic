'use client';

import type { ReactNode } from 'react';
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import {
  Package,
  Search,
  Loader2,
  Sword,
  Shield,
  Wrench,
  FileText,
  Sparkles,
  User,
  Heart,
  Flame,
} from 'lucide-react';
import { Character, EquipmentItem, EquipmentCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/equipment-data';
import { buildEquipmentImagePrompt } from '@/lib/equipment-prompt-builder';
import { deriveFinances } from '@/lib/economy/credit-rating';
import {
  inferWeaponSkill,
  inferWeaponDamage,
  isWeapon,
} from '@/lib/combat/weapon-context';

/** Formatuje kwotę w dolarach 1920s (separatory tysięcy, grosze tylko gdy < $1). */
function formatUsd(amount: number): string {
  if (amount < 1 && amount > 0) return `$${amount.toFixed(2)}`;
  return `$${amount.toLocaleString('en-US')}`;
}

interface EquipmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character;
  onCharacterUpdate: (character: Character) => void;
  era?: string;
  adventureTheme?: string;
  /** B2: pełen roster - włącza przełącznik postaci (czyj ekwipunek) w duecie. */
  characters?: Character[];
  /** B2: zmiana aktywnej postaci (reuse onCharacterSwitch z page) - panel pokazuje ekwipunek wybranego. */
  onCharacterChange?: (character: Character) => void;
}

// Ikony dla kategorii
const CATEGORY_ICONS: Record<EquipmentCategory, ReactNode> = {
  weapon: <Sword className="w-4 h-4" />,
  armor: <Shield className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  artifact: <Sparkles className="w-4 h-4" />,
  personal: <User className="w-4 h-4" />,
  medical: <Heart className="w-4 h-4" />,
  occult: <Flame className="w-4 h-4" />,
};

// Etykiety stanu przedmiotu (déco: zwięzłe statusy w stylu special-elite)
const CONDITION_LABELS: Record<string, string> = {
  new: 'nowy',
  used: 'używany',
  damaged: 'uszkodzony',
  broken: 'zepsuty',
};

export function EquipmentModal({
  open,
  onOpenChange,
  character,
  onCharacterUpdate,
  era = '1920s',
  adventureTheme,
  characters = [],
  onCharacterChange,
}: EquipmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    EquipmentCategory | 'all'
  >('all');
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  // Klik w kafelek → modal detalu (read-only; przedmioty nabywane/tracone
  // kontekstowo w narracji, nie ręcznie - dlatego bez edycji/usuwania).
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const equipment = character.equipment || [];

  // Filtruj przedmioty
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Zapis przedmiotu (używane przez generowanie obrazka - persist imageUrl).
  // Ekwipunek jest read-only dla gracza; brak ręcznego dodawania/edycji.
  const updateItem = useCallback(
    (updatedItem: EquipmentItem) => {
      const updated = equipment.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      );
      onCharacterUpdate({ ...character, equipment: updated });
    },
    [character, equipment, onCharacterUpdate]
  );

  // Generuj obraz dla przedmiotu
  const generateImage = useCallback(
    async (item: EquipmentItem) => {
      setGeneratingImage(item.id);

      try {
        const prompt = buildEquipmentImagePrompt(item, era, adventureTheme);

        // Zew-App-Local: obrazy przez orkiestrator /api/imagen (tylko Gemini, jeden klucz).
        const response = await fetch('/api/imagen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            style: item.category === 'artifact' ? 'horror' : 'vintage',
            aspectRatio: '1:1',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate image');
        }

        const data = await response.json();

        // Aktualizuj przedmiot z obrazem
        const updatedItem: EquipmentItem = {
          ...item,
          imageUrl: data.imageUrl,
          imagePrompt: prompt,
        };
        updateItem(updatedItem);
      } catch (error) {
        console.error('Error generating image:', error);
        alert('Nie udało się wygenerować obrazu. Spróbuj ponownie.');
      } finally {
        setGeneratingImage(null);
      }
    },
    [era, adventureTheme, updateItem]
  );

  // Ekonomia CoC 7e (RAW): zamożność z Credit Rating, NIE suma $ per-przedmiot.
  const finances = deriveFinances(character);

  // Déco: rozdziel broń od reszty wyposażenia (układ kolumnowy wg makiety 21).
  const weaponItems = filteredEquipment.filter(
    (item) => item.category === 'weapon'
  );
  const gearItems = filteredEquipment.filter(
    (item) => item.category !== 'weapon'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="screen"
        className="bg-gradient-to-b from-[#14110c] to-background border-brass/30"
      >
        <DialogHeader className="flex-none flex flex-row items-center justify-between gap-3">
          <DialogTitle className="font-display uppercase tracking-[0.1em] text-foreground flex items-center gap-3">
            <Package className="w-5 h-5 text-brass" />
            <span>
              <span className="block font-special-elite text-xs font-normal normal-case tracking-[0.28em] text-primary">
                {character.name} · wyposażenie
              </span>
              Ekwipunek i finanse
            </span>
          </DialogTitle>
          {/* IND-235 a11y: opis dla czytników ekranu (aria-describedby) */}
          <DialogDescription className="sr-only">
            Lista przedmiotów i broni postaci {character.name} oraz status
            majątkowy (Poziom Zamożności) wg zasad Call of Cthulhu 7e.
          </DialogDescription>
          {/* B2: przełącznik postaci - w duecie pokazuje czyj to ekwipunek */}
          {characters.length > 1 && onCharacterChange && (
            <select
              aria-label="Wybierz postać, której ekwipunek oglądasz"
              value={character.id || ''}
              onChange={(e) => {
                const selected = characters.find(
                  (c) => c.id === e.target.value
                );
                if (selected) onCharacterChange(selected);
              }}
              className="flex-none appearance-none bg-card border border-brass/40 rounded-none px-3 py-1.5 pr-8 text-sm text-foreground cursor-pointer hover:border-brass/70 transition-colors focus:outline-none focus:ring-1 focus:ring-brass/50 font-special-elite"
            >
              {characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name}
                </option>
              ))}
            </select>
          )}
        </DialogHeader>

        {/* Separator déco */}
        <div className="flex-none flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        {/* Pasek wyszukiwania i filtrów */}
        <div className="flex-none flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brass/60" />
            <Input
              placeholder="Szukaj przedmiotów..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-special-elite"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value as EquipmentCategory | 'all')
            }
            className="bg-card border border-brass/30 rounded-md px-3 py-2 text-sm font-special-elite text-foreground"
          >
            <option value="all">Wszystkie</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Układ kolumnowy: broń | wyposażenie | finanse (wg makiety 21) */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col lg:flex-row gap-6">
          {/* === KOLUMNA: BROŃ === */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="font-display uppercase tracking-[0.2em] text-brass text-xs font-semibold mb-3 flex items-center gap-2">
              <Sword className="w-3.5 h-3.5" />
              Broń
            </div>
            <div className="flex flex-col gap-2.5">
              {weaponItems.map((item) => (
                <WeaponCard
                  key={item.id}
                  item={item}
                  generatingImage={generatingImage}
                  onGenerateImage={generateImage}
                  onOpenDetail={setSelectedItem}
                />
              ))}
              {weaponItems.length === 0 && (
                <div className="border border-dashed border-brass/20 bg-[#1f1a14]/25 p-3 text-center font-serif italic text-sm text-muted-foreground/70">
                  Broń przydzielana wg zasad / poprzednich postaci - nie
                  dodajesz jej ręcznie.
                </div>
              )}
            </div>
          </div>

          {/* === KOLUMNA: WYPOSAŻENIE === */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="font-display uppercase tracking-[0.2em] text-brass text-xs font-semibold mb-3 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" />
              Wyposażenie
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {gearItems.map((item) => (
                <GearCard
                  key={item.id}
                  item={item}
                  generatingImage={generatingImage}
                  onGenerateImage={generateImage}
                  onOpenDetail={setSelectedItem}
                />
              ))}
            </div>

            {filteredEquipment.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-brass/20 bg-card mt-2">
                <Package className="w-12 h-12 mx-auto mb-4 text-brass/30" />
                <p className="font-serif italic text-base">
                  Brak przedmiotów w ekwipunku
                </p>
                <p className="mt-2 font-serif italic text-sm text-muted-foreground/70">
                  Wyposażenie przydzielane jest wg zawodu i wydarzeń w grze.
                </p>
              </div>
            )}
          </div>

          {/* === KOLUMNA: FINANSE === */}
          <div className="w-full lg:w-[300px] lg:flex-none flex flex-col">
            <div className="font-display uppercase tracking-[0.2em] text-brass text-xs font-semibold mb-3 flex items-center gap-2">
              <span className="text-sm leading-none">$</span>
              Finanse
            </div>

            {/* Karta Poziom życia (Zamożność) z narożnikami déco */}
            <div className="relative border border-brass/40 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-5 text-center">
              <span className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-[1.5px] border-l-[1.5px] border-brass" />
              <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-[1.5px] border-r-[1.5px] border-brass" />
              <div className="font-special-elite text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Poziom życia
              </div>
              <div className="font-display font-bold text-2xl text-foreground tracking-[0.08em] my-1.5">
                {finances.tierLabel}
              </div>
              <div className="font-special-elite text-sm tracking-[0.08em] text-primary">
                wydatki dzienne ≤ {formatUsd(finances.spendingLevel)}
              </div>
            </div>

            {/* Pozycje finansowe */}
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3">
                <span className="font-serif text-base text-muted-foreground">
                  Zamożność
                </span>
                <span className="font-display text-lg text-brass">
                  {finances.creditRating}%
                </span>
              </div>
              <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3">
                <span className="font-serif text-base text-muted-foreground">
                  Gotówka
                </span>
                <span className="font-display text-lg text-foreground">
                  {formatUsd(finances.cash)}
                </span>
              </div>
              <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3">
                <span className="font-serif text-base text-muted-foreground">
                  Majątek
                </span>
                <span className="font-display text-lg text-foreground">
                  {finances.assetsDescription || formatUsd(finances.assets)}
                </span>
              </div>
              <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3">
                <span className="font-serif text-base text-muted-foreground">
                  Przedmiotów
                </span>
                <span className="font-display text-lg text-foreground">
                  {equipment.length}
                </span>
              </div>
            </div>

            {/* Flavor déco */}
            <div className="mt-3 border-l-2 border-brass/50 bg-brass/5 px-3.5 py-2.5">
              <div className="font-serif italic text-sm text-muted-foreground leading-snug">
                Poziom życia określa, na co badacza stać bez dodatkowych testów
                Zamożności.
              </div>
            </div>
          </div>
        </div>

        {/* Modal detalu przedmiotu (read-only) - klik w kafelek: duży obraz,
            pełny opis i mechanika/zastosowanie. */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="deco-corners flex flex-col bg-[#16130f] border border-brass/40 w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-serif text-2xl text-foreground">
                  {selectedItem.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                  className="flex-none text-brass/70 hover:text-brass"
                  aria-label="Zamknij"
                >
                  ✕
                </Button>
              </div>
              {selectedItem.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- data: URL (base64) z generatora; next/image nie wspiera
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full max-h-72 object-contain border border-brass/20 bg-black/30 mb-4"
                />
              )}
              {selectedItem.description && (
                <p className="font-serif italic text-base text-muted-foreground leading-relaxed mb-4">
                  {selectedItem.description}
                </p>
              )}
              {getItemMechanics(selectedItem).length > 0 && (
                <div className="border-t border-brass/20 pt-3 space-y-1.5">
                  <div className="font-display uppercase tracking-[0.16em] text-brass text-xs mb-2">
                    Zastosowanie / mechanika
                  </div>
                  {getItemMechanics(selectedItem).map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between gap-4 font-special-elite text-sm"
                    >
                      <span className="text-muted-foreground uppercase tracking-[0.06em] text-xs">
                        {row.label}
                      </span>
                      <span className="text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {getItemMechanics(selectedItem).length === 0 &&
                !selectedItem.description && (
                  <p className="font-serif italic text-sm text-muted-foreground/70">
                    Przedmiot fabularny - bez dodatkowej mechaniki.
                  </p>
                )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// === KAFEL BRONI (déco) ===

interface ItemCardProps {
  item: EquipmentItem;
  generatingImage: string | null;
  onGenerateImage: (item: EquipmentItem) => void;
  /** Klik w kafelek otwiera modal detalu (obraz + pełny opis + mechanika). */
  onOpenDetail: (item: EquipmentItem) => void;
}

/**
 * Mechanika/zastosowanie przedmiotu do modalu detalu. Broń: umiejętność bojowa
 * (weapon-context) + obrażenia/zasięg z modifiers. Pozostałe: powiązana umiejętność
 * lub premia, jeśli AI/szablon je nadał. Pusta lista → przedmiot czysto fabularny.
 */
function getItemMechanics(
  item: EquipmentItem
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (isWeapon(item)) {
    rows.push({ label: 'Test bojowy', value: inferWeaponSkill(item) });
    // Dopełnij obrażenia/zasięg, gdy broń nie ma ich w modifiers (np. broń z
    // OCCUPATION_EQUIPMENT bez szablonu) - tabela CoC 7e per typ broni.
    const inferred =
      item.modifiers?.damage && item.modifiers?.range
        ? null
        : inferWeaponDamage(item);
    const damage = item.modifiers?.damage ?? inferred?.damage;
    const range = item.modifiers?.range ?? inferred?.range;
    if (damage) rows.push({ label: 'Obrażenia', value: damage });
    if (range) rows.push({ label: 'Zasięg', value: range });
  }
  if (item.modifiers?.skill)
    rows.push({ label: 'Umiejętność', value: item.modifiers.skill });
  if (item.modifiers?.bonus)
    rows.push({ label: 'Premia', value: `+${item.modifiers.bonus}%` });
  return rows;
}

/** Mała ikona miniatury obrazu (generowanie / podgląd) - wspólna dla broni i wyposażenia. */
function ItemThumbnail({
  item,
  generatingImage,
  onGenerateImage,
  size,
}: {
  item: EquipmentItem;
  generatingImage: string | null;
  onGenerateImage: (item: EquipmentItem) => void;
  size: 'sm' | 'md';
}) {
  const box = size === 'md' ? 'w-12 h-12' : 'w-9 h-9';
  return (
    <div
      className={`flex-none ${box} border border-brass/20 bg-black/30 overflow-hidden flex items-center justify-center`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onGenerateImage(item);
          }}
          disabled={generatingImage === item.id}
          title="Wygeneruj ilustrację przedmiotu"
          className="w-full h-full p-0 text-brass/45 hover:text-brass"
        >
          {generatingImage === item.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            // Déco-placeholder per kategoria (ikona broni/narzędzia/dokumentu...);
            // klik generuje ilustrację, auto-gen w tle uzupełnia miniatury.
            CATEGORY_ICONS[item.category]
          )}
        </Button>
      )}
    </div>
  );
}

/** Kafel broni: nazwa (Cormorant), źródło/stan, statystyki bojowe (special-elite). */
function WeaponCard({
  item,
  generatingImage,
  onGenerateImage,
  onOpenDetail,
}: ItemCardProps) {
  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="group border border-brass/28 bg-[#16130f] p-3.5 hover:border-brass/50 transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <ItemThumbnail
            item={item}
            generatingImage={generatingImage}
            onGenerateImage={onGenerateImage}
            size="md"
          />
          <span className="font-serif text-lg text-foreground truncate">
            {item.name}
          </span>
        </div>
        {item.condition && (
          <span className="font-special-elite text-xs uppercase tracking-[0.08em] text-muted-foreground hidden sm:inline flex-none">
            {CONDITION_LABELS[item.condition] || item.condition}
          </span>
        )}
      </div>

      {/* Statystyki bojowe - tylko realne pola z modifiers */}
      {(item.modifiers?.damage ||
        item.modifiers?.skill ||
        item.modifiers?.bonus) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 font-special-elite text-xs uppercase tracking-[0.06em] text-muted-foreground">
          {item.modifiers?.damage && (
            <span>
              Obraż.{' '}
              <span className="text-foreground">{item.modifiers.damage}</span>
            </span>
          )}
          {item.modifiers?.skill && (
            <span>
              Umiej.{' '}
              <span className="text-foreground">{item.modifiers.skill}</span>
            </span>
          )}
          {item.modifiers?.bonus && (
            <span>
              Premia{' '}
              <span className="text-foreground">+{item.modifiers.bonus}%</span>
            </span>
          )}
        </div>
      )}
      {item.description && (
        <div className="mt-2 font-serif italic text-base text-muted-foreground line-clamp-2">
          {item.description}
        </div>
      )}
    </div>
  );
}

/** Kafel wyposażenia: ikona kategorii (déco), nazwa, opis/stan. */
function GearCard({
  item,
  generatingImage,
  onGenerateImage,
  onOpenDetail,
}: ItemCardProps) {
  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="group flex items-center gap-3 border border-brass/20 bg-[#16130f] p-3 hover:border-brass/45 transition-colors cursor-pointer"
    >
      <ItemThumbnail
        item={item}
        generatingImage={generatingImage}
        onGenerateImage={onGenerateImage}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="font-serif text-lg text-foreground truncate flex items-center gap-1.5">
          <span className="text-brass/70 flex-none">
            {CATEGORY_ICONS[item.category]}
          </span>
          {item.name}
        </div>
        <div className="mt-0.5 font-special-elite text-xs uppercase tracking-[0.06em] text-muted-foreground truncate">
          {item.description ||
            CONDITION_LABELS[item.condition || 'used'] ||
            CATEGORY_LABELS[item.category]}
        </div>
      </div>
    </div>
  );
}

export default EquipmentModal;
