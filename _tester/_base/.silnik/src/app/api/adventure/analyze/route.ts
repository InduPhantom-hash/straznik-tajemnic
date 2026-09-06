import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type {
  AdventureGraph,
  AdventureNPC,
  AdventureLocation,
  AdventureClue,
  GraphConnection
} from '@/lib/types';
import type { DocumentType, LorebookData } from '@/types/adventure';


/**
 * API do analizy PDF przygody przez Gemini AI
 * Zwraca strukturyzowane dane o przygodzie (tytuł, lokalizacja, era, motywy, etc.)
 * Wspiera wykrywanie WIELU przygód w jednym PDF
 */

const ANALYSIS_PROMPT = `Przeanalizuj ten dokument do gry fabularnej RPG "Zew Cthulhu" (Call of Cthulhu 7ed).

**KROK 1: KLASYFIKACJA TYPU DOKUMENTU (documentType)**
Określ, z jakim rodzajem materiału mamy do czynienia:
1. "scenario" - Scenariusz / Przygoda śledcza (np. gotowy one-shot, intryga, węzły poszlak, sceny, agendy BN-ów, finał). Może zawierać jedną lub wiele przygód.
2. "setting" - Przewodnik regionalny / Lorebook / Tło świata (np. "Cienie Tatr", "Horror nad Wartą", "Berlin", przewodnik po mieście/epoce). Zawiera faktografię, opis dzielnic, frakcji, atmosfery, instytucji, bez pojedynczego linearnego scenariusza.
3. "compendium" - Almanach / Bestiariusz / Grymuar regułowy (np. "Malleus Monstrorum", "Wielki Grymuar Magii"). Zawiera profile bestii, bóstw, katalog zaklęć, rytuałów, ksiąg i specyficznych zasad RAW.

**KRYTYCZNE INSTRUKCJE:**
1. Jeśli dokument to "scenario": PDF może zawierać WIELE ODDZIELNYCH PRZYGÓD (np. antologia). Każda przygoda to OSOBNY obiekt w tablicy "adventures".
2. Jeśli dokument to "setting" lub "compendium": utwórz dokładnie jeden wpis w "adventures", reprezentujący całe kompendium/przewodnik. W polu "documentType" wpisz "setting" lub "compendium", a w "lorebookData" wyekstrahuj esencję wiedzy.
3. NIE łącz tytułów przygód ani nie używaj nazwy pliku jako tytułu.

Odpowiedz WYŁĄCZNIE w formacie JSON (bez markdown, bez komentarzy):

{
  "documentType": "scenario|setting|compendium",
  "multipleAdventures": true/false,
  "totalCount": liczba_elementów,
  "adventures": [
    {
      "documentType": "scenario|setting|compendium",
      "title": "DOKŁADNY oficjalny tytuł dzieła lub przygody",
      "location": "Główna lokalizacja (miasto, region, lub 'Globalne / Różne')",
      "country": "Kraj (lub 'Różne')",
      "era": "classic|gaslight|modern|custom",
      "eraLabel": "Czytelna nazwa ery (np. 'Klasyczne lata 20.')",
      "yearRange": "Zakres lat (np. '1923-1925' lub '1920-1929')",
      "hook": "BEZSPOILEROWE wprowadzenie 2-3 zdania - zajawka klimatu przyciągająca gracza",
      "description": "BEZSPOILEROWY opis 3-4 zdania - sytuacja wyjściowa, motyw przewodni lub streszczenie kompendium",
      "tone": "purist|pulp|noir",
      "themes": ["motyw1", "motyw2", "motyw3"],
      "suggestedOccupations": ["zawód1", "zawód2", "zawód3"],
      "playerCount": "1-4",
      "estimatedSessions": "2-3",
      "difficulty": "easy|normal|hard",
      "pageStart": numer_strony_lub_null,
      "graph": {
        "npcs": [
          { "id": "npc-1", "name": "Imię postaci", "description": "Rola", "secret": "Mroczny sekret", "statsSummary": "Statystyki z podręcznika" }
        ],
        "locations": [
          { "id": "loc-1", "name": "Nazwa lokacji", "description": "Opis fabularny", "atmosphere": "Sensoryczny opis atmosfery" }
        ],
        "clues": [
          { "id": "clue-1", "name": "Nazwa poszlaki", "description": "Gdzie prowadzi", "isRedHerring": false }
        ],
        "connections": [
          { "fromId": "npc-1", "toId": "loc-1", "description": "Przebywa tutaj wieczorami" }
        ]
      },
      "lorebookData": {
        "regionOrTheme": "Główny region lub domena (np. 'Małopolska i Tatry' lub 'Bestie i Bóstwa Mitów')",
        "summary": "Kluczowa synteza zawartości tła (do 150 słów)",
        "factions": [
          { "id": "fac-1", "name": "Nazwa frakcji/sekty/policji", "influence": "Zasięg i siła", "agenda": "Główny cel jawny i ukryty" }
        ],
        "locations": [
          { "id": "setloc-1", "name": "Nazwa miejsca", "districtOrRegion": "Dzielnica/Region", "atmosphere": "Klimat", "sensoryDetails": "Dźwięki, zapachy, koloryt" }
        ],
        "compendiumEntities": [
          { "id": "ent-1", "name": "Nazwa potwora/zaklęcia", "category": "monster|deity|spell|ritual|artifact|rule", "summary": "Opis i działanie", "sanityLoss": "np. 1/1d8", "magicCost": "np. 3 PM" }
        ],
        "rawLoreSnippets": ["Ważny fakt o świecie 1", "Ważny fakt o świecie 2"]
      }
    }
  ]
}

WAŻNE:
- Dla dokumentu typu "scenario" skup się na "graph" (NPC, lokacje, poszlaki, relacje).
- Dla dokumentu typu "setting" lub "compendium" skup się na "lorebookData" (frakcje, specyfika świata, encje bestiariusza/magii).
- "title" to oficjalny tytuł z PDF, NIGDY nazwa pliku.`;


interface AdventureRaw {
  documentType?: DocumentType;
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
  graph?: Partial<AdventureGraph>;
  lorebookData?: Partial<LorebookData>;
}

const validateLorebookData = (
  raw: unknown,
  docType: DocumentType,
  title: string
): LorebookData | undefined => {
  if (docType === 'scenario') return undefined;
  const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  return {
    id: `lore-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    documentType: docType as 'setting' | 'compendium',
    regionOrTheme: String(rawObj.regionOrTheme || 'Świat Zewu Cthulhu'),
    summary: String(rawObj.summary || 'Księga wiedzy i tła fabularnego.'),
    factions: Array.isArray(rawObj.factions)
      ? rawObj.factions.map((f: Record<string, unknown>, idx: number) => ({
          id: String(f.id || `fac-${idx + 1}`),
          name: String(f.name || 'Nieznana frakcja'),
          influence: String(f.influence || ''),
          agenda: String(f.agenda || ''),
        }))
      : [],
    locations: Array.isArray(rawObj.locations)
      ? rawObj.locations.map((l: Record<string, unknown>, idx: number) => ({
          id: String(l.id || `setloc-${idx + 1}`),
          name: String(l.name || 'Lokacja tła'),
          districtOrRegion: String(l.districtOrRegion || ''),
          atmosphere: String(l.atmosphere || ''),
          sensoryDetails: String(l.sensoryDetails || ''),
        }))
      : [],
    compendiumEntities: Array.isArray(rawObj.compendiumEntities)
      ? rawObj.compendiumEntities.map((e: Record<string, unknown>, idx: number) => ({
          id: String(e.id || `ent-${idx + 1}`),
          name: String(e.name || 'Byt / Zaklęcie'),
          category: (['monster', 'deity', 'spell', 'ritual', 'artifact', 'rule'].includes(
            String(e.category)
          )
            ? e.category
            : 'rule') as 'monster' | 'deity' | 'spell' | 'ritual' | 'artifact' | 'rule',
          summary: String(e.summary || ''),
          sanityLoss: e.sanityLoss ? String(e.sanityLoss) : undefined,
          magicCost: e.magicCost ? String(e.magicCost) : undefined,
        }))
      : [],
    rawLoreSnippets: Array.isArray(rawObj.rawLoreSnippets)
      ? rawObj.rawLoreSnippets.map((s: unknown) => String(s))
      : [],
  };
};

const validateGraph = (raw: unknown): AdventureGraph | null => {
  if (!raw || typeof raw !== 'object') return null;
  const rawObj = raw as Record<string, unknown>;

  const npcs: AdventureNPC[] = Array.isArray(rawObj?.npcs)
    ? rawObj.npcs
        .filter((e: unknown) => {
          if (!e || typeof e !== 'object') return false;
          const obj = e as Record<string, unknown>;
          return Boolean(obj.id && obj.name);
        })
        .map((e: unknown) => {
          const obj = e as Record<string, unknown>;
          return {
            id: String(obj.id),
            name: String(obj.name),
            description: String(obj.description || ''),
            secret: obj.secret ? String(obj.secret) : undefined,
            statsSummary: obj.statsSummary ? String(obj.statsSummary) : undefined,
          };
        })
    : [];

  const locations: AdventureLocation[] = Array.isArray(rawObj?.locations)
    ? rawObj.locations
        .filter((e: unknown) => {
          if (!e || typeof e !== 'object') return false;
          const obj = e as Record<string, unknown>;
          return Boolean(obj.id && obj.name);
        })
        .map((e: unknown) => {
          const obj = e as Record<string, unknown>;
          return {
            id: String(obj.id),
            name: String(obj.name),
            description: String(obj.description || ''),
            atmosphere: obj.atmosphere ? String(obj.atmosphere) : undefined,
          };
        })
    : [];

  const clues: AdventureClue[] = Array.isArray(rawObj?.clues)
    ? rawObj.clues
        .filter((e: unknown) => {
          if (!e || typeof e !== 'object') return false;
          const obj = e as Record<string, unknown>;
          return Boolean(obj.id && obj.name);
        })
        .map((e: unknown) => {
          const obj = e as Record<string, unknown>;
          return {
            id: String(obj.id),
            name: String(obj.name),
            description: String(obj.description || ''),
            isRedHerring: Boolean(obj.isRedHerring),
          };
        })
    : [];

  const connections: GraphConnection[] = Array.isArray(rawObj?.connections)
    ? rawObj.connections
        .filter((e: unknown) => {
          if (!e || typeof e !== 'object') return false;
          const obj = e as Record<string, unknown>;
          return Boolean(obj.fromId && obj.toId);
        })
        .map((e: unknown) => {
          const obj = e as Record<string, unknown>;
          return {
            fromId: String(obj.fromId),
            toId: String(obj.toId),
            description: String(obj.description || ''),
          };
        })
    : [];

  if (npcs.length === 0 && locations.length === 0 && clues.length === 0) {
    return null;
  }

  return { npcs, locations, clues, connections };
};

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
      model: 'gemini-3.1-pro-preview', // IND-Dev-4: używamy najpotężniejszego modelu dla grafu
      config: {
        responseMimeType: 'application/json', // Zrzucenie na API gwarancji struktury
      },
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
      // Skoro użyto responseMimeType: 'application/json', nie ma potrzeby walczyć z markdown.
      // Ewentualnie dla pewności usuniemy backticki gdyby model w starszej wersji to zignorował.
      const cleanJson = responseText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
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

      // Zamiast cichego fallbacku, zwracamy błąd 500, aby UI mogło to prawidłowo obsłużyć.
      return NextResponse.json(
        { success: false, error: 'Analiza API zwróciła niepoprawny format danych (JSON error).' },
        { status: 500 }
      );
    }

    // Obsługa nowego formatu z wieloma przygodami
    const multipleAdventures = adventureData.multipleAdventures === true;
    const rawAdventures: AdventureRaw[] = Array.isArray(
      adventureData.adventures
    )
      ? (adventureData.adventures as AdventureRaw[])
      : [adventureData as AdventureRaw]; // Fallback dla starego formatu

    const invalidEraMetadata = rawAdventures.flatMap((adventure, index) => {
      const issues: string[] = [];
      if (!adventure.yearRange?.match(/\b\d{4}\b/)) issues.push('yearRange');
      if (
        !adventure.country?.trim() ||
        /^(unknown|nieznany|nieznane)$/i.test(adventure.country.trim())
      ) {
        issues.push('country');
      }
      return issues.length > 0 ? [{ index, issues }] : [];
    });
    if (invalidEraMetadata.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Analiza PDF nie ustaliła roku lub kraju dla każdej przygody.',
          code: 'ERA_METADATA_REQUIRED',
          invalidAdventures: invalidEraMetadata,
        },
        { status: 422 }
      );
    }

    // Walidacja i uzupełnienie brakujących pól dla każdej przygody
    const validateAdventure = (data: AdventureRaw, index: number) => {
      const docType: DocumentType =
        data.documentType && ['scenario', 'setting', 'compendium'].includes(data.documentType)
          ? data.documentType
          : 'scenario';
      const title =
        data.title ||
        `${fileName.replace('.pdf', '')} - ${
          docType === 'scenario'
            ? `Przygoda ${index + 1}`
            : docType === 'setting'
            ? 'Przewodnik regionalny'
            : 'Kompendium wiedzy'
        }`;

      return {
        documentType: docType,
        title,
        location: data.location || (docType === 'compendium' ? 'Wiedza ogólna' : 'Nieznana lokalizacja'),
        country: data.country!.trim(),
        era:
          data.era && ['classic', 'gaslight', 'modern'].includes(data.era)
            ? data.era
            : 'custom',
        eraLabel:
          data.eraLabel || `${data.yearRange!.trim()}, ${data.country!.trim()}`,
        yearRange: data.yearRange!.trim(),
        hook:
          data.hook ||
          (docType === 'setting'
            ? 'Regionalne tło i atmosfera dla Twoich śledztw...'
            : docType === 'compendium'
            ? 'Księga wiedzy, bestiariusz i arkana magii Mitów Cthulhu...'
            : 'Tajemnicza przygoda czeka na odkrycie...'),
        description: data.description || data.hook || '',
        tone:
          data.tone && ['purist', 'pulp', 'noir'].includes(data.tone)
            ? data.tone
            : 'purist',
        themes: Array.isArray(data.themes)
          ? data.themes.slice(0, 5)
          : [docType === 'compendium' ? 'bestiariusz' : docType === 'setting' ? 'przewodnik' : 'tajemnica'],
        suggestedOccupations: Array.isArray(data.suggestedOccupations)
          ? data.suggestedOccupations.slice(0, 5)
          : ['detektyw'],
        playerCount: data.playerCount || '1-4',
        estimatedSessions: data.estimatedSessions || (docType === 'scenario' ? '2-3' : '—'),
        difficulty:
          data.difficulty && ['easy', 'normal', 'hard'].includes(data.difficulty)
            ? data.difficulty
            : 'normal',
        pageStart: data.pageStart || null,
        graph: validateGraph(data.graph),
        lorebookData: validateLorebookData(data.lorebookData, docType, title),
      };
    };


    // Funkcje pomocnicze do integracji z zewnętrznymi API (pogoda, geokodowanie i historyczna mapa)
    const fetchCoords = async (location: string, country: string): Promise<{ lat: number; lon: number } | null> => {
      try {
        const query = encodeURIComponent(`${location}, ${country}`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
          headers: { 'User-Agent': 'StraznikTajemnicAI/1.0' }
        });
        if (!res.ok) {
          console.warn(`⚠️ Nominatim returned ${res.status}`);
          return null;
        }
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        } else {
          console.warn(`⚠️ Nominatim found no location for: ${location}, ${country}`);
        }
      } catch (e) {
        console.warn('⚠️ Nominatim geocoding failed:', e);
      }
      return null;
    };

    const fetchHistoricalWeather = async (lat: number, lon: number, yearRange: string): Promise<string | null> => {
      try {
        // Rok jest wymagany przez walidację metadanych powyżej.
        const yearMatch = yearRange.match(/\b(18\d\d|19\d\d|20\d\d)\b/);
        if (!yearMatch) return null;
        const year = yearMatch[1];
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

    const fetchHistoricalPOI = async (lat: number, lon: number, yearRange: string): Promise<Array<{ name: string; description: string }>> => {
      try {
        const yearMatch = yearRange.match(/\b(18\d\d|19\d\d|20\d\d)\b/);
        if (!yearMatch) return [];
        const year = parseInt(yearMatch[1]);

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

    const validatedAdventures = [];
    for (let index = 0; index < rawAdventures.length; index++) {
      const adv = rawAdventures[index];
      const validated = validateAdventure(adv, index);
      
      // Jeśli validateGraph zwrócił null, uzupełniamy pustą strukturą, żeby nie wywaliło frontu
      if (!validated.graph) {
        validated.graph = { npcs: [], locations: [], clues: [], connections: [] };
      }
      
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
          validated.graph.locations = [
            ...(validated.graph.locations || []),
            ...pois.map((p, idx) => ({ 
              id: `historical-poi-${idx}`, 
              name: p.name, 
              description: p.description 
            }))
          ]; 
        }
      }
      validatedAdventures.push(validated);

      // Sekwencyjne odstępy dla API
      if (index < rawAdventures.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

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
