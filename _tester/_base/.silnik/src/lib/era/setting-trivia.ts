import type { AdventureContext } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era';

export interface SettingTriviaResult {
  title: string;
  subtitle: string;
  facts: string[];
}

interface EraFactsPack {
  titlePl: string;
  titleEn: string;
  subtitlePl: string;
  subtitleEn: string;
  factsPl: string[];
  factsEn: string[];
}

const ERA_FACTS_PACKS: Record<string, EraFactsPack> = {
  'us-1920s': {
    titlePl: 'Realia Epoki i Świata',
    titleEn: 'Era & World Context',
    subtitlePl: 'USA, lata 20. XX w. · Prawo, obyczaje i technologia',
    subtitleEn: 'USA 1920s · Law, customs, and technology',
    factsPl: [
      'W latach 20. XX w. w USA obowiązuje federalna prohibicja (Ustawa Volsteada). Posiadanie i obrót alkoholem to przestępstwo federalne, które napędza nielegalne kluby speakeasy i wojny gangów.',
      'Łączność na odległość opiera się na telegrafie Western Union i ręcznych centralach telefonicznych operatora. Poczta kolejowa doręcza listy 1-2 razy dziennie.',
      'Medycyna sądowa opiera się na tuszowej daktyloskopii, grupach krwi A/B/O i oględzinach sekcyjnych. Badania DNA ani cyfrowy monitoring nie istnieją.',
    ],
    factsEn: [
      'In 1920s America, federal Prohibition (the Volstead Act) is in effect. Alcohol distribution is a federal crime fueling speakeasies and gang wars.',
      'Long-distance communication relies on Western Union telegrams and operator-connected telephone switchboards. Mail is delivered 1-2 times daily.',
      'Forensics relies on ink fingerprinting, A/B/O blood typing, and autopsies. DNA analysis and digital surveillance do not exist.',
    ],
  },
  'pl-1920s': {
    titlePl: 'Realia Epoki i Świata',
    titleEn: 'Era & World Context',
    subtitlePl: 'Polska, II Rzeczpospolita · Prawo i społeczeństwo',
    subtitleEn: 'Poland, Second Republic · Law and society',
    factsPl: [
      'W II Rzeczypospolitej trwa odbudowa kraju po zaborach i wojnie. W 1924 roku reforma Władysława Grabskiego wprowadza stabilnego polskiego złotego.',
      'Kolej parowa PKP stanowi krwioobieg kraju, a na prowincji dominuje transport konny. Samochody to rzadki symbol najwyższego statusu majątkowego.',
      'Policja Państwowa korzysta z kartotek śledczych i fotografii sygnalitycznej; tożsamość weryfikuje się dowodami osobistymi i księgami parafialnymi.',
    ],
    factsEn: [
      'In 1920s Poland, postwar recovery is underway. The 1924 financial reform establishes the stable Polish zloty.',
      'Steam railway connects major cities, while horse transport dominates rural areas. Automobiles remain rare luxury goods.',
      'State Police rely on investigative index cards and Bertillon records; identity is verified with ID cards and parish registers.',
    ],
  },
  'gb-1890s': {
    titlePl: 'Realia Epoki i Świata',
    titleEn: 'Era & World Context',
    subtitlePl: 'Wiktoriańska Wielka Brytania · Etykieta i przestrzeń',
    subtitleEn: 'Victorian Britain · Etiquette and society',
    factsPl: [
      'W późnej epoce wiktoriańskiej podział klasowy i sztywna etykieta towarzyska determinują, z kim i w jakich okolicznościach Badacz może rozmawiać.',
      'Ulice miast oświetlają latarnie gazowe, a transport opiera się na dorożkach konnych (hansom cabs) i parowym metrze miejskim.',
      'Scotland Yard opiera śledztwa na dedukcji i zeznaniach świadków; daktyloskopia jest w fazie wczesnych eksperymentów naukowych.',
    ],
    factsEn: [
      'In late Victorian Britain, strict class etiquette dictates how and with whom an Investigator can converse.',
      'City streets are lit by gas lamps; transport relies on horse-drawn hansom cabs and early steam underground railways.',
      'Scotland Yard relies on deductive reasoning, witness testimony, and anthropometry; fingerprinting is only experimental.',
    ],
  },
  'pl-1970s': {
    titlePl: 'Realia Epoki i Świata',
    titleEn: 'Era & World Context',
    subtitlePl: 'PRL, lata 70. · Kontrola państwowa i inwigilacja',
    subtitleEn: '1970s Communist Poland · State control and surveillance',
    factsPl: [
      'W PRL lat 70. obywatele podlegają stałej kontroli meldunkowej, a milicja i SB mają prawo wylegitymować każdego w przestrzeni publicznej.',
      'Rozmowy międzymiastowe zamawia się na poczcie przez telefonistkę, a telefony domowe podlegają procedurom inwigilacji operacyjnej MSW.',
      'Obrót zachodnimi walutami jest przestępstwem dewizowym; legalny zakup towarów importowanych możliwy jest wyłącznie za bony i dolary w sklepach Pewex.',
    ],
    factsEn: [
      'In 1970s Communist Poland, citizens are subject to strict residency registrations, and militia officers can demand identity papers at any time.',
      'Long-distance phone calls require booking through post office operators, and private lines are subject to state wiretapping.',
      'Foreign currency trade is strictly criminalized; western goods can only be purchased with hard currency or vouchers in Pewex stores.',
    ],
  },
  'pl-1990s': {
    titlePl: 'Realia Epoki i Świata',
    titleEn: 'Era & World Context',
    subtitlePl: 'Polska, lata 90. · Transformacja ustrojowa i wolny rynek',
    subtitleEn: '1990s Poland · Democratic transition and free market',
    factsPl: [
      'Lata 90. w Polsce to dynamiczna transformacja ustrojowa, likwidacja cenzury i rozkwit prywatnych inicjatyw gospodarczych oraz warsztatów prototypowych.',
      'Po rozwiązaniu Służby Bezpieczeństwa nowo utworzony Urząd Ochrony Państwa (UOP) przejął nadzór nad strategicznymi technologiami i bezpieczeństwem.',
      'Łączność opiera się na telefonach stacjonarnych i budkach na karty magnetyczne; telefonia komórkowa (Centertel) dopiero raczkuje w aglomeracjach.',
    ],
    factsEn: [
      '1990s Poland experiences rapid transition, the end of state censorship, and a boom in private enterprise and small workshops.',
      'Following the dissolution of Communist security services, the new State Protection Office (UOP) assumes intelligence oversight.',
      'Everyday communication relies on landlines and magnetic payphones; cellular networks are only beginning to emerge.',
    ],
  },
  modern: {
    titlePl: 'Realia Epoki i Świata',
    titleEn: 'Era & World Context',
    subtitlePl: 'Współczesność · Cyfrowy ślad i procedury prawne',
    subtitleEn: 'Contemporary · Digital footprint and legal procedures',
    factsPl: [
      'Współczesne śledztwo natychmiast rejestruje cyfrowy ślad: logowania telefonów do stacji BTS, nagrania miejskiego monitoringu CCTV i transakcje bezgotówkowe.',
      'Dostęp do billingów, danych geolokalizacyjnych oraz rewizja lokalu wymagają formalnego nakazu prokuratorskiego lub postanowienia sądu.',
      'Bazy profili DNA i laboratoria kryminalistyczne pozwalają na pewną identyfikację, pod warunkiem zachowania rygorystycznego łańcucha dowodowego.',
    ],
    factsEn: [
      'Modern investigations leave instant digital footprints: cellular tower pings, CCTV footage, and card transactions.',
      'Accessing phone records, geolocation data, or private premises requires strict warrants and judicial authorization.',
      'Forensic DNA databases offer precise identification, provided the chain of custody remains unbroken.',
    ],
  },
};

function resolveEraKey(
  adventureContext?: AdventureContext | null,
  eraContext?: ResolvedEraContext | null
): string {
  const effectiveYear =
    eraContext?.effectiveYear ||
    adventureContext?.activeSceneYear ||
    (adventureContext?.yearRange
      ? Number.parseInt(adventureContext.yearRange.match(/\b\d{4}\b/)?.[0] || '1925', 10)
      : null);

  const country = (
    eraContext?.countryCode ||
    adventureContext?.country ||
    adventureContext?.location ||
    ''
  ).toLowerCase();

  const isPoland =
    country.includes('pl') ||
    country.includes('pol') ||
    country.includes('prl') ||
    country.includes('warszawa') ||
    country.includes('elbląg') ||
    country.includes('kowary') ||
    country.includes('traszyn') ||
    country.includes('głogów');

  const isUk = country.includes('gb') || country.includes('uk') || country.includes('angli') || country.includes('londyn');

  if (effectiveYear != null) {
    if (effectiveYear < 1914) {
      return isUk ? 'gb-1890s' : 'gb-1890s';
    }
    if (effectiveYear >= 1918 && effectiveYear <= 1938) {
      return isPoland ? 'pl-1920s' : 'us-1920s';
    }
    if (effectiveYear >= 1960 && effectiveYear <= 1989) {
      return isPoland ? 'pl-1970s' : 'us-1920s';
    }
    if (effectiveYear >= 1990 && effectiveYear <= 2005) {
      return isPoland ? 'pl-1990s' : 'modern';
    }
    if (effectiveYear > 2005) {
      return 'modern';
    }
  }

  // Fallback po polu era
  const era = (adventureContext?.era || '').toLowerCase();
  if (era === 'prl') return 'pl-1970s';
  if (era === 'gaslight') return 'gb-1890s';
  if (era === 'modern') return 'modern';

  return isPoland ? 'pl-1920s' : 'us-1920s';
}

/**
 * Zwraca zestaw bezspoilerowych faktów i zasad świata dla ekranu przygotowania sesji.
 *
 * Priorytet źródeł:
 * 1. Jawne pole `adventureContext.settingTrivia` (dedykowane fakty per scenariusz).
 * 2. Predefiniowany zestaw faktów epokowych dopasowany do roku i kraju.
 */
export function getSettingTrivia(
  adventureContext?: AdventureContext | null,
  eraContext?: ResolvedEraContext | null,
  locale: 'pl' | 'en' = 'pl'
): SettingTriviaResult {
  const isEn = locale === 'en';
  const customTrivia = adventureContext?.settingTrivia;

  if (Array.isArray(customTrivia) && customTrivia.length > 0) {
    const defaultSubtitle = isEn
      ? 'Historical Context & Period Knowledge'
      : 'Kontekst historyczny i obyczaje epoki';
    return {
      title: isEn ? 'Era & World Context' : 'Realia Epoki i Świata',
      subtitle: defaultSubtitle,
      facts: customTrivia,
    };
  }

  const eraKey = resolveEraKey(adventureContext, eraContext);
  const pack = ERA_FACTS_PACKS[eraKey] || ERA_FACTS_PACKS['us-1920s'];

  return {
    title: isEn ? pack.titleEn : pack.titlePl,
    subtitle: isEn ? pack.subtitleEn : pack.subtitlePl,
    facts: isEn ? pack.factsEn : pack.factsPl,
  };
}

/**
 * Zwraca bezspoilerowy opis przygody dla Badacza.
 */
export function getSafeDossierIntro(
  adventureContext?: AdventureContext | null,
  fallbackDefault = ''
): string {
  if (adventureContext?.investigatorIntro?.trim()) {
    return adventureContext.investigatorIntro.trim();
  }

  const rawDesc = adventureContext?.description?.trim();
  if (!rawDesc) return fallbackDefault;

  // Podział na zdania, wybór maksymalnie 2 pierwszych bez spoilerów
  const sentences = rawDesc.split(/(?<=[.!?])\s+/);
  if (sentences.length > 0) {
    return sentences.slice(0, 2).join(' ').trim();
  }

  return rawDesc;
}
