import { getEraHardGuardrails } from './baseline';
import type { GameTime } from '@/lib/types';
import { getEraTechnologyGuardrails } from '@/lib/era-visual-style';
import { findEraRuleProfiles } from './registry';
import { resolveEraContext } from './resolve-era-context';
import type {
  EraAdventureInput,
  EraCustomProfile,
  EraUserSelection,
  ResolveEraContextInput,
  ResolvedEraContext,
} from './types';

export interface ResolveGameEraContextInput {
  gameTime?: Pick<GameTime, 'year' | 'month' | 'day'> | null;
  adventure?: EraAdventureInput | null;
  userSelection?: EraUserSelection | null;
  customProfile?: EraCustomProfile | null;
}

export function resolveGameEraContext({
  gameTime,
  adventure,
  userSelection,
  customProfile,
}: ResolveGameEraContextInput): ResolvedEraContext {
  const sceneDate: ResolveEraContextInput['sceneDate'] = gameTime
    ? {
        year: gameTime.year,
        month: gameTime.month + 1,
        day: gameTime.day,
      }
    : null;

  return resolveEraContext({
    sceneDate,
    adventure,
    userSelection,
    customProfile,
  });
}

export function isResolvedEraContext(
  value: unknown
): value is ResolvedEraContext {
  if (!value || typeof value !== 'object') return false;
  const context = value as Partial<ResolvedEraContext>;
  return (
    context.schemaVersion === 1 &&
    Number.isInteger(context.effectiveYear) &&
    typeof context.countryCode === 'string' &&
    ['PL', 'US', 'GB', 'GLOBAL'].includes(context.regionProfile ?? '') &&
    [
      'scene-time',
      'scenario-range',
      'user-selection',
      'custom-profile',
    ].includes(context.source ?? '') &&
    typeof context.rulesVersion === 'string'
  );
}

export function requireResolvedEraContext(value: unknown): ResolvedEraContext {
  if (!isResolvedEraContext(value)) {
    throw new Error('Brak poprawnego ResolvedEraContext');
  }
  return value;
}

export function buildEraNarrativeRules(context: ResolvedEraContext): string {
  const approvedProfiles = findEraRuleProfiles(
    context.effectiveYear,
    context.regionProfile
  ).filter((profile) => profile.approvalStatus === 'approved');

  const approvedDetails = approvedProfiles.flatMap((profile) => [
    ...profile.technology,
    ...profile.communication,
    ...profile.transport,
    ...profile.institutionsAndLanguage,
  ]);

  const guardrails = getEraHardGuardrails(
    context.effectiveYear,
    context.countryCode || context.regionProfile
  );

  const guardrailLines: string[] = [];
  if (guardrails) {
    if (guardrails.forbiddenTech.length > 0) {
      guardrailLines.push(
        `KATEGORYCZNY ZAKAZ TECHNOLOGICZNY (anachronizmy): ${guardrails.forbiddenTech.slice(0, 10).join(', ')}.`
      );
    }
    if (guardrails.forbiddenInstitutions.length > 0) {
      guardrailLines.push(
        `ZAKAZANE INSTYTUCJE I NUMERY: ${guardrails.forbiddenInstitutions.join(', ')}.`
      );
    }
    if (guardrails.forbiddenForensics.length > 0) {
      guardrailLines.push(
        `ZAKAZANA KRYMINALISTYKA: ${guardrails.forbiddenForensics.join(', ')}.`
      );
    }
  }

  return [
    `**KANONICZNY KONTEKST EPOKI:** rok ${context.effectiveYear}, kraj ${context.countryCode}, profil regionalny ${context.regionProfile}.`,
    'Rok jest nadrzędny wobec etykiet classic, modern, prl i eraLabel.',
    'Nie wprowadzaj technologii, instytucji, pojazdów ani mediów późniejszych niż aktualny rok sceny.',
    context.regionProfile === 'GLOBAL'
      ? 'Brak zatwierdzonej nakładki regionalnej: używaj wyłącznie neutralnych realiów i nie wymyślaj lokalnych marek ani instytucji.'
      : `Stosuj realia regionu ${context.regionProfile}; nie zastępuj ich rekwizytami z innego kraju.`,
    getEraTechnologyGuardrails(context),
    ...guardrailLines,
    approvedDetails.length > 0
      ? `Zatwierdzone reguły: ${approvedDetails.join('; ')}.`
      : 'Brak zatwierdzonego profilu szczegółowego: trzymaj się powyższych ograniczeń i opisuj tylko realia potrzebne w bieżącej scenie.',
  ].join('\n');
}

export function formatEraForPrompt(context: ResolvedEraContext): string {
  return `${context.effectiveYear}, ${context.countryCode}, profil ${context.regionProfile}`;
}

export function formatEraCurrency(
  amount: number,
  context: ResolvedEraContext
): string {
  const formatted = amount.toLocaleString(
    context.regionProfile === 'PL' ? 'pl-PL' : 'en-US',
    { maximumFractionDigits: amount < 1 ? 2 : 0 }
  );
  if (context.regionProfile === 'PL') return `${formatted} zł`;
  if (context.regionProfile === 'US') return `$${formatted}`;
  if (context.regionProfile === 'GB') return `£${formatted}`;
  return `${formatted} jednostek wartości`;
}

export function getEraHandoutDefaults(
  context: ResolvedEraContext,
  location = ''
): { date: string; location: string; newspapers: string[] } {
  const newspapers =
    context.regionProfile === 'PL'
      ? ['Gazeta lokalna', 'Dziennik regionalny']
      : context.regionProfile === 'US'
        ? ['Local Daily', 'Regional Gazette']
        : context.regionProfile === 'GB'
          ? ['Local Chronicle', 'Regional Gazette']
          : ['Gazeta lokalna'];
  return {
    date: `17 października ${context.effectiveYear}`,
    location,
    newspapers,
  };
}
