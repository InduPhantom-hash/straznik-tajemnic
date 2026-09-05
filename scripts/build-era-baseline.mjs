#!/usr/bin/env node

/**
 * @file build-era-baseline.mjs
 * 
 * Pipeline wsadowy (Batch Ingestion Pipeline) dla Strażnika Tajemnic AI.
 * Przetwarza surowe materiały z /Volumes/Karta/Zew - materiały/DeepResearch_Prompty
 * (6 epok x 2 regiony x 16 kategorii) i kompiluje je do wewnętrznej bazy wiedzy:
 *   1. src/lib/era/baseline/runtime-baseline.json (dla silnika gry, preflightu i promptu MG)
 *   2. src/lib/era/baseline/encyclopedia-baseline.json (dla Kompendium Badacza w UI)
 * 
 * Izoluje aplikację od zewnętrznego dysku. Gra działa w 100% na skompilowanym baseline.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SILNIK_SRC = path.join(REPO_ROOT, '_tester', '_base', '.silnik', 'src');
const BASELINE_TARGET_DIR = path.join(SILNIK_SRC, 'lib', 'era', 'baseline');
const EXTERNAL_RESEARCH_DIR = '/Volumes/Karta/Zew - materiały/DeepResearch_Prompty';

// 6 kanonicznych epok z przedziałami lat
const EPOCH_CONFIGS = [
  {
    id: '1890s-gaslight',
    titlePl: 'Epoka Wiktoriańska / Gaslight (1880–1899)',
    titleEn: 'Victorian Era / Gaslight (1880–1899)',
    validFrom: 1880,
    validTo: 1899,
    hardGuardrails: {
      forbiddenTech: [
        'samochód',
        'samochody',
        'smartfon',
        'telefon komórkowy',
        'komputer',
        'laptop',
        'radio domowe',
        'telewizor',
        'tworzywa sztuczne',
        'plastik',
        'długopis kulkowy',
        'latarka elektryczna',
        'broń maszynowa'
      ],
      forbiddenInstitutions: [
        'policja federalna FBI',
        'numer alarmowy 911',
        'numer alarmowy 112',
        'NFZ',
        'pogotowie ratunkowe'
      ],
      forbiddenForensics: [
        'analiza DNA',
        'baza odcisków palców AFIS',
        'cyfrowy monitoring',
        'chromatografia'
      ],
      historicalAlternatives: {
        'smartfon': 'telegraf na poczcie lub list dostarczany przez gońca',
        'telefon': 'telegraf na poczcie lub rzadki aparat stacjonarny w prywatnym klubie dżentelmeńskim',
        'samochód': 'dorożka, powóz konny, fiakier lub pociąg parowy',
        'latarka': 'lampa naftowa, latarnia karbidowa lub pudełko zapałek',
        '911': 'gwizdek na posterunkowego lub posłaniec na lokalny komisariat',
        'test DNA': 'oględziny lekarza medycyny sądowej i sekcja zwłok',
        'komputer': 'ręczne księgi w archiwum miejskim i katalogi fiszkowe w bibliotece'
      }
    }
  },
  {
    id: '1920s-classic',
    titlePl: 'Szalone Lata Dwudzieste / Classic CoC (1920–1929)',
    titleEn: 'Roaring Twenties / Classic CoC (1920–1929)',
    validFrom: 1920,
    validTo: 1929,
    hardGuardrails: {
      forbiddenTech: [
        'smartfon',
        'telefon komórkowy',
        'komórka',
        'komputer',
        'laptop',
        'tablet',
        'internet',
        'wi-fi',
        'gps',
        'nawigacja satelitarna',
        'długopis kulkowy',
        'nylon',
        'tworzywa sztuczne',
        'plastikowa butelka',
        'telewizja'
      ],
      forbiddenInstitutions: [
        'numer 911',
        'numer 112',
        'Centralne Biuro Śledcze',
        'CSI',
        'Interpol'
      ],
      forbiddenForensics: [
        'badania DNA',
        'test DNA',
        'cyfrowa baza odcisków AFIS',
        'monitoring miejski',
        'kamery CCTV'
      ],
      historicalAlternatives: {
        'smartfon': 'telefon stacjonarny przez centralę ręczną, telegram na stacji lub budka miejska',
        'komórka': 'telefon naścienny na korbkę lub telegram Western Union',
        'internet': 'miejska biblioteka publiczna, archiwum lokalnego dziennika lub encyklopedia',
        'gps': 'papierowy przewodnik drogowy (np. Rand McNally) lub mapa topograficzna',
        '911': 'podniesienie słuchawki i prośba do telefonistki: „Połącz z posterunkiem policji”',
        'test DNA': 'badanie grupy krwi A/B/O i oględziny rany przez koronera',
        'długopis': 'wieczne pióro z atramentem lub ołówek kopiowy'
      }
    }
  },
  {
    id: '1940s-noir',
    titlePl: 'Lata Czterdzieste / II Wojna Światowa & Noir (1939–1949)',
    titleEn: 'Forties / World War II & Noir (1939–1949)',
    validFrom: 1939,
    validTo: 1949,
    hardGuardrails: {
      forbiddenTech: [
        'smartfon',
        'komórka',
        'komputer osobisty',
        'laptop',
        'internet',
        'wi-fi',
        'gps',
        'tranzystor',
        'kaseta magnetofonowa',
        'płyta cd'
      ],
      forbiddenInstitutions: [
        'numer 911',
        'numer 112',
        'prywatne agencje detektywistyczne na terenie okupowanym'
      ],
      forbiddenForensics: [
        'badania DNA',
        'cyfrowy AFIS',
        'monitoring CCTV'
      ],
      historicalAlternatives: {
        'smartfon': 'telefon stacjonarny lub dalekopis (telex)',
        'internet': 'kartoteki wojskowe, archiwa miejskie i podsłuch radiowy',
        'gps': 'wojskowa mapa sztabowa i kompas marszowy',
        '911': 'telefon na posterunek żandarmerii lub policji'
      }
    }
  },
  {
    id: '1970s-prl-coldwar',
    titlePl: 'Lata Siedemdziesiąte / PRL & Zimna Wojna (1970–1979)',
    titleEn: 'Seventies / PRL & Cold War (1970–1979)',
    validFrom: 1970,
    validTo: 1979,
    hardGuardrails: {
      forbiddenTech: [
        'smartfon',
        'telefon komórkowy',
        'komórka',
        'laptop',
        'internet',
        'wi-fi',
        'sieć www',
        'gps',
        'płyta cd',
        'dvd',
        'karta bankomatowa',
        'bankomat',
        'płatność kartą'
      ],
      forbiddenInstitutions: [
        'prywatny detektyw',
        'prywatna agencja ochrony',
        'supermarket',
        'hipermarket',
        'numer 112',
        'numer 911',
        'prywatna klinika'
      ],
      forbiddenForensics: [
        'badania DNA',
        'test DNA',
        'cyfrowe bazy danych',
        'monitoring miejski'
      ],
      historicalAlternatives: {
        'smartfon': 'automat telefoniczny na żetony (A/B/C) lub aparat tarczowy w biurze',
        'komórka': 'telefon stacjonarny RWT z tarczą obrotową lub telegram z poczty',
        'internet': 'Biblioteka Narodowa, czytelnia czasopism lub katalog biblioteczny',
        'gps': 'Atlas samochodowy Polski PPWK',
        'karta płatnicza': 'gotówka w złotych (PLZ) lub bony PeKaO w Pewexie',
        'prywatny detektyw': 'zgłoszenie na komisariacie Milicji Obywatelskiej (MO) lub kontakt z informatorem',
        '911': 'telefon pod numer 997 (Milicja) lub 999 (Pogotowie Ratunkowe)',
        'test DNA': 'analiza serologiczna krwi i tradycyjne daktyloskopowanie na tusz'
      }
    }
  },
  {
    id: '1990s-2000s',
    titlePl: 'Lata Dziewięćdziesiąte i 2000 / Transformacja & Y2K (1990–2005)',
    titleEn: 'Nineties & 2000s / Transformation & Y2K (1990–2005)',
    validFrom: 1990,
    validTo: 2005,
    hardGuardrails: {
      forbiddenTech: [
        'smartfon',
        'ekran dotykowy',
        'iphone',
        'android',
        'tablet',
        'powerbank',
        'wi-fi',
        'social media',
        'facebook',
        'instagram',
        'twitter',
        'youtube',
        'blik',
        'nawigacja w telefonie'
      ],
      forbiddenInstitutions: [
        'zintegrowany numer 112 w całym kraju',
        'BLIK'
      ],
      forbiddenForensics: [
        'błyskawiczne badanie DNA w 15 minut',
        'mobilny skaner biometryczny'
      ],
      historicalAlternatives: {
        'smartfon': 'telefon komórkowy z klawiaturą (np. Nokia 3310, Motorola cegła), pager Polpager lub budka na kartę magnetyczną',
        'komórka': 'telefon komórkowy 2G lub budka telefoniczna TP S.A. na kartę chipową/magnetyczną',
        'internet': 'połączenie wdzwaniane dial-up (0202122 TP S.A.), kawiarenka internetowa lub modem 56k',
        'social media': 'kanały IRC, fora dyskusyjne phpBB lub komunikator ICQ / Gadu-Gadu (od 2000 r.)',
        'gps': 'papierowa mapa samochodowa lub atlas miast wydawnictwa Daunpol',
        'blik': 'gotówka z bankomatu Euronet lub wypłata w okienku bankowym',
        'chmura': 'dyskietka 3.5 cala lub płyta CD-R nagrana na nagrywarce x2'
      }
    }
  },
  {
    id: 'modern',
    titlePl: 'Czasy Współczesne (2006–2026)',
    titleEn: 'Contemporary Era (2006–2026)',
    validFrom: 2006,
    validTo: 2026,
    hardGuardrails: {
      forbiddenTech: [
        'technologie po 2026 r.',
        'implanty cybernetyczne'
      ],
      forbiddenInstitutions: [],
      forbiddenForensics: [],
      historicalAlternatives: {}
    }
  }
];

// Standardowe nazwy 16 kategorii tematycznych
const CATEGORY_DEFINITIONS = [
  { id: '01_prawo_i_wymiar_sprawiedliwosci', namePl: 'Prawo i Wymiar Sprawiedliwości', nameEn: 'Law & Justice System' },
  { id: '02_zwyczaje_obyczaje_i_etykieta', namePl: 'Zwyczaje, Obyczaje i Etykieta', nameEn: 'Customs, Manners & Etiquette' },
  { id: '03_relacje_spoleczne_i_klasowosc', namePl: 'Relacje Społeczne i Klasowość', nameEn: 'Social Relations & Class Structure' },
  { id: '04_panstwo_instytucje_i_obywatel', namePl: 'Państwo, Instytucje i Obywatel', nameEn: 'State, Institutions & the Citizen' },
  { id: '05_pozycja_i_prawa_kobiet', namePl: 'Pozycja i Prawa Kobiet', nameEn: 'Position & Rights of Women' },
  { id: '06_grupy_zawodowe_i_prestiz', namePl: 'Grupy Zawodowe i Prestiż', nameEn: 'Occupational Groups & Prestige' },
  { id: '07_mniejszosci_rasizm_i_ksenofobia', namePl: 'Mniejszości, Rasizm i Ksenofobia', nameEn: 'Minorities, Racism & Xenophobia' },
  { id: '08_medycyna_zdrowie_psychiczne_i_trauma', namePl: 'Medycyna, Zdrowie Psychiczne i Trauma', nameEn: 'Medicine, Mental Health & Trauma' },
  { id: '09_technologia_transport_i_komunikacja', namePl: 'Technologia, Transport i Komunikacja', nameEn: 'Technology, Transport & Communication' },
  { id: '10_przestepczosc_podziemie_i_korupcja', namePl: 'Przestępczość, Podziemie i Korupcja', nameEn: 'Crime, Underworld & Corruption' },
  { id: '11_religia_sekty_i_teorie_spiskowe', namePl: 'Religia, Sekty i Teorie Spiskowe', nameEn: 'Religion, Cults & Conspiracy Theories' },
  { id: '12_prasa_media_i_obieg_informacji', namePl: 'Prasa, Media i Obieg Informacji', nameEn: 'Press, Media & Information Flow' },
  { id: '13_gospodarka_ceny_i_koszty_zycia', namePl: 'Gospodarka, Ceny i Koszty Życia', nameEn: 'Economy, Prices & Cost of Living' },
  { id: '14_architektura_przestrzen_i_infrastruktura', namePl: 'Architektura, Przestrzeń i Infrastruktura', nameEn: 'Architecture, Space & Infrastructure' },
  { id: '15_nauka_biblioteki_i_dostep_do_wiedzy', namePl: 'Nauka, Biblioteki i Dostęp do Wiedzy', nameEn: 'Science, Libraries & Knowledge Access' },
  { id: '16_wojsko_sluzby_i_dostep_do_broni', namePl: 'Wojsko, Służby i Dostęp do Broni', nameEn: 'Military, Services & Weapon Access' }
];

function cleanTitle(fileName) {
  return path.basename(fileName, path.extname(fileName))
    .replace(/^(\d+_)+/, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();
}

function extractPromptDetails(promptContent) {
  let context = '';
  let scope = '';
  const lines = promptContent.split('\n');
  let currentSection = '';

  for (const line of lines) {
    if (line.includes('Kontekst Epoki')) {
      currentSection = 'context';
      continue;
    } else if (line.includes('Zakres i Główny Cel')) {
      currentSection = 'scope';
      continue;
    } else if (line.startsWith('####') || line.startsWith('###')) {
      currentSection = '';
    }

    if (currentSection === 'context' && line.trim()) {
      context += (context ? ' ' : '') + line.trim();
    } else if (currentSection === 'scope' && line.trim()) {
      scope += (scope ? ' ' : '') + line.trim();
    }
  }

  return { context, scope };
}

function extractSourcesFromDir(catPath) {
  const sources = [];
  if (!fs.existsSync(catPath)) return sources;

  const entries = fs.readdirSync(catPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('notebooklm-sources')) {
      const subDir = path.join(catPath, entry.name);
      const files = fs.readdirSync(subDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const filePath = path.join(subDir, file);
        const title = cleanTitle(file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8').slice(0, 500);
          const urlMatch = content.match(/url:\s*(https?:\/\/[^\s\n]+)/i);
          const url = urlMatch ? urlMatch[1] : '';
          sources.push({
            id: `src-${sources.length + 1}`,
            title,
            url: url || `internal://notebooklm/${file}`,
            trustLevel: 'curated'
          });
        } catch {
          sources.push({
            id: `src-${sources.length + 1}`,
            title,
            url: `internal://notebooklm/${file}`,
            trustLevel: 'curated'
          });
        }
      }
    }
  }
  return sources;
}

export async function buildEraBaseline() {
  console.log('🏛️  [Era Baseline Pipeline] Rozpoczynanie kompilacji 16 tematów epok...');
  console.log(`📁 Źródło surowe: ${EXTERNAL_RESEARCH_DIR}`);
  console.log(`🎯 Cel baseline: ${BASELINE_TARGET_DIR}`);

  const hasExternalDepot = fs.existsSync(EXTERNAL_RESEARCH_DIR);
  if (!hasExternalDepot) {
    console.warn(`⚠️  Katalog zewnętrzny ${EXTERNAL_RESEARCH_DIR} jest niedostępny (karta niepodłączona).`);
    console.warn('Sprawdzanie czy istniejący baseline w repozytorium jest zachowany...');
    if (fs.existsSync(path.join(BASELINE_TARGET_DIR, 'runtime-baseline.json'))) {
      console.log('✓ Wewnętrzny baseline istnieje. Pomijanie przebudowy.');
      return;
    }
    console.error('❌ Brak zarówno źródeł jak i wewnętrznego baseline!');
    process.exit(1);
  }

  if (!fs.existsSync(BASELINE_TARGET_DIR)) {
    fs.mkdirSync(BASELINE_TARGET_DIR, { recursive: true });
  }

  const runtimeBaseline = {
    $schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    eras: {}
  };

  const encyclopediaBaseline = {
    $schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    eras: {}
  };

  let totalCategoriesProcessed = 0;
  let totalSourcesIndexed = 0;

  for (const epoch of EPOCH_CONFIGS) {
    runtimeBaseline.eras[epoch.id] = {
      id: epoch.id,
      titlePl: epoch.titlePl,
      titleEn: epoch.titleEn,
      validFrom: epoch.validFrom,
      validTo: epoch.validTo,
      regions: {}
    };

    encyclopediaBaseline.eras[epoch.id] = {
      id: epoch.id,
      titlePl: epoch.titlePl,
      titleEn: epoch.titleEn,
      validFrom: epoch.validFrom,
      validTo: epoch.validTo,
      regions: {}
    };

    for (const region of ['PL', 'USA']) {
      const regionDir = path.join(EXTERNAL_RESEARCH_DIR, epoch.id, region);
      const isRegionPresent = fs.existsSync(regionDir);

      const runtimeRegionData = {
        region,
        hardGuardrails: epoch.hardGuardrails,
        categories: {}
      };

      const encyclopediaRegionData = {
        region,
        categories: []
      };

      for (const cat of CATEGORY_DEFINITIONS) {
        totalCategoriesProcessed++;
        const catPath = path.join(regionDir, cat.id);
        const promptPath = path.join(catPath, 'prompt.md');

        let context = '';
        let scope = '';
        if (fs.existsSync(promptPath)) {
          const promptContent = fs.readFileSync(promptPath, 'utf-8');
          const details = extractPromptDetails(promptContent);
          context = details.context;
          scope = details.scope;
        }

        const sources = isRegionPresent ? extractSourcesFromDir(catPath) : [];
        totalSourcesIndexed += sources.length;

        const keyFacts = [];
        if (context) keyFacts.push(context);
        if (scope) keyFacts.push(scope);

        const rulesForKeeper = [
          `W scenach dotyczących '${cat.namePl}' stosuj realia epoki (${epoch.validFrom}–${epoch.validTo}, region: ${region}).`,
          `Nigdy nie wprowadzaj anachronizmów: ${epoch.hardGuardrails.forbiddenTech.slice(0, 4).join(', ')}.`,
          `Gdy gracz próbuje użyć technologii spoza epoki, opisz historyczny odpowiednik.`
        ];

        runtimeRegionData.categories[cat.id] = {
          id: cat.id,
          namePl: cat.namePl,
          nameEn: cat.nameEn,
          keyFacts: keyFacts.slice(0, 5),
          rulesForKeeper,
          sourcesCount: sources.length
        };

        encyclopediaRegionData.categories.push({
          id: cat.id,
          number: cat.id.slice(0, 2),
          namePl: cat.namePl,
          nameEn: cat.nameEn,
          context: context || `Realia historyczne dla kategorii ${cat.namePl} w epoce ${epoch.titlePl}.`,
          scope: scope || `Ramy prawne, procedury i zwyczaje obowiązujące w regionie ${region}.`,
          rulesForKeeper,
          sources: sources.slice(0, 25)
        });
      }

      runtimeBaseline.eras[epoch.id].regions[region] = runtimeRegionData;
      encyclopediaBaseline.eras[epoch.id].regions[region] = encyclopediaRegionData;
    }
  }

  const runtimePath = path.join(BASELINE_TARGET_DIR, 'runtime-baseline.json');
  const encyclopediaPath = path.join(BASELINE_TARGET_DIR, 'encyclopedia-baseline.json');

  fs.writeFileSync(runtimePath, JSON.stringify(runtimeBaseline, null, 2), 'utf-8');
  fs.writeFileSync(encyclopediaPath, JSON.stringify(encyclopediaBaseline, null, 2), 'utf-8');

  console.log(`✓ Zapisano ${runtimePath} (${(fs.statSync(runtimePath).size / 1024).toFixed(1)} KB)`);
  console.log(`✓ Zapisano ${encyclopediaPath} (${(fs.statSync(encyclopediaPath).size / 1024).toFixed(1)} KB)`);
  console.log(`📊 Przetworzono 6 epok x 2 regiony = ${totalCategoriesProcessed} kategorii.`);
  console.log(`📚 Zindeksowano ${totalSourcesIndexed} powiązanych źródeł badawczych.`);
  console.log('🎉 Kompilacja wewnętrznej bazy wiedzy (Baseline) zakończona sukcesem!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildEraBaseline().catch(err => {
    console.error('❌ Błąd pipeline baseline:', err);
    process.exit(1);
  });
}
