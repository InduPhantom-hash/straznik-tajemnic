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
  'adrenaline-syringes-modern.webp': 'modern',
  'ancient-runes-stones-1890s.webp': '1890s',
  'ancient-runes-stones-1920s.webp': '1920s',
  'ancient-runes-stones-1930s.webp': '1930s',
  'ancient-runes-stones-1940s.webp': '1940s',
  'ancient-runes-stones-1980s.webp': '1980s',
  'ancient-runes-stones-modern.webp': 'modern',
  'archive-keys-bundle-1890s.webp': '1890s',
  'archive-keys-bundle-1920s.webp': '1920s',
  'archive-keys-bundle-1930s.webp': '1930s',
  'archive-keys-bundle-1940s.webp': '1940s',
  'archive-keys-bundle-1980s.webp': '1980s',
  'archive-keys-bundle-modern.webp': 'modern',
  'art-pencils-1890s.webp': '1890s',
  'art-pencils-1920s.webp': '1920s',
  'art-pencils-1930s.webp': '1930s',
  'art-pencils-1940s.webp': '1940s',
  'art-pencils-1980s.webp': '1980s',
  'art-pencils-modern.webp': 'modern',
  'badge-1890s.webp': '1890s',
  'badge-1920s.webp': '1920s',
  'badge-1930s.webp': '1930s',
  'badge-1940s.webp': '1940s',
  'badge-1980s.webp': '1980s',
  'badge-modern.webp': 'modern',
  'bag-1890s.webp': '1890s',
  'bag-1920s.webp': '1920s',
  'bag-1930s.webp': '1930s',
  'bag-1940s.webp': '1940s',
  'bag-1980s.webp': '1980s',
  'bag-modern.webp': 'modern',
  'bandages-1890s.webp': '1890s',
  'bandages-1920s.webp': '1920s',
  'bandages-1930s.webp': '1930s',
  'bandages-1940s.webp': '1940s',
  'bandages-1980s.webp': '1980s',
  'bandages-modern.webp': 'modern',
  'batteries-aa-1890s.webp': '1890s',
  'batteries-aa-1920s.webp': '1920s',
  'batteries-aa-1930s.webp': '1930s',
  'batteries-aa-1940s.webp': '1940s',
  'batteries-aa-1980s.webp': '1980s',
  'batteries-aa-modern.webp': 'modern',
  'binoculars-1890s.webp': '1890s',
  'binoculars-1920s.webp': '1920s',
  'binoculars-1930s.webp': '1930s',
  'binoculars-1940s.webp': '1940s',
  'binoculars-1980s.webp': '1980s',
  'binoculars-modern.webp': 'modern',
  'blanket-1890s.webp': '1890s',
  'blanket-1920s.webp': '1920s',
  'blanket-1930s.webp': '1930s',
  'blanket-1940s.webp': '1940s',
  'blanket-1980s.webp': '1980s',
  'blanket-modern.webp': 'modern',
  'brick-cellphone-prl-1980s.webp': '1980s',
  'brick-cellphone-prl.webp': '1980s',
  'browning-fn1900-1890s.webp': '1890s',
  'browning-fn1900-1920s.webp': '1920s',
  'browning-fn1900-1930s.webp': '1930s',
  'browning-fn1900-1940s.webp': '1940s',
  'browning-fn1900-1980s.webp': '1980s',
  'browning-fn1905-1890s.webp': '1890s',
  'browning-fn1905-1920s.webp': '1920s',
  'browning-fn1905-1930s.webp': '1930s',
  'browning-fn1905-1940s.webp': '1940s',
  'browning-fn1905-1980s.webp': '1980s',
  'browning-m1910-1890s.webp': '1890s',
  'browning-m1910-1920s.webp': '1920s',
  'browning-m1910-1930s.webp': '1930s',
  'browning-m1910-1940s.webp': '1940s',
  'browning-m1910-1980s.webp': '1980s',
  'camera-1890s.webp': '1890s',
  'camera-1920s.webp': '1920s',
  'camera-1930s.webp': '1930s',
  'camera-1940s.webp': '1940s',
  'camera-1980s.webp': '1980s',
  'candles-1890s.webp': '1890s',
  'candles-1920s.webp': '1920s',
  'candles-1930s.webp': '1930s',
  'candles-1940s.webp': '1940s',
  'candles-1980s.webp': '1980s',
  'candles-modern.webp': 'modern',
  'canteen-military-1890s.webp': '1890s',
  'canteen-military-1920s.webp': '1920s',
  'canteen-military-1930s.webp': '1930s',
  'canteen-military-1940s.webp': '1940s',
  'canteen-military-1980s.webp': '1980s',
  'canteen-military-modern.webp': 'modern',
  'car-keys-1890s.webp': '1890s',
  'car-keys-1920s.webp': '1920s',
  'car-keys-1930s.webp': '1930s',
  'car-keys-1940s.webp': '1940s',
  'car-keys-1980s.webp': '1980s',
  'car-keys-modern.webp': 'modern',
  'chalk-1890s.webp': '1890s',
  'chalk-1920s.webp': '1920s',
  'chalk-1930s.webp': '1930s',
  'chalk-1940s.webp': '1940s',
  'chalk-1980s.webp': '1980s',
  'chalk-modern.webp': 'modern',
  'cigarette-case-1890s.webp': '1890s',
  'cigarette-case-1920s.webp': '1920s',
  'cigarette-case-1930s.webp': '1930s',
  'cigarette-case-1940s.webp': '1940s',
  'cigarette-case-1980s.webp': '1980s',
  'climbing-carabiners-modern.webp': 'modern',
  'colt-m1911-1890s.webp': '1890s',
  'colt-m1911-1920s.webp': '1920s',
  'colt-m1911-1930s.webp': '1930s',
  'colt-m1911-1940s.webp': '1940s',
  'colt-m1911-1980s.webp': '1980s',
  'compass-1890s.webp': '1890s',
  'compass-1920s.webp': '1920s',
  'compass-1930s.webp': '1930s',
  'compass-1940s.webp': '1940s',
  'compass-1980s.webp': '1980s',
  'compass-modern.webp': 'modern',
  'contacts-notebook-prl.webp': '1980s',
  'crowbar-1890s.webp': '1890s',
  'crowbar-1920s.webp': '1920s',
  'crowbar-1930s.webp': '1930s',
  'crowbar-1940s.webp': '1940s',
  'crowbar-1980s.webp': '1980s',
  'crowbar-modern.webp': 'modern',
  'crystal-ball-stand-1890s.webp': '1890s',
  'crystal-ball-stand-1920s.webp': '1920s',
  'crystal-ball-stand-1930s.webp': '1930s',
  'crystal-ball-stand-1940s.webp': '1940s',
  'crystal-ball-stand-1980s.webp': '1980s',
  'crystal-ball-stand-modern.webp': 'modern',
  'crystal-pendulum-1890s.webp': '1890s',
  'crystal-pendulum-1920s.webp': '1920s',
  'crystal-pendulum-1930s.webp': '1930s',
  'crystal-pendulum-1940s.webp': '1940s',
  'crystal-pendulum-1980s.webp': '1980s',
  'crystal-pendulum-modern.webp': 'modern',
  'derringer-1890s.webp': '1890s',
  'digital-dictaphone-modern.webp': 'modern',
  'diy-emf-detector-prl-1980s.webp': '1980s',
  'diy-emf-detector-prl-modern.webp': 'modern',
  'diy-emf-detector-prl.webp': '1980s',
  'dslr-camera-modern.webp': 'modern',
  'dubeltowka-mysliwska-1890s.webp': '1890s',
  'dubeltowka-mysliwska-1920s.webp': '1920s',
  'dubeltowka-mysliwska-1930s.webp': '1930s',
  'dubeltowka-mysliwska-1940s.webp': '1940s',
  'dubeltowka-mysliwska-1980s.webp': '1980s',
  'electrical-kit-1890s.webp': '1890s',
  'electrical-kit-1920s.webp': '1920s',
  'electrical-kit-1930s.webp': '1930s',
  'electrical-kit-1940s.webp': '1940s',
  'electrical-kit-1980s.webp': '1980s',
  'electrical-kit-modern.webp': 'modern',
  'electronics-case-prl-1980s.webp': '1980s',
  'electronics-case-prl-modern.webp': 'modern',
  'electronics-case-prl.webp': '1980s',
  'embroidered-shawl-1890s.webp': '1890s',
  'embroidered-shawl-1920s.webp': '1920s',
  'embroidered-shawl-1930s.webp': '1930s',
  'embroidered-shawl-1940s.webp': '1940s',
  'embroidered-shawl-1980s.webp': '1980s',
  'embroidered-shawl-modern.webp': 'modern',
  'emf-meter-vintage-1890s.webp': '1890s',
  'emf-meter-vintage-1920s.webp': '1920s',
  'emf-meter-vintage-1930s.webp': '1930s',
  'emf-meter-vintage-1940s.webp': '1940s',
  'emf-meter-vintage-1980s.webp': '1980s',
  'emf-meter-vintage-modern.webp': 'modern',
  'encrypted-usb-modern.webp': 'modern',
  'fireproof-gloves-1890s.webp': '1890s',
  'fireproof-gloves-1920s.webp': '1920s',
  'fireproof-gloves-1930s.webp': '1930s',
  'fireproof-gloves-1940s.webp': '1940s',
  'fireproof-gloves-1980s.webp': '1980s',
  'fireproof-gloves-modern.webp': 'modern',
  'first-aid-1890s.webp': '1890s',
  'first-aid-1920s.webp': '1920s',
  'first-aid-1930s.webp': '1930s',
  'first-aid-1940s.webp': '1940s',
  'first-aid-1980s.webp': '1980s',
  'first-aid-modern.webp': 'modern',
  'first-aid-prl-1970s.webp': '1980s',
  'flare-gun-1890s.webp': '1890s',
  'flare-gun-1920s.webp': '1920s',
  'flare-gun-1930s.webp': '1930s',
  'flare-gun-1940s.webp': '1940s',
  'flare-gun-1980s.webp': '1980s',
  'flare-gun-modern.webp': 'modern',
  'flashlight-1920s.webp': '1920s',
  'flashlight-1940s.webp': '1940s',
  'flashlight-modern.webp': 'modern',
  'flask-1890s.webp': '1890s',
  'flask-1920s.webp': '1920s',
  'flask-1930s.webp': '1930s',
  'flask-1940s.webp': '1940s',
  'flask-1980s.webp': '1980s',
  'flask-modern.webp': 'modern',
  'french-wrench-tool-1890s.webp': '1890s',
  'french-wrench-tool-1920s.webp': '1920s',
  'french-wrench-tool-1930s.webp': '1930s',
  'french-wrench-tool-1940s.webp': '1940s',
  'french-wrench-tool-1980s.webp': '1980s',
  'french-wrench-tool-modern.webp': 'modern',
  'gasoline-lighter-1940s.webp': '1940s',
  'geological-hammer-1890s.webp': '1890s',
  'geological-hammer-1920s.webp': '1920s',
  'geological-hammer-1930s.webp': '1930s',
  'geological-hammer-1940s.webp': '1940s',
  'geological-hammer-1980s.webp': '1980s',
  'geological-hammer-modern.webp': 'modern',
  'handcuffs-1890s.webp': '1890s',
  'handcuffs-1920s.webp': '1920s',
  'handcuffs-1930s.webp': '1930s',
  'handcuffs-1940s.webp': '1940s',
  'handcuffs-1980s.webp': '1980s',
  'handcuffs-modern.webp': 'modern',
  'heavy-laptop-wifi-1990s-modern.webp': 'modern',
  'heavy-laptop-wifi-1990s.webp': '1990s',
  'heavy-police-flashlight-prl-1980s.webp': '1980s',
  'holy-water-phial-1890s.webp': '1890s',
  'holy-water-phial-1920s.webp': '1920s',
  'holy-water-phial-1930s.webp': '1930s',
  'holy-water-phial-1940s.webp': '1940s',
  'holy-water-phial-1980s.webp': '1980s',
  'holy-water-phial-modern.webp': 'modern',
  'hunting-rifle-1890s.webp': '1890s',
  'hunting-rifle-1920s.webp': '1920s',
  'hunting-rifle-1930s.webp': '1930s',
  'hunting-rifle-1940s.webp': '1940s',
  'hunting-rifle-1980s.webp': '1980s',
  'hunting-rifle-modern.webp': 'modern',
  'incense-1890s.webp': '1890s',
  'incense-1920s.webp': '1920s',
  'incense-1930s.webp': '1930s',
  'incense-1940s.webp': '1940s',
  'incense-1980s.webp': '1980s',
  'incense-modern.webp': 'modern',
  'karabin-ppanc-ur-wz35-1930s.webp': '1930s',
  'karabin-ppanc-ur-wz35-1940s.webp': '1940s',
  'karabin-wz98-1890s.webp': '1890s',
  'karabin-wz98-1920s.webp': '1920s',
  'karabin-wz98-1930s.webp': '1930s',
  'karabin-wz98-1940s.webp': '1940s',
  'karabin-wz98-1980s.webp': '1980s',
  'karabinek-wz91-98-23-1890s.webp': '1890s',
  'karabinek-wz91-98-23-1920s.webp': '1920s',
  'karabinek-wz91-98-23-1930s.webp': '1930s',
  'karabinek-wz91-98-23-1940s.webp': '1940s',
  'karabinek-wz91-98-23-1980s.webp': '1980s',
  'knife-1890s.webp': '1890s',
  'knife-1920s.webp': '1920s',
  'knife-1930s.webp': '1930s',
  'knife-1940s.webp': '1940s',
  'knife-1980s.webp': '1980s',
  'knife-modern.webp': 'modern',
  'lab-equipment-1890s.webp': '1890s',
  'lab-equipment-1920s.webp': '1920s',
  'lab-equipment-1930s.webp': '1930s',
  'lab-equipment-1940s.webp': '1940s',
  'lab-equipment-1980s.webp': '1980s',
  'lab-equipment-modern.webp': 'modern',
  'latin-scroll-vellum-1890s.webp': '1890s',
  'latin-scroll-vellum-1920s.webp': '1920s',
  'latin-scroll-vellum-1930s.webp': '1930s',
  'latin-scroll-vellum-1940s.webp': '1940s',
  'latin-scroll-vellum-1980s.webp': '1980s',
  'latin-scroll-vellum-modern.webp': 'modern',
  'laudanum-bottle-vintage-1890s.webp': '1890s',
  'leather-briefcase-1890s.webp': '1890s',
  'leather-briefcase-1920s.webp': '1920s',
  'leather-briefcase-1930s.webp': '1930s',
  'leather-briefcase-1940s.webp': '1940s',
  'leather-briefcase-1980s.webp': '1980s',
  'leather-briefcase-modern.webp': 'modern',
  'leather-grimoire-book-1890s.webp': '1890s',
  'leather-grimoire-book-1920s.webp': '1920s',
  'leather-grimoire-book-1930s.webp': '1930s',
  'leather-grimoire-book-1940s.webp': '1940s',
  'leather-grimoire-book-1980s.webp': '1980s',
  'leather-grimoire-book-modern.webp': 'modern',
  'leather-whip-1890s.webp': '1890s',
  'leather-whip-1920s.webp': '1920s',
  'leather-whip-1930s.webp': '1930s',
  'leather-whip-1940s.webp': '1940s',
  'leather-whip-1980s.webp': '1980s',
  'leather-whip-modern.webp': 'modern',
  'lockpicks-1930s.webp': '1930s',
  'lockpicks-1940s.webp': '1940s',
  'lockpicks-1980s.webp': '1980s',
  'lockpicks-modern.webp': 'modern',
  'machete-1890s.webp': '1890s',
  'machete-1920s.webp': '1920s',
  'machete-1930s.webp': '1930s',
  'machete-1940s.webp': '1940s',
  'machete-1980s.webp': '1980s',
  'machete-modern.webp': 'modern',
  'magnifier-1890s.webp': '1890s',
  'magnifier-1920s.webp': '1920s',
  'magnifier-1930s.webp': '1930s',
  'magnifier-1940s.webp': '1940s',
  'magnifier-1980s.webp': '1980s',
  'magnifier-modern.webp': 'modern',
  'makeup-kit-1890s.webp': '1890s',
  'makeup-kit-1920s.webp': '1920s',
  'makeup-kit-1930s.webp': '1930s',
  'makeup-kit-1940s.webp': '1940s',
  'makeup-kit-1980s.webp': '1980s',
  'makeup-kit-modern.webp': 'modern',
  'matches-1890s.webp': '1890s',
  'matches-1920s.webp': '1920s',
  'matches-1930s.webp': '1930s',
  'matches-1940s.webp': '1940s',
  'matches-1980s.webp': '1980s',
  'matches-modern.webp': 'modern',
  'mauser-c96-1890s.webp': '1890s',
  'mauser-c96-1920s.webp': '1920s',
  'mauser-c96-1930s.webp': '1930s',
  'mauser-c96-1940s.webp': '1940s',
  'mauser-c96-1980s.webp': '1980s',
  'mechanical-kit-1890s.webp': '1890s',
  'mechanical-kit-1920s.webp': '1920s',
  'mechanical-kit-1930s.webp': '1930s',
  'mechanical-kit-1940s.webp': '1940s',
  'mechanical-kit-1980s.webp': '1980s',
  'mechanical-kit-modern.webp': 'modern',
  'medical-bag-1920s.webp': '1920s',
  'morphine-ampoules-1920s.webp': '1920s',
  'morphine-ampoules-1940s.webp': '1940s',
  'multitool-modern.webp': 'modern',
  'musical-instrument-1890s.webp': '1890s',
  'musical-instrument-1920s.webp': '1920s',
  'musical-instrument-1930s.webp': '1930s',
  'musical-instrument-1940s.webp': '1940s',
  'musical-instrument-1980s.webp': '1980s',
  'musical-instrument-modern.webp': 'modern',
  'nagant-1895-1890s.webp': '1890s',
  'nagant-1895-1920s.webp': '1920s',
  'nagant-1895-1930s.webp': '1930s',
  'nagant-1895-1940s.webp': '1940s',
  'nagant-1895-1980s.webp': '1980s',
  'night-photo-kit-1890s.webp': '1890s',
  'night-photo-kit-1920s.webp': '1920s',
  'night-photo-kit-1930s.webp': '1930s',
  'night-photo-kit-1940s.webp': '1940s',
  'night-photo-kit-1980s.webp': '1980s',
  'night-photo-kit-modern.webp': 'modern',
  'nightvision-camera-modern-1980s.webp': '1980s',
  'nightvision-camera-modern.webp': 'modern',
  'nurse-cross-silver-1890s.webp': '1890s',
  'nurse-cross-silver-1920s.webp': '1920s',
  'nurse-cross-silver-1940s.webp': '1940s',
  'oil-lantern-1890s.webp': '1890s',
  'oil-lantern-1920s.webp': '1920s',
  'oil-lantern-1930s.webp': '1930s',
  'oil-lantern-1940s.webp': '1940s',
  'oil-lantern-1980s.webp': '1980s',
  'overalls-1890s.webp': '1890s',
  'overalls-1920s.webp': '1920s',
  'overalls-1930s.webp': '1930s',
  'overalls-1940s.webp': '1940s',
  'overalls-1980s.webp': '1980s',
  'overalls-modern.webp': 'modern',
  'p08-parabellum-1920s.webp': '1920s',
  'p08-parabellum-1930s.webp': '1930s',
  'p08-parabellum-1940s.webp': '1940s',
  'p08-parabellum-1980s.webp': '1980s',
  'palette-brushes-1890s.webp': '1890s',
  'palette-brushes-1920s.webp': '1920s',
  'palette-brushes-1930s.webp': '1930s',
  'palette-brushes-1940s.webp': '1940s',
  'palette-brushes-1980s.webp': '1980s',
  'palette-brushes-modern.webp': 'modern',
  'phone-modern.webp': 'modern',
  'photo-plates-1890s.webp': '1890s',
  'photo-plates-1920s.webp': '1920s',
  'photo-plates-1930s.webp': '1930s',
  'photo-plates-1940s.webp': '1940s',
  'photo-plates-1980s.webp': '1980s',
  'photo-plates-modern.webp': 'modern',
  'photo-tripod-1890s.webp': '1890s',
  'photo-tripod-1920s.webp': '1920s',
  'photo-tripod-1930s.webp': '1930s',
  'photo-tripod-1940s.webp': '1940s',
  'photo-tripod-1980s.webp': '1980s',
  'photo-tripod-modern.webp': 'modern',
  'pilot-goggles-1920s-1940s.webp': '1940s',
  'pilot-goggles-1920s.webp': '1920s',
  'pistol-45-1920s.webp': '1920s',
  'pistol-45-1940s.webp': '1940s',
  'pistol-45-modern.webp': 'modern',
  'pistol-glock-modern.webp': 'modern',
  'pistol-p64-prl-1980s.webp': '1980s',
  'pistol-p64-prl.webp': '1980s',
  'pm-mors-1930s.webp': '1930s',
  'pm-mors-1940s.webp': '1940s',
  'pocket-watch-1890s.webp': '1890s',
  'pocket-watch-1920s.webp': '1920s',
  'pocket-watch-1930s.webp': '1930s',
  'pocket-watch-1940s.webp': '1940s',
  'pocket-watch-1980s.webp': '1980s',
  'police-baton-1890s.webp': '1890s',
  'police-baton-1920s.webp': '1920s',
  'police-baton-1930s.webp': '1930s',
  'police-baton-1940s.webp': '1940s',
  'police-baton-1980s.webp': '1980s',
  'police-baton-modern.webp': 'modern',
  'police-flashlight-prl.webp': '1980s',
  'power-bank-modern.webp': 'modern',
  'protective-herbs-pouch-1890s.webp': '1890s',
  'protective-herbs-pouch-1920s.webp': '1920s',
  'protective-herbs-pouch-1930s.webp': '1930s',
  'protective-herbs-pouch-1940s.webp': '1940s',
  'protective-herbs-pouch-1980s.webp': '1980s',
  'protective-herbs-pouch-modern.webp': 'modern',
  'psychotropics-kit-1890s.webp': '1890s',
  'psychotropics-kit-1920s.webp': '1920s',
  'psychotropics-kit-1930s.webp': '1930s',
  'psychotropics-kit-1940s.webp': '1940s',
  'psychotropics-kit-1980s.webp': '1980s',
  'psychotropics-kit-modern.webp': 'modern',
  'reading-glasses-case-1890s.webp': '1890s',
  'reading-glasses-case-1920s.webp': '1920s',
  'reading-glasses-case-1930s.webp': '1930s',
  'reading-glasses-case-1940s.webp': '1940s',
  'reading-glasses-case-1980s.webp': '1980s',
  'reading-glasses-case-modern.webp': 'modern',
  'reichsrevolver-m1879-1890s.webp': '1890s',
  'reichsrevolver-m1879-1920s.webp': '1920s',
  'reichsrevolver-m1879-1930s.webp': '1930s',
  'reichsrevolver-m1879-1940s.webp': '1940s',
  'reichsrevolver-m1879-1980s.webp': '1980s',
  'revolver-1940s.webp': '1940s',
  'revolver-32-1890s.webp': '1890s',
  'revolver-32-1920s.webp': '1920s',
  'revolver-32-1930s.webp': '1930s',
  'revolver-32-1940s.webp': '1940s',
  'revolver-32-1980s.webp': '1980s',
  'revolver-38-1920s.webp': '1920s',
  'revolver-colt38-1920s-1940s.webp': '1940s',
  'revolver-colt38-1920s.webp': '1920s',
  'revolver-pocket-unlicensed-1890s.webp': '1890s',
  'revolver-pocket-unlicensed-1920s.webp': '1920s',
  'revolver-pocket-unlicensed-1930s.webp': '1930s',
  'revolver-pocket-unlicensed-1940s.webp': '1940s',
  'revolver-pocket-unlicensed-1980s.webp': '1980s',
  'revolver-pocket-unlicensed-modern.webp': 'modern',
  'revolver-webley-1920s-1890s.webp': '1890s',
  'revolver-webley-1920s-1940s.webp': '1940s',
  'revolver-webley-1920s.webp': '1920s',
  'rifle-hk416-modern.webp': 'modern',
  'rifle-lee-metford-1890s.webp': '1890s',
  'rifle-springfield-1920s-1940s.webp': '1940s',
  'rifle-springfield-1920s.webp': '1920s',
  'rkm-chauchat-1920s.webp': '1920s',
  'rkm-chauchat-1930s.webp': '1930s',
  'rkm-chauchat-1940s.webp': '1940s',
  'rkm-chauchat-1980s.webp': '1980s',
  'rope-1890s.webp': '1890s',
  'rope-1920s.webp': '1920s',
  'rope-1930s.webp': '1930s',
  'rope-1940s.webp': '1940s',
  'rope-1980s.webp': '1980s',
  'rope-modern.webp': 'modern',
  'rugged-hiking-backpack-1890s.webp': '1890s',
  'rugged-hiking-backpack-1920s.webp': '1920s',
  'rugged-hiking-backpack-1930s.webp': '1930s',
  'rugged-hiking-backpack-1940s.webp': '1940s',
  'rugged-hiking-backpack-1980s.webp': '1980s',
  'rugged-ultrabook-modern.webp': 'modern',
  'safety-helmet-industrial-1890s.webp': '1890s',
  'safety-helmet-industrial-1920s.webp': '1920s',
  'safety-helmet-industrial-1930s.webp': '1930s',
  'safety-helmet-industrial-1940s.webp': '1940s',
  'safety-helmet-industrial-1980s.webp': '1980s',
  'safety-helmet-industrial-modern.webp': 'modern',
  'sage-incense-bundle-1890s.webp': '1890s',
  'sage-incense-bundle-1920s.webp': '1920s',
  'sage-incense-bundle-1930s.webp': '1930s',
  'sage-incense-bundle-1940s.webp': '1940s',
  'sage-incense-bundle-1980s.webp': '1980s',
  'sage-incense-bundle-modern.webp': 'modern',
  'satellite-gps-modern.webp': 'modern',
  'satellite-radio-modern.webp': 'modern',
  'scientific-calc-prl-1980s.webp': '1980s',
  'scientific-calc-prl.webp': '1980s',
  'shotgun-1890s.webp': '1890s',
  'shotgun-1920s.webp': '1920s',
  'shotgun-1930s.webp': '1930s',
  'shotgun-1940s.webp': '1940s',
  'shotgun-1980s.webp': '1980s',
  'shotgun-modern.webp': 'modern',
  'shotgun-sawed-off-1890s.webp': '1890s',
  'shotgun-sawed-off-1920s.webp': '1920s',
  'shotgun-sawed-off-1930s.webp': '1930s',
  'shotgun-sawed-off-1940s.webp': '1940s',
  'shotgun-sawed-off-1980s.webp': '1980s',
  'shotgun-sawed-off-modern.webp': 'modern',
  'silver-amulet-sigil-1890s.webp': '1890s',
  'silver-amulet-sigil-1920s.webp': '1920s',
  'silver-amulet-sigil-1930s.webp': '1930s',
  'silver-amulet-sigil-1940s.webp': '1940s',
  'silver-amulet-sigil-1980s.webp': '1980s',
  'silver-amulet-sigil-modern.webp': 'modern',
  'silver-cross-1890s.webp': '1890s',
  'silver-cross-1920s.webp': '1920s',
  'silver-cross-1930s.webp': '1930s',
  'silver-cross-1940s.webp': '1940s',
  'silver-cross-1980s.webp': '1980s',
  'silver-cross-modern.webp': 'modern',
  'silver-talisman-1890s.webp': '1890s',
  'silver-talisman-1920s.webp': '1920s',
  'silver-talisman-1930s.webp': '1930s',
  'silver-talisman-1940s.webp': '1940s',
  'silver-talisman-1980s.webp': '1980s',
  'silver-talisman-modern.webp': 'modern',
  'smelling-salts-vial-1890s.webp': '1890s',
  'smelling-salts-vial-1920s.webp': '1920s',
  'smelling-salts-vial-1930s.webp': '1930s',
  'smelling-salts-vial-1940s.webp': '1940s',
  'smelling-salts-vial-1980s.webp': '1980s',
  'smelling-salts-vial-modern.webp': 'modern',
  'sports-bag-1890s.webp': '1890s',
  'sports-bag-1920s.webp': '1920s',
  'sports-bag-1930s.webp': '1930s',
  'sports-bag-1940s.webp': '1940s',
  'sports-bag-1980s.webp': '1980s',
  'sports-bag-modern.webp': 'modern',
  'sports-gear-1890s.webp': '1890s',
  'sports-gear-1920s.webp': '1920s',
  'sports-gear-1930s.webp': '1930s',
  'sports-gear-1940s.webp': '1940s',
  'sports-gear-1980s.webp': '1980s',
  'sports-gear-modern.webp': 'modern',
  'submachine-tommy-1920s-1940s.webp': '1940s',
  'submachine-tommy-1920s.webp': '1920s',
  'sztucer-mysliwski-1890s.webp': '1890s',
  'sztucer-mysliwski-1920s.webp': '1920s',
  'sztucer-mysliwski-1930s.webp': '1930s',
  'sztucer-mysliwski-1940s.webp': '1940s',
  'sztucer-mysliwski-1980s.webp': '1980s',
  'tactical-flashlight-modern.webp': 'modern',
  'tape-recorder-prl-1970s-1980s.webp': '1980s',
  'tape-recorder-prl-1970s.webp': '1980s',
  'tarot-deck-vintage-1890s.webp': '1890s',
  'tarot-deck-vintage-1920s.webp': '1920s',
  'tarot-deck-vintage-1930s.webp': '1930s',
  'tarot-deck-vintage-1940s.webp': '1940s',
  'tarot-deck-vintage-1980s.webp': '1980s',
  'tarot-deck-vintage-modern.webp': 'modern',
  'thermometer-1890s.webp': '1890s',
  'thermometer-1920s.webp': '1920s',
  'thermometer-1930s.webp': '1930s',
  'thermometer-1940s.webp': '1940s',
  'thermometer-1980s.webp': '1980s',
  'thermometer-modern.webp': 'modern',
  'towel-1890s.webp': '1890s',
  'towel-1920s.webp': '1920s',
  'towel-1930s.webp': '1930s',
  'towel-1940s.webp': '1940s',
  'towel-1980s.webp': '1980s',
  'towel-modern.webp': 'modern',
  'trenchcoat-hat-noir-1920s.webp': '1920s',
  'trowel-brush-1890s.webp': '1890s',
  'trowel-brush-1920s.webp': '1920s',
  'trowel-brush-1930s.webp': '1930s',
  'trowel-brush-1940s.webp': '1940s',
  'trowel-brush-1980s.webp': '1980s',
  'trowel-brush-modern.webp': 'modern',
  'typewriter-1890s.webp': '1890s',
  'typewriter-1920s.webp': '1920s',
  'typewriter-1930s.webp': '1930s',
  'typewriter-1940s.webp': '1940s',
  'typewriter-1980s.webp': '1980s',
  'typewriter-modern.webp': 'modern',
  'vis-wz35-1930s.webp': '1930s',
  'vis-wz35-1940s.webp': '1940s',
  'vis-wz35-modern.webp': 'modern',
  'wallet-1890s.webp': '1890s',
  'wallet-1920s.webp': '1920s',
  'wallet-1930s.webp': '1930s',
  'wallet-1940s.webp': '1940s',
  'wallet-1980s.webp': '1980s',
  'wallet-modern.webp': 'modern',
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
