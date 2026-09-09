'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Footprints, ShieldAlert, Swords, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CombatDefenseWeaponOption } from '@/lib/combat/weapon-context';
import { resolveOutnumberedBonus } from '@/lib/combat/combat-resolver';

export interface CombatDefenseDialogProps {
  attackerName: string;
  attackerWeapon?: string;
  intent?: string;
  targetName?: string;
  dodgeSkill: number;
  weapons: CombatDefenseWeaponOption[];
  defensesUsedThisRound?: number;
  queuePosition?: number;
  queueTotal?: number;
  onSelectDefense: (
    choice: 'dodge' | 'fight_back',
    weapon?: CombatDefenseWeaponOption
  ) => void;
  disabled?: boolean;
}

export function CombatDefenseDialog({
  attackerName,
  attackerWeapon,
  intent,
  targetName,
  dodgeSkill,
  weapons,
  defensesUsedThisRound = 0,
  queuePosition = 1,
  queueTotal = 1,
  onSelectDefense,
  disabled = false,
}: CombatDefenseDialogProps) {
  const t = useTranslations('CombatDefense');
  const [selectedWeaponId, setSelectedWeaponId] = useState(weapons[0]?.id ?? '');
  const outnumbered = resolveOutnumberedBonus(defensesUsedThisRound);
  const selectedWeapon =
    weapons.find((weapon) => weapon.id === selectedWeaponId) ?? weapons[0];

  return (
    <Card className="overflow-hidden border-brass/40 bg-card/95 text-foreground shadow-deco">
      <CardHeader className="border-b border-brass/20 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-brass" />
            <CardTitle className="font-display text-base uppercase tracking-wider text-brass">
              {t('title')}
            </CardTitle>
          </div>
          <Badge className="border-brass/40 bg-brass/20 font-mono text-brass">
            {t('attackQueue', { current: queuePosition, total: queueTotal })}
          </Badge>
        </div>
        <p className="mt-1 font-serif text-sm text-muted-foreground">
          {attackerWeapon
            ? t('incomingAttackWithWeapon', { attacker: attackerName, weapon: attackerWeapon })
            : t('incomingAttackUnarmed', { attacker: attackerName })}
        </p>
        {intent && <p className="font-serif text-sm italic">{intent}</p>}
        {targetName && (
          <p className="text-xs text-muted-foreground">
            {t('targetLabel', { target: targetName })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {outnumbered.isOutnumbered && (
          <div className="flex items-start gap-2 rounded border border-brass/40 p-3 text-xs">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
            <span>{t('outnumberedWarningDesc')}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectDefense('dodge')}
            className="rounded-md border border-border bg-card/60 p-4 text-left transition-colors hover:border-brass/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:opacity-50"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 font-display font-semibold">
                <Footprints className="h-4 w-4 text-primary" />
                {t('actionDodge')}
              </span>
              <strong className="font-mono text-primary">{dodgeSkill}%</strong>
            </div>
            <p className="font-serif text-xs text-muted-foreground">{t('dodgeDescription')}</p>
          </button>

          <div className="rounded-md border border-border bg-card/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 font-display font-semibold">
                <Swords className="h-4 w-4 text-destructive" />
                {t('actionFightBack')}
              </span>
              <strong className="font-mono text-destructive">{selectedWeapon?.skillValue ?? 0}%</strong>
            </div>
            <p className="mb-3 font-serif text-xs text-muted-foreground">{t('fightBackDescription')}</p>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="combat-defense-weapon">
              {t('weaponLabel')}
            </label>
            <select
              id="combat-defense-weapon"
              value={selectedWeaponId}
              onChange={(event) => setSelectedWeaponId(event.target.value)}
              className="mb-3 w-full rounded border border-border bg-background px-2 py-2 text-sm"
              disabled={disabled || weapons.length === 0}
            >
              {weapons.map((weapon) => (
                <option key={weapon.id} value={weapon.id}>
                  {weapon.id === 'unarmed' ? t('unarmed') : weapon.name} - {weapon.damageFormula}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={disabled || !selectedWeapon}
              onClick={() => onSelectDefense('fight_back', selectedWeapon)}
              className="w-full rounded border border-destructive/60 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
            >
              {t('confirmFightBack')}
            </button>
          </div>
        </div>

        <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          {t('rulebookTieReminder')}
        </p>
      </CardContent>
    </Card>
  );
}
