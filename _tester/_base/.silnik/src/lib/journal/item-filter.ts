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
  wordPattern('bateri[a-ząćęłńóśźż]*|akumulator[a-ząćęłńóśźż]*|battery|batteries'),
  wordPattern(
    'telefon[a-ząćęłńóśźż]*(\\s+komórkow[a-ząćęłńóśźż]*)?|komórk[a-ząćęłńóśźż]*|smartfon[a-ząćęłńóśźż]*|cellphone[s]?|cell\\s*phone[s]?|mobile(\\s*phone[s]?)?|smart\\s*phone[s]?'
  ),
  wordPattern('ładowark[a-ząćęłńóśźż]*|charger[s]?'),
  wordPattern('powerbank[a-ząćęłńóśźż]*|power\\s*bank[s]?'),
  wordPattern('kabl[a-ząćęłńóśźż]*\\s+usb|usb\\s+cable[s]?'),

  // Ogień i palenie (pospolite)
  wordPattern('zapałk[a-ząćęłńóśźż]*|zapałek|matches|matchbox(es)?'),
  wordPattern('zapalniczk[a-ząćęłńóśźż]*|lighter[s]?'),
  wordPattern('papieros[a-ząćęłńóśźż]*|cigarettes?|pack\\s+of\\s+cigarettes'),
  wordPattern('cygar[a-ząćęłńóśźż]*|cigars?|tabak[a-ząćęłńóśźż]*|snuff'),
  wordPattern('popielniczk[a-ząćęłńóśźż]*|ashtray[s]?'),

  // Finanse i drobiazgi kieszonkowe
  wordPattern('portfel[a-ząćęłńóśźż]*|portmonetk[a-ząćęłńóśźż]*|wallet[s]?|billfold[s]?|purse[s]?'),
  wordPattern('drobne(\\s+monety)?|bilon[a-ząćęłńóśźż]*|loose\\s+change|pocket\\s+change'),
  wordPattern('gotówk[a-ząćęłńóśźż]*|pieni[aą]dz[a-ząćęłńóśźż]*|cash'),

  // Higiena i kosmetyka codzienna
  wordPattern('chusteczk[a-ząćęłńóśźż]*|chusteczek|tissues?|handkerchief[s]?'),
  wordPattern('grzebie[ńn][a-ząćęłńóśźż]*|grzebyk[a-ząćęłńóśźż]*|comb[s]?|hairbrush(es)?'),
  wordPattern('lusterk[a-ząćęłńóśźż]*|pocket\\s+mirror[s]?'),
  wordPattern('myd[łl][a-ząćęłńóśźż]*|soap[s]?'),
  wordPattern('pomadk[a-ząćęłńóśźż]*|lipstick[s]?|balsam[a-ząćęłńóśźż]*\\s+do\\s+ust|lip\\s+balm[s]?'),
  wordPattern('szmink[a-ząćęłńóśźż]*|nail\\s+file[s]?|pilniczek|pilniczk[a-ząćęłńóśźż]*'),

  // Pospolite przybory biurowe bez cech poszlaki
  wordPattern('zwykły\\s+(ołówek|długopis)|gumk[a-ząćęłńóśźż]*\\s+do\\s+ścierania|eraser[s]?'),
  wordPattern('ołówk[a-ząćęłńóśźż]*|ołówek|długopis[a-ząćęłńóśźż]*|pencils?|pens?|ballpoint\\s*pens?'),

  // Pospolite słodycze i przekąski
  wordPattern('gum[a-ząćęłńóśźż]*\\s+do\\s+żucia|chewing\\s+gum|bubble\\s+gum'),
  wordPattern('cukierk[a-ząćęłńóśźż]*|cukierków|drops[a-ząćęłńóśźż]*|candies|candy'),

  // Pospolite klucze domowe/samochodowe (nie-śledcze)
  wordPattern('klucz[a-ząćęłńóśźż]*\\s+(do|od)\\s+(mieszkania|domu|garażu|pokoju|auta|samochodu)'),
  wordPattern('house\\s+keys?|car\\s+keys?'),

  // Pospolite elementy garderoby i drobiazgi
  wordPattern('sznurówk[a-ząćęłńóśźż]*|sznurówek|shoelaces?'),
  wordPattern('zegark[a-ząćęłńóśźż]*|zegarek(\\s+(na\\s+rękę|kwarcowy|kieszonkowy))?|wrist\\s*watch(es)?'),
];

/**
 * Wzorce słów kluczowych wskazujących na istotność fabularną.
 * Jeśli przedmiot zawiera taki znacznik, NIE jest traktowany jako pospolity,
 * nawet jeśli zawiera słowo z listy pospolitych (np. "zaszyfrowany telefon", "zakrwawiona chusteczka").
 */
const PLOT_SIGNIFICANCE_OVERRIDE_PATTERNS: RegExp[] = [
  wordPattern('zakrwawion[a-ząćęłńóśźż]*|bloody|blood-stained'),
  wordPattern('tajemnicz[a-ząćęłńóśźż]*|mysterious|enigmatic'),
  wordPattern('starożytn[a-ząćęłńóśźż]*|starodawn[a-ząćęłńóśźż]*|ancient|antyk|antique[s]?'),
  wordPattern('okultystyczn[a-ząćęłńóśźż]*|rytualn[a-ząćęłńóśźż]*|occult|ritual|eldritch'),
  wordPattern('zaszyfrowan[a-ząćęłńóśźż]*|kodowan[a-ząćęłńóśźż]*|szyfr[a-ząćęłńóśźż]*|encrypted|cipher[s]?'),
  wordPattern('magiczn[a-ząćęłńóśźż]*|magia|magii|magic|dziwn[a-ząćęłńóśźż]*|strange|bizarre|alien'),
  wordPattern('dowód|dowod[a-ząćęłńóśźż]*|poszlak[a-ząćęłńóśźż]*|ślad[a-ząćęłńóśźż]*|evidence|clue[s]?'),
  wordPattern('handout[s]?|zeznani[a-ząćęłńóśźż]*|dokument[a-ząćęłńóśźż]*|list[a-ząćęłńóśźż]*|rękopis[a-ząćęłńóśźż]*|akta|aktów|manuscript[s]?|letter[s]?'),
  wordPattern('artefakt[a-ząćęłńóśźż]*|relikt[a-ząćęłńóśźż]*|amulet[a-ząćęłńóśźż]*|talizman[a-ząćęłńóśźż]*|idol[a-ząćęłńóśźż]*|artifact[s]?|relic[s]?'),
  wordPattern('znak[a-ząćęłńóśźż]*|symbol[a-ząćęłńóśźż]*|insygni[a-ząćęłńóśźż]*|pieczęć|pieczęci[a-ząćęłńóśźż]*|sigil[s]?|seal[s]?'),
  wordPattern('trucizn[a-ząćęłńóśźż]*|jad[a-ząćęłńóśźż]*|poison[s]?|venom|arszenik|arsenic'),
  wordPattern('mosiężn[a-ząćęłńóśźż]*|srebrn[a-ząćęłńóśźż]*|złot[a-ząćęłńóśźż]*|brass|silver|golden?'),
  wordPattern('cthulhu|mythos|mity|arkham|miskatonic|innsmouth'),
  wordPattern('grimuar[a-ząćęłńóśźż]*|grimoire[s]?'),
  wordPattern('klucz[a-ząćęłńóśźż]*\\s+(do|od)\\s+(krypty|grobowca|skarbca|serwisu|kaplicy|sejfu|lochów|tajemnic|piwnicy|mauzoleum)'),
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
