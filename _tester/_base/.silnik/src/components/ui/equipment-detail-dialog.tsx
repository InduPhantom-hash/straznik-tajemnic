import { useState, useEffect } from 'react';
import { Button } from './button';
import { EquipmentItem, Character } from '@/lib/types';
import { inferWeaponSkill, inferWeaponDamage, isWeapon } from '@/lib/combat/weapon-context';
import { generateItemLore, generateVisualDescription } from '@/lib/character/item-helpers';
import { getEraImageFilter } from '@/lib/era-visual-style';
import { Loader2 } from 'lucide-react';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import { DiegeticDocumentViewer } from './diegetic-document-viewer';
import { inferDocumentType } from '@/lib/acquired-equipment';

import { createPortal } from 'react-dom';

interface EquipmentDetailDialogProps {
  item: EquipmentItem | null;
  onClose: () => void;
  era?: string;
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

export function EquipmentDetailDialog({
  item,
  onClose,
  era,
  onUpdateItem,
}: EquipmentDetailDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    try {
      const characterSaved = localStorage.getItem('characters');
      const activeCharId = localStorage.getItem('active_character_id');
      if (characterSaved) {
        const chars: Character[] = JSON.parse(characterSaved);
        const activeChar = chars.find((c) => c.id === activeCharId) || chars[0];
        if (activeChar) setActiveCharacter(activeChar);
      }
    } catch (e) {
      console.error('Błąd ładowania aktywnej postaci w EquipmentDetailDialog:', e);
    }
  }, []);

  if (!item || !mounted) return null;

  const isDocument = item.category === 'document' || item.category === 'artifact' || item.category === 'occult' || item.isReadable;

  const handleReadItem = async () => {
    if (!onUpdateItem) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const characterSaved = localStorage.getItem('characters');
      const activeCharId = localStorage.getItem('active_character_id');
      let activeChar: Character | null = null;
      if (characterSaved) {
        const chars: Character[] = JSON.parse(characterSaved);
        activeChar = chars.find((c) => c.id === activeCharId) || chars[0];
      }

      const advSaved = localStorage.getItem('adventure_context');
      const adventureContext = advSaved ? JSON.parse(advSaved) : null;

      const chatSaved = localStorage.getItem('chat-messages');
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
          adventureContext,
          currentLocation: undefined,
          recentHistory,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Nie udało się wczytać treści przedmiotu');
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
      const message = err instanceof Error ? err.message : 'Wystąpił błąd podczas czytania.';
      setErrorMsg(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="deco-corners flex flex-col bg-[#120e0a] border-2 border-brass/60 w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative shadow-2xl"
      >
        {/* Narożniki Deco */}
        <span className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-brass/80 pointer-events-none" />
        <span className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-brass/80 pointer-events-none" />
        <span className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-brass/80 pointer-events-none" />
        <span className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-brass/80 pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-serif text-2xl text-foreground">
            {item.name}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-none text-brass/70 hover:text-brass"
            aria-label="Zamknij"
          >
            ✕
          </Button>
        </div>
        {(item.mapUrl || (item.imageUrl && item.isMap)) && (
          <div className="relative w-full aspect-video border-2 border-brass/50 bg-[#070604] mb-5 overflow-hidden shadow-2xl rounded-none">
            <img
              src={item.mapUrl || item.imageUrl}
              alt={`Mapa: ${item.name}`}
              className="w-full h-full object-contain p-2"
              style={{ filter: getEraImageFilter(era) }}
            />
            <div className="absolute top-2 left-2 bg-brass/90 text-black text-[10px] font-bold font-special-elite uppercase px-2 py-0.5 shadow">
              🗺️ Mapa / Plan
            </div>
            <div className="absolute inset-1 pointer-events-none border border-brass/25" />
          </div>
        )}
        {item.imageUrl && !item.mapUrl && !item.isMap && (
          <div className="relative w-full aspect-square max-h-[380px] border-2 border-brass/40 bg-[#0d0a07] mb-5 overflow-hidden shadow-2xl rounded-none">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL (base64) z generatora */}
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              style={{ filter: getEraImageFilter(era) }}
            />
            <div className="absolute inset-2 pointer-events-none border border-brass/25" />
            <div className="absolute inset-0 pointer-events-none border border-black/80" />
          </div>
        )}
        {item.audioUrl && (
          <div className="mb-4 p-3 bg-[#0d0a07] border border-brass/30 rounded">
            <div className="text-xs font-special-elite text-brass uppercase mb-1.5 flex items-center gap-1.5">
              <span>🔊</span> Nagranie / Taśma Audio
            </div>
            <audio controls src={item.audioUrl} className="w-full h-8 outline-none" />
          </div>
        )}
        {item.description && (
          <p className="font-serif italic text-base text-muted-foreground leading-relaxed mb-4">
            {item.description}
          </p>
        )}

        {/* Sekcja czytania dokumentu */}
        {isDocument && (
          <div className="mb-4 pt-2 border-t border-brass/20">
            {item.readableContent ? (
              <DiegeticDocumentViewer item={item} character={activeCharacter} />
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
                        Badanie dokumentu...
                      </>
                    ) : (
                      '📖 Przeczytaj dokument'
                    )}
                  </Button>
                ) : (
                  <p className="text-xs italic text-muted-foreground/60">
                    Ten dokument można przeczytać na karcie postaci.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {getItemMechanics(item).length > 0 && (
          <div className="border-t border-brass/20 pt-3 space-y-1.5">
            <div className="font-display uppercase tracking-[0.16em] text-brass text-xs mb-2">
              Zastosowanie / mechanika
            </div>
            {getItemMechanics(item).map((row) => (
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
        {getItemMechanics(item).length === 0 &&
          !item.description && !isDocument && (
            <div className="space-y-2 border-t border-brass/20 pt-3">
              <div className="font-display uppercase tracking-[0.16em] text-brass text-xs">
                Opis przedmiotu
              </div>
              <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">
                {generateItemLore(item.name)}
              </p>
              <p className="font-special-elite text-xs text-muted-foreground/80">
                Wygląd: {generateVisualDescription(item.name)}
              </p>
            </div>
          )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null;
}

