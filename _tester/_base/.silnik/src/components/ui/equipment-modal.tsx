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
  HeartPulse,
  Flame,
} from 'lucide-react';
import { EquipmentDetailDialog } from './equipment-detail-dialog';
import { Character, EquipmentItem, EquipmentCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/equipment-data';
import {
  buildEquipmentImagePrompt,
  isCharacterBoundEquipment,
} from '@/lib/equipment-prompt-builder';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { deriveFinances } from '@/lib/economy/credit-rating';
import {
  inferWeaponSkill,
  inferWeaponDamage,
  isWeapon,
} from '@/lib/combat/weapon-context';
import { getEraImageFilter } from '@/lib/era-visual-style';
import { isCatalogEquipment } from '@/lib/equipment-catalog';

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
  /** B2: pełem roster - włącza przełącznik postaci (czyj ekwipunek) w duecie. */
  characters?: Character[];
  /** B2: zmiana aktywnej postaci (reuse onCharacterSwitch z page) - panel pokazuje ekwipunek wybranego. */
  onCharacterChange?: (character: Character) => void;
}

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
      if (isCatalogEquipment(item)) return;
      setGeneratingImage(item.id);

      try {
        const prompt = buildEquipmentImagePrompt(
          item,
          era,
          adventureTheme,
          character
        );

        // Zew-App-Local: obrazy przez orkiestrator /api/imagen (tylko Gemini, jeden klucz).
        const usePortraitReference = Boolean(
          character?.portraitUrl && isCharacterBoundEquipment(item)
        );
        const response = await fetchWithApiKeys(
          usePortraitReference ? '/api/flux-kontext' : '/api/imagen',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              style: usePortraitReference
                ? 'realistic'
                : item.category === 'artifact'
                  ? 'horror'
                  : 'vintage',
              aspectRatio: '1:1',
              seed: `${character?.id || ''}-${item.id}`,
              ...(usePortraitReference
                ? { inputImageUrl: character!.portraitUrl }
                : {}),
            }),
          }
        );

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
          visualSource: 'generated',
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

  // Auto-generacja miniatur obsługiwana wyłącznie przez useEquipmentThumbnails
  // (fire-and-forget po starcie gry w useGameStart). Drugi useEffect w modalu
  // powodował wyścig stanów (closure vs. functional update) i kasowanie imageUrl.

  const [activeTab, setActiveTab] = useState<'weapon' | 'gear' | 'finances'>(
    'weapon'
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
        className="bg-gradient-to-b from-[#14110c] to-background border-brass/30 flex flex-col"
      >
        <DialogHeader className="flex-none flex flex-row items-center justify-between gap-3 pr-12">
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
          {/* B2: przełącznik postaci - w duecie pokazuje czyj to ekwipunek jako zakładki */}
          {characters.length > 1 && onCharacterChange && (
            <div className="flex items-center gap-1 border border-brass/35 bg-[#120f0c] p-0.5 font-special-elite mr-2">
              {characters.map((char) => {
                const isActive = char.id === character.id;
                return (
                  <button
                    key={char.id}
                    onClick={() => onCharacterChange(char)}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-all duration-200 ${
                      isActive
                        ? 'bg-brass/20 text-foreground border border-brass/45'
                        : 'text-muted-foreground/60 hover:text-brass hover:bg-brass/5'
                    }`}
                  >
                    {char.name}
                  </button>
                );
              })}
            </div>
          )}
        </DialogHeader>

        {/* Separator déco */}
        <div className="flex-none flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-r from-gold/40 to-transparent" />
        </div>

        {/* Pasek zakładek i wyszukiwania */}
        <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-brass/25 pb-4">
          <div className="flex bg-[#120b07] p-1 border border-brass/35 rounded-none">
            <button
              onClick={() => setActiveTab('weapon')}
              className={`px-5 py-2 font-display uppercase tracking-[0.16em] text-xs font-semibold transition-all ${
                activeTab === 'weapon'
                  ? 'bg-primary text-[#04110f]'
                  : 'text-brass/70 hover:text-brass'
              }`}
            >
              ⚔️ Broń ({weaponItems.length})
            </button>
            <button
              onClick={() => setActiveTab('gear')}
              className={`px-5 py-2 font-display uppercase tracking-[0.16em] text-xs font-semibold transition-all ${
                activeTab === 'gear'
                  ? 'bg-primary text-[#04110f]'
                  : 'text-brass/70 hover:text-brass'
              }`}
            >
              🎒 Wyposażenie ({gearItems.length})
            </button>
            <button
              onClick={() => setActiveTab('finances')}
              className={`px-5 py-2 font-display uppercase tracking-[0.16em] text-xs font-semibold transition-all ${
                activeTab === 'finances'
                  ? 'bg-primary text-[#04110f]'
                  : 'text-brass/70 hover:text-brass'
              }`}
            >
              💵 Finanse
            </button>
          </div>

          {activeTab !== 'finances' && (
            <div className="flex gap-2">
              <div className="relative w-64">
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
                className="bg-card border border-brass/30 rounded-none px-3 py-2 text-sm font-special-elite text-foreground"
              >
                <option value="all">Wszystkie</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Zawartość zakładek */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* === KARTA: BROŃ === */}
          {activeTab === 'weapon' && (
            <div className="flex flex-col gap-2.5 max-w-4xl mx-auto">
              {weaponItems.map((item) => (
                <WeaponCard
                  key={item.id}
                  item={item}
                  generatingImage={generatingImage}
                  onGenerateImage={generateImage}
                  onOpenDetail={setSelectedItem}
                  era={era}
                />
              ))}
              {weaponItems.length === 0 && (
                <div className="border border-dashed border-brass/20 bg-[#1f1a14]/25 p-6 text-center font-serif italic text-base text-muted-foreground/70">
                  Broń przydzielana wg zasad / poprzednich postaci - nie
                  dodajesz jej ręcznie.
                </div>
              )}
            </div>
          )}

          {/* === KARTA: WYPOSAŻENIE === */}
          {activeTab === 'gear' && (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gearItems.map((item) => (
                  <GearCard
                    key={item.id}
                    item={item}
                    generatingImage={generatingImage}
                    onGenerateImage={generateImage}
                    onOpenDetail={setSelectedItem}
                    era={era}
                  />
                ))}
              </div>

              {gearItems.length === 0 && (
                <div className="text-center py-16 text-muted-foreground border border-brass/20 bg-card mt-2">
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
          )}

          {/* === KARTA: FINANSE === */}
          {activeTab === 'finances' && (
            <div className="max-w-md mx-auto space-y-6">
              {/* Poziom życia */}
              <div className="relative border border-brass/40 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-6 text-center">
                <span className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-[1.5px] border-l-[1.5px] border-brass" />
                <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-[1.5px] border-r-[1.5px] border-brass" />
                <div className="font-special-elite text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Poziom życia
                </div>
                <div className="font-display font-bold text-3xl text-foreground tracking-[0.08em] my-2">
                  {finances.tierLabel}
                </div>
                <div className="font-special-elite text-sm tracking-[0.08em] text-primary">
                  wydatki dzienne ≤ {formatUsd(finances.spendingLevel)}
                </div>
              </div>

              {/* Pozycje finansowe */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3.5">
                  <span className="font-serif text-base text-muted-foreground">
                    Zamożność
                  </span>
                  <span className="font-display text-xl text-brass">
                    {finances.creditRating}%
                  </span>
                </div>
                <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3.5">
                  <span className="font-serif text-base text-muted-foreground">
                    Gotówka
                  </span>
                  <span className="font-display text-xl text-foreground">
                    {formatUsd(finances.cash)}
                  </span>
                </div>
                <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3.5">
                  <span className="font-serif text-base text-muted-foreground">
                    Majątek
                  </span>
                  <span className="font-display text-xl text-foreground">
                    {finances.assetsDescription || formatUsd(finances.assets)}
                  </span>
                </div>
                <div className="flex justify-between items-center border border-brass/20 bg-card px-4 py-3.5">
                  <span className="font-serif text-base text-muted-foreground">
                    Liczba przedmiotów
                  </span>
                  <span className="font-display text-xl text-foreground">
                    {equipment.length}
                  </span>
                </div>
              </div>

              {/* Flavor déco */}
              <div className="border-l-2 border-brass/50 bg-brass/5 px-4 py-3">
                <div className="font-serif italic text-sm text-muted-foreground leading-snug">
                  Poziom życia określa, na co badacza stać bez dodatkowych
                  testów Zamożności. Majątek obejmuje nieruchomości, udziały i
                  inne dobra trwałe.
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedItem && (
          <EquipmentDetailDialog
            item={selectedItem}
            era={era}
            onClose={() => setSelectedItem(null)}
          />
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
  era: string;
}

/** Ikona kategorii przedmiotu (Lucide) - placeholder gdy brak wygenerowanego obrazu AI. */
function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  switch (category) {
    case 'weapon':
      return <Sword className={className} />;
    case 'armor':
      return <Shield className={className} />;
    case 'tool':
      return <Wrench className={className} />;
    case 'document':
      return <FileText className={className} />;
    case 'artifact':
      return <Sparkles className={className} />;
    case 'personal':
      return <User className={className} />;
    case 'medical':
      return <HeartPulse className={className} />;
    case 'occult':
      return <Flame className={className} />;
    default:
      return <Package className={className} />;
  }
}

/** Mała ikona miniatury obrazu (generowanie / podgląd) - wspólna dla broni i wyposażenia. */
function ItemThumbnail({
  item,
  generatingImage,
  onGenerateImage,
  size,
  era,
}: {
  item: EquipmentItem;
  generatingImage: string | null;
  onGenerateImage: (item: EquipmentItem) => void;
  size: 'sm' | 'md';
  era: string;
}) {
  const box = size === 'md' ? 'w-24 h-24' : 'w-20 h-20';
  const iconSize = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  const canGenerate = !isCatalogEquipment(item);

  return (
    <div
      className={`flex-none ${box} border border-brass/30 bg-gradient-to-br from-[#1c1712] to-[#0f0b07] overflow-hidden flex items-center justify-center relative shadow-md group rounded-sm`}
    >
      {item.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ filter: getEraImageFilter(era) }}
          />
          {canGenerate && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateImage(item);
                }}
                disabled={generatingImage === item.id}
                title="Wygeneruj nową ilustrację AI przedmiotu"
                className="w-full h-full p-0 text-brass hover:text-[#ffd79e] hover:bg-brass/10 transition-colors flex items-center justify-center"
              >
                {generatingImage === item.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brass" />
                ) : (
                  <span className="text-brass text-xs font-special-elite uppercase tracking-wider">
                    Nowy
                  </span>
                )}
              </Button>
            </div>
          )}
        </>
      ) : canGenerate ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onGenerateImage(item);
          }}
          disabled={generatingImage === item.id}
          title="Wygeneruj ilustrację przedmiotu"
          className="w-full h-full p-0 flex items-center justify-center"
        >
          {generatingImage === item.id ? (
            <Loader2 className="w-7 h-7 animate-spin text-brass" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="text-brass/70 transition-opacity group-hover:opacity-0 flex items-center justify-center w-full h-full">
                <CategoryIcon category={item.category} className={iconSize} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <span className="text-brass/70 text-sm">◆</span>
                <span className="text-[8px] text-brass/70 uppercase tracking-widest font-special-elite">
                  Generuj
                </span>
              </div>
            </div>
          )}
        </Button>
      ) : (
        <CategoryIcon category={item.category} className={iconSize} />
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
  era,
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
            era={era}
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
  era,
}: ItemCardProps) {
  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="group flex items-center gap-4 border border-brass/25 bg-[#16130f] p-3.5 hover:border-brass/50 hover:bg-[#1f1a14] transition-all duration-200 cursor-pointer shadow-sm"
    >
      <ItemThumbnail
        item={item}
        generatingImage={generatingImage}
        onGenerateImage={onGenerateImage}
        size="sm"
        era={era}
      />
      <div className="flex-1 min-w-0">
        <div className="font-serif text-lg text-foreground truncate">
          {item.name}
        </div>
        <div className="mt-1 font-special-elite text-xs uppercase tracking-[0.06em] text-muted-foreground whitespace-normal break-words leading-relaxed line-clamp-2">
          {item.description ||
            CONDITION_LABELS[item.condition || 'used'] ||
            CATEGORY_LABELS[item.category]}
        </div>
      </div>
    </div>
  );
}

export default EquipmentModal;
