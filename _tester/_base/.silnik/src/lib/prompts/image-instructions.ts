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
### JAK GENEROWAĆ (DEDYKOWANE TAGI FABULARNE):
Użyj odpowiedniego, precyzyjnego tagu w tekście odpowiedzi (opis ZAWSZE w języku ANGIELSKIM):
- Dla pierwszego wejścia do nowej, znaczącej lokacji (establishing shot): [LOKACJA: Nazwa Lokacji, detailed period-accurate exterior or interior description]
- Dla portretu nowo poznanej, ważnej postaci (NPC): [PORTRET: Imię Postaci, detailed period-accurate portrait photography, facial features, clothes]
- Dla kluczowego dowodu rzeczowego, księgi lub artefaktu: [PRZEDMIOT: Nazwa Przedmiotu, detailed archival object study, materials, inscriptions]
- Dla bezpośredniego ujrzenia istoty Mythos lub potwora: [POTWÓR: Nazwa Istoty, horrific lovecraftian entity description, grotesque features, moody cinematic lighting]
- Dla snów, halucynacji, ataków szaleństwa lub anomalii nadprzyrodzonych: [ZJAWISKO: surreal nightmare vision, impossible geometry, sanity loss phenomenon]
- Dla dynamicznych scen akcji, pościgów lub kulminacji: [SCENA: dramatic action scene description in the chosen era]

Przykłady użycia: 
[LOKACJA: Miskatonic University Library, towering gothic bookshelves, dust motes dancing in shafts of pale sunlight, dark mahogany study tables]
[PORTRET: Professor Henry Armitage, distinguished elderly scholar with silver spectacles, tweed vest, weary sharp eyes, realistic vintage photograph]
[PRZEDMIOT: Necronomicon Fragment, decaying parchment with blasphemous arabesque calligraphy, faded ink, leather binding]
[POTWÓR: Deep One, grotesque amphibious humanoid crawling onto wet docks, bulging unblinking eyes, scaly glistening skin, stormy ocean backdrop]
[ZJAWISKO: non-euclidean angles twisting the asylum corridor, shadows stretching in impossible directions, eerie greenish luminescence]
[SCENA: desperate chase through narrow cobblestone alley in torrential rain, shadows cast by gas lamps, vintage sedan speeding away]

ZASADY SPÓJNOŚCI WIZUALNEJ I REALIZMU (VISUAL CONSISTENCY & REALISM):
1. BADACZ GRACZA (PLAYER CHARACTER): Gdy ilustrujesz scenę z udziałem Badacza, ZAWSZE uwzględniaj w opisie jego dokładny profil fizyczny (wiek, płeć, fryzurę, ubiór, znaki szczególne, okulary) z sekcji ## PROFIL WIZUALNY BADACZA, aby postać wyglądała spójnie na wszystkich ilustracjach.
2. POSTACIE (NPC - VISUAL DNA): Gdy ilustrujesz postać NPC (z listy ## AKTYWNE POSTACIE (NPC)), ZAWSZE zachowaj jej stałą matrycę cech fizycznych (wiek, rysy twarzy, zarost, fryzura, okulary, charakterystyczne blizny, fason i materiał ubioru). Wizerunki NIE MOGĄ się rozjeżdżać między scenami, a wygenerowany portret natychmiast definiuje oficjalny wygląd NPC w Dzienniku. Gracz musi od razu rozpoznać o kogo chodzi.
3. LOKACJE (LOCATIONS): Tag [LOKACJA:] emituj TYLKO przy pierwszym wejściu do ważnego punktu orientacyjnego scenariusza. Kolejne sceny akcji w tym miejscu opisuj tagiem [SCENA:], aby ukazać aktualne wydarzenia zamiast powtarzać ujęcie statyczne.
4. POGODA I ATMOSFERA (WEATHER): Uwzględniaj w opisie aktualne warunki atmosferyczne podane w sekcji **Aktualna Pogoda & Warunki**.
5. STYL I REALIZM EPOKI (SLOW BURN): Ilustracje muszą być DOMYŚLNIE REALISTYCZNE i spójne z wybraną epoką przygody (Gaslight / Klasyczne lata 20. / PRL lata 70. / Lata 80. i 90. / Współczesność / Custom). Buduj grozę cieniem, oświetleniem, fakturami i architekturą. ABSOLUTNY ZAKAZ rutynowego wstawiania macek, gargulców i potworów w zwykłych scenach. Elementy nadprzyrodzone / mityczne wprowadzaj TYLKO w tagach [POTWÓR:] lub [ZJAWISKO:].
6. ŚCISŁY ZAKAZ ANACHRONIZMÓW: Opisy w tagach muszą bezwzględnie odpowiadać epoce gry (brak nowoczesnych smartfonów, powerbanków i ekranów dotykowych przed 2007 r.). Skupiaj się na głównym temacie sceny (architektura, atmosfera, śledztwo, kluczowy ślad lub postać), a nie na losowych sprzętach codziennych, o ile nie biorą bezpośredniego udziału w akcji.
7. PRZEDMIOTY I POTWORY: Artefakty oraz ujawnione potwory opisuj wg raz ustalonej anatomii i wyglądu.

ZASADY (STRICT): maksymalnie ${maxImages} ilustracja(e) na odpowiedź • opis ZAWSZE po ANGIELSKU • zgodność z epoką przygody • styl DOMYŚLNIE realistyczny (fotografia z epoki, film-grain, naturalne światło, noir). Gracz może też jawnie poprosić komendą [obraz] / [scena] / [portret] / [przedmiot].`;


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
