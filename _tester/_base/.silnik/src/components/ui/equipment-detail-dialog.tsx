'use client';

import { Button } from './button';
import { EquipmentItem } from '@/lib/types';
import { inferWeaponSkill, inferWeaponDamage, isWeapon } from '@/lib/combat/weapon-context';
import { getEraImageFilter } from '@/lib/era-visual-style';

interface EquipmentDetailDialogProps {
  item: EquipmentItem | null;
  onClose: () => void;
  era?: string;
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
}: EquipmentDetailDialogProps) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center bg-black/75 backdrop-blur-sm py-6 md:py-8 px-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="deco-corners flex flex-col bg-[#16130f] border border-brass/40 w-full max-w-lg h-fit p-6 relative"
      >
        {/* Narożniki Deco */}
        <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/60 pointer-events-none" />
        <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brass/60 pointer-events-none" />
        <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brass/60 pointer-events-none" />
        <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/60 pointer-events-none" />

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
          !item.description && (
            <p className="font-serif italic text-sm text-muted-foreground/70">
              Przedmiot fabularny - bez dodatkowej mechaniki.
            </p>
          )}
      </div>
    </div>
  );
}
