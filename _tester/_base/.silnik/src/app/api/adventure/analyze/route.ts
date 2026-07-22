import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import type {
  AdventureBreakdown,
  AdventureBreakdownEntry,
} from '@/lib/adventures-data';

/**
 * API do analizy PDF przygody przez Gemini AI
 * Zwraca strukturyzowane dane o przygodzie (tytuł, lokalizacja, era, motywy, etc.)
 * Wspiera wykrywanie WIELU przygód w jednym PDF
 */

const ANALYSIS_PROMPT = `Przeanalizuj ten scenariusz do gry RPG "Zew Cthulhu" (Call of Cthulhu).

**KRYTYCZNE INSTRUKCJE:**
1. Ten PDF może zawierać WIELE ODDZIELNYCH PRZYGÓD (np. antologia, zbiór scenariuszy).
2. Każda przygoda to OSOBNY scenariusz z własnym tytułem, fabułą i lokalizacją.
3. NIE łącz tytułów przygód - każdy tytuł musi być osobno!
4. Szukaj nagłówków typu "Scenariusz:", "Przygoda:", spisu treści, lub wyraźnych podziałów.
5. Jeśli plik zawiera tylko jeden scenariusz, ustaw multipleAdventures na false.

Odpowiedz WYŁĄCZNIE w formacie JSON (bez markdown, bez komentarzy, bez tekstu przed/po JSON):

{
  "multipleAdventures": true/false,
  "totalCount": liczba_przygód,
  "adventures": [
    {
      "title": "DOKŁADNY tytuł przygody (NIE nazwa pliku!)",
      "location": "Główna lokalizacja (miasto, region)",
      "country": "Kraj",
      "era": "classic|gaslight|modern",
      "eraLabel": "Czytelna nazwa ery (np. 'Klasyczne lata 20.', 'Era wiktoriańska', 'Współczesność')",
      "yearRange": "Zakres lat (np. '1923-1925')",
      "hook": "BEZSPOILEROWE wprowadzenie 2-3 zdania - zajawka klimatu przyciągająca gracza, BEZ zdradzania rozwiązania, sprawcy ani zwrotów akcji",
      "description": "BEZSPOILEROWY opis 3-4 zdania - sytuacja wyjściowa i ton, BEZ zakończenia i tajemnic",
      "tone": "purist|pulp|noir",
      "themes": ["motyw1", "motyw2", "motyw3"],
      "suggestedOccupations": ["zawód1", "zawód2", "zawód3"],
      "playerCount": "1-4",
      "estimatedSessions": "2-3",
      "difficulty": "easy|normal|hard",
      "pageStart": numer_strony_lub_null,
      "breakdown": {
        "characters": [{ "name": "imię NPC", "description": "rola i krótki opis (PEŁNY, dla MG)" }],
        "locations": [{ "name": "nazwa miejsca", "description": "czym jest, co tam się dzieje" }],
        "events": [{ "name": "nazwa sceny/zdarzenia", "description": "co się wydarza, w jakiej kolejności" }],
        "items": [{ "name": "przedmiot/wskazówka/handout", "description": "do czego służy, gdzie jest" }],
        "creatures": [{ "name": "stwór/byt Mitów", "description": "natura, zagrożenie, statystyki jeśli są" }]
      }
    }
  ]
}

WAŻNE:
- Jeśli znajdziesz wiele przygód, KAŻDA musi mieć OSOBNY obiekt w tablicy "adventures"
- "title" to oficjalny tytuł przygody z PDF, NIE nazwa pliku
- era "classic" = lata 1920-1930, "gaslight" = era wiktoriańska (1880-1910), "modern" = współczesność (2000+)
- NIGDY nie łącz kilku tytułów w jeden string!
- "breakdown" rozłóż scenariusz na czynniki pierwsze (postacie, miejsca, zdarzenia, przedmioty, stwory) - to PEŁNY materiał dla Mistrza Gry, MOŻE zawierać spoilery (sprawca, zwroty akcji, zakończenie). Wypełnij każdą listę faktami z PDF; gdy czegoś brak, zostaw pustą tablicę [].
- W "breakdown" bądź konkretny i wierny treści PDF - nie zmyślaj. Maksymalnie ~8 najważniejszych pozycji na listę.
- ROZRÓŻNIENIE: "hook"/"description" są DLA GRACZA i muszą być BEZSPOILEROWE; "breakdown" jest DLA MG i może być pełny.`;

interface AdventureRaw {
  title?: string;
  location?: string;
  country?: string;
  era?: string;
  eraLabel?: string;
  yearRange?: string;
  hook?: string;
  description?: string;
  tone?: string;
  themes?: string[];
  suggestedOccupations?: string[];
  playerCount?: string;
  estimatedSessions?: string;
  difficulty?: string;
  pageStart?: number | null;
  breakdown?: Partial<AdventureBreakdown>;
}

/**
 * Sanityzuje listę rozkładu z odpowiedzi AI - odrzuca śmieci, wymusza kształt
 * { name, description }, ucina do limitu. Gemini bywa kreatywny ze schematem.
 */
const sanitizeBreakdownList = (raw: unknown): AdventureBreakdownEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is { name?: unknown; description?: unknown } =>
        typeof e === 'object' && e !== null
    )
    .map((e) => ({
      name: typeof e.name === 'string' ? e.name : '',
      description: typeof e.description === 'string' ? e.description : '',
    }))
    .filter((e) => e.name.trim().length > 0)
    .slice(0, 8);
};

const validateBreakdown = (
  raw: Partial<AdventureBreakdown> | undefined
): AdventureBreakdown => ({
  characters: sanitizeBreakdownList(raw?.characters),
  locations: sanitizeBreakdownList(raw?.locations),
  events: sanitizeBreakdownList(raw?.events),
  items: sanitizeBreakdownList(raw?.items),
  creatures: sanitizeBreakdownList(raw?.creatures),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geminiFileUri, fileName, geminiMimeType } = body;

    // mimeType pliku w Gemini File API. parse-local wgrywa natywny PDF
    // (application/pdf) lub fallback tekstowy (text/plain) i zwraca tę wartość.
    // Wcześniej zaszyte 'text/plain' dla natywnego PDF = mismatch → Gemini 500
    // → analiza wpadała w fallback z placeholderami. Default application/pdf, bo
    // parse-local domyślnie wgrywa PDF natywnie.
    const fileMimeType =
      typeof geminiMimeType === 'string' && geminiMimeType
        ? geminiMimeType
        : 'application/pdf';

    if (!geminiFileUri) {
      return NextResponse.json(
        { success: false, error: 'Brak geminiFileUri' },
        { status: 400 }
      );
    }

    // IND-131 B2: user API key support - priorytet header > env (wzorzec
    // z pdf/extract-text/route.ts:82-83 i chat/route.ts)
    const apiKey =
      request.headers.get('X-Gemini-Api-Key') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Brak klucza Gemini (X-Gemini-Api-Key header lub GEMINI_API_KEY env)',
        },
        { status: 401 }
      );
    }

    console.log(`🔍 Analyzing adventure PDF: ${fileName}`);
    console.log(`   Gemini URI: ${geminiFileUri}`);

    const ai = new GoogleGenAI({ apiKey });

    // Wywołanie Gemini z plikiem tekstowym (sparsowany PDF)
    const result = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { mimeType: fileMimeType, fileUri: geminiFileUri } },
            { text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const responseText = result.text ?? '';
    console.log(`✅ Gemini response received (${responseText.length} chars)`);
    // Log first 500 chars for debugging
    console.log(`📄 Response preview: ${responseText.substring(0, 500)}...`);

    // Parsowanie JSON z odpowiedzi
    let adventureData;
    try {
      // Usuń ewentualne markdown backticks i whitespace
      let cleanJson = responseText
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();

      // Znajdź początek i koniec JSON
      const jsonStart = cleanJson.indexOf('{');
      const jsonEnd = cleanJson.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
      }

      adventureData = JSON.parse(cleanJson);

      // Log parsed data for debugging
      console.log(
        `📊 Parsed adventures: multipleAdventures=${adventureData.multipleAdventures}, count=${adventureData.adventures?.length || 0}`
      );
      if (adventureData.adventures) {
        adventureData.adventures.forEach((adv: AdventureRaw, i: number) => {
          console.log(`   📖 Adventure ${i + 1}: "${adv.title}"`);
        });
      }
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', parseError);
      console.log('Raw response:', responseText);

      // Fallback - spróbuj wyciągnąć dane z tekstu
      adventureData = {
        multipleAdventures: false,
        adventures: [
          {
            title: fileName.replace('.pdf', '').replace(/_/g, ' '),
            location: 'Nieznana lokalizacja',
            country: 'Nieznany',
            era: 'classic' as const,
            eraLabel: 'Klasyczne lata 20.',
            yearRange: '1920-1930',
            hook: 'Przygoda wymaga analizy...',
            description: responseText.substring(0, 200),
            tone: 'purist' as const,
            themes: ['tajemnica', 'horror'],
            suggestedOccupations: ['detektyw', 'dziennikarz', 'profesor'],
            playerCount: '1-4',
            estimatedSessions: '2-3',
            difficulty: 'normal' as const,
          },
        ],
      };
    }

    // Obsługa nowego formatu z wieloma przygodami
    const multipleAdventures = adventureData.multipleAdventures === true;
    const rawAdventures: AdventureRaw[] = Array.isArray(
      adventureData.adventures
    )
      ? (adventureData.adventures as AdventureRaw[])
      : [adventureData as AdventureRaw]; // Fallback dla starego formatu

    // Walidacja i uzupełnienie brakujących pól dla każdej przygody
    const validateAdventure = (data: AdventureRaw, index: number) => ({
      title:
        data.title || `${fileName.replace('.pdf', '')} - Przygoda ${index + 1}`,
      location: data.location || 'Nieznana lokalizacja',
      country: data.country || 'Nieznany',
      era:
        data.era && ['classic', 'gaslight', 'modern'].includes(data.era)
          ? data.era
          : 'classic',
      eraLabel: data.eraLabel || 'Klasyczne lata 20.',
      yearRange: data.yearRange || '1920-1930',
      hook: data.hook || 'Tajemnicza przygoda czeka na odkrycie...',
      description: data.description || data.hook || '',
      tone:
        data.tone && ['purist', 'pulp', 'noir'].includes(data.tone)
          ? data.tone
          : 'purist',
      themes: Array.isArray(data.themes)
        ? data.themes.slice(0, 5)
        : ['tajemnica'],
      suggestedOccupations: Array.isArray(data.suggestedOccupations)
        ? data.suggestedOccupations.slice(0, 5)
        : ['detektyw'],
      playerCount: data.playerCount || '1-4',
      estimatedSessions: data.estimatedSessions || '2-3',
      difficulty:
        data.difficulty && ['easy', 'normal', 'hard'].includes(data.difficulty)
          ? data.difficulty
          : 'normal',
      pageStart: data.pageStart || null,
      breakdown: validateBreakdown(data.breakdown),
    });

    // Funkcje pomocnicze do integracji z zewnętrznymi API (pogoda, geokodowanie i historyczna mapa)
    const fetchCoords = async (location: string, country: string): Promise<{ lat: number; lon: number } | null> => {
      try {
        const query = encodeURIComponent(`${location}, ${country}`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
          headers: { 'User-Agent': 'StraznikTajemnicAI/1.0' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
      } catch (e) {
        console.warn('⚠️ Nominatim geocoding failed:', e);
      }
      return null;
    };

    const fetchHistoricalWeather = async (lat: number, lon: number, yearRange: string): Promise<string | null> => {
      try {
        // Wyciągnij pierwszy rok z zakresu lub domyślny 1925
        const yearMatch = yearRange.match(/\b(18\d\d|19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '1925';
        const date = `${year}-05-12`; // Domyślny, klimatyczny dzień wiosenny

        const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,rain,snowfall,weather_code`);
        if (!res.ok) return null;
        const data = await res.json();
        
        if (data.hourly && data.hourly.temperature_2m) {
          const temps = data.hourly.temperature_2m;
          const avgTemp = Math.round(temps.reduce((sum: number, t: number) => sum + t, 0) / temps.length);
          const hasRain = data.hourly.rain?.some((r: number) => r > 0);
          const hasSnow = data.hourly.snowfall?.some((s: number) => s > 0);
          
          let desc = 'Umiarkowana pogoda';
          if (hasRain) desc = 'Deszczowo';
          else if (hasSnow) desc = 'Śnieżnie i mroźnie';
          else if (avgTemp > 22) desc = 'Ciepło i sucho';
          else if (avgTemp < 5) desc = 'Zimno i mgliście';

          return `Średnia temperatura: ${avgTemp}°C, stan: ${desc} (dane historyczne dla dnia ${date})`;
        }
      } catch (e) {
        console.warn('⚠️ Open-Meteo weather fetch failed:', e);
      }
      return null;
    };

    const fetchHistoricalPOI = async (
      lat: number,
      lon: number,
      yearRange: string
    ): Promise<Array<{ name: string; description: string }>> => {
      try {
        const yearMatch = yearRange.match(/\b(18\d\d|19\d\d|20\d\d)\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : 1925;

        // Zapytanie Overpass API dla OpenHistoricalMap o POI w promieniu 1000m
        const query = `
          [out:json][timeout:15];
          (
            nwr["amenity"](around:1000,${lat},${lon});
            nwr["historical"](around:1000,${lat},${lon});
            nwr["building"~"church|hotel|townhall|station"](around:1000,${lat},${lon});
          );
          out center;
        `;
        const res = await fetch('https://overpass-api.openhistoricalmap.org/api/interpreter', {
          method: 'POST',
          body: query
        });
        if (!res.ok) return [];
        const data = await res.json();
        
        if (data.elements) {
          const pois: Array<{ name: string; description: string }> = [];
          for (const el of data.elements) {
            const tags = el.tags || {};
            const name = tags.name || tags.operator || tags.amenity || tags.building || 'Historyczne miejsce';
            
            // Filtrujemy po dacie istnienia jeśli tagi start_date/end_date są obecne
            if (tags.start_date) {
              const start = parseInt(tags.start_date);
              if (!isNaN(start) && start > year) continue; // Jeszcze nie wybudowano
            }
            if (tags.end_date) {
              const end = parseInt(tags.end_date);
              if (!isNaN(end) && end < year) continue; // Już zburzono
            }

            const typeDesc = tags.amenity || tags.building || tags.historical || 'obiekt';
            pois.push({
              name,
              description: `Historyczny ${typeDesc} zidentyfikowany w bazie OpenHistoricalMap.`
            });

            if (pois.length >= 5) break; // Limitujemy do 5 najciekawszych
          }
          return pois;
        }
      } catch (e) {
        console.warn('⚠️ OpenHistoricalMap POI fetch failed:', e);
      }
      return [];
    };

    const validatedAdventures = await Promise.all(
      rawAdventures.map(async (adv: AdventureRaw, index: number) => {
        const validated = validateAdventure(adv, index);
        
        // Dociągnij dane geograficzno-pogodowe
        const coords = await fetchCoords(validated.location, validated.country);
        if (coords) {
          const weatherPromise = fetchHistoricalWeather(coords.lat, coords.lon, validated.yearRange);
          const poiPromise = fetchHistoricalPOI(coords.lat, coords.lon, validated.yearRange);
          const [weather, pois] = await Promise.all([weatherPromise, poiPromise]);

          if (weather) {
            validated.description = `${validated.description}\n\n[KLIMAT & POGODA]: ${weather}`;
          }
          if (pois && pois.length > 0) {
            validated.breakdown.locations = [
              ...validated.breakdown.locations,
              ...pois.map(p => ({ name: p.name, description: p.description }))
            ].slice(0, 8); // Utrzymujemy limit 8 lokacji
          }
        }
        return validated;
      })
    );

    console.log(
      `📚 Analyzed ${validatedAdventures.length} adventures${multipleAdventures ? ' (multiple in PDF)' : ''}`
    );
    validatedAdventures.forEach((adv, i: number) => {
      console.log(
        `   ${i + 1}. "${adv.title}" - Era: ${adv.era}, Tone: ${adv.tone}`
      );
    });

    // Zwracamy nowy format z obsługą wielu przygód
    return NextResponse.json({
      success: true,
      multipleAdventures,
      adventures: validatedAdventures,
      // Dla wstecznej kompatybilności - pierwsza przygoda
      adventure: validatedAdventures[0],
    });
  } catch (error) {
    console.error('❌ Adventure analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd analizy przygody',
      },
      { status: 500 }
    );
  }
}
