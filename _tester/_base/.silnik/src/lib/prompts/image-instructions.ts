import { AISettings } from '../ai-settings/types';

/**
 * OPT-03: Shared image instructions builder - single source of truth.
 * Eliminates duplicate ~400-token block between getGameMasterPrompt()
 * and getOptimizedGameMasterPrompt().
 *
 * IND-91: rename replicateEnabled → imageGenerationEnabled (provider-agnostic flag).
 *
 * IND-259: częstotliwość ilustracji wpięta w tryb narracji + suwak (płynność
 * narracji ma priorytet - koniec "obraz co turę"). Tryb ustala bazowy poziom,
 * suwak imageFrequency przesuwa go o ±1. Ten sam resolver steruje throttle'em
 * w useChat (constants/chat.imageCooldownMsForLevel).
 */

/**
 * Wylicza efektywny poziom częstotliwości obrazów (0-3) z trybu narracji i suwaka.
 *   base: pure_narrative=0, story_priority=1, full_rpg=2
 *   shift: rare=-1, normal=0, often=+1
 * Pure function - testowalna i współdzielona z throttle'em w useChat.
 */
export function resolveImageLevel(
  narrativeMode: string | undefined,
  imageFrequency: string | undefined
): number {
  const base =
    narrativeMode === 'pure_narrative'
      ? 0
      : narrativeMode === 'story_priority'
        ? 1
        : 2; // full_rpg (default)
  const shift =
    imageFrequency === 'rare' ? -1 : imageFrequency === 'often' ? 1 : 0;
  return Math.max(0, Math.min(3, base + shift));
}

export function buildImageInstructions(settings: AISettings): string {
  if (!settings.imageGenerationEnabled) {
    return '';
  }

  const narrativeMode = settings.sessionZero?.narrativeMode || 'full_rpg';
  const imageFrequency = settings.replicateSettings?.imageFrequency || 'normal';
  const level = resolveImageLevel(narrativeMode, imageFrequency);
  const maxImages = settings.replicateSettings?.maxImagesPerMessage || 1;

  // 3 tiery promptu z poziomu 0-3 (0-1 = minimalnie, 2 = umiarkowanie, 3 = często).
  const tier = level <= 1 ? 'minimal' : level === 2 ? 'moderate' : 'frequent';
  const priorityLabel =
    tier === 'minimal'
      ? 'NISKI'
      : tier === 'moderate'
        ? 'UMIARKOWANY'
        : 'WYSOKI';

  // Wspólny blok formatu (jak emitować tag).
  const formatBlock = `
### JAK GENEROWAĆ:
Użyj tagu w tekście odpowiedzi: [ILUSTRACJA: szczegółowy opis w języku ANGIELSKIM]
Przykład: [ILUSTRACJA: dimly lit 1920s private study, mahogany desk with scattered papers, rain streaking the window, realistic period photograph, cinematic film-grain, moody natural light]

ZASADY SPÓJNOŚCI WIZUALNEJ (VISUAL CONSISTENCY):
1. POSTACIE (NPC): Gdy ilustrujesz scenę z udziałem aktywnego NPC (z listy ## AKTYWNE POSTACIE (NPC)), musisz utrzymać jego tożsamość wizualną. ZAWSZE uwzględniaj w opisie ilustracji jego dokładne cechy fizyczne (wiek, płeć, kolor i styl włosów, ubiór, znaki szczególne) podane w jego profilu. NIGDY nie podawaj samego imienia.
2. LOKACJE (LOCATIONS): Gdy generujesz kolejny obraz tej samej lokacji (np. pokoju, domu, ulicy), utrzymaj te same elementy architektoniczne (np. kształt okien, styl tapety, stałe meble jak kominek, zegar czy pianino). Zmiany mogą dotyczyć tylko oświetlenia, kąta kamery lub drobnych interakcji (np. przewrócone krzesło).
3. POGODA I ATMOSFERA (WEATHER): Uwzględniaj w opisie aktualne warunki atmosferyczne (np. deszczowe mokre bruki, gęstą mgłę, burzowe niebo, zamieć) podane w sekcji **Aktualna Pogoda & Warunki**, aby obraz zachował pełną spójność z narracją.
4. PRZEDMIOTY (ITEMS): Znalezione artefakty, klucze, księgi czy dowody muszą wyglądać tak samo przy każdym zbliżeniu. Opisuj je za pomocą tych samych cech fizycznych (np. "iron key with a skull-shaped bow", "leather-bound journal with brass clasps").
5. POTWORY I ISTOTY (MONSTERS & BEASTS): Kiedy na ilustracji pojawia się istota Mythos, trzymaj się raz określonej anatomii (faktura skóry, liczba oczu/kończyn, sposób poruszania się, kolorystyka).

ZASADY (STRICT): maksymalnie ${maxImages} ilustracja(e) na odpowiedź • opis ZAWSZE po ANGIELSKU • era lat 20. XX wieku (absolutny zakaz anachronizmów) • styl DOMYŚLNIE realistyczny: świat rzeczywisty lat 20. (fotografia z epoki, film-grain, naturalne światło, noir). Elementy Mythos / macki / nadprzyrodzone wprowadzaj do opisu TYLKO na mocne momenty grozy - NIE rutynowo. Gracz może też jawnie poprosić komendą [obraz]/[ilustracja].`;

  if (tier === 'minimal') {
    return `

## GENEROWANIE ILUSTRACJI (PRIORYTET: ${priorityLabel})
Płynność narracji ma ABSOLUTNY priorytet. Generuj ilustrację **bardzo rzadko** - tylko dla pojedynczych, przełomowych momentów całej sesji (pierwsze ujrzenie kluczowej istoty Mythos, wielki wizualny zwrot grozy). W zdecydowanej większości tur NIE generuj żadnego obrazu. NIE ilustruj rutynowych przejść, rozmów ani drobnych odkryć. Pamiętaj o ZASADACH SPÓJNOŚCI WIZUALNEJ przy kluczowych NPC i lokacjach.${formatBlock}`;
  }

  if (tier === 'moderate') {
    return `

## GENEROWANIE ILUSTRACJI (PRIORYTET: ${priorityLabel})
Ilustruj **oszczędnie, tylko wyraźnie kluczowe sceny - NIE co turę**. Wygeneruj obraz, gdy następuje istotny moment:
- wejście do nowej, znaczącej lokacji (nie każdego pomieszczenia czy korytarza),
- pierwsze spotkanie ważnego NPC lub przerażającej istoty,
- dramatyczny moment akcji lub odkrycia budzący grozę.
Rutynowe przejścia, oględziny drobiazgów i zwykłe rozmowy zostaw BEZ obrazu - płynność opowieści jest ważniejsza niż liczba ilustracji. ZAWSZE stosuj ZASADY SPÓJNOŚCI WIZUALNEJ przy generowaniu ważnych lokacji, przedmiotów i NPC.${formatBlock}`;
  }

  // frequent (level 3)
  let instructions = `

## GENEROWANIE ILUSTRACJI (PRIORYTET: ${priorityLabel})
Wizualizuj najważniejsze momenty sesji. Generuj obraz, gdy:
- gracz dociera do nowej, istotnej lokacji,
- pojawia się nowy ważny NPC lub przerażająca istota,
- ma miejsce dramatyczna scena akcji lub moment grozy.
Mimo to NIE ilustruj każdej drobnej czynności ani rutynowego przejścia - trzymaj się momentów o realnym znaczeniu. Pamiętaj o bezwzględnym stosowaniu ZASAD SPÓJNOŚCI WIZUALNEJ.${formatBlock}`;

  if (settings.replicateSettings?.autoGenerateNPCs ?? true)
    instructions += `\n- Priorytetowo ilustruj nowo poznanych, ważnych NPC, precyzyjnie opisując ich wygląd fizyczny z profilu.`;
  if (settings.replicateSettings?.autoGenerateLocations ?? true)
    instructions += `\n- Priorytetowo ilustruj nowe, istotne lokacje, gdy gracz do nich dociera.`;

  return instructions;
}
