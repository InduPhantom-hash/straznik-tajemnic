import { SafeImage } from '@/components/ui/safe-image';
import { useState, useCallback, useMemo } from 'react';
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
  Mail,
  IdCard,
  Ticket,
  BookOpen,
  Newspaper
} from 'lucide-react';
import { EquipmentDetailDialog } from './equipment-detail-dialog';
import { Character, EquipmentItem, EquipmentCategory, EquipmentVisualEra } from '@/lib/types';
import { CATEGORY_LABELS, findEquipmentByName } from '@/lib/equipment-data';
import {
  buildEquipmentImagePrompt,
  isCharacterBoundEquipment,
} from '@/lib/equipment-prompt-builder';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { deriveFinances } from '@/lib/economy/credit-rating';
import { inferDocumentType } from '@/lib/acquired-equipment';
import {
  inferWeaponSkill,
  inferWeaponDamage,
  isWeapon,
  isMeleeWeapon,
} from '@/lib/combat/weapon-context';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import { useMessages, useTranslations, useLocale } from 'next-intl';
import { generateItemLore } from '@/lib/character/item-helpers';
import { localizeSystemEquipment } from '@/lib/i18n/preset-translation';
import { getEraImageFilter } from '@/lib/era-visual-style';
import { isCatalogEquipment, migrateEquipmentCatalog } from '@/lib/equipment-catalog';

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
  const t = useTranslations('EquipmentModal');
  const messages = useMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    EquipmentCategory | 'all'
  >('all');
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  // Klik w kafelek → modal detalu (read-only; przedmioty nabywane/tracone
  // kontekstowo w narracji, nie ręcznie - dlatego bez edycji/usuwania).
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const migratedEquipment = useMemo(
    () =>
      migrateEquipmentCatalog(
        character.equipment,
        (era as EquipmentVisualEra) || '1920s'
      ) || [],
    [character.equipment, era]
  );

  const equipment = migratedEquipment.map((item) =>
    localizeSystemEquipment(item, messages)
  );

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

  const [generateError, setGenerateError] = useState<string | null>(null);

  // Generuj obraz dla przedmiotu
  const generateImage = useCallback(
    async (item: EquipmentItem) => {
      setGeneratingImage(item.id);
      setGenerateError(null);

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
                  : 'item',
              era,
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
        setGenerateError(t('imageGenerateFailed'));
      } finally {
        setGeneratingImage(null);
      }
    },
    [era, adventureTheme, updateItem, t]
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
        data-testid="equipment-modal"
        size="wide"
        className="w-[86vw] max-w-[1280px] max-h-[85vh] overflow-y-auto p-6 sm:p-8 bg-gradient-to-b from-[#16120d] via-[#100c08] to-background border-brass/50 shadow-2xl"
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-3 pr-12">
          <DialogTitle className="font-display uppercase tracking-[0.12em] text-foreground flex items-center gap-3">
            <Package className="w-5 h-5 text-brass" />
            <span>
              <span className="block font-special-elite text-xs font-normal normal-case tracking-[0.24em] text-primary">
                {t('titleEyebrow', { name: character.name })}
              </span>
              {t('title')}
            </span>
          </DialogTitle>
          {/* IND-235 a11y: opis dla czytników ekranu (aria-describedby) */}
          <DialogDescription className="sr-only">
            {t('descriptionA11y', { name: character.name })}
          </DialogDescription>
          {/* B2: przełącznik postaci - w duecie pokazuje czyj to ekwipunek jako zakładki */}
          {characters.length > 1 && onCharacterChange && (
            <div className="flex items-center gap-1 border border-brass/40 bg-[#120f0c] p-0.5 font-special-elite mr-2">
              {characters.map((char) => {
                const isActive = char.id === character.id;
                return (
                  <button
                    key={char.id}
                    onClick={() => onCharacterChange(char)}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-brass/20 text-foreground border border-brass/50 font-bold'
                        : 'text-muted-foreground/60 hover:text-brass hover:bg-brass/5'
                    }`}
                  >
                    <User className="w-3 h-3 text-brass/70" />
                    <span>{char.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </DialogHeader>

        {/* Separator déco */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/50" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <span className="w-1.5 h-1.5 border border-brass rotate-45" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/50" />
        </div>

        {/* Baner błędu generowania miniatury Art Déco */}
        {generateError && (
          <div
            data-testid="equipment-generate-error"
            className="flex items-center justify-between gap-3 px-4 py-2.5 mb-4 bg-red-950/40 border border-red-800/60 text-red-200 text-xs font-special-elite"
          >
            <span>{generateError}</span>
            <button
              onClick={() => setGenerateError(null)}
              className="text-red-300 hover:text-white transition-colors uppercase tracking-widest text-[10px]"
              title="Zamknij"
            >
              [×]
            </button>
          </div>
        )}

        {/* Pasek zakładek i wyszukiwania */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-brass/25 pb-4">
          <div className="flex bg-[#120b07] p-1 border border-brass/35 rounded-none">
            <button
              onClick={() => setActiveTab('weapon')}
              className={`px-5 py-2 font-display uppercase tracking-[0.16em] text-xs font-semibold transition-all ${
                activeTab === 'weapon'
                  ? 'bg-primary text-[#04110f]'
                  : 'text-brass/70 hover:text-brass'
              }`}
            >
              {t('weaponsTab', { count: weaponItems.length })}
            </button>
            <button
              onClick={() => setActiveTab('gear')}
              className={`px-5 py-2 font-display uppercase tracking-[0.16em] text-xs font-semibold transition-all ${
                activeTab === 'gear'
                  ? 'bg-primary text-[#04110f]'
                  : 'text-brass/70 hover:text-brass'
              }`}
            >
              {t('gearTab', { count: gearItems.length })}
            </button>
            <button
              onClick={() => setActiveTab('finances')}
              className={`px-5 py-2 font-display uppercase tracking-[0.16em] text-xs font-semibold transition-all ${
                activeTab === 'finances'
                  ? 'bg-primary text-[#04110f]'
                  : 'text-brass/70 hover:text-brass'
              }`}
            >
              {t('financesTab')}
            </button>
          </div>

          {activeTab !== 'finances' && (
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brass/60" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 font-special-elite bg-[#120f0c] border-brass/30 focus:border-brass/70 text-foreground"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value as EquipmentCategory | 'all')
                }
                className="bg-[#120f0c] border border-brass/30 rounded-none px-3 py-2 text-sm font-special-elite text-foreground"
              >
                <option value="all">{t('allFilter')}</option>
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
        <div className="min-h-0">
          {/* === KARTA: BROŃ === */}
          {activeTab === 'weapon' && (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weaponItems.map((item) => (
                  <WeaponCard
                    key={item.id}
                    item={item}
                    generatingImage={generatingImage}
                    onGenerateImage={generateImage}
                    onOpenDetail={setSelectedItem}
                    era={era}
                    character={character}
                  />
                ))}
              </div>
              {weaponItems.length === 0 && (
                <div className="border border-dashed border-brass/20 bg-[#1f1a14]/25 p-8 text-center font-serif italic text-base text-muted-foreground/70">
                  {t('weaponsEmpty')}
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
                    character={character}
                  />
                ))}
              </div>

              {gearItems.length === 0 && (
                <div className="text-center py-16 text-muted-foreground border border-brass/20 bg-card mt-2">
                  <Package className="w-12 h-12 mx-auto mb-4 text-brass/30" />
                  <p className="font-serif italic text-base">
                    {t('gearEmptyTitle')}
                  </p>
                  <p className="mt-2 font-serif italic text-sm text-muted-foreground/70">
                    {t('gearEmptyDesc')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* === KARTA: FINANSE === */}
          {activeTab === 'finances' && (
            <div className="max-w-4xl mx-auto py-2">
              <div className="border border-brass/40 bg-gradient-to-br from-[#16120c] via-[#120e09] to-[#0a0805] p-6 md:p-8 shadow-2xl relative">
                {/* Narożniki Deco */}
                <span className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-brass/80 pointer-events-none" />
                <span className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-brass/80 pointer-events-none" />
                <span className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-brass/80 pointer-events-none" />
                <span className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-brass/80 pointer-events-none" />

                {/* Nagłówek bankowy */}
                <div className="text-center mb-6 pb-4 border-b border-brass/30">
                  <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-brass/80 mb-1">
                    {t('bankHeader')}
                  </div>
                  <h3 className="font-display uppercase tracking-[0.16em] text-2xl text-foreground">
                    {t('financialDossierTitle', { name: character.name })}
                  </h3>
                  <p className="font-serif italic text-sm text-muted-foreground/80 mt-1">
                    {t('financialDossierSubtitle')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Kolumna 1: Zamożność & Poziom Życia */}
                  <div className="space-y-4">
                    <div className="border border-brass/30 bg-[#100c08] p-5 relative">
                      <div className="font-special-elite text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        {t('livingStandard')}
                      </div>
                      <div className="font-display text-2xl md:text-3xl text-brass font-bold tracking-wide">
                        {finances.tierLabel}
                      </div>
                      <div className="mt-2 font-special-elite text-sm text-primary tracking-wide">
                        {t('dailySpending', { amount: formatUsd(finances.spendingLevel) })}
                      </div>
                      <p className="mt-3 font-serif italic text-xs text-muted-foreground/75 leading-relaxed">
                        {t('dailySpendingExplainer')}
                      </p>
                    </div>

                    <div className="flex justify-between items-center border border-brass/25 bg-[#14100b] px-4 py-3">
                      <span className="font-serif text-base text-foreground">
                        {t('creditRatingLabel')}
                      </span>
                      <span className="font-display text-2xl text-brass font-bold">
                        {finances.creditRating}%
                      </span>
                    </div>
                  </div>

                  {/* Kolumna 2: Bilans Gotówki i Aktywów */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border border-brass/25 bg-[#14100b] px-4 py-3.5">
                      <div>
                        <div className="font-serif text-base text-foreground">
                          {t('cashLabel')}
                        </div>
                        <div className="font-special-elite text-xs text-muted-foreground">
                          {t('cashSubtitle')}
                        </div>
                      </div>
                      <span className="font-display text-2xl text-foreground font-bold">
                        {formatUsd(finances.cash)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border border-brass/25 bg-[#14100b] px-4 py-3.5">
                      <div>
                        <div className="font-serif text-base text-foreground">
                          {t('assetsLabel')}
                        </div>
                        <div className="font-special-elite text-xs text-muted-foreground">
                          {t('assetsSubtitle')}
                        </div>
                      </div>
                      <span className="font-display text-2xl text-foreground font-bold">
                        {finances.assetsDescription || formatUsd(finances.assets)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border border-brass/25 bg-[#14100b] px-4 py-3.5">
                      <span className="font-serif text-base text-foreground">
                        {t('itemCountLabel')}
                      </span>
                      <span className="font-display text-xl text-brass font-bold">
                        {equipment.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nota prawna / regułowa */}
                <div className="mt-6 pt-4 border-t border-brass/20 text-center font-serif italic text-xs text-muted-foreground/70">
                  {t('financesFlavor')}
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
            onUpdateItem={(updatedItem) => {
              setSelectedItem(updatedItem);
              updateItem(updatedItem);
            }}
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
  character: Character;
}

/** Ikona kategorii przedmiotu (Lucide) - placeholder gdy brak wygenerowanego obrazu AI. */
function CategoryIcon({
  category,
  item,
  className,
}: {
  category: string;
  item?: EquipmentItem;
  className?: string;
}) {
  if (category === 'document' && item) {
    const docType = inferDocumentType(item);
    switch (docType) {
      case 'evidence_envelope':
      case 'letter': return <Mail className={className} />;
      case 'id_card':
      case 'press_pass': return <IdCard className={className} />;
      case 'newspaper': return <Newspaper className={className} />;
      case 'official_document':
      case 'journal_page': return <BookOpen className={className} />;
      default:
        // Sprawdzenie "na żywioł" dla biletów:
        if (/bilet|ticket/.test(item.name.toLowerCase())) return <Ticket className={className} />;
        return <FileText className={className} />;
    }
  }

  // Sprawdzenie "na żywioł" czy to bilet chociaż nie jest "document" (np. "personal")
  if (item && /bilet|ticket/.test(item.name.toLowerCase())) {
    return <Ticket className={className} />;
  }

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
  const t = useTranslations('EquipmentModal');
  const box = size === 'md' ? 'w-20 h-20' : 'w-16 h-16';
  const iconSize = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';

  const isSvgFallback = Boolean(
    item.imageUrl && item.imageUrl.includes('/equipment/predefined/')
  );
  const isDedicatedCatalogAsset = Boolean(
    item.imageUrl &&
      item.imageUrl.includes('/equipment/catalog/') &&
      item.imageUrl.endsWith('.webp')
  );
  const hasRealImage = Boolean(item.imageUrl && !isSvgFallback);
  const canGenerate = !isDedicatedCatalogAsset;

  return (
    <div
      className={`flex-none ${box} border border-brass/35 bg-gradient-to-br from-[#1c1712] via-[#140f0a] to-[#0b0805] overflow-hidden flex items-center justify-center relative shadow-md group rounded-sm`}
    >
      {hasRealImage ? (
        <>
          <SafeImage
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
                title={t('regenerateImageTitle')}
                className="w-full h-full p-0 text-brass hover:text-[#ffd79e] hover:bg-brass/10 transition-colors flex items-center justify-center"
              >
                {generatingImage === item.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brass" />
                ) : (
                  <span className="text-brass text-xs font-special-elite uppercase tracking-wider">
                    {t('newBadge')}
                  </span>
                )}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <CategoryIcon category={item.category} item={item} className={`${iconSize} text-brass/80`} />
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
                title={t('generateImageTitle')}
                className="w-full h-full p-0 text-brass hover:text-[#ffd79e] hover:bg-brass/10 transition-colors flex items-center justify-center"
              >
                {generatingImage === item.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brass" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4 text-brass" />
                    <span className="text-brass text-[9px] font-special-elite uppercase tracking-wider">
                      {t('generateBadge')}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          )}
          {generatingImage === item.id && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brass" />
            </div>
          )}
        </>
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
  character,
}: ItemCardProps) {
  const t = useTranslations('EquipmentModal');
  const conditionLabels: Record<string, string> = {
    new: t('conditionNew'),
    used: t('conditionUsed'),
    damaged: t('conditionDamaged'),
    broken: t('conditionBroken'),
  };
  const locale = useLocale();
  const effectiveLore = item.description?.trim() || generateItemLore(item.name, locale);

  const skillName = inferWeaponSkill(item);
  const skillVal = resolveTestValue(skillName, character);
  const skillStr = skillVal !== null ? `${skillName} ${skillVal}%` : `${skillName} (baza)`;

  const inferred =
    item.modifiers?.damage && item.modifiers?.range ? null : inferWeaponDamage(item);
  const damage = item.modifiers?.damage ?? inferred?.damage;
  const melee = isMeleeWeapon(item);
  const damageBonus = character.damageBonus?.trim();
  const hasDb = Boolean(damageBonus) && damageBonus !== '0' && damageBonus !== '-';
  const effectiveDamage = melee && hasDb && damage ? `${damage} ${damageBonus}` : damage;
  const range = item.modifiers?.range ?? inferred?.range;

  const template = findEquipmentByName(item.name);
  const malfunction = item.modifiers?.malfunction ?? template?.modifiers?.malfunction;
  const attacks = item.modifiers?.attacks ?? template?.modifiers?.attacks;
  const capacity = item.modifiers?.capacity ?? template?.modifiers?.capacity;

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
          <div className="min-w-0 flex-1">
            <span className="font-serif text-lg text-foreground truncate block">
              {item.name}
            </span>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-special-elite bg-brass/10 border border-brass/30 text-brass">
              {skillStr}
            </span>
          </div>
        </div>
        {item.condition && (
          <span className="font-special-elite text-xs uppercase tracking-[0.08em] text-muted-foreground hidden sm:inline flex-none">
            {conditionLabels[item.condition] || item.condition}
          </span>
        )}
      </div>

      {/* Statystyki bojowe CoC 7e */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-2 border-t border-brass/15 font-special-elite text-xs uppercase tracking-[0.06em] text-muted-foreground">
        {effectiveDamage && (
          <span>
            {t('dmgShort')}{' '}
            <span className="text-foreground font-semibold">{effectiveDamage}</span>
          </span>
        )}
        {range && (
          <span>
            {t('range')}:{' '}
            <span className="text-foreground">{range}</span>
          </span>
        )}
        {attacks && (
          <span>
            {t('attacks')}:{' '}
            <span className="text-foreground">{attacks}</span>
          </span>
        )}
        {capacity && (
          <span>
            {t('capacity')}:{' '}
            <span className="text-foreground">{capacity}</span>
          </span>
        )}
        {malfunction && !melee && (
          <span>
            {t('malfunction')}:{' '}
            <span className="text-foreground">{malfunction}</span>
          </span>
        )}
        {item.modifiers?.bonus && (
          <span>
            {t('bonusShort')}{' '}
            <span className="text-foreground">+{item.modifiers.bonus}%</span>
          </span>
        )}
      </div>

      <div className="mt-2 font-serif italic text-sm text-muted-foreground/90 whitespace-normal break-words leading-relaxed line-clamp-2">
        {effectiveLore}
      </div>
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
  character,
}: ItemCardProps) {
  const t = useTranslations('EquipmentModal');
  const locale = useLocale();
  const conditionLabels: Record<string, string> = {
    new: t('conditionNew'),
    used: t('conditionUsed'),
    damaged: t('conditionDamaged'),
    broken: t('conditionBroken'),
  };
  const effectiveLore = item.description?.trim() || generateItemLore(item.name, locale);

  const isDoc = item.category === 'document' || item.isReadable;
  const quantity = item.quantity && item.quantity > 1 ? item.quantity : null;

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="group flex items-center gap-4 border border-brass/25 bg-[#16130f] p-3.5 hover:border-brass/50 hover:bg-[#1f1a14] transition-all duration-200 cursor-pointer shadow-sm relative"
    >
      <div className="relative flex-none">
        <ItemThumbnail
          item={item}
          generatingImage={generatingImage}
          onGenerateImage={onGenerateImage}
          size="md"
          era={era}
        />
        {quantity && (
          <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-special-elite font-bold bg-[#1b150f] text-brass border border-brass/60 rounded shadow">
            x{quantity}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif text-lg text-foreground truncate">
              {item.name}
            </span>
            {isDoc && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-special-elite uppercase tracking-wider bg-brass/15 text-brass border border-brass/35 rounded-sm flex-none">
                <FileText className="w-3 h-3" />
                {t('documentBadge')}
              </span>
            )}
          </div>
          {item.condition && (
            <span className="font-special-elite text-xs uppercase tracking-[0.08em] text-muted-foreground hidden sm:inline flex-none">
              {conditionLabels[item.condition] || item.condition}
            </span>
          )}
        </div>

        {/* Modyfikatory / premie użytkowe */}
        {(item.modifiers?.skill || item.modifiers?.bonus) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 font-special-elite text-xs uppercase tracking-[0.06em] text-brass/90">
            {item.modifiers?.skill && (
              <span>
                {t('skillShort')}: {item.modifiers.skill}
              </span>
            )}
            {item.modifiers?.bonus && (
              <span>
                {t('bonusShort')}: +{item.modifiers.bonus}%
              </span>
            )}
          </div>
        )}

        <div className="mt-1 font-serif italic text-sm text-muted-foreground/90 whitespace-normal break-words leading-relaxed line-clamp-2">
          {effectiveLore}
        </div>
      </div>
    </div>
  );
}

export default EquipmentModal;
