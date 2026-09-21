/**
 * Moduł filtrowania pospolitych przedmiotów w Dzienniku Sesji (Issue #466).
 *
 * Filtruje przedmioty codziennego użytku (baterie, telefon, zapałki itp.),
 * pozostawiając w Kronice Scen wyłącznie przedmioty istotne dla fabuły:
 * artefakty, dokumenty, listy, poszlaki, klucze śledcze, niezwykłą broń itp.
 */

/** Pomocnicza funkcja tworząca regex z poprawnym dopasowaniem granic słów z polskimi znakami */
function wordPattern(expr: string): RegExp {
  return new RegExp(
    `(?<![a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ])(?:${expr})(?![a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ])`,
    'iu'
  );
}

/**
 * Wzorce pospolitych przedmiotów codziennego użytku (PL i EN).
 */
const MUNDANE_PATTERNS: RegExp[] = [
  // Zasilanie i elektronika codziennego użytku
  wordPattern('baterie|bateria|akumulatorek|akumulatorki|battery|batteries'),
  wordPattern(
    'telefon(\\s+komórkowy)?|komórka|smartfon|cellphone|cell\\s*phone|mobile(\\s*phone)?|smart\\s*phone'
  ),
  wordPattern('ładowark[aieę]|charger'),
  wordPattern('powerbank|power\\s*bank'),
  wordPattern('kabel\\s+usb|usb\\s+cable'),

  // Ogień i palenie (pospolite)
  wordPattern('zapałk[iaieę]|pudełko\\s+zapałek|matches|matchbox'),
  wordPattern('zapalniczk[aieę]|lighter'),
  wordPattern('papieros[yów]?|paczka\\s+papierosów|cigarettes?|pack\\s+of\\s+cigarettes'),
  wordPattern('cygar[oa]|cigars?|tabaka|snuff'),
  wordPattern('popielniczk[aieę]|ashtray'),

  // Finanse i drobiazgi kieszonkowe
  wordPattern('portfel|portmonetk[aieę]|wallet|billfold|purse'),
  wordPattern('drobne(\\s+monety)?|bilon|loose\\s+change|pocket\\s+change'),
  wordPattern('gotówka|pieniądze|cash'),

  // Higiena i kosmetyka codzienna
  wordPattern('chusteczk[iaieę](\\s+higieniczne)?|tissues?|handkerchief'),
  wordPattern('grzebie[ńn]|grzebyk|comb|hairbrush'),
  wordPattern('lusterko(\\s+kieszonkowe)?|pocket\\s+mirror'),
  wordPattern('mydł[oa]|soap'),
  wordPattern('pomadk[aieę]|lipstick|balsam\\s+do\\s+ust|lip\\s+balm'),
  wordPattern('szmink[aieę]|nail\\s+file|pilniczek'),

  // Pospolite przybory biurowe bez cech poszlaki
  wordPattern('zwykły\\s+(ołówek|długopis)|gumka\\s+do\\s+ścierania|eraser'),
  wordPattern('ołówek|długopis|pencil|ballpoint\\s*pen'),

  // Pospolite słodycze i przekąski
  wordPattern('guma\\s+do\\s+żucia|chewing\\s+gum|bubble\\s+gum'),
  wordPattern('cukierk[iaieę]|dropsy|candies|candy'),

  // Pospolite klucze domowe/samochodowe (nie-śledcze)
  wordPattern('klucze?\\s+do\\s+(mieszkania|domu|garażu|pokoju|auta|samochodu)'),
  wordPattern('house\\s+keys?|car\\s+keys?'),

  // Pospolite elementy garderoby i drobiazgi
  wordPattern('sznurówk[iaieę]|shoelaces?'),
  wordPattern('zegarek\\s+(na\\s+rękę|kwarcowy|kieszonkowy)|wrist\\s*watch'),
];

/**
 * Wzorce słów kluczowych wskazujących na istotność fabularną.
 * Jeśli przedmiot zawiera taki znacznik, NIE jest traktowany jako pospolity,
 * nawet jeśli zawiera słowo z listy pospolitych (np. "zaszyfrowany telefon", "zakrwawiona chusteczka").
 */
const PLOT_SIGNIFICANCE_OVERRIDE_PATTERNS: RegExp[] = [
  wordPattern('zakrwawion[a-ząćęłńóśźż]*|bloody|blood-stained'),
  wordPattern('tajemnicz[a-ząćęłńóśźż]*|mysterious|enigmatic'),
  wordPattern('starożytn[a-ząćęłńóśźż]*|starodawn[a-ząćęłńóśźż]*|ancient|antyk|antique'),
  wordPattern('okultystyczn[a-ząćęłńóśźż]*|rytualn[a-ząćęłńóśźż]*|occult|ritual|eldritch'),
  wordPattern('zaszyfrowan[a-ząćęłńóśźż]*|kodowan[a-ząćęłńóśźż]*|szyfr[a-ząćęłńóśźż]*|encrypted|cipher'),
  wordPattern('magniczn[a-ząćęłńóśźż]*|dziwn[a-ząćęłńóśźż]*|strange|bizarre|alien'),
  wordPattern('dowód|poszlak[a-ząćęłńóśźż]*|ślad|evidence|clue'),
  wordPattern('handout|zeznanie|dokument|list|rękopis|akt[a]?|manuscript|letter'),
  wordPattern('artefakt|relikt|amulet|talizman|idol|artifact|relic'),
  wordPattern('symbol|insygnia|pieczęć|sigil|seal'),
  wordPattern('trucizn[a-ząćęłńóśźż]*|jad|poison|venom|arszenik|arsenic'),
  wordPattern('mosiężn[a-ząćęłńóśźż]*|srebrn[a-ząćęłńóśźż]*|złot[a-ząćęłńóśźż]*|brass|silver|golden'),
  wordPattern('cthulhu|mythos|mity|arkham|miskatonic'),
  wordPattern('klucz\\s+do\\s+(krypty|grobowca|sewisu|kaplicy|sejfu|lochów|tajemnic)'),
];

/**
 * Sprawdza, czy dany przedmiot jest istotny dla fabuły śledztwa (nie jest pospolity).
 */
export function isPlotRelevantItem(itemName: string | null | undefined): boolean {
  if (!itemName || typeof itemName !== 'string') return false;
  const trimmed = itemName.trim();
  if (!trimmed) return false;

  // Sprawdź czy przedmiot ma silny znacznik fabularny (np. "zakrwawiona chusteczka")
  if (PLOT_SIGNIFICANCE_OVERRIDE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  // Sprawdź czy przedmiot pasuje do pospolitych rzeczy codziennego użytku
  if (MUNDANE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  return true;
}

/**
 * Filtruje tablicę przedmiotów/poszlak, pozostawiając tylko te istotne fabularnie.
 */
export function filterPlotItems(items: (string | null | undefined)[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0 && isPlotRelevantItem(item));
}
