/**
 * Session Recap - recap przy wznowieniu przerwanej kampanii.
 *
 * Apka zapisuje stan gry, ale przy wczytaniu zapisu nie generuje narracyjnego
 * "poprzednio w...". Ta funkcja wstrzykuje do kontekstu instrukcję, by MG sam
 * wygenerował recap w pierwszej turze po wznowieniu - wg wzorca z korpusu
 * actual-play: kotwica czasowo-fabularna + recap przez postać-proxy.
 *
 * Recap jest PROMPT-SIDE (bez osobnego wywołania LLM) - MG dostaje instrukcję
 * i robi recap w ramach normalnej odpowiedzi. Treść JAK robić recap jest w
 * promptcie narracyjnym (CZĘŚĆ XV); tu dajemy tylko TRIGGER "zrób to teraz".
 *
 * @module session-recap
 */

/**
 * Wznowienie = gra startuje (isGameStart) i istnieje historia rozmowy (messageCount > 0).
 * Świeża kampania też ma isGameStart, ale nie ma jeszcze historii - wtedy recap nie ma sensu.
 */
export function isSessionResume(
  isGameStart: boolean | undefined,
  messageCount: number
): boolean {
  return Boolean(isGameStart) && messageCount > 0;
}

/**
 * Instrukcja recapu do wstrzyknięcia w additionalContext przy wznowieniu gry.
 */
export function buildSessionRecapInstruction(): string {
  return `\n## WZNOWIENIE SESJI (RECAP)
To pierwsza tura po wczytaniu zapisanej gry. ZANIM ruszysz nową scenę, wygeneruj RECAP zgodnie z CZĘŚCIĄ XV (STRUKTURA SESJI - "Kolejne Sesje / Wznowienie"):
- otwórz kotwicą czasowo-fabularną: data, dzień sprawy oraz jawnie przypomniana stawka (co goni graczy, co stracą, jeśli zwlekają),
- jeśli pasuje, użyj recapu PRZEZ POSTAĆ-PROXY: wprowadź postać, której "nie było" (sojusznik, wracający BN, świadek), tak by gracze sami streścili wydarzenia w fikcji - recap pada ich ustami, nie Twoim wykładem,
- opcjonalnie dorzuć handout (list, wycinek z gazety, notatka) konsolidujący wiedzę.
Oprzyj recap WYŁĄCZNIE na dotychczasowej historii rozmowy i [RAG_CONTEXT] - nie wymyślaj nowych faktów. Po recapie zakotwicz scenę (pora, miejsce) i zakończ markerem [Co robisz?].`;
}
