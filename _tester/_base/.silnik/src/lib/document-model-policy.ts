/**
 * User policy: copyrighted source documents must not reach any model, including
 * local or remote embedding models. Existing files and indexes have no audited
 * rights provenance, so the whole document-to-model channel fails closed.
 * This is deliberately not configurable through a request, API key or env var.
 * Campaign event memory is separate and is not disabled by this policy.
 */
export function isDocumentModelUseBlocked(): boolean {
  return true;
}

export const DOCUMENT_MODEL_USE_BLOCKED = 'DOCUMENT_MODEL_USE_BLOCKED';

export function assertDocumentModelUseAllowed(): void {
  if (isDocumentModelUseBlocked()) throw new Error(DOCUMENT_MODEL_USE_BLOCKED);
}

export function documentPolicyError(locale: string = 'pl') {
  return {
    success: false,
    code: DOCUMENT_MODEL_USE_BLOCKED,
    error: locale.toLowerCase().startsWith('en')
      ? 'Documents are not sent to AI. Permission to use their contents has not been verified. Game memory remains available.'
      : 'Dokumenty nie są wysyłane do AI. Nie potwierdzono prawa do użycia ich treści. Pamięć rozgrywki pozostaje dostępna.',
  };
}
