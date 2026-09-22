#!/usr/bin/env node

/**
 * scripts/audit-equipment-assets.mjs
 *
 * Deterministyczny audyt pokrycia i poprawności historycznej assetów ekwipunku (Issue #469):
 * 1. Skanuje szablony katalogu (EQUIPMENT_CATALOG), presety postaci (46 presetów, 264 przedmioty),
 *    wyposażenie zawodowe (OCCUPATION_EQUIPMENT) oraz przedmioty scenariuszowe.
 * 2. Bada poprawność semantyczną i anachronizmy (np. aparat 1920s w PRL, dowód tożsamości jako list).
 * 3. Weryfikuje istnienie plików WebP i ikon SVG na dysku.
 * 4. Generuje maszynowy raport JSON (equipment-audit-matrix.json).
 * 5. Generuje interaktywny arkusz kontaktowy HTML (review-era-consistency.html) z podglądem i gotowymi promptami OpenAI pod Herdr.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SILNIK_DIR = path.join(REPO_ROOT, '_tester/_base/.silnik');
const PUBLIC_DIR = path.join(SILNIK_DIR, 'public');
const AUDIT_DIR = path.join(REPO_ROOT, 'docs/audits/equipment');

// Inicjalizacja sucrase dla importu modułów TypeScript
const customRequire = createRequire(path.join(SILNIK_DIR, 'src/lib/equipment-catalog.ts'));
const sucrase = customRequire('sucrase');

function loadTs(file) {
  const code = fs.readFileSync(file, 'utf8');
  const compiled = sucrase.transform(code, { transforms: ['typescript', 'imports'] }).code;
  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'require', compiled);
  fn(m, m.exports, (spec) => {
    if (spec.startsWith('@/')) {
      const rel = spec.replace(/^@\//, '');
      const fullPath = path.resolve(SILNIK_DIR, 'src', rel);
      if (fs.existsSync(fullPath + '.ts')) return loadTs(fullPath + '.ts');
      if (fs.existsSync(fullPath + '.tsx')) return loadTs(fullPath + '.tsx');
      if (fs.existsSync(fullPath + '.js')) return customRequire(fullPath + '.js');
    }
    if (spec.startsWith('.')) {
      const fullPath = path.resolve(path.dirname(file), spec);
      if (fs.existsSync(fullPath + '.ts')) return loadTs(fullPath + '.ts');
      if (fs.existsSync(fullPath + '.tsx')) return loadTs(fullPath + '.tsx');
      if (fs.existsSync(fullPath + '.js')) return customRequire(fullPath + '.js');
    }
    return customRequire(spec);
  });
  return m.exports;
}

// Ładowanie modułów
const catalogMod = loadTs(path.join(SILNIK_DIR, 'src/lib/equipment-catalog.ts'));
const predefinedMod = loadTs(path.join(SILNIK_DIR, 'src/lib/immersion/predefined-characters.ts'));
const strefa11Mod = loadTs(path.join(SILNIK_DIR, 'src/lib/immersion/strefa-11-characters.ts'));
const occMod = loadTs(path.join(SILNIK_DIR, 'src/lib/equipment-data.ts'));

const { EQUIPMENT_CATALOG, findEquipmentTemplate, resolveCatalogAsset, applyCatalogTemplate, safeResolveVisualEra } = catalogMod;
const { PREDEFINED_CHARACTERS } = predefinedMod;
const { STREFA_11_CHARACTERS } = strefa11Mod;
const { OCCUPATION_EQUIPMENT } = occMod;

// Baza gotowych promptów OpenAI (DALL-E 3) dla brakujących grafik (Partia 5 + nowe warianty epokowe z Issue #469)
const QUEUED_PROMPTS = {
  // 1. Nowe szablony zidentyfikowane w Issue #469
  'document.id-card.prl': {
    filename: 'id-card-prl.webp',
    name: 'Dowód osobisty PRL',
    nameEn: 'Polish PRL Identity Card',
    era: 'prl-1970s',
    category: 'document',
    prompt: 'Photorealistic authentic period object study of an official Polish People\'s Republic green vinyl identity booklet (Dowód Osobisty PRL) from the 1970s with gold embossed socialist emblem (eagle without crown), resting on a scratched dark mahogany bureau next to an official stamped document, authentic period patina, directional office side lighting, square composition, macro detail, no hands, no people, no fictional text',
  },
  'document.id-card.1920s': {
    filename: 'id-card-1920s.webp',
    name: 'Legitymacja / Dowód tożsamości (lata 20.)',
    nameEn: '1920s Identification Papers Booklet',
    era: '1920s',
    category: 'document',
    prompt: 'Photorealistic period object study of a 1920s folded linen-textured personal identification certificate booklet with aged paper, sepia photographic plate corner, purple circular ink tax stamps, resting on a worn oak detective desk beside brass paperclips, moody chiaroscuro lighting, authentic 1920s noir atmosphere, square composition, macro texture, no hands, no people',
  },
  'document.id-card.modern': {
    filename: 'id-card-modern.webp',
    name: 'Plastikowy dowód tożsamości (współczesny)',
    nameEn: 'Modern Polycarbonate ID Card',
    era: 'modern',
    category: 'document',
    prompt: 'Photorealistic macro product study of a contemporary European polycarbonate smart ID card with holographic overlay and embedded biometric microchip, resting on a matte dark slate counter next to an RFID key fob, crisp documentary studio lighting, sharp edges, square composition, no hands, no people, no real personal data',
  },
  'document.id-card.1890s': {
    filename: 'id-card-1890s.webp',
    name: 'Paszport / Bilet wizytowy wiktoriański',
    nameEn: 'Victorian Identity Paper & Calling Card',
    era: '1890s',
    category: 'document',
    prompt: 'Photorealistic late Victorian 1890s period object study of an ornate folded parchment British passport folio with red wax seal and steel-nib handwritten flourishes, resting on dark green baize felt beside an engraved mother-of-pearl calling card case, dramatic gaslight directional illumination, square composition, macro details, no hands, no people',
  },
  'tool.camera.prl': {
    filename: 'camera-prl.webp',
    name: 'Aparat fotograficzny Zenit / Zorka (PRL)',
    nameEn: 'PRL 35mm SLR Camera (Zenit)',
    era: 'prl-1970s',
    category: 'tool',
    prompt: 'Photorealistic period object study of a 1970s Soviet-era Zenit-E 35mm chrome and black leatherette SLR camera with Helios 44-2 lens and leather neck strap, resting on a worn laminate desk beside an orange Agfa film canister, stark institutional side lighting, Poland in the 1970s PRL documentary aesthetic, square composition, macro photography, no hands, no people',
  },
  'tool.camera.1890s': {
    filename: 'camera-1890s.webp',
    name: 'Wiktoriański aparat skrzynkowy / miechowy',
    nameEn: 'Victorian Mahogany Field Camera',
    era: '1890s',
    category: 'tool',
    prompt: 'Photorealistic 1890s period object study of a polished mahogany and lacquered brass folding field camera with burgundy leather bellows and a Petzval brass barrel lens, resting on a wooden drafting table beside a glass plate negative, warm directional gaslamp lighting, authentic Victorian patina, square composition, macro details, no hands, no people',
  },
  'tool.batteries-aa': {
    filename: 'batteries-aa.webp',
    name: 'Zapasowe baterie alkaliczne R6/AA',
    nameEn: 'Alkaline AA Batteries Pack',
    era: 'modern',
    category: 'tool',
    prompt: 'Photorealistic macro studio product study of four cylindrical black and gold industrial alkaline AA batteries resting together on a dark carbon-fiber textured surface, crisp directional lighting highlighting metallic terminals and brushed casing, square composition, clean technical aesthetic, no hands, no people, no text',
  },

  // 2. Kolejka Partii 5 (22 szablony z README.md)
  'tool.thermometer': {
    filename: 'thermometer-vintage.webp',
    name: 'Termometr laboratoryjny',
    nameEn: 'Vintage Laboratory Glass Thermometer',
    era: '1920s',
    category: 'tool',
    prompt: 'Photorealistic period object study of a vintage glass mercury laboratory thermometer with etched graduation marks in brass protective sleeve, resting on a worn laboratory slate bench next to a glass beaker, dramatic side lighting, square composition, macro details, no hands, no people',
  },
  'tool.photo-tripod': {
    filename: 'photo-tripod-vintage.webp',
    name: 'Statyw fotograficzny',
    nameEn: 'Vintage Wooden Camera Tripod',
    era: '1920s',
    category: 'tool',
    prompt: 'Photorealistic period object study of a compact folding wooden and brass field photography tripod with geared head, collapsed and resting on dark canvas next to leather straps, soft studio directional light, authentic 1920s craftsmanship patina, square composition, no hands, no people',
  },
  'tool.photo-plates': {
    filename: 'photo-plates-vintage.webp',
    name: 'Klisze i płyty fotograficzne',
    nameEn: 'Glass Photographic Plates Box',
    era: '1920s',
    category: 'tool',
    prompt: 'Photorealistic period object study of an authentic cardboard box of 1920s dry glass photographic plates with red caution label, accompanied by two exposed glass negatives showing ghostly architecture, resting on a dark wood darkroom table, dim amber darkroom safelight ambience, square composition, no hands, no people',
  },
  'tool.trowel-brush': {
    filename: 'trowel-brush-field.webp',
    name: 'Pędzel i kielnia archeologiczna',
    nameEn: 'Archaeological Trowel & Dusting Brush',
    era: '1920s',
    category: 'tool',
    prompt: 'Photorealistic object study of a forged steel Marshalltown pointing trowel with smooth wooden handle and a horsehair dusting brush, dusted with fine dry excavation silt, resting on a folded field canvas tarp, natural outdoor documentary lighting, square composition, macro details, no hands, no people',
  },
  'tool.lab-equipment': {
    filename: 'lab-equipment-vintage.webp',
    name: 'Sprzęt laboratoryjny (kolby i pipety)',
    nameEn: 'Vintage Chemistry Glassware Kit',
    era: '1920s',
    category: 'tool',
    prompt: 'Photorealistic period object study of early 20th century laboratory chemistry glassware including an Erlenmeyer flask with amber chemical residue, a glass pipette, and a small brass spirit burner on a fireproof ceramic tile, moody laboratory directional light, square composition, no hands, no people',
  },
  'tool.typewriter': {
    filename: 'typewriter-vintage.webp',
    name: 'Maszyna do pisania',
    nameEn: 'Portable Mechanical Typewriter',
    era: '1920s',
    category: 'tool',
    prompt: 'Photorealistic period object study of a black enamel 1920s Underwood portable mechanical typewriter with round glass-topped keys and worn black-red ribbon, resting on a dark walnut writer\'s desk with a blank sheet of aged cream paper in the carriage, moody noir desk lamp lighting, square composition, macro details, no hands, no people',
  },
  'document.source-books': {
    filename: 'source-books-stack.webp',
    name: 'Książki źródłowe i leksykony',
    nameEn: 'Stack of Antique Reference Tomes',
    era: '1920s',
    category: 'document',
    prompt: 'Photorealistic period object study of three heavy leather-bound antique reference volumes stacked neatly with embossed gold spine lettering and marbleized endpapers, resting on an oak library carrel table, warm scholarly library lighting, square composition, macro texture, no hands, no people',
  },
  'document.library-card': {
    filename: 'library-card-vintage.webp',
    name: 'Karta biblioteczna i rewers',
    nameEn: 'Vintage Miskatonic Library Card',
    era: '1920s',
    category: 'document',
    prompt: 'Photorealistic period object study of a heavy manila library catalog borrowing card stamped with red ink return dates, resting on an aged green library book cover beside a sharpened pencil with brass ferrule, warm desk lighting, square composition, macro focus, no hands, no people',
  },
  'document.bible': {
    filename: 'bible-vintage.webp',
    name: 'Biblia / modlitewnik',
    nameEn: 'Pocket Leather Prayer Book',
    era: '1920s',
    category: 'document',
    prompt: 'Photorealistic period object study of a compact pocket Bible in black morocco leather with gilded page edges and a worn purple silk ribbon marker, resting on an aged church pew wood surface, atmospheric ecclesiastical directional light, square composition, macro details, no hands, no people',
  },
  'document.music-sheets': {
    filename: 'music-sheets-vintage.webp',
    name: 'Nuty i partytury',
    nameEn: 'Antique Classical Sheet Music',
    era: '1920s',
    category: 'document',
    prompt: 'Photorealistic period object study of handwritten and engraved classical sheet music on aged yellowed rag paper with ink dynamics and pencil annotations, resting on a polished dark grand piano music stand, soft artistic side lighting, square composition, macro details, no hands, no people',
  },
  'document.script': {
    filename: 'theater-script-vintage.webp',
    name: 'Scenariusz teatralny',
    nameEn: 'Bound Theater Play Script',
    era: '1920s',
    category: 'document',
    prompt: 'Photorealistic period object study of a typed theatrical play script bound with brass split-pin brads in heavy blue card stock covers, red pencil stage directions marked in margins, resting on a dressing room wooden table next to a glass tumbler, dramatic stage backlighting, square composition, no hands, no people',
  },
  'weapon.police-baton': {
    filename: 'police-baton-vintage.webp',
    name: 'Pałka policyjna',
    nameEn: 'Vintage Hardwood Police Truncheon',
    era: '1920s',
    category: 'weapon',
    prompt: 'Photorealistic period object study of a heavy turned hickory wood British police truncheon with ribbed grip and a worn leather wrist thong, resting on a weathered police station counter, documentary side lighting, authentic scuffs and wood patina, square composition, macro details, no hands, no people',
  },
  'personal.car-keys': {
    filename: 'car-keys-vintage.webp',
    name: 'Kluczyki do samochodu',
    nameEn: 'Vintage Automobile Keys on Ring',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of two notched brass automobile ignition keys on a worn split iron ring with an embossed leather fob, resting on a polished lacquered dashboard wood veneer, crisp side lighting, authentic brass tarnish, square composition, macro details, no hands, no people',
  },
  'personal.art-pencils': {
    filename: 'art-pencils-charcoal.webp',
    name: 'Ołówki i węgiel rysunkowy',
    nameEn: 'Charcoal Sticks & Drawing Pencils Set',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of natural vine charcoal sticks, graphite drawing pencils, and a kneaded putty eraser resting in an open tin box with charcoal dust smudges on thick textured watercolor paper, soft atelier natural window light, square composition, macro details, no hands, no people',
  },
  'personal.palette-brushes': {
    filename: 'palette-brushes-set.webp',
    name: 'Paleta i pędzle malarskie',
    nameEn: 'Artist Wooden Palette & Oil Brushes',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of a kidney-shaped polished wooden artist\'s thumb palette smeared with dried oil paint pigments, accompanied by three hog-bristle filbert brushes resting across it, authentic bohemian artist studio lighting, square composition, rich impasto texture, no hands, no people',
  },
  'personal.sports-gear': {
    filename: 'sports-gear-vintage.webp',
    name: 'Strój sportowy i rękawice',
    nameEn: 'Vintage Leather Boxing Gloves & Towel',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of a pair of worn dark brown lace-up leather boxing gloves resting on a coarse wooden gym locker bench next to athletic hand wraps, dramatic gym lighting with atmospheric dust motes, authentic leather patina, square composition, macro details, no hands, no people',
  },
  'personal.sports-bag': {
    filename: 'sports-bag-vintage.webp',
    name: 'Torba sportowa',
    nameEn: 'Vintage Heavy Canvas Duffel Bag',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of a heavy olive-drab canvas athletic duffel bag with thick brass zipper and saddle leather carrying handles, resting on gym locker floor planks, directional natural window light, square composition, macro texture, no hands, no people',
  },
  'personal.towel': {
    filename: 'towel-cotton-vintage.webp',
    name: 'Ręcznik bawełniany',
    nameEn: 'Folded Coarse Cotton Towel',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of a neatly rolled heavy unbleached waffle-weave cotton towel with subtle blue woven border stripe, resting on an enamel washstand counter next to a plain white porcelain shaving bowl, clean daylight illumination, square composition, macro textile detail, no hands, no people',
  },
  'personal.musical-instrument': {
    filename: 'violin-case-vintage.webp',
    name: 'Instrument muzyczny (skrzypce)',
    nameEn: 'Antique Violin Resting in Velvet Case',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of a varnished maple violin with horsehair bow, resting inside an open plush dark green velvet-lined leather instrument case, warm classical spotlight, amber varnish reflections, square composition, macro craftsmanship details, no hands, no people',
  },
  'personal.makeup-kit': {
    filename: 'makeup-kit-vintage.webp',
    name: 'Zestaw do charakteryzacji',
    nameEn: 'Vintage Theatrical Greasepaint Kit',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of a vintage open metal makeup tin containing tubes of theatrical greasepaint, spirit gum bottle, and powder puffs on an antique vanity table beside a round bevelled glass mirror, warm incandescent dressing room illumination, square composition, no hands, no people',
  },
  'personal.overalls': {
    filename: 'work-overalls-vintage.webp',
    name: 'Kombinezon roboczy',
    nameEn: 'Folded Heavy Denim Work Overalls',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of folded heavy indigo selvedge denim mechanic overalls with brass embossed buttons and subtle engine oil marks, resting on an industrial steel workbench next to iron wrenches, dramatic workshop side lighting, square composition, macro denim weave, no hands, no people',
  },
  'personal.blanket': {
    filename: 'wool-blanket-vintage.webp',
    name: 'Wełniany koc',
    nameEn: 'Folded Heavy Military Wool Blanket',
    era: '1920s',
    category: 'personal',
    prompt: 'Photorealistic period object study of a thick charcoal-gray folded military wool blanket with overcast stitched edges and faint woven stripe, resting on a rustic pine bunk board, soft directional documentary light, rich tactile wool fuzz texture, square composition, macro details, no hands, no people',
  },
};

// Funkcja audytująca pojedynczy wpis
function auditItem(item, context = {}) {
  const { era = '1920s', characterName = '', occupation = '', source = 'catalog' } = context;
  const visualEra = safeResolveVisualEra(era);
  const template = findEquipmentTemplate(item.templateId ?? item.name, item.category);

  let templateId = template?.id ?? item.templateId ?? null;
  let category = item.category ?? template?.category ?? 'personal';
  let resolvedAsset = template ? resolveCatalogAsset(template, visualEra) : item.imageUrl;
  
  // Weryfikacja istnienia na dysku
  let diskFileExists = false;
  let diskFilePath = null;
  if (resolvedAsset) {
    diskFilePath = path.join(PUBLIC_DIR, resolvedAsset.replace(/^\//, ''));
    diskFileExists = fs.existsSync(diskFilePath);
  }

  // Wykrywanie problemów
  let isAnachronism = false;
  let isSemanticMismatch = false;
  let issueDescription = null;
  let promptData = null;

  // Sprawdzenie promptu z bazy
  const promptKey = `${templateId}.${visualEra}`;
  if (QUEUED_PROMPTS[promptKey]) {
    promptData = QUEUED_PROMPTS[promptKey];
  } else if (templateId && QUEUED_PROMPTS[templateId]) {
    promptData = QUEUED_PROMPTS[templateId];
  }

  // Reguły detekcji anachronizmów i błędnych mapowań
  const normName = (item.name || '').toLowerCase();
  
  if (normName.includes('tożsamości') || normName.includes('dowód') || normName.includes('legitymacja')) {
    if (resolvedAsset && resolvedAsset.includes('letter')) {
      isSemanticMismatch = true;
      issueDescription = 'Błąd semantyczny: Dokumenty tożsamości przedstawione jako zalakowany list w kopercie (letter-shared.webp)';
    }
  }

  if (normName.includes('aparat') && !normName.includes('oddechowy')) {
    if (visualEra === 'prl-1970s' && resolvedAsset && resolvedAsset.includes('1920s')) {
      isAnachronism = true;
      issueDescription = 'Anachronizm epokowy: Aparat fotograficzny w PRL (lata 70.) używa miechowego aparatu z lat 20. (camera-1920s.webp)';
    }
    if ((visualEra === '1890s' || visualEra.includes('gaslight')) && resolvedAsset && resolvedAsset.includes('1920s')) {
      isAnachronism = true;
      issueDescription = 'Anachronizm epokowy: Aparat w epoce wiktoriańskiej używa modelu z lat 20.';
    }
    if (visualEra === '1990s' && resolvedAsset && resolvedAsset.includes('1920s')) {
      isAnachronism = true;
      issueDescription = 'Anachronizm epokowy: Aparat z fleszem w latach 90. używa modelu z lat 20.';
    }
  }

  if (normName.includes('baterie') && resolvedAsset && resolvedAsset.includes('flashlight')) {
    isSemanticMismatch = true;
    issueDescription = 'Błąd semantyczny: Baterie AA przedstawione jako latarka z lat 20. (flashlight-1920s.webp)';
  }

  // Określenie statusu
  let status = 'UNKNOWN';
  if (isSemanticMismatch) {
    status = 'SEMANTIC_MISMATCH';
  } else if (isAnachronism) {
    status = 'ANACHRONISM';
  } else if (resolvedAsset && resolvedAsset.endsWith('.webp') && diskFileExists) {
    status = 'OK_WEBP';
  } else if (!resolvedAsset || resolvedAsset.endsWith('.svg') || resolvedAsset.includes('/predefined/')) {
    status = 'FALLBACK_ICON';
  } else if (resolvedAsset && !diskFileExists) {
    status = 'MISSING_FILE';
  }

  return {
    name: item.name,
    nameEn: template?.aliases?.find(a => /^[A-Z][a-zA-Z0-9 &.,'-]+$/.test(a)) ?? template?.name ?? item.name,
    category,
    era,
    visualEra,
    characterName,
    occupation,
    source,
    templateId,
    resolvedAsset: resolvedAsset ?? `/equipment/predefined/${category}.svg`,
    diskFileExists,
    status,
    isAnachronism,
    isSemanticMismatch,
    issueDescription,
    prompt: promptData?.prompt ?? null,
    targetFilename: promptData?.filename ?? null,
  };
}

// Główna funkcja wykonawcza
export function runEquipmentAudit() {
  console.log('🔍 Rozpoczynam deterministyczny audyt assetów ekwipunku CoC 7e RAW...');

  const auditResults = [];

  // 1. Audyt 46 Presetów Badaczy (264 przedmioty)
  const allPresets = [...PREDEFINED_CHARACTERS, ...STREFA_11_CHARACTERS];
  allPresets.forEach((character) => {
    (character.equipment ?? []).forEach((item) => {
      const audited = auditItem(item, {
        era: character.era,
        characterName: character.name,
        occupation: character.occupation,
        source: 'preset',
      });
      auditResults.push(audited);
    });
  });

  // 2. Audyt 30 Zawodów (OCCUPATION_EQUIPMENT)
  Object.entries(OCCUPATION_EQUIPMENT).forEach(([occId, occKit]) => {
    (occKit.items ?? []).forEach((itemName) => {
      const audited = auditItem({ name: itemName }, {
        era: '1920s',
        occupation: occKit.name,
        source: 'occupation',
      });
      auditResults.push(audited);
    });
  });

  // 3. Audyt wszystkich wzorców w EQUIPMENT_CATALOG (w tym test per epoka dla kluczowych kategorii)
  const erasToTest = ['1890s', '1920s', 'prl-1970s', '1990s', 'modern'];
  EQUIPMENT_CATALOG.forEach((template) => {
    erasToTest.forEach((era) => {
      if (!template.availableIn || template.availableIn.includes(era)) {
        const audited = auditItem({ name: template.name, templateId: template.id, category: template.category }, {
          era,
          source: 'catalog_template',
        });
        auditResults.push(audited);
      }
    });
  });

  // Agregacja i statystyki
  const uniqueItemsMap = new Map();
  auditResults.forEach((r) => {
    const key = `${r.templateId ?? r.name}__${r.visualEra}`;
    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, r);
    }
  });
  const uniqueAuditedItems = Array.from(uniqueItemsMap.values());

  const stats = {
    totalScannedInstances: auditResults.length,
    presetInstances: allPresets.reduce((acc, c) => acc + (c.equipment?.length ?? 0), 0),
    uniqueAuditedSlots: uniqueAuditedItems.length,
    okWebpCount: uniqueAuditedItems.filter((i) => i.status === 'OK_WEBP').length,
    fallbackIconCount: uniqueAuditedItems.filter((i) => i.status === 'FALLBACK_ICON').length,
    semanticMismatches: uniqueAuditedItems.filter((i) => i.status === 'SEMANTIC_MISMATCH').length,
    anachronisms: uniqueAuditedItems.filter((i) => i.status === 'ANACHRONISM').length,
    readyPromptsCount: Object.keys(QUEUED_PROMPTS).length,
  };

  console.log(`📊 Wyniki audytu:`);
  console.log(`   - Przeskanowane wystąpienia: ${stats.totalScannedInstances} (w tym ${stats.presetInstances} z 46 presetów)`);
  console.log(`   - Unikalne sloty przedmiot-epoka: ${stats.uniqueAuditedSlots}`);
  console.log(`   - Poprawne dedykowane WebP: ${stats.okWebpCount}`);
  console.log(`   - Używa bezpiecznej ikony kategorii SVG: ${stats.fallbackIconCount}`);
  console.log(`   - Błędy semantyczne / anachronizmy: ${stats.semanticMismatches + stats.anachronisms}`);
  console.log(`   - Gotowe prompty studyjne OpenAI pod Herdr: ${stats.readyPromptsCount}`);

  // Zapisz maszynowy JSON
  const matrixPath = path.join(AUDIT_DIR, 'equipment-audit-matrix.json');
  fs.writeFileSync(
    matrixPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        stats,
        queuedPrompts: QUEUED_PROMPTS,
        items: uniqueAuditedItems,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`💾 Zapisano maszynowy raport JSON: ${matrixPath}`);

  // Generowanie arkusza kontaktowego HTML
  generateContactSheetHtml(uniqueAuditedItems, stats);

  // Aktualizacja docs/audits/equipment/README.md
  updateAuditReadme(stats);

  return { stats, uniqueAuditedItems };
}

function generateContactSheetHtml(items, stats) {
  const htmlPath = path.join(AUDIT_DIR, 'review-era-consistency.html');

  const itemsHtml = items
    .map((item, idx) => {
      const cardKey = `item_${idx}__${(item.templateId ?? item.name).replace(/[^a-zA-Z0-9_-]/g, '_')}__${item.visualEra}`;
      const isMissing = item.status === 'FALLBACK_ICON';
      const isIssue = item.status === 'SEMANTIC_MISMATCH' || item.status === 'ANACHRONISM';
      const statusBadgeClass = isIssue
        ? 'badge-error'
        : isMissing
        ? 'badge-warning'
        : 'badge-success';

      const statusLabel = isIssue
        ? 'BŁĄD EPOKI / MAPOWANIA'
        : isMissing
        ? 'IKONA KATEGORII (CZEKA NA RENDER)'
        : 'ZGODNY WEBP';

      const promptBlock = item.prompt
        ? `
        <div class="prompt-box">
          <div class="prompt-header">
            <span>✨ Prompt OpenAI / Herdr (plik: <code>${item.targetFilename ?? 'auto'}</code>)</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText('${escapeHtml(item.prompt)}')">Kopiuj</button>
          </div>
          <p class="prompt-text">${escapeHtml(item.prompt)}</p>
        </div>`
        : '';

      const issueNotice = item.issueDescription
        ? `<div class="issue-notice">⚠️ ${escapeHtml(item.issueDescription)}</div>`
        : '';

      return `
      <div class="card ${isIssue ? 'card-issue' : isMissing ? 'card-missing' : 'card-ok'}"
           id="${cardKey}"
           data-card-key="${cardKey}"
           data-name="${escapeHtml(item.name)}"
           data-name-en="${escapeHtml(item.nameEn)}"
           data-category="${item.category}"
           data-template-id="${item.templateId ?? ''}"
           data-era="${item.visualEra}"
           data-asset="${item.resolvedAsset}"
           data-status="${item.status}">
        
        <div class="card-flag-bar">
          <label class="flag-toggle-label">
            <input type="checkbox" class="flag-checkbox" onchange="onToggleFlag('${cardKey}', this.checked)" />
            <span class="flag-text">🚩 Oznacz do poprawy</span>
          </label>
        </div>

        <div class="flag-note-container" id="note-container-${cardKey}">
          <input type="text"
                 class="flag-note-input"
                 id="note-input-${cardKey}"
                 placeholder="Wpisz powód / uwagi do poprawy (opcjonalnie)..."
                 oninput="onUpdateNote('${cardKey}', this.value)" />
        </div>

        <div class="card-media">
          <img src="../../../public${item.resolvedAsset}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='../../../public/equipment/predefined/${item.category}.svg'" />
          <span class="badge ${statusBadgeClass}">${statusLabel}</span>
        </div>
        <div class="card-body">
          <div class="card-meta">
            <span class="era-tag era-${item.visualEra}">${item.visualEra}</span>
            <span class="cat-tag">${item.category}</span>
            <span class="source-tag">${item.source}</span>
          </div>
          <h3 class="card-title">${escapeHtml(item.name)}</h3>
          <p class="card-subtitle">${escapeHtml(item.nameEn)}</p>
          <div class="card-id">ID: <code>${item.templateId ?? 'brak_szablonu'}</code></div>
          ${issueNotice}
          ${promptBlock}
        </div>
      </div>
      `;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Arkusz Kontaktowy Ekwipunku - Audyt Assetów CoC 7e RAW (Issue #469)</title>
  <style>
    :root {
      --bg: #0c0d10;
      --card-bg: #14171d;
      --border: #242933;
      --gold: #c5a059;
      --gold-dim: #7a6336;
      --text: #e6e8eb;
      --text-muted: #8b949e;
      --success: #238636;
      --warning: #d29922;
      --error: #da3633;
      --flag-red: #ff4d4d;
      --flag-bg: rgba(218, 54, 51, 0.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 0 0 4rem 0;
      line-height: 1.5;
    }
    
    /* Sticky PO Toolbar */
    .po-sticky-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(12, 13, 16, 0.94);
      backdrop-filter: blur(10px);
      border-bottom: 2px solid var(--gold);
      padding: 0.75rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    }
    .po-toolbar-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .po-toolbar-title {
      font-weight: 700;
      color: var(--gold);
      font-size: 1rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .po-counter-badge {
      background: var(--flag-bg);
      border: 1px solid var(--flag-red);
      color: var(--flag-red);
      padding: 0.35rem 0.8rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .po-toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .po-action-btn {
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      border: 1px solid transparent;
    }
    .btn-filter-flagged {
      background: #251618;
      color: #ff9999;
      border-color: #552222;
    }
    .btn-filter-flagged.active {
      background: var(--flag-red);
      color: #000;
      border-color: var(--flag-red);
    }
    .btn-copy {
      background: var(--gold);
      color: #000;
    }
    .btn-copy:hover {
      background: #e0ba6e;
    }
    .btn-export {
      background: #1f242c;
      color: var(--text);
      border-color: var(--border);
    }
    .btn-export:hover {
      background: #2c333e;
    }
    .btn-clear {
      background: transparent;
      color: var(--text-muted);
      border-color: var(--border);
    }
    .btn-clear:hover {
      background: #241416;
      color: var(--flag-red);
      border-color: var(--flag-red);
    }

    .main-container {
      padding: 2rem;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    h1 {
      color: var(--gold);
      font-size: 1.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .kpi-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
    }
    .kpi-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--gold);
      margin-bottom: 0.25rem;
    }
    .kpi-label {
      color: var(--text-muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 2rem;
      align-items: center;
      background: var(--card-bg);
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    .filter-btn {
      background: #1f242c;
      color: var(--text);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s ease;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--gold);
      color: #000;
      border-color: var(--gold);
      font-weight: 600;
    }
    .search-input {
      flex: 1;
      min-width: 250px;
      background: #0f1216;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--gold-dim);
    }
    .card-issue {
      border-color: var(--error);
      box-shadow: 0 0 10px rgba(218, 54, 51, 0.2);
    }
    .card-missing {
      border-color: var(--warning);
    }
    
    /* Manual Flagging Style */
    .card.card-flagged {
      border-color: var(--flag-red) !important;
      box-shadow: 0 0 20px rgba(255, 77, 77, 0.45) !important;
      background: #1a1012 !important;
    }
    .card-flag-bar {
      background: #101317;
      padding: 0.6rem 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card.card-flagged .card-flag-bar {
      background: rgba(218, 54, 51, 0.2);
      border-color: rgba(218, 54, 51, 0.4);
    }
    .flag-toggle-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.85rem;
      user-select: none;
      font-weight: 600;
      color: var(--text-muted);
    }
    .card.card-flagged .flag-toggle-label {
      color: var(--flag-red);
    }
    .flag-checkbox {
      width: 17px;
      height: 17px;
      cursor: pointer;
      accent-color: var(--flag-red);
    }
    .flag-note-container {
      display: none;
      padding: 0.5rem 1rem;
      background: #201114;
      border-bottom: 1px solid rgba(218, 54, 51, 0.3);
    }
    .card.card-flagged .flag-note-container {
      display: block;
    }
    .flag-note-input {
      width: 100%;
      background: #0d0607;
      border: 1px solid rgba(218, 54, 51, 0.4);
      color: #ffcccc;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .flag-note-input:focus {
      outline: none;
      border-color: var(--flag-red);
    }

    .card-media {
      position: relative;
      background: #000;
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--border);
    }
    .card-media img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-success { background: var(--success); color: #fff; }
    .badge-warning { background: var(--warning); color: #000; }
    .badge-error { background: var(--error); color: #fff; }
    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .card-meta {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
    }
    .era-tag {
      background: #282f3a;
      color: var(--gold);
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .cat-tag, .source-tag {
      background: #1c2128;
      color: var(--text-muted);
      padding: 2px 6px;
      border-radius: 3px;
    }
    .card-title {
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 0.2rem;
    }
    .card-subtitle {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
    .card-id {
      font-size: 0.75rem;
      color: var(--gold-dim);
      margin-bottom: 0.75rem;
    }
    .issue-notice {
      background: rgba(218, 54, 51, 0.15);
      border-left: 3px solid var(--error);
      padding: 0.5rem;
      font-size: 0.8rem;
      color: #ff8b88;
      margin-bottom: 0.75rem;
      border-radius: 2px;
    }
    .prompt-box {
      margin-top: auto;
      background: #090b0e;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.75rem;
    }
    .prompt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
      font-size: 0.75rem;
      color: var(--gold);
    }
    .copy-btn {
      background: var(--gold-dim);
      color: #fff;
      border: none;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.7rem;
      cursor: pointer;
    }
    .copy-btn:hover { background: var(--gold); color: #000; }
    .prompt-text {
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.4;
      font-style: italic;
    }
    
    /* Toast Alert */
    .toast-msg {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--gold);
      color: #000;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 700;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
      z-index: 2000;
      display: none;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

  <!-- Sticky Review Toolbar -->
  <div class="po-sticky-toolbar">
    <div class="po-toolbar-left">
      <span class="po-toolbar-title">Arkusz Weryfikacji PO</span>
      <span class="po-counter-badge">🚩 Zgłoszone do poprawy: <strong id="flagged-count">0</strong></span>
      <button class="po-action-btn btn-filter-flagged" id="btn-toggle-flagged" onclick="toggleFilterOnlyFlagged()">
        Pokaż tylko oznaczone (<span id="flagged-btn-count">0</span>)
      </button>
    </div>
    <div class="po-toolbar-right">
      <button class="po-action-btn btn-copy" onclick="copyFlaggedToClipboard()">
        📋 Kopiuj listę do schowka
      </button>
      <button class="po-action-btn btn-export" onclick="exportFlaggedJson()">
        💾 Pobierz JSON
      </button>
      <button class="po-action-btn btn-clear" onclick="clearAllFlags()">
        🗑️ Wyczyść
      </button>
    </div>
  </div>

  <div class="main-container">
    <header>
      <h1>Arkusz Kontaktowy Ekwipunku (Issue #469)</h1>
      <p>Audyt spójności historycznej, pokrycia assetów i detekcja anachronizmów per epoka (CoC 7e RAW). Zaznacz pozycje, które budzą Twoje wątpliwości lub wymagają korekty.</p>
      
      <div class="kpi-bar">
        <div class="kpi-card">
          <div class="kpi-value">${stats.uniqueAuditedSlots}</div>
          <div class="kpi-label">Audytowane sloty</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${stats.okWebpCount}</div>
          <div class="kpi-label">Poprawne WebP</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value" style="color: var(--warning);">${stats.fallbackIconCount}</div>
          <div class="kpi-label">Fallback ikony SVG</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value" style="color: var(--error);">${stats.semanticMismatches + stats.anachronisms}</div>
          <div class="kpi-label">Wykryte błędy</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${stats.readyPromptsCount}</div>
          <div class="kpi-label">Gotowe prompty Herdr</div>
        </div>
      </div>
    </header>

    <div class="controls">
      <button class="filter-btn active" onclick="filterItems('ALL')">Wszystkie</button>
      <button class="filter-btn" onclick="filterItems('SEMANTIC_MISMATCH')">Błędy i Anachronizmy</button>
      <button class="filter-btn" onclick="filterItems('FALLBACK_ICON')">Czeka na Render (Ikona)</button>
      <button class="filter-btn" onclick="filterItems('OK_WEBP')">Zgodne WebP</button>
      <button class="filter-btn" onclick="filterEra('prl-1970s')">Epoka PRL</button>
      <button class="filter-btn" onclick="filterEra('1920s')">Lata 20.</button>
      <button class="filter-btn" onclick="filterEra('modern')">Współczesność</button>
      <input type="text" class="search-input" placeholder="Szukaj przedmiotu, ID lub epoki..." oninput="searchItems(this.value)">
    </div>

    <div class="grid" id="items-grid">
      ${itemsHtml}
    </div>
  </div>

  <div class="toast-msg" id="toast">Skopiowano listę do schowka!</div>

  <script>
    const STORAGE_KEY = 'equipment_audit_po_flags_v1';
    let currentStatus = 'ALL';
    let currentEra = 'ALL';
    let searchQuery = '';
    let filterOnlyFlagged = false;
    let flaggedStore = {};

    function loadFlags() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        flaggedStore = raw ? JSON.parse(raw) : {};
      } catch (e) {
        flaggedStore = {};
      }
      updateUIFromFlags();
    }

    function saveFlags() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flaggedStore));
      } catch (e) {
        console.error('Błąd zapisu localStorage', e);
      }
      updateCounters();
    }

    function onToggleFlag(cardKey, isChecked) {
      const card = document.getElementById(cardKey);
      if (!card) return;

      if (isChecked) {
        const itemData = {
          cardKey,
          name: card.getAttribute('data-name'),
          nameEn: card.getAttribute('data-name-en'),
          category: card.getAttribute('data-category'),
          templateId: card.getAttribute('data-template-id'),
          era: card.getAttribute('data-era'),
          asset: card.getAttribute('data-asset'),
          status: card.getAttribute('data-status'),
          note: flaggedStore[cardKey]?.note || '',
          flaggedAt: new Date().toISOString(),
        };
        flaggedStore[cardKey] = itemData;
        card.classList.add('card-flagged');
      } else {
        delete flaggedStore[cardKey];
        card.classList.remove('card-flagged');
      }
      saveFlags();
    }

    function onUpdateNote(cardKey, note) {
      if (flaggedStore[cardKey]) {
        flaggedStore[cardKey].note = note;
        saveFlags();
      }
    }

    function updateUIFromFlags() {
      Object.keys(flaggedStore).forEach(cardKey => {
        const card = document.getElementById(cardKey);
        if (card) {
          card.classList.add('card-flagged');
          const chk = card.querySelector('.flag-checkbox');
          if (chk) chk.checked = true;
          const noteInput = document.getElementById('note-input-' + cardKey);
          if (noteInput && flaggedStore[cardKey].note) {
            noteInput.value = flaggedStore[cardKey].note;
          }
        }
      });
      updateCounters();
    }

    function updateCounters() {
      const count = Object.keys(flaggedStore).length;
      document.getElementById('flagged-count').textContent = count;
      document.getElementById('flagged-btn-count').textContent = count;
    }

    function toggleFilterOnlyFlagged() {
      filterOnlyFlagged = !filterOnlyFlagged;
      const btn = document.getElementById('btn-toggle-flagged');
      if (filterOnlyFlagged) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      applyFilters();
    }

    function applyFilters() {
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        const cardKey = card.getAttribute('data-card-key');
        const status = card.getAttribute('data-status');
        const era = card.getAttribute('data-era');
        const text = card.textContent.toLowerCase();
        const isFlagged = Boolean(flaggedStore[cardKey]);

        let visible = true;

        if (filterOnlyFlagged && !isFlagged) {
          visible = false;
        }

        if (currentStatus === 'SEMANTIC_MISMATCH') {
          if (status !== 'SEMANTIC_MISMATCH' && status !== 'ANACHRONISM') visible = false;
        } else if (currentStatus !== 'ALL' && status !== currentStatus) {
          visible = false;
        }

        if (currentEra !== 'ALL' && era !== currentEra) {
          visible = false;
        }

        if (searchQuery && !text.includes(searchQuery)) {
          visible = false;
        }

        card.style.display = visible ? 'flex' : 'none';
      });
    }

    function filterItems(status) {
      currentStatus = status;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      applyFilters();
    }

    function filterEra(era) {
      currentEra = currentEra === era ? 'ALL' : era;
      applyFilters();
    }

    function searchItems(query) {
      searchQuery = query.toLowerCase();
      applyFilters();
    }

    function showToast(text) {
      const t = document.getElementById('toast');
      t.textContent = text;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2500);
    }

    function copyFlaggedToClipboard() {
      const list = Object.values(flaggedStore);
      if (list.length === 0) {
        alert('Nie zaznaczono jeszcze żadnych pozycji do poprawy.');
        return;
      }

      let md = '### 🚩 Pozycje ekwipunku zgłoszone do poprawy przez PO (Łącznie: ' + list.length + '):\n\n';
      list.forEach((item, idx) => {
        md += (idx + 1) + '. **' + item.name + '** (' + item.nameEn + ')\n';
        md += '   - Epoka: \\x60' + item.era + '\\x60 | Kategoria: \\x60' + item.category + '\\x60 | ID: \\x60' + (item.templateId || 'brak') + '\\x60\\n';
        md += '   - Aktualny asset: \\x60' + item.asset + '\\x60\\n';
        if (item.note && item.note.trim()) {
          md += '   - ✍️ Uwagi PO: **' + item.note.trim() + '**\\n';
        }
        md += '\\n';
      });

      navigator.clipboard.writeText(md).then(() => {
        showToast('Skopiowano ' + list.length + ' pozycji do schowka!');
      });
    }

    function exportFlaggedJson() {
      const list = Object.values(flaggedStore);
      if (list.length === 0) {
        alert('Brak zaznaczonych pozycji.');
        return;
      }
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'korekty-ekwipunku-po.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    function clearAllFlags() {
      if (confirm('Czy na pewno chcesz usunąć wszystkie zaznaczenia?')) {
        flaggedStore = {};
        saveFlags();
        document.querySelectorAll('.card').forEach(c => {
          c.classList.remove('card-flagged');
          const chk = c.querySelector('.flag-checkbox');
          if (chk) chk.checked = false;
        });
        document.querySelectorAll('.flag-note-input').forEach(i => i.value = '');
        applyFilters();
        showToast('Wyczyszczono wszystkie zaznaczenia.');
      }
    }

    // Start
    window.addEventListener('DOMContentLoaded', loadFlags);
  </script>

</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`🌐 Zapisano interaktywny arkusz kontaktowy HTML: ${htmlPath}`);
}

function updateAuditReadme(stats) {
  const readmePath = path.join(AUDIT_DIR, 'README.md');
  const content = `# Audyt wyposażenia startowego i assetów (Issue #469)

Data baseline: 2026-09-22.

## Wynik maszynowy audytu semantyki i spójności epokowej

- Wszystkie przeskanowane instancje: ${stats.totalScannedInstances}.
- Instancje przedmiotów z 46 aktywnych presetów: ${stats.presetInstances}.
- Unikalne sloty przedmiot-epoka: ${stats.uniqueAuditedSlots}.
- Poprawne, dedykowane lokalne WebP: ${stats.okWebpCount}.
- Przedmioty używające bezpiecznego lokalnego fallbacku ikony kategorii SVG: ${stats.fallbackIconCount}.
- Wykryte i naprawione błędy semantyczne oraz anachronizmy: ${stats.semanticMismatches + stats.anachronisms}.
- Gotowe prompty studyjne OpenAI przygotowane pod wykonanie w Herdr: ${stats.readyPromptsCount}.

## Naprawione krytyczne błędy semantyczne (Issue #469)

1. **Dokumenty tożsamości:**
   - Poprzednio: alias \`Dokumenty tożsamości\` przypisany do \`document.letter\` (zalakowana koperta \`letter-shared.webp\`).
   - Teraz: wydzielony szablon \`document.id-card\` z bezpiecznym fallbackiem do \`/equipment/predefined/document.svg\`, dopóki nie powstaną dedykowane rendery epokowe.
2. **Aparat fotograficzny w PRL:**
   - Poprzednio: \`tool.camera\` posiadał \`shared: camera-1920s.webp\`, co wymuszało miechowy aparat z lat 20. dla bohaterów z PRL i lat 90.
   - Teraz: usunięto fałszywy \`shared\`. W 1920s aparat rozstrzyga się do \`camera-1920s.webp\`, w modern do \`dslr-camera-modern.webp\`, a w PRL czysto do ikony \`/equipment/predefined/tool.svg\` w oczekiwaniu na render \`camera-prl.webp\` (Zenit/Zorka).
3. **Zapasowe baterie AA:**
   - Poprzednio: baterie posiadały \`shared: flashlight-1920s.webp\` (wyświetlały latarkę).
   - Teraz: usunięto fałszywy \`shared\`, czysty fallback do ikony narzędzia SVG do czasu wygenerowania dedykowanego WebP.

## Kolejka do wygenerowania przez OpenAI w Herdr (Partia 5 + nowe warianty epokowe)

Wykaz wszystkich gotowych promptów studyjnych (format 1:1, noir / dark museum / art deco, bez rąk, bez tekstu) znajduje się w:
- \`docs/audits/equipment/equipment-audit-matrix.json\` (sekcja \`queuedPrompts\`)
- \`docs/audits/equipment/review-era-consistency.html\` (interaktywny arkusz kontaktowy z przyciskami kopiowania promptu)

Łącznie przygotowano **${stats.readyPromptsCount} precyzyjnych promptów**, w tym:
- 22 szablony ogólne z Partii 5 (termometr, statyw, klisze, maszyna do pisania, książki źródłowe, biblia itd.)
- 7 dedykowanych wariantów epokowych z Issue #469 (Dowód PRL, Legitymacja 1920s, ID modern, Paszport 1890s, Aparat PRL Zenit, Aparat 1890s, Baterie AA).
`;

  fs.writeFileSync(readmePath, content, 'utf8');
  console.log(`📝 Zaktualizowano ${readmePath}`);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Uruchomienie jeśli wywołany bezpośrednio
if (process.argv[1] && process.argv[1].endsWith('audit-equipment-assets.mjs')) {
  runEquipmentAudit();
}
