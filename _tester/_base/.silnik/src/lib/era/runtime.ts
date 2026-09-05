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
  if (context.regionProfile === 'PL') {
    const year = context.effectiveYear;
    // Okres PRL oraz transformacji przed denominacją 1995 r. (PLZ: stare złote - tysiące/miliony)
    if (year >= 1950 && year < 1995) {
      // Jeśli podana kwota to np. mała liczba (skala nowozłotowa np. 10 zł), przeliczamy na rząd wielkości cen PRL/transformacji
      // W latach 70./80. i na początku 90. chleb lub gazeta kosztowały od dziesiątek do tysięcy/milionów złotych
      const isSmallBaseAmount = amount > 0 && amount <= 500;
      const displayAmount = isSmallBaseAmount
        ? (year >= 1989 ? amount * 10000 : amount * 100)
        : amount;
      const formatted = displayAmount.toLocaleString('pl-PL', {
        maximumFractionDigits: 0,
      });
      return `${formatted} zł (stare złote PLZ)`;
    }
    // Polska po denominacji 1 stycznia 1995 r. (PLN: nowe złote)
    if (year >= 1995) {
      const formatted = amount.toLocaleString('pl-PL', {
        maximumFractionDigits: amount < 1 ? 2 : 0,
      });
      return `${formatted} zł`;
    }
    // Okres II Rzeczypospolitej (reforma Grabskiego 1924 r. i lata międzywojenne) oraz wcześniejszy
    const formatted = amount.toLocaleString('pl-PL', {
      maximumFractionDigits: amount < 1 ? 2 : 0,
    });
    return `${formatted} zł`;
  }

  const formatted = amount.toLocaleString('en-US', {
    maximumFractionDigits: amount < 1 ? 2 : 0,
  });
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
