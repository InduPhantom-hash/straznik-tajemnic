import type { EraException, ResolvedEraContext } from './types';

export interface EraAvailabilitySubject {
  name: string;
  description?: string;
}

export interface EraAvailabilityResult {
  allowed: boolean;
  reason?: string;
  matchedRuleId?: string;
  exceptionApplied?: EraException['type'];
}

interface RestrictedTechnologyRule {
  id: string;
  pattern: RegExp;
  validFrom: number;
  label: string;
}

const RESTRICTED_TECHNOLOGY: RestrictedTechnologyRule[] = [
  {
    id: 'technology.smartphone',
    pattern: /\b(smartfon\w*|smartphone\w*|iphone\w*|android\w*)\b/i,
    validFrom: 2007,
    label: 'smartfon',
  },
  {
    id: 'technology.powerbank',
    pattern: /\b(powerbank\w*|power\s*bank\w*)\b/i,
    validFrom: 2010,
    label: 'powerbank',
  },
  {
    id: 'technology.tablet',
    pattern: /\b(tablet\w*|ipad\w*)\b/i,
    validFrom: 2010,
    label: 'tablet',
  },
];

function appliesException(
  exception: EraException | undefined,
  year: number
): exception is EraException {
  return Boolean(
    exception?.scenarioId.trim() &&
    exception.reason.trim() &&
    year >= exception.validFrom &&
    year <= exception.validTo
  );
}

export function validateEraAvailability(
  subject: EraAvailabilitySubject,
  context: ResolvedEraContext,
  exception?: EraException
): EraAvailabilityResult {
  const text = `${subject.name} ${subject.description ?? ''}`;
  const blockedRule = RESTRICTED_TECHNOLOGY.find(
    (rule) => rule.pattern.test(text) && context.effectiveYear < rule.validFrom
  );

  if (!blockedRule) return { allowed: true };

  if (appliesException(exception, context.effectiveYear)) {
    return {
      allowed: true,
      matchedRuleId: blockedRule.id,
      exceptionApplied: exception.type,
    };
  }

  return {
    allowed: false,
    matchedRuleId: blockedRule.id,
    reason: `${blockedRule.label} nie jest dostępny w roku ${context.effectiveYear}`,
  };
}

export function assertEraAvailability(
  subject: EraAvailabilitySubject,
  context: ResolvedEraContext,
  exception?: EraException
): void {
  const result = validateEraAvailability(subject, context, exception);
  if (!result.allowed) {
    throw new Error(result.reason ?? 'Element jest niedostępny w tej epoce');
  }
}
