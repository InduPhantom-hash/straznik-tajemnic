/**
 * @file src/lib/era/anachronisms.ts
 * 
 * Silnik detekcji anachronizmów (Anachronism Engine).
 * Analizuje tekst wprowadzony przez gracza pod kątem technologii, instytucji i procedur,
 * które w danym roku historycznym jeszcze nie istniały, i zwraca historyczny odpowiednik.
 */

import { getEraHardGuardrails } from './baseline';

export interface AnachronismDetection {
  detected: boolean;
  term?: string;
  category?: 'tech' | 'institution' | 'forensics';
  reason?: string;
  alternative?: string;
}

interface KeywordRule {
  pattern: RegExp;
  term: string;
  category: 'tech' | 'institution' | 'forensics';
  maxYear: number;
  reasonPl: string;
  alternativePl: string;
  reasonEn: string;
  alternativeEn: string;
  regions?: ('PL' | 'USA')[];
}

/**
 * Zestaw reguł detekcji kluczowych anachronizmów z granicą roku ich wprowadzenia.
 */
const ANACHRONISM_RULES: KeywordRule[] = [
  // 1. Smartfony i urządzenia z ekranem dotykowym
  {
    pattern: /(?:\b|^|\s)(?:smartfon\w*|smartphon\w*|iphone\w*|ajfon\w*|android\w*|tablet(?:em|u|y)?|ipad\w*|smartwatch\w*|smartband\w*|powerbank\w*|ekran\w*\s+dotykow\w*)(?:\b|$|\s)/i,
    term: 'smartfon',
    category: 'tech',
    maxYear: 2006,
    reasonPl: 'Smartfony i ekrany dotykowe pojawiły się dopiero pod koniec pierwszej dekady XXI wieku.',
    alternativePl: 'budka telefoniczna, telefon stacjonarny lub telefon komórkowy z klawiaturą (od lat 90.)',
    reasonEn: 'Smartphones and touchscreens did not exist until the late 2000s.',
    alternativeEn: 'phone booth, landline telephone, or keypad mobile phone (from the 1990s)'
  },
  // 2. Telefonia komórkowa ogółem (przed latami 90.)
  {
    pattern: /(?:\b|^|\s)(?:cell\s*phone\w*|mobile\s*phone\w*|telefon(?:u|em|ie)?\s+komórkow\w*|dzwoni[ęe]\s+z\s+komórki|wyciągam\s+(?:komórkę|telefon\s+komórkowy)|wyjmuję\s+(?:komórkę|telefon\s+komórkowy)|biorę\s+(?:komórkę|telefon\s+komórkowy)|sprawdzam\s+komórk[ęe])(?:\b|$|\s)/i,
    term: 'telefon komórkowy',
    category: 'tech',
    maxYear: 1989,
    reasonPl: 'Powszechna telefonia komórkowa nie była dostępna przed latami 90.',
    alternativePl: 'telefon stacjonarny, budka telefoniczna na monety/karty lub telegraf',
    reasonEn: 'Mobile cellphones were not available before the 1990s.',
    alternativeEn: 'landline telephone, payphone, or telegraph'
  },
  // 3. Wiadomości tekstowe SMS (przed 1992 r.)
  {
    pattern: /(?:\b|^|\s)(?:sms(?:-?a|y|ów)?|pisz[ęe]\s+sms|wysyłam\s+sms)(?:\b|$|\s)/i,
    term: 'wiadomość SMS',
    category: 'tech',
    maxYear: 1991,
    reasonPl: 'Wiadomości tekstowe SMS wprowadzono dopiero w 1992 roku.',
    alternativePl: 'telefon stacjonarny, telegram ekspresowy lub notatka pisemna',
    reasonEn: 'SMS text messaging was not introduced until 1992.',
    alternativeEn: 'landline call, urgent telegram, or written dispatch'
  },
  // 4. Komputery przenośne / laptopy (przed latami 80.)
  {
    pattern: /(?:\b|^|\s)(?:laptop(?:em|a|y)?|notebook(?:em|a|i)?)(?:\b|$|\s)/i,
    term: 'laptop / komputer przenośny',
    category: 'tech',
    maxYear: 1981,
    reasonPl: 'Komputery przenośne (laptopy) nie istniały przed latami 80. XX wieku.',
    alternativePl: 'maszyna do pisania, notatnik papierowy lub stacjonarne archiwum',
    reasonEn: 'Portable laptop computers did not exist before the 1980s.',
    alternativeEn: 'mechanical typewriter, paper notebook, or desktop office archives'
  },
  // 5. Internet i sieć WWW ogółem (przed latami 90.)
  {
    pattern: /(?:\b|^|\s)(?:internet\w*|sieci\s+internetowej|sieci\s+www\b|przeglądark\w*\s+internetow\w*|browse\s+the\s+web|search\s+online)(?:\b|$|\s)/i,
    term: 'sieć internetowa / WWW',
    category: 'tech',
    maxYear: 1990,
    reasonPl: 'Sieć internetowa nie była dostępna publicznie przed latami 90.',
    alternativePl: 'biblioteka miejska, czytelnia prasy lub archiwum miejskie',
    reasonEn: 'The internet was not available to the general public before the 1990s.',
    alternativeEn: 'public library, newspaper archives, or town records'
  },
  // 6. Wyszukiwarki internetowe i Google (przed 1997 r.)
  {
    pattern: /(?:\b|^|\s)(?:google|googluj\w*|wygoogl\w*|wyszukiwark\w*\s+internetow\w*|google\s+it)(?:\b|$|\s)/i,
    term: 'wyszukiwarka Google',
    category: 'tech',
    maxYear: 1997,
    reasonPl: 'Wyszukiwarka Google powstała w 1998 roku.',
    alternativePl: 'katalogi biblioteczne, kartoteki lub wczesne bazy danych',
    reasonEn: 'Google was not launched until 1998.',
    alternativeEn: 'card catalogs, library indexes, or early local directories'
  },
  // 7. Łączność bezprzewodowa Wi-Fi / Bluetooth (przed 1998 r.)
  {
    pattern: /(?:\b|^|\s)(?:wi[- ]?fi|hotspot|bluetooth)(?:\b|$|\s)/i,
    term: 'Wi-Fi / Bluetooth',
    category: 'tech',
    maxYear: 1998,
    reasonPl: 'Łączność bezprzewodowa Wi-Fi i Bluetooth pojawiła się pod koniec lat 90.',
    alternativePl: 'połączenie modemowe (dial-up) lub kabel sieciowy',
    reasonEn: 'Wi-Fi and Bluetooth wireless protocols did not exist before the late 1990s.',
    alternativeEn: 'dial-up telephone modem or local cable connection'
  },
  // 8. Media społecznościowe (przed latami 2000.)
  {
    pattern: /(?:\b|^|\s)(?:tik\s*tok|instagram\w*|insta\b|facebook\w*|social\s*media|twitter|reddit|discord|youtube)(?:\b|$|\s)|(?:wrzucam\s+(?:posta|filmik|na\s+tiktoka|na\s+insta))/i,
    term: 'media społecznościowe',
    category: 'tech',
    maxYear: 2003,
    reasonPl: 'Nowoczesne platformy społecznościowe i wideo nie istniały na przełomie wieków.',
    alternativePl: 'kanały IRC, fora dyskusyjne Usenet, poczta e-mail lub prasa lokalna',
    reasonEn: 'Modern social media platforms did not exist around the turn of the millennium.',
    alternativeEn: 'IRC channels, Usenet newsgroups, personal email, or local periodicals'
  },
  // 9. Aplikacje przewozowe (Uber, Bolt, Lyft)
  {
    pattern: /(?:\b|^|\s)(?:uber(?:a|em)?|zamawiam\s+ubera|zamawiam\s+bolta|jadę\s+boltem|aplikacj\w*\s+bolt|bolt\s+taxi|taxi\s+bolt|lyft(?:a|em)?|carsharing|taxi\s+z\s+aplikacji)(?:\b|$|\s)/i,
    term: 'aplikacja przewozowa (Uber/Bolt)',
    category: 'tech',
    maxYear: 2009,
    reasonPl: 'Aplikacje przewozowe na smartfony nie istniały przed 2010 rokiem.',
    alternativePl: 'zamówienie Radio Taxi przez telefon lub podejście na postój taksówek',
    reasonEn: 'Smartphone rideshare apps were not established before 2010.',
    alternativeEn: 'hailing a traditional street cab or telephoning radio dispatch'
  },
  // 10. Nowoczesne płatności cyfrowe: BLIK / zbliżeniowe
  {
    pattern: /(?:\b|^|\s)(?:blik(?:iem)?|płacę\s+blikiem|płatność\s+zbliżeniow\w*|kart[aąę]\s+zbliżeniow\w*|apple\s*pay|google\s*pay|terminal\s+zbliżeniow\w*)(?:\b|$|\s)/i,
    term: 'płatność zbliżeniowa / BLIK',
    category: 'tech',
    maxYear: 2007,
    reasonPl: 'Płatności zbliżeniowe i BLIK powstały w drugiej dekadzie XXI wieku.',
    alternativePl: 'gotówka (banknoty i bilon), tradycyjna karta płatnicza z paskiem lub czek',
    reasonEn: 'Contactless smartphone payments and instant mobile codes did not exist in this era.',
    alternativeEn: 'cash currency, magnetic stripe payment card, or written check'
  },
  // 11. Nowoczesny e-commerce i automaty paczkowe: Paczkomat InPost
  {
    pattern: /(?:\b|^|\s)(?:paczkomat\w*|inpost|do\s+żabki|w\s+żabce|sklep\w*\s+żabka|hot[- ]?dog\s+z\s+żabki)(?:\b|$|\s)/i,
    term: 'automaty paczkowe / współczesna sieć convenience',
    category: 'tech',
    maxYear: 2008,
    reasonPl: 'Samoobsługowe automaty paczkowe pojawiły się dopiero pod koniec lat 2000.',
    alternativePl: 'urząd pocztowy, punkt nadań ekspresowych lub tradycyjny sklep osiedlowy',
    reasonEn: 'Automated locker parcel networks were introduced in the late 2000s.',
    alternativeEn: 'post office branch, commercial courier depot, or local corner grocery'
  },
  // 12. GPS i nawigacja cyfrowa (przed drugą połową lat 90.)
  {
    pattern: /(?:\b|^|\s)(?:gps\b|nawigacj\w*\s+(?:gps|satelitarn\w*)|satelit\w*\s+gps)(?:\b|$|\s)/i,
    term: 'nawigacja GPS',
    category: 'tech',
    maxYear: 1995,
    reasonPl: 'Cywilna nawigacja satelitarna GPS nie była powszechnie dostępna przed drugą połową lat 90.',
    alternativePl: 'papierowa mapa topograficzna, atlas samochodowy lub kompas',
    reasonEn: 'Civilian GPS satellite navigation was not widely available before the late 1990s.',
    alternativeEn: 'paper road atlas, topographic map, or magnetic compass'
  },
  // 13. Drony konsumenckie, pojazdy elektryczne Tesla, tasery
  {
    pattern: /(?:\b|^|\s)(?:dron(?:a|em|y|ów)?\s+z\s+kamerą|wypuszczam\s+drona|quadcopter|auto\s+tesla|samochód\s+tesla|wsiadam\s+do\s+tesli|jadę\s+tesl[aąę]|taser\w*|paralizator\w*)(?:\b|$|\s)/i,
    term: 'dron z kamerą / pojazd elektryczny Tesla',
    category: 'tech',
    maxYear: 2008,
    reasonPl: 'Komercyjne drony z kamerą i samochody Tesla to technologie z drugiej dekady XXI wieku.',
    alternativePl: 'obserwacja lornetką z dachu, klasyczny samochód spalinowy lub solidna pałka',
    reasonEn: 'Consumer camera drones and modern electric cars are technologies from the 2010s.',
    alternativeEn: 'binocular rooftop observation, conventional automobile, or a heavy walking stick'
  },
  // 14. Kryminalistyka: badania DNA
  {
    pattern: /(?:\b|^|\s)(?:badani\w*\s+dna|test\w*\s+dna|analiz\w*\s+dna|kod\w*\s+dna|próbk\w*\s+dna)(?:\b|$|\s)/i,
    term: 'badania DNA',
    category: 'forensics',
    maxYear: 1986,
    reasonPl: 'Profilowanie genetyczne DNA w kryminalistyce wprowadzono pod koniec lat 80.',
    alternativePl: 'badanie grupy krwi A/B/O, analiza mikroskopowa tkanek i odcisków palców',
    reasonEn: 'Forensic DNA profiling was not introduced until the late 1980s.',
    alternativeEn: 'A/B/O blood typing, microscopic hair/fiber analysis, and manual fingerprinting'
  },
  // 15. Numery alarmowe 911 / 112
  {
    pattern: /(?:\b|^|\s)(?:911\b|112\b|numer\w*\s+alarmow\w*)(?:\b|$|\s)/i,
    term: 'numer alarmowy (911/112)',
    category: 'institution',
    maxYear: 1968,
    reasonPl: 'Zintegrowany numer ratunkowy nie istniał w tej epoce.',
    alternativePl: 'połączenie przez telefonistkę z lokalnym komisariatem policji lub wezwanie dyżurnego',
    reasonEn: 'Integrated emergency dispatch numbers did not exist in this era.',
    alternativeEn: 'asking the central operator to connect to the local police precinct or hospital'
  },
  // 16. Karty płatnicze magnetyczne (przed 1950 r.)
  {
    pattern: /(?:\b|^|\s)(?:kart\w*\s+kredytow\w*|kart\w*\s+płatnicz\w*|karcie\s+kredytowej|terminal\s+płatnicz\w*)(?:\b|$|\s)/i,
    term: 'karta kredytowa / płatnicza',
    category: 'tech',
    maxYear: 1950,
    reasonPl: 'Płatności kartami kredytowymi nie istniały przed latami 50. XX wieku.',
    alternativePl: 'gotówka (banknoty i monety z epoki), książeczka czekowa lub weksel',
    reasonEn: 'Credit card payments did not exist before the 1950s.',
    alternativeEn: 'cash (period bills and coins), bank check, or letter of credit'
  },
  // 17. Syntetyczny nylon (przed 1935 r.)
  {
    pattern: /(?:\b|^|\s)(?:nylon(?:ow\w*|em|u)?)(?:\b|$|\s)/i,
    term: 'nylon syntetyczny',
    category: 'tech',
    maxYear: 1935,
    reasonPl: 'Nylon został wynaleziony przez DuPont w 1935 roku.',
    alternativePl: 'lina konopna, tkanina bawełniana, len lub skóra',
    reasonEn: 'Nylon was invented in 1935.',
    alternativeEn: 'sturdy hemp rope, cotton canvas, or leather straps'
  },
  // 18. Celowniki laserowe (przed 1975 r.)
  {
    pattern: /(?:\b|^|\s)(?:celownik\w*\s+laserow\w*|laser\w*)(?:\b|$|\s)/i,
    term: 'celownik laserowy / laser',
    category: 'tech',
    maxYear: 1965,
    reasonPl: 'Celowniki laserowe i technologia laserowa nie były dostępne w broni przed drugą połową XX wieku.',
    alternativePl: 'tradycyjna muszka i szczerbinka lub luneta optyczna',
    reasonEn: 'Laser sights were not developed for firearms until the late 20th century.',
    alternativeEn: 'iron sights, peep sights, or optical telescopic scope'
  },
  // 19. Samochody spalinowe w epoce wiktoriańskiej (przed 1900 r.)
  {
    pattern: /(?:\b|^|\s)(?:samochód\w*|samochod\w*|samochodzie|auto\b|auta\b|autem\b)(?:\b|$|\s)/i,
    term: 'samochód spalinowy',
    category: 'tech',
    maxYear: 1899,
    reasonPl: 'W epoce wiktoriańskiej samochody spalinowe nie były powszechnie dostępne.',
    alternativePl: 'dorożka, powóz konny, fiakier lub pociąg parowy',
    reasonEn: 'Automobiles were not commercially available or common in the Victorian era.',
    alternativeEn: 'horse-drawn carriage, hansom cab, or steam locomotive'
  },
  // 20. Prywatny detektyw w PRL
  {
    pattern: /(?:\b|^|\s)(?:prywatn\w*\s+detektyw\w*|biur\w*\s+detektywistyczn\w*|agencj\w*\s+detektywistyczn\w*)(?:\b|$|\s)/i,
    term: 'prywatny detektyw',
    category: 'institution',
    maxYear: 1989,
    regions: ['PL'],
    reasonPl: 'W PRL prywatna działalność detektywistyczna była nielegalna (monopol państwowy MO i SB).',
    alternativePl: 'kontakt z funkcjonariuszem Milicji Obywatelskiej (MO), adwokatem lub zaufanym informatorem',
    reasonEn: 'Private detective agencies were illegal in socialist Poland (state police monopoly).',
    alternativeEn: 'contacting a trusted Milicja officer, investigative journalist, or legal advocate'
  }
];

/**
 * Wykrywa anachronizmy w tekście gracza dla wskazanego roku i regionu.
 */
export function detectAnachronism(
  text: string,
  year: number,
  countryOrRegion = 'US',
  locale: 'pl' | 'en' = 'pl'
): AnachronismDetection | null {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  const normRegion = (countryOrRegion ?? '').toUpperCase().trim();
  const isPl = normRegion === 'PL' || normRegion === 'POLSKA' || normRegion === 'POLAND';
  const regionCode: 'PL' | 'USA' = isPl ? 'PL' : 'USA';

  // 1. Sprawdzenie reguł słownikowych
  for (const rule of ANACHRONISM_RULES) {
    if (year <= rule.maxYear) {
      if (rule.regions && !rule.regions.includes(regionCode)) {
        continue;
      }
      if (rule.pattern.test(text)) {
        return {
          detected: true,
          term: rule.term,
          category: rule.category,
          reason: locale === 'en' ? rule.reasonEn : rule.reasonPl,
          alternative: locale === 'en' ? rule.alternativeEn : rule.alternativePl
        };
      }
    }
  }

  // 2. Dodatkowa weryfikacja z hardGuardrails z baseline'u
  const guardrails = getEraHardGuardrails(year, countryOrRegion);
  if (guardrails) {
    const lowerText = text.toLowerCase();
    for (const forbidden of guardrails.forbiddenTech) {
      if (forbidden.length > 3 && lowerText.includes(forbidden.toLowerCase())) {
        const alt = guardrails.historicalAlternatives[forbidden] || 'tradycyjne metody z epoki';
        return {
          detected: true,
          term: forbidden,
          category: 'tech',
          reason: locale === 'en'
            ? `Technology '${forbidden}' did not exist or was unavailable in ${year}.`
            : `Technologia '${forbidden}' nie istniała lub nie była dostępna w ${year} roku.`,
          alternative: alt
        };
      }
    }
  }

  return null;
}
