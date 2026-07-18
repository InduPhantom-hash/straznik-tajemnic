'use client';

/**
 * CharacterSheet - SheetEquipment komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Sekcja 7 EKWIPUNEK. Rozdziela:
 *   - ⚔️ BROŃ - pełna statystyka bojowa (umiejętność %, obrażenia, zasięg, zacięcie),
 *   - 🎒 WYPOSAŻENIE - pozostałe przedmioty jako kafle déco 2-kolumnowe.
 *
 * Klasyfikacja broni reużyta z weapon-context, wartość umiejętności bojowej z
 * resolveTestValue. RAW: brak wagi; broń biała dolicza DB postaci.
 */

import type { Character, EquipmentItem } from '@/lib/types';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import {
  isWeapon,
  inferWeaponSkill,
  isMeleeWeapon,
} from '@/lib/combat/weapon-context';
import {
  Package,
  Sword,
  Shield,
  Wrench,
  FileText,
  Sparkles,
  User,
  HeartPulse,
  Flame,
} from 'lucide-react';

/** Ikona kategorii przedmiotu (Lucide) - placeholder gdy brak wygenerowanego obrazu AI. */
function CategoryIcon({ category, className }: { category: string; className?: string }) {
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

export interface SheetEquipmentProps {
  character: Character;
  onItemClick?: (item: EquipmentItem) => void;
}

/**
 * Miniatura przedmiotu (B2): pokazuje obraz `item.imageUrl` gdy istnieje
 * (generowany w tle przez useEquipmentThumbnails IND-271 lub ręcznie w
 * EquipmentModal), w przeciwnym razie ikonę kategorii w stylu Art Déco. Read-only - panel karty
 * nie generuje obrazów (to robi modal/hook), tu tylko prezentacja.
 */
function ItemThumbnail({ item }: { item: EquipmentItem }) {
  return (
    <div className="flex-none w-20 h-20 border border-brass/30 bg-gradient-to-br from-[#1c1712] to-[#0f0b07] overflow-hidden flex items-center justify-center relative shadow-md rounded-sm transition-colors hover:border-brass/50">
      {item.imageUrl && !item.imageUrl.endsWith('.svg') ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-brass/70">
          <CategoryIcon category={item.category} className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}

/**
 * Renderuje ekwipunek postaci: broń z pełną statystyką bojową + resztę jako kafle.
 * Zwraca null gdy postać nie ma ekwipunku (sekcja znika z karty).
 */
export function SheetEquipment({ character, onItemClick }: SheetEquipmentProps) {
  const equipment = character.equipment ?? [];
  if (equipment.length === 0) return null;

  const weapons = equipment.filter(isWeapon);
  const gear = equipment.filter((item) => !isWeapon(item));

  const damageBonus = character.damageBonus?.trim();
  const hasDb =
    Boolean(damageBonus) && damageBonus !== '0' && damageBonus !== '-';

  return (
    <div>
      <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4">
        🎒 Ekwipunek
      </h3>

      {/* BROŃ - pełna statystyka bojowa CoC 7e */}
      {weapons.length > 0 && (
        <div className="mb-4">
          <h4 className="font-special-elite text-[14px] text-brass/70 uppercase tracking-[0.16em] mb-2">
            ⚔️ Broń
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {weapons.map((w) => {
              const skill = inferWeaponSkill(w);
              const skillVal = resolveTestValue(skill, character);
              const melee = isMeleeWeapon(w);
              const damage = w.modifiers?.damage ?? '-';
              const damageStr =
                melee && hasDb ? `${damage} ${damageBonus}` : damage;
              return (
                <div
                  key={w.id}
                  onClick={() => onItemClick?.(w)}
                  className="cursor-pointer border border-[#b3322c]/35 bg-[#181410] hover:bg-[#1f1a14]/60 p-4 rounded-sm flex flex-col justify-between hover:border-[#b3322c]/60 transition-all duration-200"
                >
                  <div className="flex justify-between items-start gap-3 mb-2.5">
                    <span className="flex items-center gap-3 min-w-0">
                      <ItemThumbnail item={w} />
                      <span className="font-serif text-lg text-foreground font-medium truncate leading-tight">
                        {w.name}
                      </span>
                    </span>
                    <span className="flex-none font-special-elite text-sm text-[#d9685f] bg-[#d9685f]/10 px-2 py-0.5 rounded border border-[#d9685f]/20">
                      {skill}{' '}
                      <span className="font-bold">
                        {skillVal !== null ? `${skillVal}%` : 'baza'}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-special-elite text-sm text-muted-foreground/90 tracking-[0.04em] pt-2 border-t border-[#b3322c]/15">
                    <span className="flex items-center gap-1">⚔️ Obrażenia: <strong className="text-foreground">{damageStr}</strong></span>
                    {w.modifiers?.range && (
                      <span className="flex items-center gap-1">🎯 Zasięg: <strong className="text-foreground">{w.modifiers.range}</strong></span>
                    )}
                    {w.modifiers?.malfunction && (
                      <span className="flex items-center gap-1">⚙️ Zacięcie: <strong className="text-foreground">{w.modifiers.malfunction}</strong></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WYPOSAŻENIE - pozostałe przedmioty (kafle déco) */}
      {gear.length > 0 && (
        <div>
          <h4 className="font-special-elite text-[14px] text-brass/70 uppercase tracking-[0.16em] mb-2">
            🎒 Wyposażenie
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {gear.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className="cursor-pointer flex items-center gap-4 border border-brass/25 bg-[#181410] hover:bg-[#1f1a14]/60 p-4 rounded-sm hover:border-brass/45 transition-all duration-200"
              >
                <ItemThumbnail item={item} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-serif text-lg text-foreground font-medium truncate leading-tight">
                      {item.name}
                    </span>
                    {item.modifiers?.skill && item.modifiers?.bonus && (
                      <span className="flex-none font-special-elite text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        {item.modifiers.skill} +{item.modifiers.bonus}%
                      </span>
                    )}
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
    </div>
  );
}
