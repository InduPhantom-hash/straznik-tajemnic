/**
 * buildAdditionalContext - pure function dla sekcji 8 route.ts (IND-71 micro 1/3).
 *
 * Składa tablicę `additionalContext: string[]` przekazywaną do
 * `provider.streamChat({ geminiOptions: { additionalContext } })`.
 *
 * Zachowuje 1:1 kolejność push'y z oryginalnego route.ts (lin 267-315 przed split):
 *   1. timePromptSection
 *   2. gmProtocol (tylko gdy NIE cache - OPT-26: cache zawiera już protokół)
 *   3. getPacingDirective(gameContext)
 *   4. directorSection (jeśli sessionId + state istnieje)
 *   5. ragSection (jeśli niepuste)
 *   6. summarySection (jeśli niepuste)
 *   7. gameContextPrompt LUB NPC context (zależnie od skipContext + dostępności)
 *   8. HOT SEAT FIX (jeśli hotSeatConfig.enabled + ≥2 graczy)
 *
 * Pure function: brak side effects, brak async. Wszystkie zależności (getPacingDirective,
 * getDirectorPromptSection) injected via import z `@/lib/*` - mockowalne przez jest.
 */

import type { CachedContent } from '@google/genai';
import { getPacingDirective } from '@/lib/pacing-controller';
import {
  getDirectorPromptSection,
  getDirectorState,
} from '@/lib/director-state';
import type { GameContext } from '@/lib/prompt-section-parser';
import type { Character } from '@/lib/types';
import { getSkillValue } from '@/lib/types';
import { buildLocationEraGuidanceSection } from '@/lib/location-era-validator';
import { isWeapon } from '@/lib/combat/weapon-context';
import { deriveFinances } from '@/lib/economy/credit-rating';

/**
 * Buduje sekcję promptu z umiejętnościami postaci (nazwa + wartość %), by AI wzywało
 * testy `[TEST:]` WYŁĄCZNIE nazwami z karty. Eliminuje rozjazd nazewnictwa, przez który
 * AI prosiło o test nazwą spoza karty → resolver zwracał 0% → Tacka „próg ≤0".
 * Zwraca pusty string gdy brak postaci/umiejętności (sekcja się nie wstrzykuje).
 */
export function buildPlayerSkillsSection(
  character: Character | null | undefined
): string {
  const skills = character?.skills;
  if (!skills) return '';
  const list = Object.entries(skills)
    .map(([name, value]) => `${name} ${getSkillValue(value)}%`)
    .join(', ');
  if (!list) return '';
  return (
    `\n## UMIEJĘTNOŚCI POSTACI (lista z karty)\n${list}\n` +
    `Gdy wzywasz test \`[TEST:]\`, użyj DOKŁADNIE nazwy umiejętności z tej listy. ` +
    `Jeśli akcja nie pasuje do żadnej, wybierz najbliższą z listy albo test cechy ` +
    `(np. Inteligencja, Spostrzegawczość) - NIGDY nie wymyślaj nazwy spoza karty.`
  );
}

/**
 * Buduje sekcję promptu z listą wyposażenia i przedmiotów użytkowych badacza
 * (z wyłączeniem broni, która jest już opisywana w sekcji uzbrojenia).
 * Informuje AI MG co gracz ma przy sobie, aby zapobiec wymyślaniu przedmiotów
 * znikąd oraz uwzględniać brak sprzętu w testach.
 */
export function buildPlayerEquipmentSection(
  character: Character | null | undefined
): string {
  const equipment = character?.equipment;
  if (!equipment || equipment.length === 0) return '';

  const nonWeapons = equipment.filter((item) => !isWeapon(item));
  if (nonWeapons.length === 0) return '';

  const lines = nonWeapons.map((item) => {
    const desc = item.description?.trim();
    let statusLabel = '';
    if (item.quantity && item.quantity > 0) {
      statusLabel = ` (pozostało: ${item.quantity}${item.maxQuantity ? `/${item.maxQuantity}` : ''})`;
    } else if (item.isConsumable) {
      statusLabel = ` [zużywalny]`;
    }
    return desc
      ? `- **${item.name}**${statusLabel}: ${desc}`
      : `- **${item.name}**${statusLabel}`;
  });

  return (
    `\n## EKWIPUNEK POSTACI (posiadane przedmioty)\n` +
    `Badacz ma przy sobie WYŁĄCZNIE następujące przedmioty użytkowe:\n` +
    lines.join('\n') +
    `\nReguła: Gdy gracz podejmuje działania wymagające narzędzi (np. rozpalenie ognia, oświetlenie ciemności, otwarcie zamka, pierwsza pomoc, robienie zdjęć, badania naukowe), bierz pod uwagę powyższą listę. ` +
    `Brak odpowiedniego narzędzia powinien utrudniać zadanie (np. kość kary w teście, brak możliwości wykonania testu lub konieczność improwizacji). ` +
    `NIGDY nie zakładaj, że postać posiada przedmioty, których nie ma na tej liście, chyba że dopiero co podniosła je w bieżącej scenie.\n\n` +
    `Reguły operowania ekwipunkiem (Fiction First & puryzm CoC 7e):\n` +
    `1. Gdy gracz deklaruje akcje w sposób naturalny w świecie gry, sprawdzaj posiadaną listę. Jeśli deklaruje użycie czegoś, czego nie ma, opisz to fabularnie w świecie gry i nie emituj tagu.\n` +
    `2. Gdy badacz z sukcesem zużywa zasób zużywalny (np. dawka morfiny, bandaże, flara), dołącz na końcu odpowiedzi znacznik: \`[EKWIPUNEK: ZUZYJ | NazwaPrzedmiotu | 1]\`.\n` +
    `3. Gdy przedmiot zostaje bezpowrotnie zniszczony, porzucony lub odebrany: \`[EKWIPUNEK: USUN | NazwaPrzedmiotu]\`.\n` +
    `4. Gdy badacz odnajduje lub otrzymuje nowy kluczowy rekwizyt w śledztwie: \`[EKWIPUNEK: DODAJ | Nazwa | kategoria | opis]\` (kategorie: tool, document, weapon, medical, occult, artifact, personal).\n` +
    `5. Drobiazgi tła (zapałki, ołówek, notes) oraz amunicja w broni są nielimitowane w normalnych warunkach - NIE zliczaj pojedynczych zapałek ani naboi jak w grach arcade. Mogą się skończyć wyłącznie przy dramatycznej komplikacji, zacięciu lub pechu.`
  );
}

/**
 * Buduje sekcję promptu ze statusem majątkowym i zamożnością badacza wg reguł CoC 7e RAW.
 * Przekazuje AI poziom wydatków (Spending Level), gotówkę oraz majątek trwały,
 * dzięki czemu MG wie, kiedy gracz może wydać pieniądze od ręki, a kiedy żądać testu.
 */
export function buildPlayerFinancesSection(
  character: Character | null | undefined
): string {
  if (!character) return '';

  const finances = deriveFinances(character);
  const spendingStr = `${finances.spendingLevel} $`;
  const cashStr = `${finances.cash} $`;
  const assetsStr = `${finances.assets} $`;
  const assetsDesc = finances.assetsDescription ? ` (${finances.assetsDescription})` : '';

  return (
    `\n## MAJĄTEK I STATUS FINANSOWY POSTACI (CoC 7e RAW)\n` +
    `- Zamożność (Credit Rating): ${finances.creditRating}% [Poziom: ${finances.tierLabel}]\n` +
    `- Dzienny poziom wydatków bez rzutu (Spending Level): ${spendingStr} dziennie (drobne wydatki, tanie hotele, posiłki, bilety miejskie gracz opłaca od ręki bez testu kośćmi i bez odliczania)\n` +
    `- Gotówka pod ręką (Cash): ${cashStr} (na zakupy przekraczające poziom wydatków, lecz mieszczące się w tej kwocie)\n` +
    `- Majątek trwały (Assets): ${assetsStr}${assetsDesc} (nieruchomości, oszczędności bankowe; spieniężenie wymaga czasu i procedur bankowych)\n` +
    `Reguła: Gdy gracz próbuje dokonać wydatku znacząco przekraczającego gotówkę, wziąć dużą pożyczkę lub zaimponować statusem majątkowym, zażądaj \`[TEST: Majętność | zwykły | ... | powód]\`. Porażka oznacza odmowę lub utratę reputacji.`
  );
}

/**
 * Buduje sekcję promptu ze stałym profilem wizualnym Badacza (Visual DNA).
 * Przekazuje AI wygląd, płeć, wiek, ubiór i cechy szczególne z karty,
 * aby generowane ilustracje i portrety zachowywały pełną spójność.
 */
export function buildPlayerVisualProfileSection(
  character: Character | null | undefined
): string {
  if (!character) return '';

  const details: string[] = [];
  if (character.gender) {
    const g =
      character.gender === 'male'
        ? 'mężczyzna'
        : character.gender === 'female'
          ? 'kobieta'
          : character.gender;
    details.push(`Płeć: ${g}`);
  }
  if (character.age) details.push(`Wiek: ${character.age} lat`);
  if (character.occupation) {
    details.push(`Zawód / Profesja: ${character.occupation}`);
  }
  if (character.appearance && character.appearance.trim()) {
    details.push(`Wygląd i aparycja: ${character.appearance.trim()}`);
  }
  if (character.traits && character.traits.length > 0) {
    details.push(`Cechy szczególne i styl: ${character.traits.join(', ')}`);
  }

  if (details.length === 0) return '';

  return (
    `\n## PROFIL WIZUALNY BADACZA (VISUAL DNA)\n` +
    `Badacz gracza to **${character.name}** o następującym stałym wyglądzie fizycznym:\n` +
    details.map((d) => `- ${d}`).join('\n') +
    `\nReguła: Gdy generujesz tagi ilustracji ([SCENA:], [PORTRET:]) z udziałem Badacza, ` +
    `ZAWSZE wplataj powyższe cechy fizyczne (wiek, sylwetka, ubranie z epoki) w angielski prompt, ` +
    `aby postać wyglądała spójnie na wszystkich wygenerowanych grafikach.`
  );
}

export interface BuildActiveInvestigationOpts {
  character?: Character | null;
  characters?: Character[];
  sessionId?: string;
  locale?: 'pl' | 'en';
}

/**
 * Buduje kompaktową sekcję promptu "AKTYWNE ŚLEDZTWO I WIEDZA BADACZA" (~80-120 tokenów)
 * zamykającą dwukierunkową pętlę pamięci w relacji Gracz <-> AI MG (Issue #68).
 *
 * Zawiera:
 * 1. Kluczowe potwierdzone poszlaki (do 5 najważniejszych z 1-zdaniową syntezą).
 * 2. Ostatnie wnioski i hipotezy badacza (z rzutów na Pomysł / notatek / dossier).
 * 3. Aktywny wątek lub cel śledczy.
 *
 * Zachowuje 100% symetrię językową (PL + EN).
 */
export function buildActiveInvestigationSection(
  opts: BuildActiveInvestigationOpts
): string {
  const isEn = opts.locale === 'en';
  const directorState = opts.sessionId ? getDirectorState(opts.sessionId) : null;

  // Znajdź główną postać (lub pierwszą z drużyny)
  const char = opts.character || opts.characters?.[0];

  // 1. ZBIERZ POSZLAKI (do 5 najważniejszych)
  const clues: { title: string; fact: string }[] = [];
  const seenClueKeys = new Set<string>();

  // A. Z dossier postaci (priorytet)
  if (char?.investigatorDossier?.clues && char.investigatorDossier.clues.length > 0) {
    // Sortuj: kluczowe poszlaki najpierw, potem najnowsze
    const sorted = [...char.investigatorDossier.clues].sort((a, b) => {
      if (a.isKeyClue && !b.isKeyClue) return -1;
      if (!a.isKeyClue && b.isKeyClue) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    for (const c of sorted) {
      const key = c.title.toLowerCase().trim();
      if (!seenClueKeys.has(key)) {
        seenClueKeys.add(key);
        const fact = (c.description || c.investigatorInsight || '').trim();
        clues.push({ title: c.title.trim(), fact });
        if (clues.length >= 5) break;
      }
    }
  }

  // B. Fallback: z dziennika (character.journal)
  if (clues.length < 5 && char?.journal && char.journal.length > 0) {
    const journalClues = char.journal
      .filter((e) => e.type === 'clue' || e.type === 'discovery')
      .reverse();

    for (const j of journalClues) {
      const key = j.title.toLowerCase().trim();
      if (!seenClueKeys.has(key)) {
        seenClueKeys.add(key);
        clues.push({ title: j.title.trim(), fact: j.content.trim() });
        if (clues.length >= 5) break;
      }
    }
  }

  // C. Fallback: z directorState.clueFacts lub discoveredClues
  if (clues.length < 5 && directorState) {
    if (directorState.clueFacts && directorState.clueFacts.length > 0) {
      for (const cf of directorState.clueFacts) {
        const key = cf.title.toLowerCase().trim();
        if (!seenClueKeys.has(key)) {
          seenClueKeys.add(key);
          clues.push({ title: cf.title, fact: cf.fact });
          if (clues.length >= 5) break;
        }
      }
    } else if (directorState.discoveredClues && directorState.discoveredClues.length > 0) {
      for (const title of directorState.discoveredClues.slice(-5)) {
        const key = title.toLowerCase().trim();
        if (!seenClueKeys.has(key)) {
          seenClueKeys.add(key);
          clues.push({ title, fact: '' });
          if (clues.length >= 5) break;
        }
      }
    }
  }

  // 2. ZBIERZ HIPOTEZY I WNIOSKI (do 2 najważniejszych)
  const hypotheses: string[] = [];
  const seenHypo = new Set<string>();

  // A. Z notatek badacza (dossier.notes)
  if (char?.investigatorDossier?.notes && char.investigatorDossier.notes.length > 0) {
    for (const note of char.investigatorDossier.notes.slice(-2)) {
      const text = (note.content || note.title).trim();
      if (text && !seenHypo.has(text.toLowerCase())) {
        seenHypo.add(text.toLowerCase());
        hypotheses.push(text);
      }
    }
  }

  // B. Z wniosków poszlak (investigatorInsight)
  if (hypotheses.length < 2 && char?.investigatorDossier?.clues) {
    for (const c of char.investigatorDossier.clues) {
      if (c.investigatorInsight && !seenHypo.has(c.investigatorInsight.toLowerCase())) {
        seenHypo.add(c.investigatorInsight.toLowerCase());
        hypotheses.push(c.investigatorInsight.trim());
        if (hypotheses.length >= 2) break;
      }
    }
  }

  // C. Z directorState.investigatorHypotheses
  if (hypotheses.length < 2 && directorState?.investigatorHypotheses) {
    for (const h of directorState.investigatorHypotheses.slice(-2)) {
      if (!seenHypo.has(h.toLowerCase())) {
        seenHypo.add(h.toLowerCase());
        hypotheses.push(h);
        if (hypotheses.length >= 2) break;
      }
    }
  }

  // 3. AKTYWNY CEL / WĄTEK ŚLEDCZY
  let activeLead = '';
  if (directorState?.narrativeGoal) {
    activeLead = directorState.narrativeGoal.trim();
  } else if (char?.investigatorDossier?.clues) {
    const unconfirmedKey = char.investigatorDossier.clues.find(
      (c) => c.status === 'unconfirmed' || c.isKeyClue
    );
    if (unconfirmedKey) {
      activeLead = unconfirmedKey.title;
    }
  }

  // Jeśli brak jakichkolwiek danych śledczych, nie marnujemy tokenów
  if (clues.length === 0 && hypotheses.length === 0 && !activeLead) {
    return '';
  }

  // SKŁADANIE SEKCJI
  const header = isEn
    ? '## ACTIVE INVESTIGATION & INVESTIGATOR KNOWLEDGE'
    : '## AKTYWNE ŚLEDZTWO I WIEDZA BADACZA';

  const lines: string[] = [header];

  // Formatowanie poszlak (1 linia = 1 zwięzła poszlaka z faktem)
  if (clues.length > 0) {
    const cluesHeader = isEn
      ? '**Key confirmed clues:**'
      : '**Kluczowe potwierdzone poszlaki:**';
    lines.push(cluesHeader);
    for (const c of clues) {
      let desc = c.fact ? `: ${c.fact}` : '';
      if (desc.length > 100) desc = `${desc.slice(0, 97)}...`;
      lines.push(`- **${c.title}**${desc}`);
    }
  }

  // Formatowanie hipotez
  if (hypotheses.length > 0) {
    const hypoHeader = isEn
      ? '**Investigator hypotheses & insights:**'
      : '**Wnioski i hipotezy badacza:**';
    lines.push(hypoHeader);
    for (const h of hypotheses) {
      let text = h;
      if (text.length > 100) text = `${text.slice(0, 97)}...`;
      lines.push(`- ${text}`);
    }
  }

  // Formatowanie aktywnego wątku
  if (activeLead) {
    const leadHeader = isEn
      ? `**Active investigative lead:** ${activeLead}`
      : `**Aktywny wątek śledczy:** ${activeLead}`;
    lines.push(leadHeader);
  }

  return `\n${lines.join('\n')}\n`;
}

// IND-160: minimal NPC context shape z body request (cleanup `any` z lin 255 route.ts).
export interface NpcContextEntry {
  name: string;
  status?: 'alive' | 'unknown' | 'dead' | string;
  occupation?: string;
  description?: string;
}

// IND-72: minimal Hot Seat player shape z body request (cleanup `any` z lin 291 route.ts).
export interface HotSeatPlayerEntry {
  characterName?: string;
}

export interface BuildAdditionalContextOpts {
  timePromptSection: string;
  gmProtocol: string;
  gameContext: GameContext;
  resolvedCachedContent: CachedContent | null;
  // IND-223: imię postaci gracza (steruje człowiek) - oznaczamy ją jawnie w
  // kontekście, by AI nigdy nie generowało jej wypowiedzi/akcji.
  playerCharacterName?: string;
  // Uzbrojenie postaci gracza (sekcja promptu z buildPlayerWeaponContext). Wstrzykiwane
  // gdy niepuste, by AI prowadziło walkę narracyjnie znając broń + umiejętność + obrażenia.
  playerWeaponsSection?: string;
  // Lista umiejętności postaci z wartościami % (gotowa sekcja). Wstrzykiwana, by AI
  // wzywało testy WYŁĄCZNIE nazwami z karty - eliminuje rozjazd nazw (Tacka 0%).
  playerSkillsSection?: string;
  /** Ekwipunek i przedmioty użytkowe postaci (bez broni) */
  playerEquipmentSection?: string;
  /** Status majątkowy i poziom wydatków postaci wg CoC 7e RAW */
  playerFinancesSection?: string;
  /** Stały profil fizyczny Badacza (Visual DNA) */
  playerVisualProfileSection?: string;
  sessionId?: string;
  ragSection?: string;
  summarySection?: string | null;
  /** Sekcja z realnymi handoutami przygody (DriveThruRPG) - markdown do wstawienia przez MG. */
  handoutsSection?: string;
  /** C1: instrukcja recapu przy wznowieniu zapisanej gry (null gdy nie wznowienie). */
  sessionRecapSection?: string | null;
  skipContext?: boolean;
  gameContextPrompt?: string;
  isGameStart?: boolean;
  characters?: Character[];
  npcs?: NpcContextEntry[];
  currentLocation?: string;
  hotSeatConfig?: { enabled?: boolean; players?: HotSeatPlayerEntry[] };
  tone?: 'purist' | 'pulp' | 'noir' | 'neutral';
  /** Epoka gry dla reguł materialnych i guardrails */
  era?: string;
  /** Język wyjścia dla dyrektyw kontekstowych */
  locale?: 'pl' | 'en';
  /** Sekcja danych immersyjnych (astronomia, gazety, ceny epoki) - wstrzykiwana gdy dostępna. */
  immersionSection?: string;
  /** Wydarzenie z generatora fabularnego zrzucone z UI, przekazywane z hooka useChat */
  directorEventSection?: string;
}

export function buildAdditionalContext(
  opts: BuildAdditionalContextOpts
): string[] {
  const {
    timePromptSection,
    gmProtocol,
    gameContext,
    resolvedCachedContent,
    sessionId,
    ragSection,
    summarySection,
    handoutsSection,
    sessionRecapSection,
    skipContext,
    gameContextPrompt,
    npcs,
    currentLocation,
    hotSeatConfig,
    playerCharacterName,
    playerWeaponsSection,
    playerSkillsSection,
    playerEquipmentSection,
    playerFinancesSection,
    playerVisualProfileSection,
    isGameStart,
    characters,
    era,
  } = opts;

  const additionalContext: string[] = [timePromptSection];

  // Materialne User Story i Kontrast Epoki dla MG
  if (era || currentLocation) {
    additionalContext.push(buildLocationEraGuidanceSection(era, currentLocation));
  }

  // C1: recap przy wznowieniu zapisanej gry - instrukcja "zrób recap w tej turze".
  if (sessionRecapSection) {
    additionalContext.push(sessionRecapSection);
  }

  // IND-223: jawne oznaczenie postaci gracza (steruje człowiek). Wstrzykiwane
  // ZAWSZE (nie cache'owane jak gmProtocol), by AI dostawało konkretne imię i
  // twardy zakaz grania za gracza nawet po przejściu na compact protokół.
  // IND-223: jawne oznaczenie postaci gracza w trybie SOLO. W trybie Hot Seat z 2+ postaciami
  // ta sekcja jest zastępowana dedykowanym blokiem ## TRYB GRY DLA DWÓCH OSÓB.
  const isHotSeatActive = hotSeatConfig?.enabled && (hotSeatConfig?.players?.length ?? 0) >= 2;
  if (playerCharacterName && !isHotSeatActive) {
    additionalContext.push(
      `\n## POSTAĆ GRACZA (STERUJE CZŁOWIEK)\nPostać gracza: **${playerCharacterName}**. To człowiek podejmuje jej decyzje, pisze jej kwestie i wykonuje jej akcje. NIGDY nie generuj wypowiedzi, myśli ani działań postaci ${playerCharacterName} - opisz świat i reakcje NPC, a potem zatrzymaj się na [Co robisz?] i czekaj na input gracza.`
    );
  }

  // Profil wizualny Badacza (Visual DNA) - by generowane ilustracje miały spójny wygląd
  if (playerVisualProfileSection) {
    additionalContext.push(playerVisualProfileSection);
  }

  // Uzbrojenie postaci gracza - by AI prowadziło walkę narracyjnie znając broń.
  if (playerWeaponsSection) {
    additionalContext.push(playerWeaponsSection);
  }

  // Umiejętności postaci - AI ma wzywać testy WYŁĄCZNIE nazwami z tej listy.
  if (playerSkillsSection) {
    additionalContext.push(playerSkillsSection);
  }

  // Ekwipunek i przedmioty użytkowe postaci - AI wie co badacz ma przy sobie.
  if (playerEquipmentSection) {
    additionalContext.push(playerEquipmentSection);
  }

  // Sytuacja finansowa i Zamożność - AI zna poziom wydatków i gotówkę wg CoC 7e RAW.
  if (playerFinancesSection) {
    additionalContext.push(playerFinancesSection);
  }

  // Wstrzykiwanie Ustawy Przygody na podstawie tonu (dynamiczne pacingi z debaty)
  const sessionTone = opts.tone || 'purist';
  if (sessionTone === 'noir') {
    additionalContext.push(
      `\n## USTAWA O PRZYGODZIE NOIR\n` +
      `1. Prowadź grę w stylu Noir (powolne tempo, slow-burn, mrok, beznadzieja). NPC prezentują oficjalną Maskę, ale kierują się Ukrytym Celem/Strachem (są nieufni, podejrzliwi).\n` +
      `2. Zasoby są skrajnie ograniczone (rzadka amunicja, brak gotowych środków obrony).\n` +
      `3. CIĘCIA MONTAŻOWE: Teleportuj postać do nowej lokacji natychmiast po jej zadeklarowaniu. Jeśli jednak gracz wprost chce zrobić coś w drodze (np. czytać, przepytać kierowcę), rozegraj to jako mikro-scenę w podróży przed przeniesieniem.\n` +
      `4. SZALEŃSTWO: Przy stracie Poczytalności narzucaj traumę, fobie i luki w pamięci bezpośrednio w opisie zachowania badacza (jako wyjątek od sprawczości). Nigdy nie pisz o punktach ani mechanice w narracji.`
    );
  } else if (sessionTone === 'pulp') {
    additionalContext.push(
      `\n## USTAWA O PRZYGODZIE PULP CTHULHU\n` +
      `1. Prowadź grę w stylu Pulp/Wild Science (dynamiczna akcja, pościgi, anomalie). Badacze są twardsi i rany goją się szybciej.\n` +
      `2. CIĘCIA MONTAŻOWE: Pomijaj zbędne przejścia i od razu wrzucaj badaczy w centrum akcji nowej lokacji, chyba że gracz zadeklarował konkretną czynność w trakcie drogi.\n` +
      `3. SZALEŃSTWO: Utrata poczytalności wywołuje widowiskowy, filmowy szał lub nagłe popadnięcie w nietypową fobię opisaną sensorycznie. Brak mechanicznego języka w narracji.`
    );
  } else if (sessionTone === 'purist') {
    additionalContext.push(
      `\n## USTAWA O PRZYGODZIE KLASYCZNEJ (LOVECRAFTIAN)\n` +
      `1. Prowadź grę w klasycznym stylu Lovecrafta (powolne popadanie w szaleństwo, badanie starych ksiąg i rodów). NPC skrywają swoje prawdziwe oblicze pod Maską.\n` +
      `2. CIĘCIA MONTAŻOWE: Domyślnie teleportuj badacza do nowej lokacji. Jeśli gracz wprost opisał chęć zrobienia czegoś w podróży (np. lektura, obserwacja), rozegraj to przed cięciem.\n` +
      `3. SZALEŃSTWO: Narzucaj traumę i czasową amnezję bezpośrednio w opisie badacza po porażce SAN. Zakaz używania pojęć mechanicznych (punktów, testów) w prozie opisu.`
    );
  }

  // OPT-26: gmProtocol skip gdy cache aktywny - jest już w cachedContent.contents
  if (!resolvedCachedContent) additionalContext.push(gmProtocol);
  additionalContext.push(getPacingDirective(gameContext, opts.locale));

  // Director's state injection
  if (sessionId) {
    const directorSection = getDirectorPromptSection(sessionId);
    if (directorSection) additionalContext.push(directorSection);
  }

  // Issue #68: Dwukierunkowa pętla pamięci - wstrzykiwanie sekcji ## AKTYWNE ŚLEDZTWO I WIEDZA BADACZA
  const investigationSection = buildActiveInvestigationSection({
    character: characters?.[0] ?? undefined,
    characters,
    sessionId,
    locale: opts.locale,
  });
  if (investigationSection) additionalContext.push(investigationSection);

  if (ragSection) additionalContext.push(ragSection);
  if (summarySection) additionalContext.push(summarySection);
  // Realne handouty przygody (DriveThruRPG) - MG dostaje markdown obrazów do wstawienia.
  if (handoutsSection) additionalContext.push(handoutsSection);

  // Etap 3: dane immersyjne (astronomia, gazety epoki, przelicznik cen) - wzbogacają narrację.
  if (opts.immersionSection) additionalContext.push(opts.immersionSection);

  // Etap 3.5: Wstrzyknięcie instrukcji reżyserskiej z wylosowanego zdarzenia
  if (opts.directorEventSection) {
    additionalContext.push(opts.directorEventSection);
  }

  // OPT-23: game context injection (gameContextPrompt LUB NPC fallback)
  if (!skipContext && gameContextPrompt) {
    additionalContext.push(gameContextPrompt);
  } else if (!skipContext && npcs && npcs.length > 0) {
    const activeNPCs = npcs.filter(
      (npc) => npc.status === 'alive' || npc.status === 'unknown'
    );
    if (activeNPCs.length > 0) {
      let npcContext = '\n## AKTYWNE POSTACIE (NPC)\n';
      for (const npc of activeNPCs.slice(0, 10)) {
        npcContext += `- **${npc.name}**`;
        if (npc.occupation) npcContext += ` (${npc.occupation})`;
        if (npc.description) npcContext += `: ${npc.description.slice(0, 100)}`;
        npcContext += '\n';
      }
      if (currentLocation) {
        npcContext += `\nAktualna lokacja gracza: ${currentLocation}\n`;
      }
      additionalContext.push(npcContext);
    }
  }

  // OPT-22: Hot Seat FIX prompt (≥2 graczy z resolved characterName)
  if (hotSeatConfig?.enabled && (hotSeatConfig?.players?.length ?? 0) >= 2) {
    const characterNames = (hotSeatConfig.players ?? [])
      .map((p) => p.characterName || 'Nieznany')
      .filter((n) => n !== 'Nieznany');
    if (characterNames.length >= 2) {
      let duetContext = `\n## TRYB GRY DLA DWÓCH OSÓB (HOT SEAT / DRUŻYNA)\n` +
        `KRYTYCZNE NADPISANIE ROLI: Ta gra NIE jest jednoosobowa. W grze uczestniczy ZESPÓŁ badaczy: ${characterNames.join(', ')}.\n` +
        `1. FORMA NARRACJI: Opisuj świat i sceny w liczbie mnogiej ("Widzicie...", "Stajecie przed...", "Wchodzicie...") lub w ujęciach adresowanych ("@${characterNames[0]}..., podczas gdy @${characterNames[1]}..."). NIGDY nie zwracaj się do nich jak do pojedynczej osoby w 2. osobie l.poj.\n` +
        `2. RELACJA I WSPÓLNY CEL: Prowadź grę z uwzględnieniem faktu, że bohaterowie współpracują. Podkreślaj ich wspólne wyzwania oraz to, co sprowadziło ich razem w dany punkt czasu i przestrzeni. NIGDY nie zmuszaj graczy do dyskusji między sobą na czacie.\n` +
        `3. ADRESOWANIE I AKCJE: Sceny wspólne opisuj dla obu postaci. Kwestie i akcje kierowane do JEDNEJ postaci poprzedzaj tagiem @ImięPostaci: (np. @${characterNames[0]}: ...).\n` +
        `4. ZAKOŃCZENIE TURY: Zamiast pytania do każdej postaci z osobna ZAWSZE kończ prostym pytaniem skierowanym do drużyny: [Co robicie?].\n` +
        `5. PRZYPISANIE SKUTKÓW: Przy zmianach SAN/HP/dziennika dodawaj prefiks @Imię: \`[SANITY:@${characterNames[0]}: -1d4: powód]\`, \`[HP:@${characterNames[1]}: -1d6: powód]\`, \`[DZIENNIK:@${characterNames[0]}:trop:tytuł]treść[/DZIENNIK]\`.\n`;

      if (isGameStart && characters && characters.length >= 2) {
        duetContext += `\n### WPROWADZENIE DLA DUETU (ROZPOCZĘCIE GRY)\n` +
          `Otwierasz grę dla dwójki graczy. Twoja pierwsza tura musi nakreślić wspólny początek z myślą o obu postaciach:\n` +
          `1. OPISZ RELACJĘ I SPOTKANIE: Opisz jak postacie się tam znalazły, dlaczego podróżują/działają razem, co je łączy i dlaczego są w tym miejscu i czasie w tym samym momencie.\n` +
          `2. DRUŻYNOWY HAK: Zwiąż hook przygody ze wspólnym celem obu postaci, odwołując się do ich tła z kart.\n` +
          `3. FORMA: Zwróć się bezpośrednio do obu postaci jednocześnie w liczbie mnogiej.\n\n` +
          `Dane bohaterów do zarysowania relacji i spotkania:\n`;
        
        characters.forEach((char) => {
          duetContext += `- **${char.name}** (${char.occupation}): ${char.background || ''}\n` +
            `  * Koncept: ${char.characterConcept || ''}\n` +
            `  * Osobowość i Cechy: ${(char.traits || []).join(', ')}. ${((char as unknown) as Record<string, unknown>).personality || ''}\n` +
            `  * Kluczowa osoba: ${char.significantPerson || ''}\n` +
            `  * Ważne miejsce: ${char.meaningfulLocation || ''}\n` +
            `  * Cenne posiadanie: ${char.treasuredPossession || ''}\n` +
            `  * Historia: ${char.backstory || ''}\n`;
        });
      }

      additionalContext.push(duetContext);
    }
  }

  return additionalContext;
}
