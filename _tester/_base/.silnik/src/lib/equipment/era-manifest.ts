/**
 * era-manifest.ts - Manifest katalogu ekwipunku per epoka i audyt brakujących wariantów (Issue #503)
 *
 * SSOT dla fizycznych assetów graficznych ekwipunku w 6 docelowych epokach:
 * 1890s, 1920s, 1930s, 1940s, 1980s, modern.
 *
 * Zasady architektoniczne:
 * 1. Każdy wariant fizyczny przedmiotu należy do dokładnie jednej epoki wizualnej.
 * 2. Pliki -shared.webp są traktowane rygorystycznie jako brak dedykowanego wariantu epokowego ('missing_era_asset').
 * 3. Fallback graficzny dla braków to wyłącznie bezpieczna ikona SVG (/equipment/predefined/<category>.svg).
 * 4. Manifest nie zawiera odwołań -shared ani anachronizmów technologicznych.
 */

import { EQUIPMENT_CATALOG } from '../equipment-catalog';
import type { EquipmentCategory, EquipmentVisualEra, EquipmentTemplate } from '../types';

// ============================================================================
// 1. TYPY I STAŁE DOCELOWYCH EPOK I KATEGORII
// ============================================================================

export const TARGET_ERAS = [
  '1890s',
  '1920s',
  '1930s',
  '1940s',
  '1980s',
  'modern',
] as const;

export type TargetEra = (typeof TARGET_ERAS)[number];

export const PHYSICAL_CATEGORIES = [
  'weapon',
  'tool',
  'medical',
  'personal',
  'occult',
  'armor',
] as const;

export type PhysicalEquipmentCategory = (typeof PHYSICAL_CATEGORIES)[number];

export type EraAssetStatus = 'ready' | 'missing_era_asset';

export interface EraManifestEntry {
  /** Unikalny identyfikator wariantu w formacie <era>.<category>.<slug>, np. 1920s.weapon.revolver-38 */
  id: string;
  /** Identyfikator szablonu bazowego w EQUIPMENT_CATALOG, np. weapon.revolver-38 */
  baseTemplateId: string;
  /** Nazwa przedmiotu w języku polskim */
  name: string;
  /** Nazwa przedmiotu w języku angielskim (jeśli zdefiniowana w aliasach lub manifeście) */
  nameEn?: string;
  /** Kategoria fizyczna przedmiotu */
  category: PhysicalEquipmentCategory;
  /** Docelowa epoka wizualna */
  era: TargetEra;
  /** Status dostępności dedykowanego assetu epokowego */
  assetStatus: EraAssetStatus;
  /**
   * Ścieżka do aktywnego zasobu graficznego:
   * - dla statusu 'ready': dedykowany plik WebP dla tej epoki
   * - dla statusu 'missing_era_asset': bezpieczna ikona SVG (/equipment/predefined/<category>.svg)
   */
  assetPath: string;
  /** Bezpieczny lokalny fallback SVG (nigdy shared.webp) */
  fallbackAsset: string;
  /** Czy przedmiot należy do zestawu priorytetowych próbek przeglądu wizualnego (6 epok x 6 kategorii) */
  isPrioritySample?: boolean;
}

// ============================================================================
// 2. PRIORYTETOWE PRÓBKI (6 KATEGORII X 6 EPOK = 36 WARIANTÓW)
// ============================================================================

export interface PrioritySampleDef {
  category: PhysicalEquipmentCategory;
  baseTemplateId: string;
  itemName: string;
}

export const PRIORITY_SAMPLES: readonly PrioritySampleDef[] = [
  { category: 'tool', baseTemplateId: 'tool.magnifier', itemName: 'Lupa' },
  { category: 'personal', baseTemplateId: 'light.matches', itemName: 'Pudełko zapałek' },
  { category: 'weapon', baseTemplateId: 'weapon.flare-gun', itemName: 'Pistolet sygnalizacyjny' },
  { category: 'medical', baseTemplateId: 'medical.first-aid', itemName: 'Apteczka' },
  { category: 'occult', baseTemplateId: 'occult.candles', itemName: 'Świece' },
  { category: 'armor', baseTemplateId: 'armor.safety-helmet-industrial', itemName: 'Przemysłowy kask ochronny' },
] as const;

/** Style wizualne dla każdej z 6 docelowych epok na potrzeby generacji assetów */
export const ERA_VISUAL_STYLES: Record<TargetEra, { labelPl: string; description: string }> = {
  '1890s': {
    labelPl: 'Epoka wiktoriańska / Gaslight (koniec XIX wieku)',
    description: 'late nineteenth-century materials, patina, period-correct brass/wood/leather construction, Victorian lighting',
  },
  '1920s': {
    labelPl: 'Klasyczne lata 20. / II Rzeczpospolita',
    description: 'interwar Poland and roaring twenties, early mass production, blued steel, worn practical materials, art deco noir',
  },
  '1930s': {
    labelPl: 'Lata 30. / Wielki Kryzys i modernizm przedwojenny',
    description: 'late interwar Poland, mature pre-war industrial design, streamlined bakelite and steel, economic austerity',
  },
  '1940s': {
    labelPl: 'Lata 40. / Okres wojenny i wczesny powojenny',
    description: 'wartime scarcity, repaired and field-worn materials, utilitarian olive canvas, film noir venetian blind lighting',
  },
  '1980s': {
    labelPl: 'Lata 80. / Schyłkowy PRL i zimna wojna',
    description: 'Polish People\'s Republic and late Cold War, utilitarian domestic manufacture, textured matte plastics, institutional realism',
  },
  'modern': {
    labelPl: 'Czasy współczesne (XXI wiek)',
    description: 'contemporary everyday object, clean industrial design, matte polycarbonate, tactical matte black, authentic scale, no retro styling',
  },
};

// ============================================================================
// 3. MAPA DEDYKOWANYCH ZASOBÓW EPOKOWYCH (BEZ -SHARED)
// ============================================================================

/**
 * Rejestr plików assetów, które posiadają dedykowany status dla konkretnej epoki.
 * Jeśli plik zawiera w nazwie przyrostek -shared lub nie odpowiada danej epoce,
 * zostaje bezwzględnie odrzucony i zakwalifikowany jako missing_era_asset.
 */
const KNOWN_ERA_SPECIFIC_ASSETS: Record<string, TargetEra> = {
  // 1890s
  'derringer-1890s.webp': '1890s',
  'oil-lantern-1890s.webp': '1890s',
  'rifle-lee-metford-1890s.webp': '1890s',
  'black-veil-hat.webp': '1890s',
  'flare-gun-1890s.webp': '1890s',
  'magnifier-1890s.webp': '1890s',
  'first-aid-1890s.webp': '1890s',
  'matches-1890s.webp': '1890s',
  'candles-1890s.webp': '1890s',
  'safety-helmet-industrial-1890s.webp': '1890s',

  // 1920s
  'revolver-colt38-1920s.webp': '1920s',
  'revolver-webley-1920s.webp': '1920s',
  'submachine-tommy-1920s.webp': '1920s',
  'flashlight-1920s.webp': '1920s',
  'camera-1920s.webp': '1920s',
  'pilot-goggles-1920s.webp': '1920s',
  'rifle-springfield-1920s.webp': '1920s',
  'nurse-cross-silver.webp': '1920s',
  'flare-gun-1920s.webp': '1920s',
  'magnifier-1920s.webp': '1920s',
  'first-aid-1920s.webp': '1920s',
  'matches-1920s.webp': '1920s',
  'candles-1920s.webp': '1920s',
  'safety-helmet-industrial-1920s.webp': '1920s',

  // 1930s
  'flare-gun-1930s.webp': '1930s',
  'magnifier-1930s.webp': '1930s',
  'first-aid-1930s.webp': '1930s',
  'matches-1930s.webp': '1930s',
  'candles-1930s.webp': '1930s',
  'safety-helmet-industrial-1930s.webp': '1930s',

  // 1940s
  'gasoline-lighter-1940s.webp': '1940s',
  'revolver-1940s.webp': '1940s',
  'trenchcoat-hat-noir.webp': '1940s',
  'flare-gun-1940s.webp': '1940s',
  'magnifier-1940s.webp': '1940s',
  'first-aid-1940s.webp': '1940s',
  'matches-1940s.webp': '1940s',
  'candles-1940s.webp': '1940s',
  'safety-helmet-industrial-1940s.webp': '1940s',

  // 1980s
  'microcassette-dictaphone.webp': '1980s',
  'flare-gun-1980s.webp': '1980s',
  'magnifier-1980s.webp': '1980s',
  'first-aid-1980s.webp': '1980s',
  'matches-1980s.webp': '1980s',
  'candles-1980s.webp': '1980s',
  'safety-helmet-industrial-1980s.webp': '1980s',

  // modern
  'pistol-glock-modern.webp': 'modern',
  'phone-modern.webp': 'modern',
  'power-bank-modern.webp': 'modern',
  'tactical-flashlight-modern.webp': 'modern',
  'multitool-modern.webp': 'modern',
  'digital-dictaphone-modern.webp': 'modern',
  'nightvision-camera-modern.webp': 'modern',
  'dslr-camera-modern.webp': 'modern',
  'satellite-gps-modern.webp': 'modern',
  'satellite-radio-modern.webp': 'modern',
  'rugged-ultrabook-modern.webp': 'modern',
  'rugged-tablet-lidar.webp': 'modern',
  'encrypted-usb-modern.webp': 'modern',
  'tactical-vest-black.webp': 'modern',
  'rugged-hiking-backpack.webp': 'modern',
  'flare-gun-modern.webp': 'modern',
  'magnifier-modern.webp': 'modern',
  'first-aid-modern.webp': 'modern',
  'matches-modern.webp': 'modern',
  'candles-modern.webp': 'modern',
  'safety-helmet-industrial-modern.webp': 'modern',
  'rifle-hk416-modern.webp': 'modern',
  'adrenaline-syringes-modern.webp': 'modern',
  'medical-id-badge.webp': 'modern',
  'climbing-carabiners-modern.webp': 'modern',
};

// ============================================================================
// 4. GENEROWANIE IDENTYFIKATORÓW I REZOLWACJA ASSETÓW
// ============================================================================

/**
 * Tworzy kanoniczny identyfikator wpisu manifestu w formacie <era>.<category>.<slug>.
 * Przykład: 1920s.weapon.revolver-38
 */
export function generateEraManifestId(
  era: TargetEra,
  category: PhysicalEquipmentCategory,
  baseTemplateId: string
): string {
  const dotIdx = baseTemplateId.indexOf('.');
  const rawSlug = dotIdx !== -1 ? baseTemplateId.substring(dotIdx + 1) : baseTemplateId;
  const slug = rawSlug.replace(/-shared$/, '');
  return `${era}.${category}.${slug}`;
}

/**
 * Sprawdza, czy dany szablon posiada dedykowany plik graficzny dla wskazanej epoki.
 * Zwraca status 'ready' wyłącznie dla unikalnych assetów dedykowanych danej epoce.
 * Wszelkie odwołania -shared.webp lub assety obcych epok są rygorystycznie klasyfikowane jako missing_era_asset.
 */
export function resolveEraAssetStatus(
  template: EquipmentTemplate,
  era: TargetEra,
  category: PhysicalEquipmentCategory
): { assetStatus: EraAssetStatus; assetPath: string; fallbackAsset: string } {
  const fallbackAsset = `/equipment/predefined/${category}.svg`;

  // Pobierz bezpośrednią ścieżkę dla danej epoki
  const eraSpecificPath = template.assetPaths?.[era as EquipmentVisualEra];

  if (!eraSpecificPath || typeof eraSpecificPath !== 'string') {
    return {
      assetStatus: 'missing_era_asset',
      assetPath: fallbackAsset,
      fallbackAsset,
    };
  }

  // Bezwzględny zakaz odwołań -shared
  if (eraSpecificPath.includes('-shared')) {
    return {
      assetStatus: 'missing_era_asset',
      assetPath: fallbackAsset,
      fallbackAsset,
    };
  }

  const filename = eraSpecificPath.split('/').pop() || '';

  // Sprawdź czy plik jest zarejestrowany jako dedykowany dla tej epoki
  const designatedEra = KNOWN_ERA_SPECIFIC_ASSETS[filename];
  if (designatedEra) {
    if (designatedEra === era) {
      return {
        assetStatus: 'ready',
        assetPath: eraSpecificPath,
        fallbackAsset,
      };
    } else {
      // Plik należy do innej epoki (np. revolver-webley-1920s w 1890s) - brak wariantu dla bieżącej
      return {
        assetStatus: 'missing_era_asset',
        assetPath: fallbackAsset,
        fallbackAsset,
      };
    }
  }

  // Weryfikacja przyrostka epoki w nazwie pliku
  const eraMatch = filename.match(/-(1890s|1920s|1930s|1940s|1950s|prl-1970s|prl|1980s|1990s|2000s|modern)\.webp$/);
  if (eraMatch) {
    const fileEra = eraMatch[1] === 'prl' ? 'prl-1970s' : eraMatch[1];
    if (fileEra === era) {
      return {
        assetStatus: 'ready',
        assetPath: eraSpecificPath,
        fallbackAsset,
      };
    } else {
      return {
        assetStatus: 'missing_era_asset',
        assetPath: fallbackAsset,
        fallbackAsset,
      };
    }
  }

  // Jeśli plik nie ma sprecyzowanej epoki w nazwie ani rejestrze, nie traktujemy go jako zatwierdzony wariant epokowy
  return {
    assetStatus: 'missing_era_asset',
    assetPath: fallbackAsset,
    fallbackAsset,
  };
}

// ============================================================================
// 5. BUDOWA MANIFESTU SSOT (ERA_MANIFEST)
// ============================================================================

/**
 * Buduje kompletny, deterministyczny manifest wszystkich fizycznych przedmiotów
 * w 6 docelowych epokach, z uwzględnieniem filtrów anachronizmów i bez powoływania się na shared.
 */
export function buildEraManifest(): EraManifestEntry[] {
  const entries: EraManifestEntry[] = [];
  const priorityIdSet = new Set(PRIORITY_SAMPLES.map((s) => s.baseTemplateId));

  for (const template of EQUIPMENT_CATALOG) {
    // 1. Filtr kategorii fizycznych (wyłączenie document i artifact)
    if (!PHYSICAL_CATEGORIES.includes(template.category as PhysicalEquipmentCategory)) {
      continue;
    }

    const category = template.category as PhysicalEquipmentCategory;

    // Pobierz angielską nazwę z aliasów jeśli istnieje (zwykle pierwszy angielski alias)
    const nameEn = template.aliases.find((alias) =>
      alias !== template.name && !/[ąćęłńóśźż]/iu.test(alias) && !alias.includes('.')
    );

    // 2. Przejście przez 6 docelowych epok
    for (const era of TARGET_ERAS) {
      // 3. Filtr anachronizmów: tylko przedmioty faktycznie istniejące w danej epoce
      if (!template.availableIn.includes(era as EquipmentVisualEra)) {
        continue;
      }

      const id = generateEraManifestId(era, category, template.id);
      const { assetStatus, assetPath, fallbackAsset } = resolveEraAssetStatus(template, era, category);
      const isPrioritySample = priorityIdSet.has(template.id);

      entries.push({
        id,
        baseTemplateId: template.id,
        name: template.name,
        nameEn,
        category,
        era,
        assetStatus,
        assetPath,
        fallbackAsset,
        isPrioritySample,
      });
    }
  }

  // Sortowanie stabilne: po epoce, kategorii i ID
  return entries.sort((a, b) => {
    if (a.era !== b.era) {
      return TARGET_ERAS.indexOf(a.era) - TARGET_ERAS.indexOf(b.era);
    }
    if (a.category !== b.category) {
      return PHYSICAL_CATEGORIES.indexOf(a.category) - PHYSICAL_CATEGORIES.indexOf(b.category);
    }
    return a.id.localeCompare(b.id);
  });
}

/** Główny manifest SSOT dostępny w silniku aplikacji */
export const ERA_MANIFEST: EraManifestEntry[] = buildEraManifest();

// ============================================================================
// 6. AGREGACJA STATYSTYK I RAPORTOWANIE BRAKÓW
// ============================================================================

export interface EraCategoryStats {
  total: number;
  ready: number;
  missing: number;
  coveragePct: number;
}

export interface EraGapsSummary {
  eras: Record<
    TargetEra,
    {
      total: number;
      ready: number;
      missing: number;
      coveragePct: number;
      byCategory: Record<PhysicalEquipmentCategory, EraCategoryStats>;
    }
  >;
  byCategoryTotal: Record<PhysicalEquipmentCategory, EraCategoryStats>;
  grandTotal: EraCategoryStats;
}

/**
 * Oblicza agregowane statystyki pokrycia grafikami dla manifestu.
 */
export function getEraManifestStats(manifest: EraManifestEntry[] = ERA_MANIFEST): EraGapsSummary {
  const initStats = (): EraCategoryStats => ({ total: 0, ready: 0, missing: 0, coveragePct: 0 });

  const summary: EraGapsSummary = {
    eras: {} as EraGapsSummary['eras'],
    byCategoryTotal: {} as Record<PhysicalEquipmentCategory, EraCategoryStats>,
    grandTotal: initStats(),
  };

  for (const cat of PHYSICAL_CATEGORIES) {
    summary.byCategoryTotal[cat] = initStats();
  }

  for (const era of TARGET_ERAS) {
    summary.eras[era] = {
      total: 0,
      ready: 0,
      missing: 0,
      coveragePct: 0,
      byCategory: {} as Record<PhysicalEquipmentCategory, EraCategoryStats>,
    };
    for (const cat of PHYSICAL_CATEGORIES) {
      summary.eras[era].byCategory[cat] = initStats();
    }
  }

  for (const entry of manifest) {
    const isReady = entry.assetStatus === 'ready';

    // Per era & category
    const eraStats = summary.eras[entry.era];
    const catStats = eraStats.byCategory[entry.category];
    const globalCatStats = summary.byCategoryTotal[entry.category];

    eraStats.total++;
    catStats.total++;
    globalCatStats.total++;
    summary.grandTotal.total++;

    if (isReady) {
      eraStats.ready++;
      catStats.ready++;
      globalCatStats.ready++;
      summary.grandTotal.ready++;
    } else {
      eraStats.missing++;
      catStats.missing++;
      globalCatStats.missing++;
      summary.grandTotal.missing++;
    }
  }

  // Obliczenie procentów
  const calcPct = (ready: number, total: number) => (total > 0 ? Math.round((ready / total) * 100) : 0);

  summary.grandTotal.coveragePct = calcPct(summary.grandTotal.ready, summary.grandTotal.total);

  for (const cat of PHYSICAL_CATEGORIES) {
    const s = summary.byCategoryTotal[cat];
    s.coveragePct = calcPct(s.ready, s.total);
  }

  for (const era of TARGET_ERAS) {
    const e = summary.eras[era];
    e.coveragePct = calcPct(e.ready, e.total);
    for (const cat of PHYSICAL_CATEGORIES) {
      const c = e.byCategory[cat];
      c.coveragePct = calcPct(c.ready, c.total);
    }
  }

  return summary;
}

// ============================================================================
// 7. GENEROWANIE DOKUMENTU RAPORTU (docs/reports/equipment-era-gaps.md)
// ============================================================================

/**
 * Generuje deterministyczną treść raportu braków wariantów epokowych w Markdown.
 */
export function generateEraGapsReport(manifest: EraManifestEntry[] = ERA_MANIFEST): string {
  const stats = getEraManifestStats(manifest);

  const lines: string[] = [];

  lines.push('# Raport audytu wariantów ekwipunku per epoka (Issue #503)');
  lines.push('');
  lines.push('> Manifest katalogu ekwipunku per epoka oraz zestawienie luk w dedykowanych renderach WebP.');
  lines.push('> Dokument wygenerowany automatycznie na podstawie TypeScript SSOT (`src/lib/equipment/era-manifest.ts`).');
  lines.push('');
  lines.push('## 1. Założenia architektoniczne i polityka assetów');
  lines.push('');
  lines.push('1. **Docelowe 6 epok**: `1890s` (wiktoriańska), `1920s` (klasyczna/II RP), `1930s` (kryzys/modernizm), `1940s` (wojenna/noir), `1980s` (schyłkowy PRL), `modern` (współczesność).');
  lines.push('2. **6 kategorii fizycznych**: `weapon`, `tool`, `medical`, `personal`, `occult`, `armor` (z wyłączeniem dokumentów i traktowaniem unikalnych artefaktów jako osobna ścieżka).');
  lines.push('3. **Format identyfikatora**: `<era>.<category>.<slug>`, np. `1920s.weapon.revolver-38`. Każdy wariant ma gwarantowaną unikalność.');
  lines.push('4. **Rygorystyczna eliminacja -shared**: pliki `-shared.webp` są traktowane jako brak dedykowanego wariantu epokowego (`assetStatus: missing_era_asset`). Brak odwołań do shared w manifeście.');
  lines.push('5. **Bezpieczny fallback**: w przypadku braku dedykowanego renderu epokowego stosowany jest wyłącznie lokalny wektor SVG (`/equipment/predefined/<category>.svg`), bez degradacji do niespójnych grafik z innej epoki.');
  lines.push('6. **Filtr anachronizmów**: manifest uwzględnia wyłącznie przedmioty faktycznie istniejące w danej epoce historycznej.');
  lines.push('');
  lines.push('## 2. Podsumowanie macierzy wariantów (6 epok x 6 kategorii)');
  lines.push('');
  lines.push('| Epoka | Gotowe (ready) | Brakujące (missing) | Łącznie wariantów | Pokrycie | Status graficzny |');
  lines.push('|---|---|---|---|---|---|');

  for (const era of TARGET_ERAS) {
    const e = stats.eras[era];
    const statusNote = e.ready === 0
      ? 'Pilna potrzeba partii renderów'
      : e.coveragePct < 15
        ? 'Dostępne pojedyncze unikalne assety'
        : 'Częściowo pokryta';
    lines.push(`| **${era}** | ${e.ready} | ${e.missing} | ${e.total} | ${e.coveragePct}% | ${statusNote} |`);
  }

  lines.push(`| **ŁĄCZNIE** | **${stats.grandTotal.ready}** | **${stats.grandTotal.missing}** | **${stats.grandTotal.total}** | **${stats.grandTotal.coveragePct}%** | **Gotowych: ${stats.grandTotal.ready} / ${stats.grandTotal.total}** |`);
  lines.push('');
  lines.push('### Macierz szczegółowa: Gotowe / Łącznie (Brakujące)');
  lines.push('');
  lines.push('| Epoka | Broń (`weapon`) | Narzędzia (`tool`) | Medycyna (`medical`) | Osobiste (`personal`) | Okultyzm (`occult`) | Pancerz (`armor`) | Suma epoki |');
  lines.push('|---|---|---|---|---|---|---|---|');

  for (const era of TARGET_ERAS) {
    const e = stats.eras[era];
    const cols = PHYSICAL_CATEGORIES.map((cat) => {
      const c = e.byCategory[cat];
      return `${c.ready}/${c.total} (-${c.missing})`;
    });
    lines.push(`| **${era}** | ${cols.join(' | ')} | **${e.ready}/${e.total}** |`);
  }

  const catTotals = PHYSICAL_CATEGORIES.map((cat) => {
    const c = stats.byCategoryTotal[cat];
    return `**${c.ready}/${c.total}**`;
  });
  lines.push(`| **SUMA** | ${catTotals.join(' | ')} | **${stats.grandTotal.ready}/${stats.grandTotal.total}** |`);
  lines.push('');
  lines.push('## 3. Wykaz 36 próbek priorytetowych (Priority Review Samples)');
  lines.push('');
  lines.push('Zestaw 6 reprezentatywnych przedmiotów fizycznych sprawdzanych przekrojowo w 6 epokach (6 x 6 = 36 wariantów).');
  lines.push('Służy do wzorcowej oceny kierunku artystycznego i spójności stylu przed masowym generowaniem.');
  lines.push('');
  lines.push('| Epoka | Kategoria | Identyfikator | Nazwa przedmiotu | Status | Zasób / Fallback |');
  lines.push('|---|---|---|---|---|---|');

  const priorityEntries = manifest.filter((entry) => entry.isPrioritySample);
  for (const entry of priorityEntries) {
    const statusBadge = entry.assetStatus === 'ready' ? 'READY' : 'MISSING';
    lines.push(`| ${entry.era} | ${entry.category} | \`${entry.id}\` | ${entry.name} | ${statusBadge} | \`${entry.assetPath}\` |`);
  }

  lines.push('');
  lines.push('## 4. Wytyczne do generacji brakujących wariantów');
  lines.push('');
  lines.push('Dla każdego brakującego wariantu (`assetStatus: missing_era_asset`) generowany obraz WebP musi spełniać standardy:');
  lines.push('- **Kadr i kompozycja**: Obiekt przedmiotu dominuje kadr w ujęciu makro/obiektowym, kadr kwadratowy (1:1), brak postaci ludzkich, rąk, napisów, znaków wodnych i elementów z innych epok.');
  lines.push('- **Tło i kontekst epoki**: Dyskretne, klimatyczne podłoże zgodne z epoką (np. zniszczone drewniane biurko detektywa z lat 20., gazeta z lat 40., cerata lub laminat z okresu PRL).');
  lines.push('- **Izolacja epokowa**: Każdy wariant otrzymuje unikalną nazwę `<przedmiot>-<epoka>.webp`. Zakaz ponownego tworzenia assetów wspólnych (`*-shared.webp`).');
  lines.push('');
  lines.push('## 5. Następne kroki');
  lines.push('');
  lines.push('1. Zatwierdzenie estetyki 36 próbek priorytetowych z sekcji 3 przez PO.');
  lines.push('2. Realizacja partii grafik dla epok o najwyższym deficycie (w szczególności `1930s`: 0% gotowych, `1980s`: 1% gotowych, `1940s`: 3% gotowych, `1890s`: 4% gotowych).');
  lines.push('3. Stopniowa aktualizacja manifestu i podmienianie statusów z `missing_era_asset` na `ready` wraz z wprowadzaniem dedykowanych plików WebP.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Zapisuje wygenerowany raport braków do pliku docs/reports/equipment-era-gaps.md.
 * Używa dynamicznego require dla node:fs i node:path, dzięki czemu era-manifest.ts
 * pozostaje czystym modułem SSOT bezpiecznym do importu także w kodzie klienckim Next.js.
 */
export function writeEraGapsReport(customPath?: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');

  let targetPath: string;

  if (customPath) {
    targetPath = customPath;
  } else {
    // Poszukiwanie katalogu docs/reports - priorytet ma korzeń repozytorium projektu
    const cwd = process.cwd();
    const repoRootDir = path.resolve(__dirname, '../../../../../../docs/reports') as string;
    const candidateDirs: string[] = [
      repoRootDir,
      path.resolve(cwd, '../../../docs/reports') as string,
      path.resolve(cwd, 'docs/reports') as string,
    ];

    let resolvedDir = candidateDirs[0];
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        resolvedDir = dir;
        break;
      }
    }

    targetPath = path.join(resolvedDir, 'equipment-era-gaps.md') as string;
  }

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = generateEraGapsReport();
  fs.writeFileSync(targetPath, content, 'utf8');

  return targetPath;
}
