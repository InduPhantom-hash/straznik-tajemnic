/**
 * Walidacja pochodzenia (Origin) żądań dla wrażliwych endpointów desktopowych (Auto-Update, Zimny Start).
 *
 * Zabezpiecza przed atakami CSRF z zewnętrznych stron (np. złośliwa strona webowa wysyłająca fetch do 127.0.0.1:4050).
 * Jednocześnie poprawnie obsługuje naturalną tożsamość pętli zwrotnej (loopback):
 * gdy przeglądarka łączy się przez http://127.0.0.1:PORT, a Next.js normalizuje URL żądania do http://localhost:PORT.
 */
export function isSameOriginOrLoopback(
  originHeader: string | null | undefined,
  requestUrl: string
): boolean {
  if (!originHeader) return false;

  try {
    const originUrl = new URL(originHeader);
    const targetUrl = new URL(requestUrl);

    // 1. Bezpośrednia tożsamość origin
    if (originUrl.origin === targetUrl.origin) {
      return true;
    }

    // 2. Ścisła zgodność protokołu (np. http vs http)
    if (originUrl.protocol !== targetUrl.protocol) {
      return false;
    }

    // 3. Ścisła zgodność numeru portu
    const originPort = originUrl.port || (originUrl.protocol === 'https:' ? '443' : '80');
    const targetPort = targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80');
    if (originPort !== targetPort) {
      return false;
    }

    // 4. Obie strony muszą być adresem pętli zwrotnej (loopback)
    const isLoopbackHost = (host: string) => {
      const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');
      return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
    };

    return isLoopbackHost(originUrl.hostname) && isLoopbackHost(targetUrl.hostname);
  } catch {
    return false;
  }
}
