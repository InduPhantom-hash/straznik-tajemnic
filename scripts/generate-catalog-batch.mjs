#!/usr/bin/env node

/**
 * generate-catalog-batch.mjs
 *
 * Skrypt wsadowy dla Issue #64 (Katalog ekwipunku CoC 7e RAW):
 * - Definiuje pełną bazę 110 przedmiotów (35 istniejących do ujednolicenia + 75 nowych z presetów)
 * - Obsługuje podział na partie (Batch 1 = 30 pozycji)
 * - Generuje manifest JSON oraz interaktywny arkusz kontaktowy HTML
 * - Konwertuje wygenerowane grafiki do formatu WebP 512x512 (< 250 KB)
 *
 * Użycie:
 *   node scripts/generate-catalog-batch.mjs --batch=1
 *   node scripts/generate-catalog-batch.mjs --all
 *   node scripts/generate-catalog-batch.mjs --html-only
 *   node scripts/generate-catalog-batch.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(REPO_ROOT, 'public/equipment/catalog');
const AUDIT_DIR = path.join(REPO_ROOT, 'docs/audits/equipment');

// ============================================================================
// BAZA 110 PRZEDMIOTÓW (35 DO PRZEBUDOWY + 75 NOWYCH)
// ============================================================================

export const CATALOG_ITEMS = [
  // --------------------------------------------------------------------------
  // BATCH 1: 30 REPREZENTATYWNYCH PRZEDMIOTÓW (PRÓBA GENERALNA STYLU)
  // --------------------------------------------------------------------------
  {
    id: 'weapon.revolver-colt38-1920s',
    filename: 'revolver-colt38-1920s.webp',
    name: 'Rewolwer Colt Police Positive .38',
    nameEn: 'Colt Police Positive .38 Revolver',
    category: 'weapon',
    era: '1920s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of a blued steel Colt Police Positive .38 revolver with checkered walnut grip, resting on a worn dark oak detective desk next to two brass cartridge casings, dramatic side directional lighting, 1920s art deco noir atmosphere, authentic metal patina, square composition, macro photography, no hands, no people, no text, no modern elements',
  },
  {
    id: 'weapon.revolver-webley-1920s',
    filename: 'revolver-webley-1920s.webp',
    name: 'Rewolwer Webley Mk IV .455',
    nameEn: 'Webley Mk IV .455 Revolver',
    category: 'weapon',
    era: '1920s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of a heavy British Webley Mk IV .455 top-break service revolver with vulcanite grips, resting on an olive green military canvas field cloth, authentic matte blued steel with holster wear, natural documentary directional light, square composition, macro details, no hands, no people, no text',
  },
  {
    id: 'weapon.derringer-1890s',
    filename: 'derringer-1890s.webp',
    name: 'Kieszonkowy pistolet Derringer .41',
    nameEn: 'Pocket Remington Derringer .41',
    category: 'weapon',
    era: '1890s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of an antique double-barrel Remington Derringer .41 over-under pocket pistol with tarnished nickel finish and mother-of-pearl grips, lying on a dark velvet surface beside an antique brass pocket watch, late Victorian 1890s period lighting, square composition, no hands, no people',
  },
  {
    id: 'weapon.pistol-p64-prl',
    filename: 'pistol-p64-prl.webp',
    name: 'Pistolet P-64 Czak 9mm Makarov',
    nameEn: 'P-64 Czak 9mm Makarov Pistol',
    category: 'weapon',
    era: 'prl-1970s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of a Polish P-64 Czak 9mm Makarov service pistol with black polymer grips, resting on a gray laminate office desk next to a spare magazine, Poland in the 1970s PRL aesthetic, stark institutional directional light, square composition, documentary realism, no hands, no people',
  },
  {
    id: 'weapon.pistol-glock-modern',
    filename: 'pistol-glock-modern.webp',
    name: 'Pistolet Glock 19 9mm',
    nameEn: 'Glock 19 9mm Pistol',
    category: 'weapon',
    era: 'modern',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic contemporary object study of a matte black Glock 19 Gen 5 semi-automatic pistol, resting on a dark slate ballistic mat, clean studio side lighting, subtle reflections on matte polymer and tenifer steel slide, square composition, authentic scale, no hands, no people, no brands',
  },
  {
    id: 'weapon.shotgun-sawed-off-shared',
    filename: 'shotgun-sawed-off-shared.webp',
    name: 'Obrzyn dubeltówki',
    nameEn: 'Sawed-Off Double-Barrel Shotgun',
    category: 'weapon',
    era: 'shared',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic gritty object study of a sawed-off double-barrel 12-gauge shotgun with roughly cut shortened barrels and modified wooden pistol grip, resting on rough burlap fabric, worn steel, dark moody noir lighting, square composition, no hands, no people, no blood',
  },
  {
    id: 'weapon.submachine-tommy-1920s',
    filename: 'submachine-tommy-1920s.webp',
    name: 'Pistolet maszynowy Thompson 1921',
    nameEn: 'Thompson 1921 Submachine Gun',
    category: 'weapon',
    era: '1920s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic historical object study of an authentic 1921 Thompson submachine gun with front vertical foregrip and 50-round drum magazine, blued steel, rich walnut stock, resting on raw pine crate planks, 1920s prohibition era lighting, square composition, macro texture, no people, no hands',
  },
  {
    id: 'tool.oil-lantern-1890s',
    filename: 'oil-lantern-1890s.webp',
    name: 'Lampa naftowa',
    nameEn: 'Brass Kerosene Hurricane Lantern',
    category: 'tool',
    era: '1890s',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic period object study of an antique brass Dietz hurricane oil lantern with clear glass chimney, unlit, authentic patina and brass oxidation, resting on a rough timber workbench, warm Victorian directional light, square composition, highly detailed texture, no people, no hands',
  },
  {
    id: 'tool.flashlight-1920s',
    filename: 'flashlight-1920s.webp',
    name: 'Latarka elektryczna 1920s',
    nameEn: 'Tubular Nickel Flashlight 1920s',
    category: 'tool',
    era: '1920s',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic period object study of an early 1920s ribbed tubular nickel-plated electric flashlight with round bullseye glass lens and brass toggle switch, resting on a canvas field bag, authentic subtle scratches, 1920s lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.gasoline-lighter-1940s',
    filename: 'gasoline-lighter-1940s.webp',
    name: 'Zapalniczka benzynowa',
    nameEn: 'Vintage Gasoline Trench Lighter',
    category: 'tool',
    era: '1940s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of a vintage 1940s brushed chrome flip-top gasoline lighter with flint wheel, resting open on a dark scarred mahogany table with a faint wisp of cold wick, moody noir side lighting, square composition, no hands, no people, no brand logos',
  },
  {
    id: 'tool.crowbar-shared',
    filename: 'crowbar-shared.webp',
    name: 'Stalowy łom',
    nameEn: 'Heavy Steel Crowbar',
    category: 'tool',
    era: 'shared',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic utilitarian object study of a heavy hexagonal forged steel wrecking crowbar with chisel and claw ends, chipped black enamel paint showing bare scratched metal, lying across worn wooden floorboards, hard directional industrial light, square composition, no hands, no people',
  },
  {
    id: 'tool.lockpicks-shared',
    filename: 'lockpicks-shared.webp',
    name: 'Wytrychy',
    nameEn: 'Lockpick Set in Leather Wrap',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic macro object study of a fine locksmith pick set with tension wrenches and slender steel picks laid out on an open dark brown calfskin leather roll, resting on a dark desk, dramatic low-key raking light, square composition, authentic scale, no hands, no people',
  },
  {
    id: 'personal.pocket-watch-shared',
    filename: 'pocket-watch-shared.webp',
    name: 'Zegarek kieszonkowy',
    nameEn: 'Engraved Pocket Watch with Chain',
    category: 'personal',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic period object study of an antique tarnished silver pocket watch with Roman numerals on an enamel dial and a heavy curb link watch chain, resting on an open vintage leather ledger, warm soft directional lighting, square composition, documentary realism, no hands, no people',
  },
  {
    id: 'personal.cigarette-case-shared',
    filename: 'cigarette-case-shared.webp',
    name: 'Srebrna papierośnica',
    nameEn: 'Art Deco Silver Cigarette Case',
    category: 'personal',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic period object study of an open 1920s Art Deco sterling silver cigarette case with geometric engine-turned engraving, holding thin rolled cigarettes held by an elastic band, resting on dark walnut, glinting metallic highlights, square composition, no hands, no people',
  },
  {
    id: 'personal.pilot-goggles-1920s',
    filename: 'pilot-goggles-1920s.webp',
    name: 'Skórzana pilotka i gogle',
    nameEn: 'Aviation Helmet and Flying Goggles',
    category: 'personal',
    era: '1920s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of a 1920s brown leather aviator flight cap paired with brass-framed split-lens safety flying goggles, resting on a rolled khaki canvas map case, authentic distressed leather texture, documentary directional light, square composition, no hands, no people',
  },
  {
    id: 'tool.french-wrench-tool',
    filename: 'french-wrench-tool.webp',
    name: 'Klucz francuski nastawny',
    nameEn: 'Vintage Adjustable Monkey Wrench',
    category: 'tool',
    era: 'shared',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic object study of a heavy forged steel French adjustable monkey wrench with wooden handle inserts and threaded screw adjustment, stained with machine oil patina, lying on a grease-marked workbench cloth, sharp side lighting, square composition, no hands, no people',
  },
  {
    id: 'personal.leather-briefcase-shared',
    filename: 'leather-briefcase-shared.webp',
    name: 'Skórzana aktówka śledcza',
    nameEn: 'Investigator Leather Briefcase',
    category: 'personal',
    era: 'shared',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of a thick distressed dark brown saddlery leather lawyer briefcase with dual brass buckle latches and a sturdy carry handle, standing upright on a parquet floor, moody chiaroscuro lighting, square composition, detailed leather grain, no people, no text',
  },
  {
    id: 'tool.magnifier-shared',
    filename: 'magnifier-shared.webp',
    name: 'Mosiężna lupa',
    nameEn: 'Brass Hand Magnifier with Ebony Handle',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic macro object study of a heavy optical magnifying glass with a solid brass rim and turned ebony wooden handle, resting over yellowed unreadable parchment paper, realistic glass optical refraction, studio side lighting, square composition, no hands, no people',
  },
  {
    id: 'document.notebook-shared',
    filename: 'notebook-shared.webp',
    name: 'Notatnik badawczy i ołówek',
    nameEn: 'Field Notebook & Graphite Pencil',
    category: 'document',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic period object study of a small moleskin pocket field notebook bound in oilcloth with rounded corners and an elastic band, paired with a sharpened hexagonal graphite pencil, resting on a dark wood table, natural daylight from window, square composition, no readable text, no hands, no people',
  },
  {
    id: 'tool.camera-1920s',
    filename: 'camera-1920s.webp',
    name: 'Aparat fotograficzny mieszkowy',
    nameEn: '1920s Folding Bellows Camera',
    category: 'tool',
    era: '1920s',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic period object study of a vintage 1920s folding bellows camera with black leatherette cladding, nickeled metal struts and a brass optical shutter lens, standing unfolded on a wooden table, 1920s studio lighting, square composition, rich mechanical detail, no hands, no people, no readable logos',
  },
  {
    id: 'tool.tape-recorder-prl-1970s',
    filename: 'tape-recorder-prl-1970s.webp',
    name: 'Magnetofon kasetowy PRL',
    nameEn: 'PRL Portable Cassette Recorder',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic period object study of a 1970s Polish Unitra-Kasprzak style portable cassette tape recorder, textured black and gray plastic housing with silver piano-key buttons, carrying handle and microphone input, resting on a desk, Poland PRL aesthetic, authentic era lighting, square composition, no people, no hands',
  },
  {
    id: 'medical.medical-bag-shared',
    filename: 'medical-bag-shared.webp',
    name: 'Torba lekarska',
    nameEn: 'Gladstone Doctor Medical Bag',
    category: 'medical',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic period object study of a classic dark brown cowhide Gladstone medical doctor bag with hinged brass frame and top latch, closed, displaying dignified leather wear and scuffs, resting on a clean wooden examination table, soft medical studio light, square composition, no hands, no people',
  },
  {
    id: 'medical.first-aid-prl-1970s',
    filename: 'first-aid-prl-1970s.webp',
    name: 'Apteczka samochodowa PRL',
    nameEn: 'PRL First Aid Metal Box',
    category: 'medical',
    era: 'prl-1970s',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic object study of a vintage 1970s Polish orange-red metal first aid box with stamped white cross symbol and metal latch, resting on a gray concrete bench, authentic chipped enamel and light surface rust, authentic PRL era daylight, square composition, no people, no readable labels',
  },
  {
    id: 'medical.morphine-ampoules-shared',
    filename: 'morphine-ampoules-shared.webp',
    name: 'Ampułki z morfiną',
    nameEn: 'Medical Morphine Ampoules in Tin',
    category: 'medical',
    era: '1920s',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic historical object study of an open vintage nickel-plated tin case containing sealed glass liquid medicine ampoules cushioned in folded sterile gauze, resting on a medical tray, cool clinical side lighting, authentic early 20th century medical paraphernalia, square composition, no readable text, no hands, no people',
  },
  {
    id: 'personal.silver-cross-shared',
    filename: 'silver-cross-shared.webp',
    name: 'Srebrny krucyfiks',
    nameEn: 'Silver Crucifix on Chain',
    category: 'personal',
    era: 'shared',
    isExisting: false,
    batch: 1,
    prompt:
      'Photorealistic macro object study of a heavy solid sterling silver crucifix pendant with tarnished oxidation in the recesses, resting coiled on a dark ecclesiastical linen altar cloth, dramatic single candle light beam, square composition, documentary texture, no hands, no people',
  },
  {
    id: 'occult.candles-shared',
    filename: 'candles-shared.webp',
    name: 'Świece woskowe',
    nameEn: 'Bundle of Natural Beeswax Candles',
    category: 'occult',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic macro object study of a bundle of three hand-dipped natural golden beeswax taper candles tied with raw hemp twine, unlit, authentic wax drips and textured cotton wicks, resting on rough flagstone slate, atmospheric side lighting, square composition, no occult symbols, no hands, no people',
  },
  {
    id: 'occult.chalk-shared',
    filename: 'chalk-shared.webp',
    name: 'Kreda rytualna',
    nameEn: 'Mineral Ritual Chalk Pieces',
    category: 'occult',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic macro object study of three irregular sticks of natural dense mineral chalk (off-white, ochre, and deep charcoal black) with powdered chalk dust on a dark slate slab, dramatic low raking light, square composition, high surface tactile detail, no hands, no pentagrams, no text',
  },
  {
    id: 'weapon.knife-shared',
    filename: 'knife-shared.webp',
    name: 'Nóż myśliwski',
    nameEn: 'Fixed-Blade Hunting Knife',
    category: 'weapon',
    era: 'shared',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic object study of a classic clip-point carbon steel hunting knife with a stacked leather washer grip and brass crossguard, sheathed partially in a brown tooled leather scabbard, resting on cedar wood, directional natural light, square composition, no blood, no hands, no people',
  },
  {
    id: 'tool.phone-modern',
    filename: 'phone-modern.webp',
    name: 'Smartfon z ładowarką',
    nameEn: 'Smartphone & USB-C Cable',
    category: 'tool',
    era: 'modern',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic object study of a dark matte glass-and-aluminum modern smartphone with dark blank screen, lying flat next to a coiled braided black USB-C cable on a dark minimalist slate desk, clean contemporary studio directional lighting, square composition, no logos, no hands, no people',
  },
  {
    id: 'tool.power-bank-modern',
    filename: 'power-bank-modern.webp',
    name: 'Powerbank',
    nameEn: 'Portable Slim Power Bank',
    category: 'tool',
    era: 'modern',
    isExisting: true,
    batch: 1,
    prompt:
      'Photorealistic object study of a compact rectangular anodized aluminum portable power bank with subtle dual USB ports, resting on a dark travel notebook, clean modern documentary lighting, square composition, no brand names, no hands, no people',
  },

  // --------------------------------------------------------------------------
  // BATCH 2: 30 POZYCJI (DOKOŃCZENIE PRZEBUDOWY + GŁÓWNE REKWIZYTY BADACZY)
  // --------------------------------------------------------------------------
  {
    id: 'weapon.revolver-32-shared',
    filename: 'revolver-32-shared.webp',
    name: 'Rewolwer .32',
    nameEn: '.32 Snubnose Revolver',
    category: 'weapon',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic period object study of a compact blued steel .32 caliber revolver with hard rubber checkered grips, resting on a dark wooden table beside a vintage leather wallet, dramatic noir side lighting, square composition, no hands, no people',
  },
  {
    id: 'weapon.revolver-1940s',
    filename: 'revolver-1940s.webp',
    name: 'Rewolwer 1940s',
    nameEn: '1940s Detective Special Revolver',
    category: 'weapon',
    era: '1940s',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic period object study of a 1940s service revolver with a 4-inch barrel, rich blued steel with subtle holster wear, resting on an open folded newspaper under harsh venetian blind shadow slats, 1940s film noir lighting, square composition, no hands, no people, no text',
  },
  {
    id: 'weapon.pistol-45-shared',
    filename: 'pistol-45-shared.webp',
    name: 'Pistolet .45',
    nameEn: '.45 M1911 Semi-Automatic Pistol',
    category: 'weapon',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic period object study of a classic Colt M1911 .45 ACP semi-automatic military pistol, parked gray phosphate steel finish with diamond checkered walnut grips, resting on olive drab military canvas, documentary raking light, square composition, no hands, no people',
  },
  {
    id: 'weapon.shotgun-shared',
    filename: 'shotgun-shared.webp',
    name: 'Dubeltówka',
    nameEn: 'Double-Barrel Side-by-Side Shotgun',
    category: 'weapon',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a classic side-by-side 12-gauge hunting shotgun with case-hardened receiver and figured walnut stock, lying on a rustic wooden gun rack table, soft daylight, square composition, no hands, no people',
  },
  {
    id: 'weapon.hunting-rifle-shared',
    filename: 'hunting-rifle-shared.webp',
    name: 'Sztucer myśliwski',
    nameEn: 'Bolt-Action Hunting Rifle',
    category: 'weapon',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a bolt-action hunting rifle with walnut stock and blued barrel, resting horizontally across dark wool blanket, crisp natural lighting, fine metal and wood grain details, square composition, no hands, no people',
  },
  {
    id: 'weapon.machete-shared',
    filename: 'machete-shared.webp',
    name: 'Maczeta',
    nameEn: 'Heavy Expedition Machete',
    category: 'weapon',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a broad steel expedition machete with riveted hardwood handle, resting in front of its heavy leather sheath on weathered expedition planks, sharp side lighting, square composition, no hands, no people',
  },
  {
    id: 'weapon.revolver-pocket-unlicensed',
    filename: 'revolver-pocket-unlicensed.webp',
    name: 'Rewolwer kieszonkowy (bez zezwolenia)',
    nameEn: 'Unregistered Pocket Snub Revolver',
    category: 'weapon',
    era: 'shared',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of a worn compact 2-inch barrel pocket revolver with filed-down serial numbers, resting in a pocket-worn brown cloth pouch on a dark scarred table, dim gritty side lighting, square composition, no hands, no people',
  },
  {
    id: 'weapon.leather-whip-shared',
    filename: 'leather-whip-shared.webp',
    name: 'Skórzany bicz',
    nameEn: 'Braided Kangaroo Leather Bullwhip',
    category: 'weapon',
    era: 'shared',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of a tightly braided dark brown heavy leather bullwhip coiled neatly on a rough wooden packing crate, rich supple leather texture, documentary directional lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.binoculars-shared',
    filename: 'binoculars-shared.webp',
    name: 'Lornetka',
    nameEn: 'Vintage Prism Field Binoculars',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic period object study of classic black vulcanite prism field binoculars with brass central focusing wheel and leather neck strap, resting on a folded field map, documentary side lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.compass-shared',
    filename: 'compass-shared.webp',
    name: 'Kompas',
    nameEn: 'Brass Pocket Transit Compass',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic macro still-life of an antique brass pocket compass on a dark weathered oak desk, dramatic side directional lighting, authentic brass patina, square composition, highly detailed texture, no people, no hands, no modern elements',
  },
  {
    id: 'tool.rope-shared',
    filename: 'rope-shared.webp',
    name: 'Lina (15 m)',
    nameEn: 'Coiled Heavy Manila Hemp Rope',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a neat coil of thick natural three-strand manila hemp climbing rope, resting on wooden deck planks, crisp raking side light emphasizing fiber texture, square composition, no hands, no people',
  },
  {
    id: 'tool.matches-shared',
    filename: 'matches-shared.webp',
    name: 'Pudełko zapałek',
    nameEn: 'Vintage Wooden Matchbox',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic macro object study of a vintage wooden slide matchbox with two loose red-tipped sulphur matches beside it on a scarred oak tabletop, warm natural light, square composition, no readable commercial logos, no hands, no people',
  },
  {
    id: 'tool.mechanical-kit-shared',
    filename: 'mechanical-kit-shared.webp',
    name: 'Zestaw narzędzi mechanicznych',
    nameEn: 'Mechanical Tool Roll',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of an unrolled heavy waxed canvas tool roll containing steel wrenches, pliers, and screwdrivers, resting on an industrial workbench, cool directional lighting, authentic tool wear, square composition, no hands, no people',
  },
  {
    id: 'tool.electrical-kit-shared',
    filename: 'electrical-kit-shared.webp',
    name: 'Zestaw narzędzi elektrycznych',
    nameEn: 'Vintage Electrical Test Kit',
    category: 'tool',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a mid-century analog electrical test meter in a bakelite case with cloth-insulated probe wires and precision wire cutters, resting on a workshop table, documentary lighting, square composition, no hands, no people',
  },
  {
    id: 'personal.wallet-shared',
    filename: 'wallet-shared.webp',
    name: 'Portfel',
    nameEn: 'Bifold Leather Wallet',
    category: 'personal',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a well-worn dark brown saddle leather bifold wallet, closed, resting on a polished mahogany surface, soft window lighting highlighting the supple distressed leather texture, square composition, no hands, no people',
  },
  {
    id: 'personal.flask-shared',
    filename: 'flask-shared.webp',
    name: 'Piersiówka',
    nameEn: 'Pewter Hip Flask with Screw Cap',
    category: 'personal',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a curved antique pewter hip flask with captured screw-top lid, resting on a dark wool tweed coat, warm subdued pub lighting, square composition, metallic reflections, no hands, no people',
  },
  {
    id: 'personal.handcuffs-shared',
    filename: 'handcuffs-shared.webp',
    name: 'Stalowe kajdanki',
    nameEn: 'Steel Police Handcuffs with Key',
    category: 'personal',
    era: 'shared',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of heavy nickel-plated steel police handcuffs with a small brass barrel key in the lock, lying on a dark scarred police desk, sharp raking light, square composition, cold steel reflections, no hands, no people',
  },
  {
    id: 'personal.canteen-military-shared',
    filename: 'canteen-military-shared.webp',
    name: 'Manierka wojskowa',
    nameEn: 'Military Canteen in Canvas Cover',
    category: 'personal',
    era: 'shared',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of an aluminum military canteen nestled in a faded olive-drab canvas cover with brass lift-the-dot snaps, resting on field rocks, documentary daylight, square composition, no hands, no people',
  },
  {
    id: 'tool.geological-hammer-shared',
    filename: 'geological-hammer-shared.webp',
    name: 'Młotek geologiczny',
    nameEn: 'Geologist Rock Pick Hammer',
    category: 'tool',
    era: 'shared',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of a forged steel geological rock pick hammer with pointed tip and rubber shock-reduction grip, resting on granite rock specimens, sharp sunlight, square composition, authentic field wear, no hands, no people',
  },
  {
    id: 'tool.heavy-police-flashlight-prl',
    filename: 'heavy-police-flashlight-prl.webp',
    name: 'Mocna latarka policyjna PRL',
    nameEn: 'Heavy Duty Police Flashlight PRL',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of an authentic 1970s heavy metal angle-head inspection flashlight painted dark hammered green, with belt clip and thick glass lens, resting on a concrete table, moody institutional light, square composition, no hands, no people',
  },
  {
    id: 'tool.tactical-flashlight-modern',
    filename: 'tactical-flashlight-modern.webp',
    name: 'Ciężka latarka taktyczna LED',
    nameEn: 'Heavy Tactical LED Patrol Light',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of a black anodized aerospace aluminum heavy tactical LED flashlight with knurled grip and crenelated strike bezel, resting on dark ballistic nylon, crisp studio lighting, square composition, no brands, no hands, no people',
  },
  {
    id: 'tool.multitool-modern',
    filename: 'multitool-modern.webp',
    name: 'Multitool Leatherman',
    nameEn: 'Stainless Steel Multitool',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic macro object study of an open stainless steel multi-tool displaying plier jaws and folded knife and screwdriver bits, resting on a graphite workbench, clean high-contrast studio light, square composition, no readable brand trademarks, no hands, no people',
  },
  {
    id: 'document.letter-shared',
    filename: 'letter-shared.webp',
    name: 'Zalita woskiem koperta',
    nameEn: 'Wax-Sealed Heavy Parchment Letter',
    category: 'document',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic macro object study of a thick parchment paper envelope sealed with dark burgundy sealing wax bearing an unreadable signet impression, resting on a dark desk beside a bone letter opener, warm candlelight, square composition, no readable address text, no hands, no people',
  },
  {
    id: 'document.diary-shared',
    filename: 'diary-shared.webp',
    name: 'Dziennik skórzany',
    nameEn: 'Leather-Bound Journal with Clasp',
    category: 'document',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a thick hand-bound dark leather diary with brass locking clasp and marbling on the page edges, closed, lying on antique wooden desk, warm low side light, square composition, deep tactile textures, no hands, no people',
  },
  {
    id: 'document.map-shared',
    filename: 'map-shared.webp',
    name: 'Złożona mapa',
    nameEn: 'Folded Topographical Linen Map',
    category: 'document',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic object study of a large folded vintage linen-backed regional survey map showing topographic contour lines, partially unfolded on a wooden drafting board, soft diffuse morning light, square composition, no readable place names, no hands, no people',
  },
  {
    id: 'document.photo-shared',
    filename: 'photo-shared.webp',
    name: 'Stara fotografia',
    nameEn: 'Silver Gelatin Sepia Photograph',
    category: 'document',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic macro object study of an antique sepia-toned gelatin silver cabinet card photograph of a foggy desolate house, lying on dark felt with curled corners and authentic emulsion cracking, gentle side lighting, square composition, no readable text, no hands, no people',
  },
  {
    id: 'document.sketchbook-shared',
    filename: 'sketchbook-shared.webp',
    name: 'Szkicownik z ołówkiem',
    nameEn: 'Artist Sketchbook with Charcoal Study',
    category: 'document',
    era: 'shared',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic object study of an open linen-bound sketchbook showing a subtle architectural pencil sketch of an archway, with a graphite stick resting in the crease, soft north-facing studio light, square composition, no hands, no people, no text',
  },
  {
    id: 'medical.bandages-shared',
    filename: 'bandages-shared.webp',
    name: 'Bandaże bawełniane',
    nameEn: 'Sterile Cotton Gauze Rolls',
    category: 'medical',
    era: 'shared',
    isExisting: true,
    batch: 2,
    prompt:
      'Photorealistic macro object study of several tight rolls of clean woven cotton gauze bandages and a small safety pin, resting on a white enameled medical tray, clean soft documentary lighting, square composition, no blood, no hands, no people',
  },
  {
    id: 'medical.laudanum-bottle-vintage',
    filename: 'laudanum-bottle-vintage.webp',
    name: 'Buteleczka z laudanum',
    nameEn: 'Amber Glass Tincture Bottle of Laudanum',
    category: 'medical',
    era: '1890s',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic period object study of an antique ribbed amber glass apothecary dropper bottle with ground glass stopper, containing dark amber liquid, resting on a dark walnut pharmacy ledge, warm backlighting through the amber glass, square composition, no readable label text, no hands, no people',
  },
  {
    id: 'medical.smelling-salts-vial',
    filename: 'smelling-salts-vial.webp',
    name: 'Sole trzeźwiące',
    nameEn: 'Antique Glass Smelling Salts Vial',
    category: 'medical',
    era: 'shared',
    isExisting: false,
    batch: 2,
    prompt:
      'Photorealistic macro object study of an ornate cut-glass Victorian smelling salts bottle with a screw-on repoussé silver cap, resting on a lace handkerchief, soft window light, fine glass facets and silver tarnish, square composition, no hands, no people',
  },

  // --------------------------------------------------------------------------
  // BATCH 3 & 4: POZOSTAŁE PRZEDMIOTY (SPECJALISTYCZNE, OKULTYZM, AUDIO, IT)
  // --------------------------------------------------------------------------
  {
    id: 'occult.incense-shared',
    filename: 'incense-shared.webp',
    name: 'Kadzidło i kadzielnica',
    nameEn: 'Bronze Incense Burner and Resins',
    category: 'occult',
    era: 'shared',
    isExisting: true,
    batch: 3,
    prompt:
      'Photorealistic object study of an antique heavy cast bronze pierced censer bowl on three claw feet, unlit, with chunks of raw frankincense and myrrh resin resting on stone, moody quiet lighting, square composition, no smoke, no occult pentagrams, no hands, no people',
  },
  {
    id: 'occult.tarot-deck-vintage',
    filename: 'tarot-deck-vintage.webp',
    name: 'Talia kart Tarota',
    nameEn: 'Antique Marseilles Tarot Deck',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of an antique hand-printed tarot card deck with worn gilded edges, a few cards loosely spread facedown on dark velvet cloth, subtle raking candle glow, square composition, antique paper texture, no readable modern text, no hands, no people',
  },
  {
    id: 'occult.crystal-ball-stand',
    filename: 'crystal-ball-stand.webp',
    name: 'Kula kryształowa',
    nameEn: 'Flawless Quartz Scrying Sphere on Stand',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a clear natural quartz crystal scrying ball mounted on a carved dark ebony tripod stand, resting on an embroidered silk cloth, atmospheric moody lighting with soft internal light refractions, square composition, no magical glow, no hands, no people',
  },
  {
    id: 'occult.leather-grimoire-book',
    filename: 'leather-grimoire-book.webp',
    name: 'Oprawny w skórę grimuar',
    nameEn: 'Heavy Leather-Bound Grimoire',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a massive antique book bound in heavy distressed dark brown calfskin with blind-tooled borders and two heavy iron clasps, closed, resting on a dark library lectern, soft chiaroscuro lighting, square composition, no glowing symbols, no hands, no people',
  },
  {
    id: 'occult.latin-scroll-vellum',
    filename: 'latin-scroll-vellum.webp',
    name: 'Łaciński zwój z XIV wieku',
    nameEn: 'Rolled Medieval Latin Vellum Scroll',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of a tightly rolled antique calfskin vellum scroll tied with a braided leather thong and a cracked red wax seal, resting on a dark wooden shelf, documentary side lighting, authentic vellum texture, square composition, no readable text, no hands, no people',
  },
  {
    id: 'occult.ancient-runes-stones',
    filename: 'ancient-runes-stones.webp',
    name: 'Zestaw starożytnych run',
    nameEn: 'Carved River Stone Runes in Pouch',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of smooth flat river pebbles with hand-carved ancient runic symbols, spilling out of a rough suede drawstring pouch onto weathered slate, low natural raking light, square composition, no glow, no hands, no people',
  },
  {
    id: 'occult.silver-amulet-sigil',
    filename: 'silver-amulet-sigil.webp',
    name: 'Srebrny amulet z siglem',
    nameEn: 'Heavy Silver Talisman with Astrological Sigil',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of a heavy circular antique silver medallion engraved with fine astronomical and geometric sigils, resting on dark cloth, glinting metallic highlights, square composition, documentary texture, no magic glow, no hands, no people',
  },
  {
    id: 'occult.crystal-pendulum-shared',
    filename: 'crystal-pendulum-shared.webp',
    name: 'Wahadełko z kryształem',
    nameEn: 'Faceted Quartz Divination Pendulum',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of a faceted clear quartz crystal pendulum on a delicate sterling silver curb chain with a silver ring end, resting on a dark polished mahogany desk, sharp directional light, square composition, no hands, no people',
  },
  {
    id: 'tool.emf-meter-vintage',
    filename: 'emf-meter-vintage.webp',
    name: 'Miernik pola elektromagnetycznego',
    nameEn: 'Analog Electromagnetic Field Meter',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic period object study of a 1970s analog electromagnetic radiation field detector with a galvanometer needle dial behind glass and rotary range switch, textured industrial case with telescopic metal antenna, resting on a desk, documentary side lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.microcassette-dictaphone',
    filename: 'microcassette-dictaphone.webp',
    name: 'Dyktafon na mikrokasety',
    nameEn: 'Microcassette Pocket Dictaphone',
    category: 'tool',
    era: '1980s',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a compact brushed aluminum handheld microcassette voice recorder with built-in microphone grille and mechanical push buttons, resting on a reporter notebook, authentic 1980s documentary light, square composition, no brands, no hands, no people',
  },
  {
    id: 'tool.digital-dictaphone-modern',
    filename: 'digital-dictaphone-modern.webp',
    name: 'Dyktafon cyfrowy',
    nameEn: 'Modern Digital Audio Dictaphone',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a sleek black zinc-alloy professional digital voice recorder with dual stereo condenser microphones at the top, resting on a dark wood conference desk, clean crisp studio light, square composition, no readable brand logos, no hands, no people',
  },
  {
    id: 'tool.nightvision-camera-modern',
    filename: 'nightvision-camera-modern.webp',
    name: 'Kamera z trybem NightVision',
    nameEn: 'Infrared Night-Vision Video Camcorder',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a rugged handheld camcorder with infrared night vision emitter ring around the optical lens and folded side LCD screen, dark matte polymer chassis, resting on a tactical hard case, crisp documentary lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.dslr-camera-modern',
    filename: 'dslr-camera-modern.webp',
    name: 'Lustrzanka cyfrowa z fleszem',
    nameEn: 'Professional DSLR Camera with Speedlight',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a black weather-sealed professional DSLR camera fitted with a large prime lens and an external hot-shoe flash unit, resting on a dark tabletop, clean studio directional lighting, square composition, no camera brands or logos, no hands, no people',
  },
  {
    id: 'tool.satellite-gps-modern',
    filename: 'satellite-gps-modern.webp',
    name: 'Odbiornik GPS satelitarny',
    nameEn: 'Rugged Handheld Satellite GPS Navigator',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a heavy-duty rubberized handheld outdoor GPS satellite navigator with high-sensitivity quad-helix antenna, matte monochrome screen turned off, carabiner clip on back, resting on slate, documentary lighting, square composition, no brand logos, no hands, no people',
  },
  {
    id: 'tool.satellite-radio-modern',
    filename: 'satellite-radio-modern.webp',
    name: 'Zabezpieczone radio satelitarne',
    nameEn: 'Rugged Satellite Transceiver Radio',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a waterproof tactical handheld satellite transceiver radio with a thick swivel antenna and heavy rotary channel knobs, resting on a dark pelican case lid, studio side lighting, square composition, no brand names, no hands, no people',
  },
  {
    id: 'tool.rugged-ultrabook-modern',
    filename: 'rugged-ultrabook-modern.webp',
    name: 'Zabezpieczony Ultrabook',
    nameEn: 'Ruggedized Mil-Spec Laptop',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a closed ruggedized magnesium-alloy military laptop with reinforced rubber shock corners and heavy carrying handle, resting on an industrial table, sharp directional lighting, square composition, no brand logos, no hands, no people',
  },
  {
    id: 'tool.rugged-tablet-lidar',
    filename: 'rugged-tablet-lidar.webp',
    name: 'Tablet ze skanerem LiDAR',
    nameEn: 'Rugged Industrial Tablet with LiDAR Sensor',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a heavy-duty rugged industrial field tablet with hand strap on back and optical LiDAR sensor array window on the top edge, resting flat on drafting plans, clean crisp directional light, square composition, no brand names, no hands, no people',
  },
  {
    id: 'tool.brick-cellphone-prl',
    filename: 'brick-cellphone-prl.webp',
    name: 'Telefon komórkowy (wielki)',
    nameEn: 'Vintage 1980s Brick Cellphone',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic period object study of an early analog heavy handheld brick mobile telephone with thick rubberized antenna, chunky black plastic casing and rubber keypad, standing upright on an office desk, documentary side lighting, square composition, no hands, no people, no brand trademarks',
  },
  {
    id: 'tool.audio-cassette-shared',
    filename: 'audio-cassette-shared.webp',
    name: 'Taśma kasetowa z nagraniem',
    nameEn: 'Compact Audio Cassette with Handwritten Label',
    category: 'document',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of a standard compact audio cassette tape with dark magnetic ribbon visible inside clear smoked plastic, featuring an unreadable scribble on a white adhesive paper label, resting on dark walnut, documentary lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.film-reel-shared',
    filename: 'film-reel-shared.webp',
    name: 'Szpula taśmy 16mm',
    nameEn: '16mm Metal Film Reel in Tin',
    category: 'document',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of an open circular galvanized tin movie film can with a perforated aluminum 16mm motion picture film reel partially pulled out, resting on an archival editing bench, soft cinematic side light, square composition, no hands, no people',
  },
  {
    id: 'tool.encrypted-usb-modern',
    filename: 'encrypted-usb-modern.webp',
    name: 'Zaszyfrowany pendrive i dysk',
    nameEn: 'Hardware Encrypted Flash Drive with Keypad',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of a heavy black aluminum hardware-encrypted USB flash drive with a built-in miniature physical alphanumeric keypad, lying next to a compact external SSD on a dark slate surface, clean studio lighting, square composition, no brand logos, no hands, no people',
  },
  {
    id: 'personal.archive-keys-bundle',
    filename: 'archive-keys-bundle.webp',
    name: 'Pęk starych kluczy do archiwum',
    nameEn: 'Heavy Iron Ring of Antique Archive Keys',
    category: 'personal',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of an antique heavy wrought iron circular key ring holding five large ornate skeleton keys with intricate wards and rusted patina, resting on a dusty dark wood archive shelf, dramatic raking light, square composition, no hands, no people',
  },
  {
    id: 'personal.reading-glasses-case',
    filename: 'reading-glasses-case.webp',
    name: 'Okulary do czytania w etui',
    nameEn: 'Tortoiseshell Reading Glasses & Leather Case',
    category: 'personal',
    era: 'shared',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic macro object study of round tortoiseshell-framed vintage reading spectacles resting half inside a fitted worn brown saddle leather snap case, on a stack of old books, warm library window lighting, square composition, no hands, no people',
  },
  {
    id: 'personal.tactical-vest-black',
    filename: 'tactical-vest-black.webp',
    name: 'Kamizelka taktyczna',
    nameEn: 'Black Tactical MOLLE Load-Bearing Vest',
    category: 'armor',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a black 1000D Cordura tactical plate carrier vest with laser-cut MOLLE webbing and modular magazine pouches, resting flat on a dark concrete locker room floor, moody studio lighting, square composition, no patches, no hands, no people',
  },
  {
    id: 'personal.rugged-hiking-backpack',
    filename: 'rugged-hiking-backpack.webp',
    name: 'Plecak turystyczny',
    nameEn: 'Expedition Cordura Rucksack',
    category: 'personal',
    era: 'modern',
    isExisting: false,
    batch: 3,
    prompt:
      'Photorealistic object study of a rugged 45-liter technical expedition backpack in dark charcoal ripstop fabric with compression straps and aluminum stay frame, standing upright against a field boulder, crisp morning daylight, square composition, no brand names, no hands, no people',
  },

  // --------------------------------------------------------------------------
  // BATCH 4: 25 POZYCJI (SPECYFIKACJA PRESETÓW STREFY 11 I PODRĘCZNIKA)
  // --------------------------------------------------------------------------
  {
    id: 'weapon.rifle-lee-metford-1890s',
    filename: 'rifle-lee-metford-1890s.webp',
    name: 'Karabin Lee-Metford .303',
    nameEn: 'Lee-Metford .303 Bolt-Action Service Rifle',
    category: 'weapon',
    era: '1890s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic Victorian object study of a British military Lee-Metford .303 bolt-action service rifle with full-length walnut stock and blued steel action, resting on heavy canvas tent cloth, soft late Victorian daylight, square composition, no hands, no people',
  },
  {
    id: 'weapon.rifle-springfield-1920s',
    filename: 'rifle-springfield-1920s.webp',
    name: 'Karabin Springfield M1903',
    nameEn: 'Springfield M1903 .30-06 Rifle',
    category: 'weapon',
    era: '1920s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic historical object study of an authentic Springfield M1903 .30-06 bolt-action military rifle with oiled American walnut stock and dark parkerized steel, resting across wooden expedition crates, 1920s directional lighting, square composition, no hands, no people',
  },
  {
    id: 'weapon.rifle-hk416-modern',
    filename: 'rifle-hk416-modern.webp',
    name: 'Karabinek H&K 416',
    nameEn: 'Tactical H&K 416 Carbine',
    category: 'weapon',
    era: 'modern',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic tactical object study of a matte black semi-automatic carbine with collapsible stock and Picatinny railed handguard, resting flat on a dark armor armory bench, clean contemporary side lighting, square composition, no brand trademarks, no hands, no people',
  },
  {
    id: 'medical.adrenaline-syringes-modern',
    filename: 'adrenaline-syringes-modern.webp',
    name: 'Ampułkostrzykawki z adrenaliną',
    nameEn: 'Auto-Injector Epinephrine Syringes',
    category: 'medical',
    era: 'modern',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic medical object study of two auto-injector epinephrine adrenaline emergency pens with safety release caps, resting on an open sterile emergency medical pouch, bright clean clinical lighting, square composition, no brand logos, no hands, no people',
  },
  {
    id: 'medical.psychotropics-kit-shared',
    filename: 'psychotropics-kit-shared.webp',
    name: 'Leki uspokajające i psychotropowe',
    nameEn: 'Sedatives & Psychiatric Medication Kit',
    category: 'medical',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic medical object study of several glass prescription medicine phials containing calming tablets and capsules, arranged inside an open dark leather doctor kit, soft dramatic lighting, square composition, no readable prescription names, no hands, no people',
  },
  {
    id: 'document.patient-records-folder',
    filename: 'patient-records-folder.webp',
    name: 'Teczka z aktami pacjentów',
    nameEn: 'Asylum Patient Case Files Folder',
    category: 'document',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic historical object study of a thick manila archival case folder bound with red cloth ribbon, marked with unreadable stamps and aged yellowed typewritten sheets inside, resting on a dark doctor desk, moody side lighting, square composition, no readable text, no hands, no people',
  },
  {
    id: 'personal.medical-id-badge',
    filename: 'medical-id-badge.webp',
    name: 'Identyfikator medyczny ordynatora',
    nameEn: 'Hospital Chief Medical Officer Badge',
    category: 'personal',
    era: 'modern',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic object study of a plastic hospital medical identification access card in a clear polycarbonate badge holder clipped to a dark woven lanyard, resting on a polished medical countertop, clean directional lighting, square composition, no readable name or hospital logo, no hands, no people',
  },
  {
    id: 'tool.climbing-carabiners-modern',
    filename: 'climbing-carabiners-modern.webp',
    name: 'Lina wspinaczkowa i karabinki',
    nameEn: 'Dynamic Climbing Rope & Locking Carabiners',
    category: 'tool',
    era: 'modern',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic outdoor object study of a coiled dynamic kernmantle climbing rope in dark muted olive with two forged aluminum screw-lock carabiners clipped to the bight, resting on a granite rock ledge, crisp natural mountain light, square composition, no hands, no people',
  },
  {
    id: 'tool.night-photo-kit-shared',
    filename: 'night-photo-kit-shared.webp',
    name: 'Zestaw do zdjęć nocnych',
    nameEn: 'Night Photography Tripod and Cable Release',
    category: 'tool',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic object study of an adjustable compact folding photography tripod with a mechanical bulb cable release and lens hood lying beside it on a slate surface, moody nocturnal side lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.diy-emf-detector-prl',
    filename: 'diy-emf-detector-prl.webp',
    name: 'Wykrywacz EMF domowej roboty',
    nameEn: 'Handmade Homemade EMF Detector Unit',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic period object study of a homemade paranormal EMF detector built into a recycled stamped tin enclosure with exposed copper wire induction coil, miniature red neon bulb and toggle switch, resting on an electronics bench, dramatic low lighting, square composition, no hands, no people',
  },
  {
    id: 'tool.electronics-case-prl',
    filename: 'electronics-case-prl.webp',
    name: 'Zestaw narzędzi w walizce',
    nameEn: 'Electronic Repair Tools in Hard Case',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic object study of an open vintage 1970s molded plastic tool suitcase fitted with partitioned foam holding precision screwdrivers, a soldering iron, spools of solder wire, and needle-nose pliers, resting on a workbench, institutional daylight, square composition, no hands, no people',
  },
  {
    id: 'tool.heavy-laptop-wifi-1990s',
    filename: 'heavy-laptop-wifi-1990s.webp',
    name: 'Ciężki laptop z wczesnym Wi-Fi',
    nameEn: 'Heavy 1990s Laptop with PCMCIA Card',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic retro tech object study of a thick gray 1990s professional laptop with a black antenna PCMCIA wireless network card protruding from the side slot, screen closed, resting on a wooden office desk, documentary side lighting, square composition, no brand trademarks, no hands, no people',
  },
  {
    id: 'tool.scientific-calc-prl',
    filename: 'scientific-calc-prl.webp',
    name: 'Kalkulator naukowy Elwro/PRL',
    nameEn: 'Vintage VFD Display Scientific Calculator',
    category: 'tool',
    era: 'prl-1970s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic period object study of an authentic 1970s Polish Elwro style scientific desktop calculator with bright teal-green vacuum fluorescent display (VFD) and hard angled plastic keys, resting on graph paper covered in handwritten formulas, documentary light, square composition, no hands, no people',
  },
  {
    id: 'armor.safety-helmet-industrial',
    filename: 'safety-helmet-industrial.webp',
    name: 'Przemysłowy kask ochronny',
    nameEn: 'Vintage Industrial Safety Hard Hat',
    category: 'armor',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic object study of a vintage fiberglass yellow industrial construction safety hard hat with adjustable leather suspension cradle inside, resting on a steel girder beam, scuffed and worn from use, directional workshop lighting, square composition, no logos, no hands, no people',
  },
  {
    id: 'armor.fireproof-gloves-shared',
    filename: 'fireproof-gloves-shared.webp',
    name: 'Rękawice ognioodporne',
    nameEn: 'Heavy Fireproof Cowhide Gauntlets',
    category: 'armor',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic object study of a pair of heavy split cowhide heat-resistant gauntlet work gloves with reinforced leather palms and long protective cuffs, resting on a stone surface, warm side lighting, rich tactile suede texture, square composition, no hands, no people',
  },
  {
    id: 'document.contacts-notebook-prl',
    filename: 'contacts-notebook-prl.webp',
    name: 'Notes kontaktów i telefonów',
    nameEn: 'Vintage Pocket Telephone Address Book',
    category: 'document',
    era: 'prl-1970s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic period object study of a small vintage pocket address telephone book with notched A-Z thumb tabs and textured vinyl cover, lying slightly open beside a plastic ballpoint pen, soft office lighting, square composition, no readable private text, no hands, no people',
  },
  {
    id: 'personal.embroidered-shawl',
    filename: 'embroidered-shawl.webp',
    name: 'Haftowany szal wełniany',
    nameEn: 'Traditional Folk Embroidered Wool Shawl',
    category: 'personal',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic macro object study of a heavy dark wool folded shawl with exquisite traditional red and gold silk floral embroidery along the fringed hem, resting on an antique wooden dowry chest, warm interior lighting, detailed weave texture, square composition, no hands, no people',
  },
  {
    id: 'personal.black-veil-hat',
    filename: 'black-veil-hat.webp',
    name: 'Czarny welon i kapelusz maskujący',
    nameEn: 'Mourning Hat with Black Lace Veil',
    category: 'personal',
    era: '1890s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic period object study of a Victorian black felt mourning bonnet with delicate black lace veil draped over its brim, resting on an antique wooden vanity stand, dramatic soft side lighting, intricate lace patterns, square composition, no face, no hands, no people',
  },
  {
    id: 'personal.trenchcoat-hat-noir',
    filename: 'trenchcoat-hat-noir.webp',
    name: 'Prochowiec i kapelusz',
    nameEn: 'Folded Noir Trenchcoat and Fedora',
    category: 'personal',
    era: '1940s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic period object study of a dark charcoal felt fedora hat with silk ribbon band resting atop a neatly folded heavy gabardine detective trench coat on an armchair, 1940s film noir venetian blind lighting, square composition, rich fabric texture, no hands, no people',
  },
  {
    id: 'personal.nurse-cross-silver',
    filename: 'nurse-cross-silver.webp',
    name: 'Srebrny krzyżyk pielęgniarki',
    nameEn: 'Vintage Silver Nurse Cross Pendant',
    category: 'personal',
    era: '1920s',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic macro object study of a sterling silver red-enamel nurse cross medallion on a delicate silver safety brooch pin, resting on a folded white starched linen nurse apron, soft documentary light, square composition, antique enamel patina, no hands, no people',
  },
  {
    id: 'occult.holy-water-phial',
    filename: 'holy-water-phial.webp',
    name: 'Buteleczka z wodą święconą',
    nameEn: 'Engraved Glass Phial of Blessed Water',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic macro object study of an antique heavy cut-glass miniature flask with silver filigree cage and cork stopper, containing clear holy water, resting on dark church oak, single directional shaft of stained glass light, square composition, no hands, no people',
  },
  {
    id: 'occult.sage-incense-bundle',
    filename: 'sage-incense-bundle.webp',
    name: 'Kadzidła szałwiowe',
    nameEn: 'Dried White Sage Smudge Stick Bundle',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic macro object study of a tightly bound dried white sage smudge wand tied with natural cotton cord, unlit, resting in a polished abalone shell on a rough wooden table, natural soft daylight, square composition, detailed dried leaf texture, no smoke, no hands, no people',
  },
  {
    id: 'occult.protective-herbs-pouch',
    filename: 'protective-herbs-pouch.webp',
    name: 'Woreczek ziół ochronnych',
    nameEn: 'Linen Charm Pouch of Protective Herbs',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic macro object study of a small unbleached coarse linen drawstring pouch tied with hemp cord, with a sprig of dried rosemary and dried rowan berries resting beside it on slate, warm quiet lighting, square composition, no hands, no people',
  },
  {
    id: 'occult.silver-talisman-shared',
    filename: 'silver-talisman-shared.webp',
    name: 'Srebrny talizman z kamieniem',
    nameEn: 'Silver Amulet with Polished Obsidian',
    category: 'occult',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic macro object study of an antique sterling silver amulet set with a smooth jet-black polished obsidian cabochon stone, surrounded by subtle hand-chased filigree, resting on dark silk, dramatic raking light, square composition, no magic glow, no hands, no people',
  },
  {
    id: 'document.ancient-translations-book',
    filename: 'ancient-translations-book.webp',
    name: 'Zeszyt z odręcznymi tłumaczeniami',
    nameEn: 'Scholar Notebook of Hieroglyphic Translations',
    category: 'document',
    era: 'shared',
    isExisting: false,
    batch: 4,
    prompt:
      'Photorealistic object study of an open marbled-cover academic notebook showing dense handwritten phonetics and small sketched glyphs in black fountain pen ink, with a bone magnifying ruler lying across the margin, warm library desk light, square composition, no readable modern words, no hands, no people',
  },

];

// ============================================================================
// LOGIKA WERYFIKACJI I OPTYMALIZACJI PLIKÓW
// ============================================================================

export function ensureDirectories() {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

export function getFileStats(filename) {
  const fullPath = path.join(CATALOG_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  const stats = fs.statSync(fullPath);
  return {
    sizeBytes: stats.size,
    sizeKb: Math.round((stats.size / 1024) * 10) / 10,
    exists: true,
  };
}

export function convertToWebp(sourceImagePath, targetWebpPath) {
  try {
    const cmd = `cwebp -q 82 -resize 512 512 "${sourceImagePath}" -o "${targetWebpPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    const stats = fs.statSync(targetWebpPath);
    return { success: true, sizeBytes: stats.size, sizeKb: Math.round((stats.size / 1024) * 10) / 10 };
  } catch (err) {
    try {
      execSync(`sips -z 512 512 "${sourceImagePath}"`, { stdio: 'pipe' });
      execSync(`cwebp -q 82 "${sourceImagePath}" -o "${targetWebpPath}"`, { stdio: 'pipe' });
      const stats = fs.statSync(targetWebpPath);
      return { success: true, sizeBytes: stats.size, sizeKb: Math.round((stats.size / 1024) * 10) / 10 };
    } catch (fallbackErr) {
      return { success: false, error: fallbackErr.message };
    }
  }
}

// ============================================================================
// GENEROWANIE ARKUSZA KONTAKTOWEGO HTML
// ============================================================================

export function buildContactSheetHtml(items, outputPath, title = 'Przegląd Grafik Ekwipunku (Partia 1)') {
  const cardsHtml = items
    .map((item) => {
      const stats = getFileStats(item.filename);
      const exists = stats && stats.exists;
      const sizeLabel = exists ? `${stats.sizeKb} KB` : 'Brak pliku';
      const statusClass = exists ? 'status-ready' : 'status-pending';
      const statusText = exists ? 'GOTOWY (512×512)' : 'OCZEKUJE NA RENDER';
      const typeBadge = item.isExisting ? '<span class="badge badge-rebuild">Przebudowa</span>' : '<span class="badge badge-new">Nowy</span>';
      const eraBadge = `<span class="badge badge-era">${item.era}</span>`;
      const catBadge = `<span class="badge badge-cat">${item.category}</span>`;
      const batchBadge = `<span class="badge badge-batch">Batch ${item.batch}</span>`;
      const imgSrc = exists ? `../../../public/equipment/catalog/${item.filename}` : '';

      return `
      <article class="card ${exists ? 'has-file' : 'is-empty'}">
        <div class="image-wrapper">
          ${
            exists
              ? `<img src="${imgSrc}" alt="${item.name}" loading="lazy" width="512" height="512">`
              : `<div class="placeholder"><span class="icon">📷</span><p>Oczekuje na wygenerowanie</p></div>`
          }
          <div class="badges-overlay">
            ${batchBadge}
            ${typeBadge}
            ${eraBadge}
            ${catBadge}
          </div>
        </div>
        <div class="card-body">
          <h3 class="item-title">${item.name}</h3>
          <p class="item-subtitle">${item.nameEn}</p>
          <div class="file-meta">
            <code>${item.filename}</code>
            <span class="file-size ${statusClass}">${sizeLabel}</span>
          </div>
          <details class="prompt-details">
            <summary>Prompt studyjny</summary>
            <p class="prompt-text">${item.prompt}</p>
          </details>
          <div class="actions">
            <button class="btn btn-accept" onclick="markDecision(this, 'approved')">✓ Zatwierdź</button>
            <button class="btn btn-reject" onclick="markDecision(this, 'rejected')">✗ Do poprawy</button>
          </div>
        </div>
      </article>
      `;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Strażnik Tajemnic AI</title>
  <style>
    :root {
      --bg-dark: #0f1114;
      --card-bg: #181b20;
      --card-border: #2a2e36;
      --gold-primary: #d4af37;
      --gold-muted: #9e8328;
      --text-main: #e6e8ec;
      --text-muted: #8b929e;
      --success: #2ecc71;
      --danger: #e74c3c;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 2rem;
      line-height: 1.5;
    }
    header {
      max-width: 1400px;
      margin: 0 auto 2rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }
    h1 {
      font-size: 2rem;
      color: var(--gold-primary);
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    .header-desc {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .stats-bar {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
      font-size: 0.85rem;
    }
    .stat-pill {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
    }
    .stat-pill strong { color: var(--gold-primary); }
    .grid {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      border-color: var(--gold-muted);
      transform: translateY(-2px);
    }
    .image-wrapper {
      position: relative;
      width: 100%;
      padding-top: 100%;
      background: #000;
    }
    .image-wrapper img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      background: #121418;
      font-size: 0.85rem;
    }
    .placeholder .icon { font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.4; }
    .badges-overlay {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-rebuild { background: #2c3e50; color: #ecf0f1; }
    .badge-new { background: #16a085; color: #fff; }
    .badge-era { background: #8e44ad; color: #fff; }
    .badge-cat { background: #d35400; color: #fff; }
    .badge-batch { background: #2980b9; color: #fff; }
    .card-body {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      gap: 0.5rem;
    }
    .item-title {
      font-size: 1.1rem;
      color: var(--text-main);
      font-weight: 600;
    }
    .item-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-style: italic;
    }
    .file-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111317;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .file-meta code {
      color: var(--gold-primary);
      font-family: monospace;
    }
    .file-size.status-ready { color: var(--success); font-weight: 600; }
    .file-size.status-pending { color: var(--danger); }
    .prompt-details {
      font-size: 0.8rem;
      color: var(--text-muted);
      background: #13161a;
      padding: 0.4rem;
      border-radius: 4px;
      margin-top: 0.25rem;
    }
    .prompt-details summary {
      cursor: pointer;
      color: var(--gold-muted);
      font-weight: 500;
    }
    .prompt-text {
      margin-top: 0.4rem;
      color: #b0b6c0;
      line-height: 1.4;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
      padding-top: 0.5rem;
    }
    .btn {
      flex: 1;
      padding: 0.5rem;
      font-size: 0.8rem;
      border-radius: 4px;
      border: 1px solid transparent;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.15s;
    }
    .btn-accept { background: #1b3a26; color: #2ecc71; border-color: #2ecc71; }
    .btn-accept:hover { background: #2ecc71; color: #000; }
    .btn-reject { background: #3a1c1c; color: #e74c3c; border-color: #e74c3c; }
    .btn-reject:hover { background: #e74c3c; color: #fff; }
    .card.approved { border-color: var(--success) !important; background: #132018; }
    .card.rejected { border-color: var(--danger) !important; background: #221314; }
  </style>
  <script>
    function markDecision(button, decision) {
      const card = button.closest('.card');
      card.classList.remove('approved', 'rejected');
      card.classList.add(decision);
    }
  </script>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p class="header-desc">Katalog grafik ekwipunku CoC 7e RAW. Spójność studyjna: makro still-life na podłożu z epoki, światło kierunkowe, brak ludzi i rąk, rozdzielczość 512×512 WebP (&lt;250 KB).</p>
    <div class="stats-bar">
      <div class="stat-pill">Pozycji w partii: <strong>${items.length}</strong></div>
      <div class="stat-pill">Gotowe pliki WebP: <strong>${items.filter((i) => getFileStats(i.filename)?.exists).length}</strong></div>
      <div class="stat-pill">Oczekuje na render: <strong>${items.filter((i) => !getFileStats(i.filename)?.exists).length}</strong></div>
    </div>
  </header>
  <main class="grid">
    ${cardsHtml}
  </main>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`✅ Wygenerowano arkusz kontaktowy HTML: ${outputPath}`);
}

// ============================================================================
// MAIN CLI DISPATCHER
// ============================================================================

async function main() {
  ensureDirectories();
  const args = process.argv.slice(2);
  const isBatch1 = args.includes('--batch=1') || args.includes('-b1');
  const isAll = args.includes('--all');
  const isDryRun = args.includes('--dry-run');
  const isHtmlOnly = args.includes('--html-only');

  const selectedItems = isBatch1
    ? CATALOG_ITEMS.filter((i) => i.batch === 1)
    : isAll
      ? CATALOG_ITEMS
      : CATALOG_ITEMS.filter((i) => i.batch === 1); // Domyślnie Partia 1

  console.log(`\n📦 Strażnik Tajemnic AI - Generator Katalogu Ekwipunku`);
  console.log(`   Wybrana partia: ${isAll ? 'WSZYSTKIE (110 pozycji)' : 'Partia 1 (30 pozycji)'}`);
  console.log(`   Pozycji do przetworzenia: ${selectedItems.length}`);

  // Zapis manifestu JSON
  const manifestPath = path.join(AUDIT_DIR, isAll ? 'catalog-manifest-all.json' : 'catalog-manifest-batch-1.json');
  fs.writeFileSync(manifestPath, JSON.stringify(selectedItems, null, 2), 'utf8');
  console.log(`📄 Zapisano manifest JSON: ${manifestPath}`);

  // Generowanie arkusza HTML
  const htmlPath = path.join(AUDIT_DIR, isAll ? 'review-all.html' : 'review-batch-1.html');
  buildContactSheetHtml(selectedItems, htmlPath, isAll ? 'Pełny Katalog Grafik Ekwipunku (110 pozycji)' : 'Przegląd Grafik Ekwipunku (Partia 1 - 30 pozycji)');

  if (isDryRun) {
    console.log(`\n🔍 Dry-run zakończony. Sprawdzono poprawność definicji promptów i manifestu.`);
    return;
  }

  if (isHtmlOnly) {
    console.log(`\n🌐 Odświeżono wyłącznie widok HTML.`);
    return;
  }

  console.log(`\n🚀 Gotowe do generowania grafik. Użyj dedykowanego zlecenia Codex / Image API.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
