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

export interface SheetEquipmentProps {
  character: Character;
}

/**
 * Miniatura przedmiotu (B2): pokazuje obraz `item.imageUrl` gdy istnieje
 * (generowany w tle przez useEquipmentThumbnails IND-271 lub ręcznie w
 * EquipmentModal), w przeciwnym razie déco-placeholder. Read-only - panel karty
 * nie generuje obrazów (to robi modal/hook), tu tylko prezentacja.
 */
function ItemThumbnail({ item }: { item: EquipmentItem }) {
  return (
    <div className="flex-none w-9 h-9 border border-brass/20 bg-black/30 overflow-hidden flex items-center justify-center">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-brass/40 text-sm">✦</span>
      )}
    </div>
  );
}

/**
 * Renderuje ekwipunek postaci: broń z pełną statystyką bojową + resztę jako kafle.
 * Zwraca null gdy postać nie ma ekwipunku (sekcja znika z karty).
 */
export function SheetEquipment({ character }: SheetEquipmentProps) {
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
                  className="border border-[#b3322c]/28 bg-[#16130f] p-3"
                >
                  <div className="flex justify-between items-center gap-2 mb-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <ItemThumbnail item={w} />
                      <span className="font-serif text-base text-foreground truncate">
                        {w.name}
                      </span>
                    </span>
                    <span className="flex-none font-special-elite text-[14px] text-[#d9685f]">
                      {skill}{' '}
                      <span className="font-bold">
                        {skillVal !== null ? `${skillVal}%` : 'baza'}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-special-elite text-[13px] text-muted-foreground tracking-[0.06em]">
                    <span>⚔️ Obrażenia: {damageStr}</span>
                    {w.modifiers?.range && (
                      <span>🎯 Zasięg: {w.modifiers.range}</span>
                    )}
                    {w.modifiers?.malfunction && (
                      <span>⚙️ Zacięcie: {w.modifiers.malfunction}</span>
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
                className="flex items-center gap-3 border border-brass/20 bg-[#16130f] p-3"
              >
                <ItemThumbnail item={item} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-serif text-base text-foreground truncate">
                      {item.name}
                    </span>
                    {item.modifiers?.skill && item.modifiers?.bonus && (
                      <span className="flex-none font-special-elite text-[13px] text-primary">
                        {item.modifiers.skill} +{item.modifiers.bonus}%
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <div className="font-special-elite text-[13px] text-muted-foreground tracking-[0.06em] line-clamp-1 mt-1">
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
