/**
 * @file idea-roll-service.ts
 *
 * Deterministyczny serwis regułowy dla mechaniki "Test Pomysłu" (Idea Roll CoC 7e RAW).
 *
 * Podręcznik Strażnika CoC 7e (s. 199-201):
 * - Test Pomysłu wykonuje się na Cechę Inteligencja (INT) badacza.
 * - Test Pomysłu służy do pchnięcia akcji do przodu, gdy śledczy utknęli w martwym punkcie
 *   lub gracz nie pamięta/nie łączy faktów z wcześniejszych faz przygody.
 * - Sukces: natychmiastowa dedukcja / olśnienie łączące znane fakty i wskazujące logiczny krok.
 * - Porażka: śledczy RÓWNIEŻ otrzymuje potrzebną informację/wskazówkę (akcja NIE zostaje zablokowana),
 *   ale za cenę komplikacji, straty cennego czasu lub ściągnięcia niebezpieczeństwa (RAW).
 */

import {
  rollD100,
  evaluateSkillCheck,
  getOutcomeInfo,
  isSuccess,
  type RollOutcome,
} from "@/lib/dice-utils";
import type { Character } from "@/lib/types";
import type { MiceQuotientType } from "@/lib/journal/dossier-types";

export interface IdeaRollExecutionParams {
  character: Character;
  targetSubject?: {
    id: string;
    title: string;
    description?: string;
    type?: string;
    miceType?: MiceQuotientType;
  };
  contextClues?: Array<{
    title: string;
    description?: string;
    type?: string;
    miceType?: MiceQuotientType;
  }>;
  /** Wybrana soczewka narracyjna M.I.C.E. (domyślnie 'inquiry' lub typ z badanego obiektu) */
  selectedMiceLens?: MiceQuotientType;
  /** Opcjonalny wymuszony rzut kością k100 (determinizm testów jednostkowych) */
  fixedRoll?: number;
}

export interface IdeaRollResult {
  roll: number;
  targetValue: number;
  outcome: RollOutcome;
  outcomeLabel: string;
  outcomeEmoji: string;
  isSuccess: boolean;
  characterName: string;
  subjectTitle?: string;
  /** Aktywna soczewka M.I.C.E. użyta do wnioskowania */
  miceLens: MiceQuotientType;
}

/**
 * Rozpoznaje domyślny wektor M.I.C.E. na podstawie typu obiektu lub słów kluczowych.
 */
export function inferMiceType(subject?: {
  title?: string;
  description?: string;
  type?: string;
  miceType?: MiceQuotientType;
}): MiceQuotientType {
  if (subject?.miceType) return subject.miceType;
  const text = `${subject?.title || ''} ${subject?.description || ''} ${subject?.type || ''}`.toLowerCase();

  if (/miejsce|lokacja|pokój|piwnica|krypta|tunel|drzwi|ucieczk|droga|wyjście|uwięzi|room|place|location|escape|door|tunnel|cell/i.test(text)) {
    return 'milieu';
  }
  if (/postać|świadek|podejrzan|relacj|psycholog|lęk|sekret|moral|osoba|npc|character|suspect|witness|fear|secret|guilt/i.test(text)) {
    return 'character';
  }
  if (/rytuał|kataklizm|zagrożeni|besti|potwór|eksplozj|zegar|pożar|czas|event|ritual|threat|monster|beast|countdown|fire/i.test(text)) {
    return 'event';
  }
  return 'inquiry';
}

/**
 * Wykonuje rzut na Inteligencję (INT) dla Testu Pomysłu CoC 7e RAW z uwzględnieniem wektora M.I.C.E.
 */
export function executeIdeaRoll(params: IdeaRollExecutionParams): IdeaRollResult {
  const { character, targetSubject, fixedRoll, selectedMiceLens } = params;
  const targetValue = character.int || 50;
  const roll = fixedRoll !== undefined ? fixedRoll : rollD100();
  const outcome = evaluateSkillCheck(roll, targetValue);
  const outcomeInfo = getOutcomeInfo(outcome);
  const miceLens = selectedMiceLens || (targetSubject ? inferMiceType(targetSubject) : 'inquiry');

  return {
    roll,
    targetValue,
    outcome,
    outcomeLabel: outcomeInfo.label,
    outcomeEmoji: outcomeInfo.emoji,
    isSuccess: isSuccess(outcome),
    characterName: character.name,
    subjectTitle: targetSubject?.title,
    miceLens,
  };
}

/**
 * Buduje zwięzły, neutralny prompt dla endpointu utility AI (/api/ai/utility).
 * Zgodny z CoC 7e RAW oraz strukturą dramaturgiczną M.I.C.E. Quotient (Card/Kowal).
 */
export function buildIdeaRollPrompt(
  result: IdeaRollResult,
  targetSubject?: { title: string; description?: string; type?: string; miceType?: MiceQuotientType },
  contextClues: Array<{ title: string; description?: string; type?: string; miceType?: MiceQuotientType }> = [],
  locale: "pl" | "en" = "pl"
): string {
  const isPl = locale === "pl";
  const cluesContext = contextClues.length > 0
    ? contextClues
        .slice(0, 8)
        .map((c) => {
          const mTag = c.miceType ? ` [${c.miceType.toUpperCase()[0]}]` : '';
          return "- " + c.title + mTag + " (" + (c.type || "trop") + "): " + (c.description || "").slice(0, 100);
        })
        .join("\n")
    : (isPl ? "Brak dodatkowych odnotowanych tropów." : "No other recorded clues.");

  const subjectHeader = targetSubject
    ? (isPl
        ? "PRZEDMIOT / OSOBA W CENTRUM UWAGI: " + targetSubject.title + "\nSzczegóły: " + (targetSubject.description || "Brak opisu")
        : "FOCUSED SUBJECT: " + targetSubject.title + "\nDetails: " + (targetSubject.description || "No description"))
    : (isPl ? "OGÓLNY STAN ŚLEDZTWA: Połączenie dotychczas zebranych tropów" : "GENERAL INVESTIGATION: Connecting known clues");

  const miceDirectivesPl: Record<MiceQuotientType, string> = {
    milieu: "SOCZEWKA M.I.C.E. - OTOCZENIE I PRZESTRZEŃ [M]: Skup się na fizycznym otoczeniu, barierach, zabezpieczeniach lokacji i drodze bezpiecznego odwrotu.",
    inquiry: "SOCZEWKA M.I.C.E. - ŚLEDZTWO I PRAWDA [I]: Skup się na sednie zagadki, rekonstrukcji faktów, motywach sprawców i łączeniu poszlak.",
    character: "SOCZEWKA M.I.C.E. - LUDZIE I PSYCHOLOGIA [C]: Skup się na dynamice relacji, ukrytych lękach, statusie społecznym, moralnych dylematach i wiarygodności świadków.",
    event: "SOCZEWKA M.I.C.E. - ZAGROŻENIE I ZDARZENIA [E]: Skup się na zachwianiu porządku świata, nadchodzącym rytuale, konsekwencjach kataklizmu i wyścigu z czasem.",
  };

  const miceDirectivesEn: Record<MiceQuotientType, string> = {
    milieu: "M.I.C.E. LENS - MILIEU & ENVIRONMENT [M]: Focus on physical surroundings, barriers, securing the perimeter and safe escape routes.",
    inquiry: "M.I.C.E. LENS - INQUIRY & TRUTH [I]: Focus on the central mystery, factual reconstruction, suspect motives and connecting clues.",
    character: "M.I.C.E. LENS - CHARACTER & MOTIVES [C]: Focus on psychological drivers, hidden fears, social status, moral crossroads and witness credibility.",
    event: "M.I.C.E. LENS - EVENT & THREAT [E]: Focus on external disruptions to the status quo, impending rituals, countdowns and surviving catastrophic escalation.",
  };

  if (isPl) {
    return [
      "Jesteś bezstronnym silnikiem regułowym Call of Cthulhu 7e (CoC 7e RAW) dla mechaniki \"Test Pomysłu\" (Idea Roll na cechę Inteligencja).",
      "Badacz: " + result.characterName + " (Inteligencja INT: " + result.targetValue + "%)",
      "Wynik rzutu D100: " + result.roll + " -> " + result.outcomeLabel + " (" + (result.isSuccess ? "SUKCES" : "PORAŻKA Z KOMPLIKACJĄ") + ")",
      "",
      subjectHeader,
      "",
      "STRUKTURA DRAMATURGICZNA (M.I.C.E. QUOTIENT - Card / Kowal):",
      "- " + miceDirectivesPl[result.miceLens],
      "- REGUŁA ZAGNIEŻDŻANIA LIFO (Last In, First Out): Wątki śledztwa zamykają się w odwrotnej kolejności do ich otwarcia. Wskaż krok rozwiązujący najbardziej bezpośredni problem, by umożliwić powrót do szerszego śledztwa.",
      "",
      "ZEBRANE FAKTY I POSZLAKI:",
      cluesContext,
      "",
      "ZASADY WERDYKTU (CoC 7e RAW s. 199-201):",
      result.isSuccess
        ? "1. [SUKCES]: Badacz doznaje olśnienia w wybranej soczewce M.I.C.E. Połącz logicznie co najmniej dwa fakty ze śledztwa. Wskaż badaczowi jasny, bezpieczny wniosek lub logiczny następny krok."
        : "1. [PORAŻKA]: Zgodnie z RAW badacz RÓWNIEŻ otrzymuje niezbędną wskazówkę, ale ZA CENĘ POWAŻNEJ KOMPLIKACJI narracyjnej (np. utrata cennego czasu, hałas ściągający uwagę wroga, nieopatrzne zdradzenie swojej obecności, nieprzyjemna konfrontacja).",
      "2. Sformatuj odpowiedź w 2-3 zwięzłych, nastrojowych zdaniach maszyny do pisania (styl Lovecrafta/akt policyjnych).",
      "3. Zwróć wyłącznie treść dedukcji - zero wstępów, zero nagłówków, zero tagów technicznych.",
    ].join("\n");
  }

  return [
    "You are the objective Call of Cthulhu 7e rules engine (CoC 7e RAW) for the \"Idea Roll\" mechanic (INT test).",
    "Investigator: " + result.characterName + " (Intelligence INT: " + result.targetValue + "%)",
    "D100 Roll: " + result.roll + " -> " + result.outcomeLabel + " (" + (result.isSuccess ? "SUCCESS" : "FAILURE WITH COMPLICATION") + ")",
    "",
    subjectHeader,
    "",
    "DRAMATIC STRUCTURE (M.I.C.E. QUOTIENT - Card / Kowal):",
    "- " + miceDirectivesEn[result.miceLens],
    "- LIFO NESTING RULE (Last In, First Out): Investigation threads close in reverse order of opening. Point towards resolving the innermost immediate tension to unlock deeper leads.",
    "",
    "KNOWN CLUES & EVIDENCE:",
    cluesContext,
    "",
    "RULES DIRECTIVE (CoC 7e RAW pp. 199-201):",
    result.isSuccess
      ? "1. [SUCCESS]: Investigator experiences a breakthrough along the selected M.I.C.E. lens. Logically connect at least two clues and present a clear deduction or next lead."
      : "1. [FAILURE]: Under RAW, the investigator STILL gets the vital hint to proceed, BUT AT THE COST of a significant complication (lost time, raised alarm, hostile encounter, unwanted attention).",
    "2. Format the response in 2-3 concise typewriter-style sentences (Lovecraftian/police file tone).",
    "3. Output only the pure deduction text - no headers, no intros, no technical tags.",
  ].join("\n");
}

/**
 * Buduje szablon deklaracji "Quote-to-Input" do wklejenia w pole czatu.
 */
export function buildQuoteToInputText(
  type: string,
  title: string,
  extra?: { sourceNpc?: string; foundLocation?: string },
  locale: "pl" | "en" = "pl"
): string {
  const isPl = locale === "pl";
  const cleanTitle = title.trim();

  switch (type) {
    case "npc":
    case "character":
    case "characters":
    case "suspect":
      return isPl
        ? "Pytam " + cleanTitle + " o "
        : "I ask " + cleanTitle + " about ";

    case "location":
    case "places":
      return isPl
        ? "Sprawdzam dokładniej " + cleanTitle + " pod kątem "
        : "I thoroughly investigate " + cleanTitle + " for ";

    case "item":
    case "items":
    case "artifact":
      return isPl
        ? "Badam " + cleanTitle + ", zwracając uwagę na "
        : "I examine " + cleanTitle + ", paying attention to ";

    case "clue":
    case "evidence":
    case "document":
      if (extra?.sourceNpc) {
        return isPl
          ? "Pytam " + extra.sourceNpc + " o dowód: \"" + cleanTitle + "\""
          : "I ask " + extra.sourceNpc + " regarding the clue: \"" + cleanTitle + "\"";
      }
      return isPl
        ? "Analizuję powiązania poszlaki: \"" + cleanTitle + "\" z "
        : "I analyze connections regarding clue: \"" + cleanTitle + "\" with ";

    case "note":
    default:
      return isPl
        ? "Nawiązuję do notatki \"" + cleanTitle + "\": "
        : "Regarding note \"" + cleanTitle + "\": ";
  }
}
