import { getEraHardGuardrails } from './baseline';
import type { GameTime } from '@/lib/types';
import { getEraTechnologyGuardrails } from '@/lib/era-visual-style';
import { findEraManifest } from './manifests';
import { findEraRuleProfiles } from './registry';
import { resolveEraContext } from './resolve-era-context';
import type {
  EraAdventureInput,
  EraCustomProfile,
  EraUserSelection,
  MeasurementSystem,
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

  const approvedManifest = findEraManifest(
    context.effectiveYear,
    context.countryCode,
    context.regionProfile
  );

  const manifestDetails: string[] = [];
  if (approvedManifest && approvedManifest.approvalStatus === 'approved') {
    if (approvedManifest.economicBackground.length > 0) {
      manifestDetails.push(`Ekonomia i waluta: ${approvedManifest.economicBackground.slice(0, 2).join(' ')}`);
    }
    if (approvedManifest.socialAndClassStructure.length > 0) {
      manifestDetails.push(`Społeczeństwo: ${approvedManifest.socialAndClassStructure.slice(0, 2).join(' ')}`);
    }
    if (approvedManifest.law.length > 0) {
      manifestDetails.push(`Prawo i służby: ${approvedManifest.law.slice(0, 2).join(' ')}`);
    }
    if (approvedManifest.periodKnowledgeAndLimits.length > 0) {
      manifestDetails.push(`Kryminalistyka i wiedza epoki: ${approvedManifest.periodKnowledgeAndLimits.join(' ')}`);
    }
    if (approvedManifest.presentismRisks.length > 0) {
      manifestDetails.push(`Zasada anty-prezentyzmu: ${approvedManifest.presentismRisks.join(' ')}`);
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
    ...manifestDetails,
    approvedDetails.length > 0
      ? `Zatwierdzone reguły: ${approvedDetails.join('; ')}.`
      : 'Brak zatwierdzonego profilu szczegółowego: trzymaj się powyższych ograniczeń i opisuj tylko realia potrzebne w bieżącej scenie.',
  ].join('\n');
}

export function formatEraForPrompt(context: ResolvedEraContext): string {
  return `${context.effectiveYear}, ${context.countryCode}, profil ${context.regionProfile}`;
}

export interface FormatEraCurrencyOptions {
  convertPpp?: boolean;
}

export function formatEraCurrency(
  amount: number,
  context: ResolvedEraContext,
  options: FormatEraCurrencyOptions = {}
): string {
  const { convertPpp = true } = options;
  const isSmallBaseAmount = amount > 0 && amount <= 500;

  if (context.regionProfile === 'PL') {
    const year = context.effectiveYear;
    // Okres PRL oraz transformacji przed denominacją 1995 r. (PLZ: stare złote - tysiące/miliony)
    if (year >= 1950 && year < 1995) {
      // Jeśli podana kwota to mała liczba (skala bazowa CoC 7e), przeliczamy na rząd wielkości cen PRL/transformacji
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
      const displayAmount =
        convertPpp && isSmallBaseAmount ? amount * 50 : amount;
      const formatted = displayAmount.toLocaleString('pl-PL', {
        maximumFractionDigits: displayAmount < 1 ? 2 : 0,
      });
      return `${formatted} zł`;
    }
    // Okres II Rzeczypospolitej (reforma Grabskiego 1924 r. i lata międzywojenne) oraz wcześniejszy
    // 1 USD (1920s) = ~5.18 zł w II RP
    const displayAmount =
      convertPpp && isSmallBaseAmount ? Math.round(amount * 5.18) : amount;
    const formatted = displayAmount.toLocaleString('pl-PL', {
      maximumFractionDigits: displayAmount < 1 ? 2 : 0,
    });
    return `${formatted} zł`;
  }

  if (context.regionProfile === 'GB') {
    // Wiktoriańska Anglia (Gaslight 1890s) / Wielka Brytania: 1 GBP (£) = ~5 USD (1920s)
    const gbpAmount =
      convertPpp && isSmallBaseAmount ? amount / 5 : amount;
    if (gbpAmount < 1 && gbpAmount > 0) {
      const shillings = Math.round(gbpAmount * 20);
      return `${shillings}s`;
    }
    const formatted = Math.round(gbpAmount).toLocaleString('en-GB');
    return `£${formatted}`;
  }

  if (context.regionProfile === 'US') {
    const year = context.effectiveYear;
    if (year >= 1990 && convertPpp && isSmallBaseAmount) {
      const displayAmount = amount * 15;
      const formatted = displayAmount.toLocaleString('en-US', {
        maximumFractionDigits: 0,
      });
      return `$${formatted}`;
    }
    const formatted = amount.toLocaleString('en-US', {
      maximumFractionDigits: amount < 1 ? 2 : 0,
    });
    return `$${formatted}`;
  }

  const formatted = amount.toLocaleString('en-US', {
    maximumFractionDigits: amount < 1 ? 2 : 0,
  });
  return `${formatted} jednostek wartości`;
}

export function formatWeaponRange(
  range: string | undefined | null,
  measurementSystem: MeasurementSystem = 'metric',
  locale: 'pl' | 'en' = 'pl'
): string {
  if (!range) return '';
  let formatted = range.trim();

  if (measurementSystem === 'metric') {
    formatted = formatted.replace(
      /(\d+(?:\/\d+)*)\s*(?:yards|yardów|jardów|jard)\b/gi,
      '$1 m'
    );
  } else {
    if (locale === 'pl') {
      formatted = formatted.replace(
        /(\d+(?:\/\d+)*)\s*(?:yards|yardów|jardów|jard)\b/gi,
        '$1 jardów'
      );
      formatted = formatted.replace(
        /(\d+(?:\/\d+)*)\s*(?:m|metrów|metry|metra)\b/gi,
        '$1 jardów'
      );
    } else {
      formatted = formatted.replace(
        /(\d+(?:\/\d+)*)\s*(?:yards|yardów|jardów|jard)\b/gi,
        '$1 yards'
      );
      formatted = formatted.replace(
        /(\d+(?:\/\d+)*)\s*(?:m|metrów|metry|metra)\b/gi,
        '$1 yards'
      );
    }
  }

  if (locale === 'pl') {
    formatted = formatted
      .replace(/\btouch\b/gi, 'dotyk')
      .replace(/\bpoint blank\b/gi, 'przyłożenie')
      .replace(/\bor up to\b/gi, 'lub do');
  } else {
    formatted = formatted
      .replace(/\bdotyk\b/gi, 'touch')
      .replace(/\bprzyłożenie\b/gi, 'point blank')
      .replace(/\blub do\b/gi, 'or up to');
  }

  return formatted;
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
