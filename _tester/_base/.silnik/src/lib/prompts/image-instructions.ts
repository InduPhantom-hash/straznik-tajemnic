import { AISettings } from '../ai-settings/types';
import { isPureTextMode } from '../api-keys-service';

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

export function buildImageInstructions(
  settings: AISettings,
  pureTextOverride?: boolean
): string {
  const isPureText =
    pureTextOverride ??
    settings.pureTextMode ??
    (typeof window !== 'undefined' ? isPureTextMode() : false);

  if (!settings.imageGenerationEnabled || isPureText) {
    return `

## TRYB NARRACJI: CZYSTA PROZA (TRYB TEKSTOWY)
Grasz w trybie czystego tekstu / literatury weird fiction (konto bez bilingu na multimedia).
ABSOLUTNY ZAKAZ generowania tagów multimedialnych: [LOKACJA:], [PORTRET:], [PRZEDMIOT:], [POTWÓR:], [ZJAWISKO:], [SCENA:], [ILUSTRACJA:], [SFX:].
Zamiast tego skup się na plastycznych, literackich opisach zmysłowych w prozie: faktury, zapachy, światłocień, dźwięki otoczenia, mroczna atmosfera epoki.
`;
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
### JAK GENEROWAĆ (DEDYKOWANE TAGI FABULARNE):
Użyj odpowiedniego, precyzyjnego tagu w tekście odpowiedzi (opis ZAWSZE w języku ANGIELSKIM):
- Dla pierwszego wejścia do nowej, znaczącej lokacji (establishing shot z oczu badacza - FPP): [LOKACJA: Polska Nazwa Lokacji | subjective first-person camera POV, detailed period-accurate exterior or interior description, archival noir photography, no protagonist in frame]
- Dla portretu nowo poznanej, ważnej postaci niezależnej (WYŁĄCZNIE NPC - NIGDY badacz gracza!): [PORTRET: Imię Postaci NPC | detailed period-accurate portrait photography, facial features, clothes]
- Dla kluczowego dowodu rzeczowego, księgi lub artefaktu: [PRZEDMIOT: Nazwa Przedmiotu | detailed archival object study, materials, inscriptions]
- Dla bezpośredniego ujrzenia istoty Mythos lub potwora: [POTWÓR: Nazwa Istoty, subjective first-person camera POV, horrific lovecraftian entity description, grotesque features, moody cinematic lighting]
- Dla snów, halucynacji, ataków szaleństwa lub anomalii nadprzyrodzonych: [ZJAWISKO: subjective first-person camera POV, surreal nightmare vision, impossible geometry, sanity loss phenomenon]
- Dla dynamicznych scen akcji, pościgów lub kulminacji (widok z oczu badacza - FPP): [SCENA: subjective first-person camera POV, dramatic action scene description in the chosen era, archival noir photography, no player character in frame]

Przykłady użycia: 
[LOKACJA: Biblioteka Uniwersytetu Miskatonic | subjective first-person camera POV, towering gothic bookshelves, dust motes dancing in shafts of pale sunlight, dark mahogany study tables, archival noir photography]
[PORTRET: Henry Armitage | distinguished elderly scholar with silver spectacles, tweed vest, weary sharp eyes, realistic vintage photograph]
[PRZEDMIOT: Fragment Necronomiconu | decaying parchment with blasphemous arabesque calligraphy, faded ink, leather binding]
[POTWÓR: Deep One, subjective first-person camera POV, grotesque amphibious humanoid crawling onto wet docks, bulging unblinking eyes, scaly glistening skin, stormy ocean backdrop]
[ZJAWISKO: subjective first-person camera POV, non-euclidean angles twisting the asylum corridor, shadows stretching in impossible directions, eerie greenish luminescence]
[SCENA: subjective first-person camera POV, desperate chase through narrow cobblestone alley in torrential rain, shadows cast by gas lamps, vintage sedan speeding away, archival noir photography]

ZASADY SPÓJNOŚCI WIZUALNEJ I REALIZMU (VISUAL CONSISTENCY & REALISM):
1. ŻELAZNA ZASADA FPP & NO-PLAYER-FACE (PURE SUBJECTIVE CAMERA POV - ARCHIVAL NOIR 1920s): Wszystkie ilustracje scen ([SCENA:], [LOKACJA:], [POTWÓR:], [ZJAWISKO:]) pokazują świat WYŁĄCZNIE z subiektywnej perspektywy oczu Badacza (czystego obiektywu kamery FPP - Pure Camera POV) lub jako nastrojowy plan otoczenia. ABSOLUTNY ZAKAZ umieszczania w kadrze twarzy, głowy, pleców, sylwetki ani nawet dłoni czy ramion Badacza gracza! Nigdy nie przepisuj cech wyglądu gracza z sekcji ## PROFIL WIZUALNY BADACZA do tagów obrazów (unikamy ujęć z trzeciej osoby TPP i over-the-shoulder). W kadrze widać wyłącznie świat, zagrożenie lub rozmówcę naprzeciwko nas.
2. ZAKAZ PORTRETÓW GRACZA ([PORTRET:] WYŁĄCZNIE DLA NPC): Tag [PORTRET:] jest zarezerwowany ŚCIŚLE i WYŁĄCZNIE dla napotkanych postaci niezależnych (NPC). NIGDY nie generuj tagu [PORTRET:] dla postaci gracza (Badacza). Gdy ilustrujesz postać NPC (z listy ## AKTYWNE POSTACIE (NPC)), ZAWSZE zachowaj jej stałą matrycę cech fizycznych (wiek, rysy twarzy, zarost, fryzura, okulary, charakterystyczne blizny, fason i materiał ubioru). Wizerunki NPC NIE MOGĄ się rozjeżdżać między scenami, a wygenerowany portret natychmiast definiuje oficjalny wygląd NPC w Dzienniku.
3. LOKACJE (LOCATIONS): Tag [LOKACJA: Polska Nazwa | English prompt] emituj TYLKO przy pierwszym wejściu do ważnego punktu orientacyjnego scenariusza. Polska nazwa przed kreską pionową | musi być zwięzła (2-4 słowa, np. 'Wylot Doliny Białego'), bez przecinków. Po kresce | umieść szczegółowy opis wizualny po angielsku w ujęciu FPP (bez badacza w kadrze). Kolejne sceny akcji w tym miejscu opisuj tagiem [SCENA:], aby ukazać aktualne wydarzenia z oczu badacza zamiast powtarzać ujęcie statyczne.
4. POGODA I ATMOSFERA (WEATHER): Uwzględniaj w opisie aktualne warunki atmosferyczne podane w sekcji **Aktualna Pogoda & Warunki**.
5. STYL I REALIZM EPOKI (SLOW BURN / ARCHIVAL NOIR 1920s): Ilustracje muszą być DOMYŚLNIE REALISTYCZNE i spójne z wybraną epoką przygody (Gaslight / Klasyczne lata 20. / PRL lata 70. / Lata 80. i 90. / Współczesność / Custom) w stylistyce archiwalnej fotografii noir (archival noir photography, authentic period film-grain, chiaroscuro lighting). Buduj grozę cieniem, oświetleniem, fakturami i architekturą. ABSOLUTNY ZAKAZ rutynowego wstawiania macek, gargulców i potworów w zwykłych scenach. Elementy nadprzyrodzone / mityczne wprowadzaj TYLKO w tagach [POTWÓR:] lub [ZJAWISKO:].
6. ŚCISŁY ZAKAZ ANACHRONIZMÓW: Opisy w tagach muszą bezwzględnie odpowiadać epoce gry (brak nowoczesnych smartfonów, powerbanków i ekranów dotykowych przed 2007 r.). Skupiaj się na głównym temacie sceny (architektura, atmosfera, śledztwo, kluczowy ślad lub postać NPC naprzeciwko badacza), a nie na losowych sprzętach codziennych, o ile nie biorą bezpośredniego udziału w akcji.
7. PRZEDMIOTY I POTWORY: Artefakty oraz ujawnione potwory opisuj wg raz ustalonej anatomii i wyglądu.
8. VISUAL BELIEF GRAPH & PROAKTYWNY REŻYSÉR SCENY (PROACTIVE T2I): W przełomowych momentach (wejście do nowej lokacji ze świadkiem, odkrycie kluczowego dowodu, objawienie istoty Mythos) możesz wyemitować do 1-3 zróżnicowanych tagów (np. [LOKACJA:] + [PORTRET:] + [PRZEDMIOT:] lub [POTWÓR:]), aby stworzyć wielokadrowy montaż sceny bez rozjeżdżania cech postaci NPC i lokacji.

ZASADY (STRICT): maksymalnie ${maxImages} ilustracja(e) na odpowiedź • opis ZAWSZE po ANGIELSKU • czysty kadr FPP (Pure Camera POV - zero twarzy i ciała gracza w kadrze, [PORTRET:] tylko dla NPC) • zgodność z epoką przygody • styl DOMYŚLNIE realistyczny (fotografia z epoki, archival noir, film-grain, naturalne światło). Gracz może też jawnie poprosić komendą [obraz] / [scena] / [portret] / [przedmiot].`;


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
