/**
 * Wspólny język koloru i spójności epokowej dla renderów, portretów i ilustracji.
 * Obsługuje wszystkie epoki (od Gaslight po współczesność), precyzyjnie definiując
 * filtry barwne, tekstowe dyrektywy oświetlenia oraz strażników anachronizmów.
 */

import type { ResolvedEraContext } from '@/lib/era/types';

export type EraVisualProfile =
  | '1890s'
  | '1920s'
  | '1930s'
  | '1940s'
  | '1950s'
  | 'prl-1970s'
  | '1980s'
  | '1990s'
  | '2000s'
  | 'modern';

const ERA_IMAGE_FILTERS: Record<EraVisualProfile, string> = {
  '1890s': 'sepia(0.5) saturate(0.58) contrast(1.06) brightness(0.96)',
  '1920s': 'sepia(0.22) saturate(0.76) contrast(1.04) brightness(0.98)',
  '1930s': 'sepia(0.18) saturate(0.68) contrast(1.08) brightness(0.95)',
  '1940s': 'sepia(0.1) saturate(0.56) contrast(1.1) brightness(0.94)',
  '1950s': 'sepia(0.06) saturate(0.85) contrast(1.02) brightness(0.98)',
  'prl-1970s': 'sepia(0.08) saturate(0.7) contrast(0.96) brightness(0.98)',
  '1980s': 'sepia(0.04) saturate(0.88) contrast(1.04) brightness(0.97)',
  '1990s': 'sepia(0.02) saturate(0.94) contrast(1.02) brightness(0.99)',
  '2000s': 'contrast(1.02) brightness(1.0)',
  modern: 'none',
};

/**
 * Precyzyjnie rozpoznaje profil epoki na podstawie nazwy ery, etykiety lub roku.
 * Zapobiega wpadaniu lat 1900-1919 i 1950-1959 do modern, a lat 80. do PRL-u lat 70.
 * Akceptuje też wprost `ResolvedEraContext` - wtedy decyduje `effectiveYear`.
 */
export function resolveEraVisualProfile(
  eraOrYear: string | ResolvedEraContext | undefined
): EraVisualProfile {
  if (eraOrYear && typeof eraOrYear === 'object') {
    return resolveEraVisualProfile(String(eraOrYear.effectiveYear));
  }
  const value = eraOrYear?.toLowerCase().trim() ?? '';
  if (!value) return '1920s';

  // 1. Jawne słowa kluczowe
  if (value.includes('gaslight') || value.includes('wiktoria') || value.includes('victorian')) return '1890s';
  if (value.includes('classic') || value.includes('lata 20') || value.includes('twenties')) return '1920s';
  if (value.includes('lata 30') || value.includes('thirties') || value.includes('depression')) return '1930s';
  if (value.includes('noir') || value.includes('lata 40') || value.includes('forties') || value.includes('wojen')) return '1940s';
  if (value.includes('lata 50') || value.includes('fifties')) return '1950s';
  if (value.includes('prl') || value.includes('lata 70') || value.includes('seventies') || value.includes('lata 60') || value.includes('sixties')) return 'prl-1970s';
  if (value.includes('lata 80') || value.includes('eighties') || value.includes('1980')) return '1980s';
  if (value.includes('lata 90') || value.includes('nineties') || value.includes('1990')) return '1990s';
  if (value.includes('2000') || value.includes('y2k') || value.includes('dwutysiecz')) return '2000s';
  if (value.includes('modern') || value.includes('współczesn') || value.includes('wspolczesn') || value.includes('contemporary')) return 'modern';

  // 2. Ekstrakcja liczby 4-cyfrowej (roku)
  const yearMatch = value.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year < 1920) return '1890s'; // 1890-1919 (Gaslight / Victorian / Edwardian)
    if (year >= 1920 && year < 1930) return '1920s';
    if (year >= 1930 && year < 1940) return '1930s';
    if (year >= 1940 && year < 1950) return '1940s';
    if (year >= 1950 && year < 1960) return '1950s';
    if (year >= 1960 && year < 1980) return 'prl-1970s';
    if (year >= 1980 && year < 1990) return '1980s';
    if (year >= 1990 && year < 2000) return '1990s';
    if (year >= 2000 && year < 2010) return '2000s';
    return 'modern';
  }

  // 3. Wzorce prefiksowe (np. '1890s', '1920s', '1970s')
  if (/^189/.test(value) || /^190/.test(value) || /^191/.test(value)) return '1890s';
  if (/^192/.test(value)) return '1920s';
  if (/^193/.test(value)) return '1930s';
  if (/^194/.test(value)) return '1940s';
  if (/^195/.test(value)) return '1950s';
  if (/^196/.test(value) || /^197/.test(value)) return 'prl-1970s';
  if (/^198/.test(value)) return '1980s';
  if (/^199/.test(value)) return '1990s';
  if (/^200/.test(value)) return '2000s';
  if (/^20[1-9]/.test(value)) return 'modern';

  return '1920s';
}

export function getEraImageFilter(eraOrYear: string | undefined): string {
  return ERA_IMAGE_FILTERS[resolveEraVisualProfile(eraOrYear)];
}

/** Tekstowy odpowiednik profilu barwnego dla generatora obrazów. */
export function getEraColorDirection(
  eraOrYear: string | ResolvedEraContext | undefined
): string {
  switch (resolveEraVisualProfile(eraOrYear)) {
    case '1890s':
      return 'muted sepia monochrome, warm archival print character, soft vintage vignette';
    case '1920s':
      return 'warm, slightly faded early color film, restrained sepia undertone, 1920s photographic plate';
    case '1930s':
      return 'dusty desaturated tones, 1930s Kodachrome prototype film aesthetic, high contrast';
    case '1940s':
      return 'muted wartime color photography, low saturation, deep shadows, 1940s film noir contrast';
    case '1950s':
      return 'early Technicolor and Kodachrome vibrance, warm saturated daylight tones, clean mid-century contrast';
    case 'prl-1970s':
      return 'faded 1970s Eastern European analog color, Orwochrom/Fotopan film look, subdued greens and ochres';
    case '1980s':
      return '1980s 35mm analog film photograph, slight grain, authentic 1980s color rendition';
    case '1990s':
      return '1990s disposable 35mm flash photograph, raw documentary analog colors, authentic 90s film grain';
    case '2000s':
      return 'early 2000s digital/analog transition colors, natural daylight, early digital camera aesthetic';
    case 'modern':
      return 'neutral full color, true-to-life saturation, sharp natural lighting, modern documentary clarity';
  }
}

/**
 * Twarde strażniki anachronizmów (Negative Guardrails) dla generatora obrazów.
 * Bezwzględnie blokuje pojawianie się technologii i pojazdów z późniejszych epok.
 */
export function getEraTechnologyGuardrails(
  eraOrYear: string | ResolvedEraContext | undefined
): string {
  const profile = resolveEraVisualProfile(eraOrYear);

  const baseNegative = 'no CGI, no 3D render, no futuristic elements';

  switch (profile) {
    case '1890s':
      return `${baseNegative}, no electricity in rural areas, no electric lightbulbs in streets, no automobiles, no cars, no modern vehicles, no airplanes, no telephones, no plastic, no modern fabrics, no cassette tapes, no vinyl records, no transistors, no modern headphones, strictly late 19th century authentic Victorian setting`;
    case '1920s':
      return `${baseNegative}, no smartphones, no mobile phones, no powerbanks, no touchscreens, no computers, no modern electronics, no plastic gadgets, no modern cars, no post-1930 vehicles, no cassette tapes, no microcassettes, no CDs, no transistors, no LED lights, no digital displays, no modern plastics, no nylon, strictly authentic 1920s period setting`;
    case '1930s':
      return `${baseNegative}, no smartphones, no cell phones, no powerbanks, no modern screens, no television sets, no post-1939 vehicles, no cassette tapes, no microcassettes, no digital screens, no transistors, no nylon, strictly authentic 1930s period setting`;
    case '1940s':
      return `${baseNegative}, no smartphones, no mobile phones, no powerbanks, no laptops, no modern plastics, no post-1950 vehicles, no cassette tapes, no CDs, no transistors, no integrated circuits, no microchips, strictly authentic 1940s period setting`;
    case '1950s':
      return `${baseNegative}, no smartphones, no cell phones, no powerbanks, no personal computers, no modern aerodynamic cars, no cassette tapes, no CDs, no microprocessors, no digital screens, no USB, strictly authentic 1950s period setting`;
    case 'prl-1970s':
      return `${baseNegative}, no smartphones, no mobile phones, no iPhones, no powerbanks, no laptops, no modern screens, no USB, no modern cars, no 1920s vintage cars, no CDs, no MP3 players, no USB flash drives, no memory cards, no laptops, no wireless devices, strictly authentic 1970s period setting`;
    case '1980s':
      return `${baseNegative}, no smartphones, no iPhones, no modern touchscreen phones, no powerbanks, no modern flat screen TVs, no modern aerodynamic cars, no 1920s vintage cars, no DVDs, no USB, no SD cards, no modern LCD screens, strictly authentic 1980s period setting`;
    case '1990s':
      return `${baseNegative}, no smartphones, no iPhones, no modern touchscreens, no powerbanks, no wireless modern earbuds, no post-2000 vehicles, no USB thumbdrives, no microSD cards, no modern OLED displays, strictly authentic 1990s period setting`;
    case '2000s':
      return `${baseNegative}, no modern full-screen smartphones, no iPhones, no modern powerbanks, no modern touchscreens, no Bluetooth earbuds, no modern USB-C, strictly authentic early 2000s period setting`;
    case 'modern':
      return `${baseNegative}`;
  }
}

/**
 * Zwraca precyzyjny opis wyglądu telefonu dla danej epoki.
 */
export function getEraPhoneVisualDescription(
  eraOrYear: string | ResolvedEraContext | undefined
): string {
  const profile = resolveEraVisualProfile(eraOrYear);
  switch (profile) {
    case '1890s':
      return 'wooden wall-mounted hand-crank telephone with separate listening piece, brass bells on top, no dial, period Victorian telephone';
    case '1920s':
    case '1930s':
      return 'vintage black metal candlestick telephone with separate earpiece receiver and rotary base, coiled cloth cord, no screen';
    case '1940s':
    case '1950s':
      return 'heavy black bakelite desktop telephone with rotary dial, mechanical bells inside, cloth cord, no screen';
    case 'prl-1970s':
      return '1970s analog desktop rotary telephone (e.g. Polish Aster or RWT Telkom), beige or grey matte plastic housing, rotary dial with finger stop, coiled cord, no screen, no digital elements';
    case '1980s':
      return '1980s desktop landline telephone with rotary dial or mechanical push buttons, beige or brown plastic case, coiled handset cord, connected to wall jack, strictly no screen, no cellular antenna';
    case '1990s':
      return '1990s desktop landline phone with push buttons and redial key OR early bulky handheld cellular phone with pull-out whip antenna and numeric keypad, small monochrome 1-line LCD';
    case '2000s':
      return 'early 2000s feature mobile phone (flip phone or durable bar phone with physical keypad), small color or monochrome screen, no touch screen';
    case 'modern':
      return 'contemporary touchscreen smartphone with glass front, minimal bezels, charging cable';
  }
}

/**
 * Zwraca precyzyjny opis pojazdów dla danej epoki (zapobiega Fordom T w latach 70.).
 */
export function getEraVehicleVisualDescription(eraOrYear: string | undefined): string {
  const profile = resolveEraVisualProfile(eraOrYear);
  switch (profile) {
    case '1890s':
      return 'horse-drawn carriage, hansom cab or steam locomotive, cobblestone street';
    case '1920s':
      return '1920s vintage automobile with upright radiator grille, running boards, spoke wheels, Model T or Packard era';
    case '1930s':
      return '1930s aerodynamic curved automobile with sweeping fenders and chrome grille';
    case '1940s':
      return '1940s heavy steel sedan with teardrop fenders and chrome bumpers';
    case '1950s':
      return '1950s automobile with tailfins, two-tone paint, chrome bumpers and wide whitewall tires';
    case 'prl-1970s':
      return '1970s Eastern European / European boxy sedan or hatchback (such as Polski Fiat 125p, FSO, Wartburg or 1970s European car), chrome rectangular bumpers, analog round or rectangular headlights, period 1970s automobile';
    case '1980s':
      return '1980s angular boxy automobile (such as Polonez, VW Golf II, Ford Sierra or boxy 1980s sedan), plastic bumpers, rectangular halogen headlights';
    case '1990s':
      return '1990s curved aerodynamic compact sedan or station wagon with plastic body panels and halogen headlights';
    case '2000s':
      return '2000s contemporary sedan or hatchback with silver metallic paint and clear lens headlights';
    case 'modern':
      return 'modern contemporary vehicle with LED lights and aerodynamic styling';
  }
}

/**
 * Zwraca precyzyjny opis urządzeń rejestrujących i elektroniki audio dla danej epoki.
 */
export function getEraAudioRecordingVisualDescription(
  eraOrYear: string | ResolvedEraContext | undefined
): string {
  const profile = resolveEraVisualProfile(eraOrYear);
  switch (profile) {
    case '1890s':
      return 'phonograph with hand-cranked clockwork motor, wax cylinder mechanism, large fluted brass horn, dark mahogany base with exposed cast-iron gearing, strictly mechanical acoustic recording';
    case '1920s':
      return '1920s spring-wound portable gramophone in black leatherette wooden case with nickel soundbox OR early vacuum tube radio receiver with exposed glowing triode valves, honeycomb tuning coils and large fluted horn speaker, external brass binding posts';
    case '1930s':
      return '1930s tabletop cathedral-style radio with arched walnut veneer cabinet, illuminated amber tuning dial, wooden fretwork grille, cloth speaker backing OR heavy portable wire-recorder with steel spools';
    case '1940s':
      return '1940s wartime communications receiver in olive-drab pressed steel chassis, rubber-coated cables, analog frequency dial with knurled knobs, heavy bakelite headphones';
    case '1950s':
      return '1950s mid-century desktop radio with pastel or ivory bakelite cabinet, gold anodized trim, horizontal tuning slide OR reel-to-reel magnetic tape recorder with two 7-inch aluminum reels, mechanical piano keys and analog VU meter';
    case 'prl-1970s':
      return '1970s Eastern European portable reel-to-reel or cassette recorder (e.g. Polish Unitra ZRK Magmor or Grundig license), two-tone grey/charcoal impact plastic, mechanical push-buttons with red record key, DIN connectors, analog needle VU meter';
    case '1980s':
      return '1980s portable microcassette voice recorder or boombox cassette deck, matte black plastic, mechanical click keys, small red LED indicator, built-in condenser mic grille';
    case '1990s':
      return '1990s handheld microcassette dictaphone or compact portable radio, charcoal-grey molded plastic with slide switches, mechanical tape counter, built-in miniature speaker';
    case '2000s':
      return 'early 2000s compact digital voice recorder with small monochrome backlit LCD, silver plastic case, USB cover cap';
    case 'modern':
      return 'contemporary slim metal-body digital audio recorder or studio microphone with shockmount';
  }
}

/**
 * Zwraca precyzyjny opis aparatów fotograficznych i optyki dla danej epoki.
 */
export function getEraCameraVisualDescription(
  eraOrYear: string | ResolvedEraContext | undefined
): string {
  const profile = resolveEraVisualProfile(eraOrYear);
  switch (profile) {
    case '1890s':
      return 'large wooden folding field camera on heavy brass-hinged tripod, pleated leather bellows, brass barrel lens with waterhouse stops, ground glass focusing back';
    case '1920s':
      return 'vintage 1920s folding pocket camera with black leather-covered body, accordion bellows, nickel-plated struts, rim-set leaf shutter and brilliant waist-level viewfinder';
    case '1930s':
      return '1930s rangefinder 35mm camera with satin-chrome top plate, black vulcanite body, collapsible lens and twin viewfinder windows';
    case '1940s':
      return 'wartime twin-lens reflex (TLR) camera with two vertically stacked lenses, black leatherette body, top pop-up waist-level focusing hood and winding crank';
    case '1950s':
      return '1950s all-metal 35mm rangefinder or early SLR, polished chrome accents, textured leatherette grip, mechanical winding lever';
    case 'prl-1970s':
      return '1970s Eastern European mechanical SLR (e.g. Zenit or Praktica), heavy die-cast metal body, black vulcanite, large manual aperture ring, cold shoe on top';
    case '1980s':
      return '1980s motorized SLR with black polycarbonate body, red grip stripe, manual focus ring, top prism housing';
    case '1990s':
      return '1990s compact point-and-shoot camera with sliding lens barrier, black textured plastic, built-in pop-up electronic flash';
    case '2000s':
      return 'early 2000s compact digital camera with silver aluminum finish, small color LCD on rear, optical zoom lens barrel';
    case 'modern':
      return 'modern mirrorless digital camera with matte black magnesium alloy body, electronic viewfinder and coated multi-element lens';
  }
}

/**
 * Zwraca opis dewocjonaliów i akcesoriów liturgicznych/rytualnych (CoC 7e RAW).
 */
export function getEraDevotionalVisualDescription(): string {
  return 'authentic liturgical devotional item, consecrated period craftsmanship, sterling silver with natural dark tarnish, hand-rubbed olive wood, genuine beeswax candles with natural drips, untrimmed rag vellum, zero fantasy embellishments, strictly authentic historical religious or folk artifact';
}

/**
 * Zwraca opis odzieży ochronnej, gogli i toreb podróżnych.
 */
export function getEraProtectiveVisualDescription(): string {
  return 'period protective or travel gear, heavy stitched saddle leather, tarnished brass roller buckles, thick optical glass with stitched leather or aluminum eye-cups, wax-coated canvas with authentic travel patina and honest wear marks';
}


