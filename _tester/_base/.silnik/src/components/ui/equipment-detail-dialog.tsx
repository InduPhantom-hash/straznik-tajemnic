import { SafeImage } from '@/components/ui/safe-image';
import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from './button';
import { EquipmentItem, Character } from '@/lib/types';
import { inferWeaponSkill, inferWeaponDamage, isWeapon } from '@/lib/combat/weapon-context';
import { generateItemLore } from '@/lib/character/item-helpers';
import { getEraImageFilter } from '@/lib/era-visual-style';
import { Loader2, X, Maximize2, Minimize2 } from 'lucide-react';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import { DiegeticDocumentViewer } from './diegetic-document-viewer';
import { inferDocumentType } from '@/lib/acquired-equipment';
import { EquipmentImagePlaceholder } from './equipment-image-placeholder';
import { CATEGORY_LABELS } from '@/lib/equipment-data';
import { resolveGameEraContext, type ResolvedEraContext } from '@/lib/era';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface EquipmentDetailDialogProps {
  item: EquipmentItem | null;
  onClose: () => void;
  era?: string;
  eraContext?: ResolvedEraContext | null;
  onUpdateItem?: (updatedItem: EquipmentItem) => void;
}

/** Formatuje kwotę w dolarach 1920s (separatory tysięcy, grosze tylko gdy < $1). */
function formatUsd(amount: number): string {
  if (amount < 1 && amount > 0) return `$${amount.toFixed(2)}`;
  return `$${amount.toLocaleString('en-US')}`;
}

/**
 * Mechanika/zastosowanie przedmiotu do modalu detalu. Broń: umiejętność bojowa
 * (weapon-context) + obrażenia/zasięg z modifiers. Pozostałe: powiązana umiejętność
 * lub premia, jeśli AI/szablon je nadał. Pusta lista → przedmiot czysto fabularny.
 */
export function getItemMechanics(
  item: EquipmentItem
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (isWeapon(item)) {
    rows.push({ label: 'combatTest', value: inferWeaponSkill(item) });
    // Dopełnij obrażenia/zasięg, gdy broń nie ma ich w modifiers (np. broń z
    // OCCUPATION_EQUIPMENT bez szablonu) - tabela CoC 7e per typ broni.
    const inferred =
      item.modifiers?.damage && item.modifiers?.range
        ? null
        : inferWeaponDamage(item);
    const damage = item.modifiers?.damage ?? inferred?.damage;
    const range = item.modifiers?.range ?? inferred?.range;
    if (damage) rows.push({ label: 'damage', value: damage });
    if (range) rows.push({ label: 'range', value: range });
    if (item.modifiers?.attacks) rows.push({ label: 'attacks', value: String(item.modifiers.attacks) });
    if (item.modifiers?.capacity) rows.push({ label: 'capacity', value: String(item.modifiers.capacity) });
    if (item.modifiers?.malfunction) rows.push({ label: 'malfunction', value: String(item.modifiers.malfunction) });
  }
  if (item.modifiers?.skill)
    rows.push({ label: 'skill', value: item.modifiers.skill });
  if (item.modifiers?.bonus)
    rows.push({ label: 'bonus', value: `+${item.modifiers.bonus}%` });
  return rows;
}

export function EquipmentDetailDialog({
  item,
  onClose,
  era,
  eraContext: propEraContext,
  onUpdateItem,
}: EquipmentDetailDialogProps) {
  const t = useTranslations('EquipmentDetailDialog');
  const conditionLabels: Record<string, string> = {
    new: t('conditionNew'),
    used: t('conditionUsed'),
    damaged: t('conditionDamaged'),
    broken: t('conditionBroken'),
  };
  const mechanicLabels: Record<string, string> = {
    combatTest: t('mechanicCombatTest'),
    damage: t('mechanicDamage'),
    range: t('mechanicRange'),
    skill: t('mechanicSkill'),
    bonus: t('mechanicBonus'),
    attacks: t('mechanicAttacks'),
    capacity: t('mechanicCapacity'),
    malfunction: t('mechanicMalfunction'),
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [item?.id]);

  useEffect(() => {
    try {
      const characterSaved = typeof window !== 'undefined' ? localStorage.getItem('characters') : null;
      const activeCharId = typeof window !== 'undefined' ? localStorage.getItem('active_character_id') : null;
      if (characterSaved) {
        const chars: Character[] = JSON.parse(characterSaved);
        const activeChar = chars.find((c) => c.id === activeCharId) || chars[0];
        if (activeChar) setActiveCharacter(activeChar);
      }
    } catch (e) {
      console.error('Failed to load active character in EquipmentDetailDialog:', e);
    }
  }, []);

  const resolvedEraContext: ResolvedEraContext = useMemo(() => {
    if (propEraContext) return propEraContext;
    try {
      const advSaved = typeof window !== 'undefined' ? localStorage.getItem('adventure_context') : null;
      const adventureContext = advSaved ? JSON.parse(advSaved) : null;
      if (adventureContext?.yearRange || adventureContext?.era) {
        return resolveGameEraContext({ adventure: adventureContext });
      }
    } catch {
      // Fallback
    }
    // Domyślny klasyczny kontekst CoC 7e
    return resolveGameEraContext({ userSelection: { year: 1924, country: 'USA' } });
  }, [propEraContext]);

  const locale = useLocale();

  if (!item) return null;

  // Naprawiony warunek czytelności: tylko dokumenty lub przedmioty z jawnym
  // isReadable=true + gotową treścią (nie wyświetlamy "Przeczytaj" dla artefaktów/okultyzmu)
  const isDocument = item.category === 'document' || (item.isReadable === true && !!item.readableContent);
  const canRequestRead = item.category === 'document' || item.isReadable === true;

  const handleReadItem = async () => {
    if (!onUpdateItem) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const characterSaved = typeof window !== 'undefined' ? localStorage.getItem('characters') : null;
      const activeCharId = typeof window !== 'undefined' ? localStorage.getItem('active_character_id') : null;
      let activeChar: Character | null = null;
      if (characterSaved) {
        const chars: Character[] = JSON.parse(characterSaved);
        activeChar = chars.find((c) => c.id === activeCharId) || chars[0];
      }

      const advSaved = typeof window !== 'undefined' ? localStorage.getItem('adventure_context') : null;
      const adventureContext = advSaved ? JSON.parse(advSaved) : null;

      const chatSaved = typeof window !== 'undefined' ? localStorage.getItem('chat-messages') : null;
      const recentHistory = chatSaved ? JSON.parse(chatSaved) : [];

      const res = await fetch('/api/equipment/read-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getApiKeyHeaders(),
        },
        body: JSON.stringify({
          item,
          character: activeChar,
          adventureContext: adventureContext || { title: item.name, yearRange: String(resolvedEraContext.effectiveYear) },
          eraContext: resolvedEraContext,
          currentLocation: undefined,
          recentHistory,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || t('readFailed'));
      }

      const data = await res.json();
      if (data.success && data.content) {
        onUpdateItem({
          ...item,
          readableContent: data.content,
          readableContentStatus: 'ready',
          isReadable: true,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : t('readError');
      setErrorMsg(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const mechanics = getItemMechanics(item);
  const hasImage = !!item.imageUrl && !item.mapUrl && !item.isMap;
  const hasMap = !!(item.mapUrl || (item.imageUrl && item.isMap));
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;
  const effectiveLore = item.description?.trim() || generateItemLore(item.name, locale);

  return (
    <DialogPrimitive.Root open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-[100] translate-x-[-50%] translate-y-[-50%] flex flex-col bg-[#120e0a] border-2 border-brass/60 overflow-hidden shadow-2xl focus:outline-none pointer-events-auto transition-all duration-200',
            isExpanded ? 'w-[96vw] max-w-6xl max-h-[94vh]' : 'w-[95vw] max-w-5xl max-h-[90vh]'
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {categoryLabel}: {item.name}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Opis i szczegóły przedmiotu {item.name}
          </DialogPrimitive.Description>

          {/* Narożniki Deco */}
          <span className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-brass/80 pointer-events-none z-10" />
          <span className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-brass/80 pointer-events-none z-10" />
          <span className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-brass/80 pointer-events-none z-10" />
          <span className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-brass/80 pointer-events-none z-10" />

          {/* Przycisk zamykania X - z dużą strefą dotyku i wysokim z-index */}
          <DialogPrimitive.Close
            className="absolute top-3 right-3 z-30 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full border border-brass/35 bg-[#120f0c]/90 text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:border-brass/70 hover:text-brass focus:outline-none focus:ring-2 focus:ring-brass/50 cursor-pointer"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </DialogPrimitive.Close>

          {isExpanded ? (
            /* === TRYB PEŁNOEKRANOWY CZYTNIKA DOKUMENTU === */
            <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-6 md:p-8">
              <div className="flex items-center justify-between mb-4 border-b border-brass/20 pb-3 flex-none pr-14">
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.2em] text-brass/70">
                    {categoryLabel}
                  </div>
                  <h3 className="font-serif text-2xl md:text-3xl text-foreground mt-0.5">
                    {item.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-2 text-xs font-special-elite text-brass border border-brass/40 bg-brass/10 hover:bg-brass/20 px-3 py-1.5 transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>{t('collapseDocument')}</span>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <DiegeticDocumentViewer
                  item={item}
                  character={activeCharacter}
                  eraContext={resolvedEraContext}
                  isExpanded={true}
                />
              </div>
            </div>
          ) : (
            /* === STANDARDOWY UKŁAD DWUKOLUMNOWY === */
            <div className="flex flex-col md:flex-row min-h-0 flex-1 overflow-hidden">
              {/* === LEWA KOLUMNA: Grafika === */}
              <div className="md:w-[45%] flex-shrink-0 bg-black/30">
                {hasMap ? (
                  /* Mapa - pełna kolumna */
                  <div className="relative w-full h-full min-h-[280px] md:min-h-0 flex items-center justify-center p-4">
                    <SafeImage
                      src={item.mapUrl || item.imageUrl}
                      alt={t('mapAlt', { name: item.name })}
                      className="max-w-full max-h-full object-contain"
                      style={{ filter: getEraImageFilter(era) }}
                    />
                    <div className="absolute top-4 left-4 bg-brass/90 text-black text-[10px] font-bold font-special-elite uppercase px-2 py-0.5 shadow">
                      {t('mapBadge')}
                    </div>
                  </div>
                ) : hasImage ? (
                  /* Obraz wygenerowany AI */
                  <div className="relative w-full h-full min-h-[280px] md:min-h-0">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      style={{ filter: getEraImageFilter(era) }}
                    />
                    <div className="absolute inset-2 pointer-events-none border border-brass/25" />
                    <div className="absolute inset-0 pointer-events-none border border-black/80" />
                  </div>
                ) : (
                  /* Klimatyczny placeholder SVG */
                  <div className="w-full h-full min-h-[280px] md:min-h-0">
                    <EquipmentImagePlaceholder
                      category={item.category}
                      className="h-full"
                    />
                  </div>
                )}
              </div>

              {/* === PRAWA KOLUMNA: Informacje === */}
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 md:p-8 md:pl-6">
                {/* Nagłówek: kategoria + nazwa */}
                <div className="mb-4">
                  <div className="font-special-elite text-[10px] uppercase tracking-[0.3em] text-brass/70 mb-1.5">
                    {categoryLabel}
                    {item.condition && (
                      <span className="ml-2 text-muted-foreground/60">
                        · {conditionLabels[item.condition] || item.condition}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-2xl md:text-3xl text-foreground leading-tight">
                    {item.name}
                  </h3>
                  {item.value != null && item.value > 0 && (
                    <div className="mt-1.5 font-special-elite text-sm text-brass/80">
                      {t('valueLabel', { value: formatUsd(item.value) })}
                    </div>
                  )}
                </div>

                {/* Audio (jeśli jest) */}
                {item.audioUrl && (
                  <div className="mb-4 p-3 bg-[#0d0a07] border border-brass/30 rounded">
                    <div className="text-xs font-special-elite text-brass uppercase mb-1.5 flex items-center gap-1.5">
                      <span>🔊</span> {t('audioLabel')}
                    </div>
                    <audio controls src={item.audioUrl} className="w-full h-8 outline-none" />
                  </div>
                )}

                {/* Opis fabularny (zawsze obecny) */}
                <p className="font-serif italic text-base text-muted-foreground leading-relaxed mb-4">
                  {effectiveLore}
                </p>

                {/* Sekcja czytania dokumentu */}
                {canRequestRead && (
                  <div className="mb-4 pt-2 border-t border-brass/20">
                    {item.readableContent ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-special-elite text-xs uppercase tracking-wider text-brass">
                            📜 {t('documentPreviewTitle')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center gap-1.5 text-xs text-brass/80 hover:text-brass transition-colors font-special-elite px-2 py-1 border border-brass/30 bg-brass/10 hover:bg-brass/20 cursor-pointer"
                            title={t('expandDocument')}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>{t('expandDocument')}</span>
                          </button>
                        </div>
                        <DiegeticDocumentViewer
                          item={item}
                          character={activeCharacter}
                          eraContext={resolvedEraContext}
                          isExpanded={false}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {errorMsg && (
                          <div className="text-xs text-red-400 font-special-elite mb-1">
                            ⚠️ {errorMsg}
                          </div>
                        )}
                        {onUpdateItem ? (
                          <Button
                            onClick={handleReadItem}
                            disabled={isGenerating}
                            variant="outline"
                            className="w-full justify-center bg-brass/10 border-brass/30 hover:bg-brass/20 text-brass uppercase font-special-elite tracking-wider text-xs"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                {t('examining')}
                              </>
                            ) : (
                              t('readDocument')
                            )}
                          </Button>
                        ) : (
                          <p className="text-xs italic text-muted-foreground/60">
                            {t('readableOnSheet')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mechanika / zastosowanie CoC 7e */}
                {mechanics.length > 0 && (
                  <div className="border-t border-brass/20 pt-3 space-y-1.5">
                    <div className="font-display uppercase tracking-[0.16em] text-brass text-xs mb-2">
                      {t('mechanicsTitle')}
                    </div>
                    {mechanics.map((row) => (
                      <div
                        key={row.label}
                        className="flex justify-between gap-4 font-special-elite text-sm"
                      >
                        <span className="text-muted-foreground uppercase tracking-[0.06em] text-xs">
                          {mechanicLabels[row.label] ?? row.label}
                        </span>
                        <span className="text-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
