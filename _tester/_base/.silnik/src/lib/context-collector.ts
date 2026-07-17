/**
 * Context Collector
 *
 * Automatycznie parsuje odpowiedzi AI i wydobywa:
 * - NPC (imiona, opisy, cechy)
 * - Lokacje (nazwy, opisy)
 * - Fakty fabularne
 *
 * Działa w tle, niewidocznie dla gracza.
 */

import {
  gameContextService,
  KeyFact,
  NPCEntry,
  LocationEntry,
} from './game-context';

// ============================================================================
// HELPERS
// ============================================================================

// Escape regex special chars (MDN-recommended pattern). Chroni przed SyntaxError
// gdy NPC name z LLM zawiera np. `(`, `[`, `\\` w treści.
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// PATTERNS DO DETEKCJI
// ============================================================================

// Pattern NPC - wykrywa cytaty i wprowadzenia NPC
const NPC_PATTERNS = [
  // "Jan Kowalski mówi:", "Pan Müller odpowiada:"
  /(?:^|\n)(?:(?:Pan|Pani|Dr|Prof\.|Profesor|Doktor|Ksiądz|Ojciec|Siostra|Brat)\s+)?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)\s+(?:mówi|odpowiada|szepcze|krzyczy|pyta|wyjaśnia|wzdycha|śmieje się|kiwa głową):/gi,
  // "— Witaj — mówi stary bibliotekarz"
  /[—–-]\s*.+?[—–-]\s+(?:mówi|odpowiada|szepcze)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/gi,
  // "spotykasz [postać]", "widzisz [osobę]"
  /(?:spotykasz|widzisz|zauważasz|dostrzegasz)\s+(?:(?:starszą?|młodą?|wysoką?|niską?|grubą?|szczupłą?)\s+)?(?:kobietę|mężczyznę|osobę|postać)(?:\s+o\s+imieniu)?\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/gi,
];

// Pattern lokacji
const LOCATION_PATTERNS = [
  // "Wchodzisz do [lokacji]", "Jesteś w [lokacji]"
  /(?:wchodzisz do|jesteś w|znajdujesz się w|docierasz do|przybywasz do)\s+(.+?)(?:\.|,|\n)/gi,
  // "dom Corbittów", "biblioteka uniwersytecka"
  /(?:opuszczony|stary|mroczny|ciemny|duży|mały)\s+(dom|budynek|biblioteka|kościół|cmentarz|piwnica|strych|magazyn|port|dok|sklep|kawiarnia|bar|hotel)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?/gi,
];

// Pattern faktów fabularnych
const FACT_PATTERNS = [
  // "dowiadujesz się, że..."
  /(?:dowiadujesz się|odkrywasz|rozumiesz|uświadamiasz sobie|dochodzisz do wniosku),?\s+że\s+(.+?)(?:\.|$)/gi,
  // "okazuje się, że..."
  /(?:okazuje się|wychodzi na jaw|staje się jasne),?\s+że\s+(.+?)(?:\.|$)/gi,
  // "to było [fakt]"
  /(?:mordercą|sprawcą|winnym|odpowiedzialnym)\s+(?:był|była|jest|okazał się|okazała się)\s+(.+?)(?:\.|$)/gi,
];

// ============================================================================
// CONTEXT COLLECTOR CLASS
// ============================================================================

interface ExtractedData {
  npcs: Partial<NPCEntry>[];
  locations: Partial<LocationEntry>[];
  facts: Partial<KeyFact>[];
}

class ContextCollector {
  private lastProcessedId: string = '';

  /**
   * Przetwarza odpowiedź AI i wydobywa kontekst
   */
  async processAIResponse(
    response: string,
    messageId?: string
  ): Promise<ExtractedData> {
    // Unikaj przetwarzania tej samej wiadomości
    if (messageId && messageId === this.lastProcessedId) {
      return { npcs: [], locations: [], facts: [] };
    }
    if (messageId) this.lastProcessedId = messageId;

    const extracted: ExtractedData = {
      npcs: [],
      locations: [],
      facts: [],
    };

    // Ekstrakcja NPC
    extracted.npcs = this.extractNPCs(response);

    // Ekstrakcja lokacji
    extracted.locations = this.extractLocations(response);

    // Ekstrakcja faktów
    extracted.facts = this.extractFacts(response);

    // Zapisz do GameContext
    this.saveExtractedData(extracted);

    if (
      extracted.npcs.length > 0 ||
      extracted.locations.length > 0 ||
      extracted.facts.length > 0
    ) {
      console.log('🔍 ContextCollector extracted:', {
        npcs: extracted.npcs.length,
        locations: extracted.locations.length,
        facts: extracted.facts.length,
      });
    }

    return extracted;
  }

  /**
   * Wydobywa NPC z tekstu
   */
  private extractNPCs(text: string): Partial<NPCEntry>[] {
    const npcs: Partial<NPCEntry>[] = [];
    const foundNames = new Set<string>();

    for (const pattern of NPC_PATTERNS) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1]?.trim();
        if (
          name &&
          name.length > 2 &&
          name.length < 40 &&
          !foundNames.has(name.toLowerCase())
        ) {
          foundNames.add(name.toLowerCase());

          // Spróbuj znaleźć opis NPC w kontekście
          const description = this.findNPCDescription(text, name);

          npcs.push({
            name,
            description: description || `Postać spotkana w grze`,
            traits: this.extractTraits(text, name),
            status: 'alive',
            relationToPC: 'nieznana',
          });
        }
      }
    }

    return npcs;
  }

  /**
   * Znajduje opis NPC w tekście
   */
  private findNPCDescription(text: string, name: string): string | null {
    // Szukaj zdania zawierającego imię i opis. Escape regex chars w name
    // (LLM może zwrócić np. "Pan (Generał) Carter" co psuło new RegExp).
    const safeName = escapeRegex(name);
    const patterns = [
      // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
      new RegExp(`${safeName}[^.]*(?:jest|wygląda na|ma|nosi|to)[^.]+\\.`, 'i'),
      // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
      new RegExp(
        `(?:widzisz|zauważasz|dostrzegasz)[^.]*${safeName}[^.]+\\.`,
        'i'
      ),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].slice(0, 150);
      }
    }

    return null;
  }

  /**
   * Wydobywa cechy NPC
   */
  private extractTraits(text: string, name: string): string[] {
    const traits: string[] = [];
    const traitPatterns = [
      /(?:jest|wygląda na)\s+(stary|młody|wysoki|niski|gruby|szczupły|nerwowy|spokojny|podejrzliwy|przyjazny|wrogi|tajemniczy|ekscentryczny)/gi,
      /(siwowłosy|łysy|brodaty|okulary|blizna|kulejący|kulawa|schludny|zaniedbany)/gi,
    ];

    // Znajdź fragment tekstu z imieniem
    const nameIndex = text.toLowerCase().indexOf(name.toLowerCase());
    if (nameIndex === -1) return traits;

    const context = text.slice(Math.max(0, nameIndex - 100), nameIndex + 200);

    for (const pattern of traitPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(context)) !== null) {
        const trait = match[1]?.toLowerCase() || match[0]?.toLowerCase();
        if (trait && !traits.includes(trait)) {
          traits.push(trait);
        }
      }
    }

    return traits.slice(0, 5); // Max 5 cech
  }

  /**
   * Wydobywa lokacje z tekstu
   */
  private extractLocations(text: string): Partial<LocationEntry>[] {
    const locations: Partial<LocationEntry>[] = [];
    const foundLocations = new Set<string>();

    for (const pattern of LOCATION_PATTERNS) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        let locationName = match[1]?.trim();

        // Dla drugiej grupy w niektórych patternach
        if (match[2]) {
          locationName = `${locationName} ${match[2]}`;
        }

        if (
          locationName &&
          locationName.length > 3 &&
          locationName.length < 50 &&
          !foundLocations.has(locationName.toLowerCase())
        ) {
          foundLocations.add(locationName.toLowerCase());

          locations.push({
            name: locationName,
            description:
              this.findLocationDescription(text, locationName) ||
              `Lokacja w grze`,
            type: this.guessLocationType(locationName),
            atmosphere: this.guessAtmosphere(text),
            visited: true,
            connectedNPCs: [],
            connectedLocations: [],
          });
        }
      }
    }

    return locations;
  }

  /**
   * Znajduje opis lokacji
   */
  private findLocationDescription(
    text: string,
    locationName: string
  ): string | null {
    // Szukaj opisu w pobliżu nazwy lokacji
    const index = text.toLowerCase().indexOf(locationName.toLowerCase());
    if (index === -1) return null;

    // Weź zdanie zawierające lokację i jedno po nim
    const start = Math.max(0, text.lastIndexOf('.', index) + 1);
    const end = text.indexOf('.', index + locationName.length);
    if (end > start) {
      return text
        .slice(start, end + 1)
        .trim()
        .slice(0, 200);
    }

    return null;
  }

  /**
   * Zgaduje typ lokacji
   */
  private guessLocationType(name: string): LocationEntry['type'] {
    const lower = name.toLowerCase();
    if (
      lower.includes('piwnic') ||
      lower.includes('tunel') ||
      lower.includes('krypta') ||
      lower.includes('katakumb')
    ) {
      return 'underground';
    }
    if (
      lower.includes('dom') ||
      lower.includes('bibliotek') ||
      lower.includes('budyn') ||
      lower.includes('sklep') ||
      lower.includes('hotel')
    ) {
      return 'indoor';
    }
    if (
      lower.includes('park') ||
      lower.includes('cmentarz') ||
      lower.includes('las') ||
      lower.includes('plaza') ||
      lower.includes('ulica')
    ) {
      return 'outdoor';
    }
    return 'other';
  }

  /**
   * Zgaduje atmosferę
   */
  private guessAtmosphere(text: string): string {
    const atmosphereKeywords: Record<string, string[]> = {
      mroczny: ['ciemn', 'mroczn', 'cień', 'mrok'],
      niepokojący: ['niepokój', 'dziwn', 'osobliw', 'niesamowit'],
      przytulny: ['ciepł', 'przytul', 'przyjemn'],
      opuszczony: ['opuszczon', 'pusty', 'zaniedb', 'zapomnia'],
      niebezpieczny: ['niebezp', 'groźn', 'zagrożen'],
    };

    const lower = text.toLowerCase();
    for (const [atmosphere, keywords] of Object.entries(atmosphereKeywords)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return atmosphere;
      }
    }

    return 'neutralny';
  }

  /**
   * Wydobywa fakty fabularne
   */
  private extractFacts(text: string): Partial<KeyFact>[] {
    const facts: Partial<KeyFact>[] = [];

    for (const pattern of FACT_PATTERNS) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        const content = match[1]?.trim();
        if (content && content.length > 10 && content.length < 200) {
          facts.push({
            content,
            source: 'ai',
            category: this.guessFcctCategory(content),
            confidence: 0.8,
          });
        }
      }
    }

    return facts;
  }

  /**
   * Zgaduje kategorię faktu
   */
  private guessFcctCategory(content: string): KeyFact['category'] {
    const lower = content.toLowerCase();

    if (
      lower.includes('morderca') ||
      lower.includes('sprawca') ||
      lower.includes('winny')
    ) {
      return 'mystery';
    }
    if (
      lower.includes('kult') ||
      lower.includes('rytuał') ||
      lower.includes('ceremoni')
    ) {
      return 'plot';
    }
    if (
      lower.includes('dom') ||
      lower.includes('miejsc') ||
      lower.includes('lokal')
    ) {
      return 'location';
    }
    if (lower.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/)) {
      // Wygląda jak imię
      return 'npc';
    }

    return 'plot';
  }

  /**
   * Zapisuje wydobyte dane do GameContext
   */
  private saveExtractedData(data: ExtractedData): void {
    // Zapisz NPC
    for (const npc of data.npcs) {
      if (npc.name) {
        gameContextService.addOrUpdateNPC({
          name: npc.name,
          description: npc.description || '',
          traits: npc.traits || [],
          status: npc.status || 'alive',
          relationToPC: npc.relationToPC || 'nieznana',
        });
      }
    }

    // Zapisz lokacje
    for (const loc of data.locations) {
      if (loc.name) {
        gameContextService.addOrUpdateLocation({
          name: loc.name,
          description: loc.description || '',
          type: loc.type || 'other',
          atmosphere: loc.atmosphere || 'neutralny',
          visited: loc.visited ?? true,
          connectedNPCs: loc.connectedNPCs || [],
          connectedLocations: loc.connectedLocations || [],
        });
      }
    }

    // Zapisz fakty
    for (const fact of data.facts) {
      if (fact.content) {
        gameContextService.addFact({
          content: fact.content,
          source: fact.source || 'ai',
          category: fact.category || 'plot',
          confidence: fact.confidence || 0.7,
        });
      }
    }
  }

  /**
   * Wydobywa NPC i fakty z AI za pomocą osobnego zapytania
   * (używane gdy automatyczna ekstrakcja nie wystarczy)
   */
  async extractWithAI(response: string): Promise<ExtractedData> {
    try {
      const prompt = `Przeanalizuj poniższą odpowiedź MG w grze RPG Zew Cthulhu i wyodrębnij:
1. NPC - imiona, krótkie opisy, cechy
2. Lokacje - nazwy, opisy
3. Fakty fabularne - kluczowe informacje

Odpowiedz TYLKO w JSON:
{
  "npcs": [{"name": "...", "description": "...", "traits": ["..."]}],
  "locations": [{"name": "...", "description": "..."}],
  "facts": [{"content": "..."}]
}

TEKST DO ANALIZY:
${response.slice(0, 2000)}`;

      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          messages: [],
          skipContext: true,
        }),
      });

      const data = await apiResponse.json();
      if (data.response) {
        const cleaned = data.response.replace(/```json\n?|```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const extracted: ExtractedData = {
          npcs: parsed.npcs || [],
          locations: parsed.locations || [],
          facts: parsed.facts || [],
        };

        this.saveExtractedData(extracted);
        return extracted;
      }
    } catch (error) {
      console.error('❌ AI extraction failed:', error);
    }

    return { npcs: [], locations: [], facts: [] };
  }
}

// Singleton export
export const contextCollector = new ContextCollector();
