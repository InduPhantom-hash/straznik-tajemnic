import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import {
  buildEraNarrativeRules,
  findEraManifest,
  type HistoricalSourceRef,
  type ResolvedEraContext,
} from '@/lib/era';
import {
  assertExactEraContext,
  hasBlockingSetupFailure,
  runHistoricalResearch,
  type SetupPhaseResult,
  type WorldSetupBundleV1,
  WorldSetupValidationError,
} from '@/lib/world-setup';

const getGenAI = (apiKey: string): GoogleGenAI => new GoogleGenAI({ apiKey });

interface SetupRequest {
  adventureText: string;
  scenarioId?: string;
  adventureTitle?: string;
  isCustomScenario?: boolean;
  scenarioYearRange?: string;
  eraContext: ResolvedEraContext;
  sources?: HistoricalSourceRef[];
  characters: Array<{
    id: string;
    name: string;
    background: string;
    occupation: string;
  }>;
}

function parseSetupJson(text: string): Record<string, unknown> {
  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new SyntaxError('Model nie zwrócił kompletnego obiektu JSON.');
  }

  return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SetupRequest = await request.json();
    const { adventureText, characters, eraContext } = body;
    assertExactEraContext(eraContext);

    const rangeYears = body.scenarioYearRange?.match(/\b\d{4}\b/g) ?? [];
    if (
      body.isCustomScenario &&
      rangeYears.length > 1 &&
      new Set(rangeYears).size > 1
    ) {
      return NextResponse.json(
        {
          error: 'Własny scenariusz z szerokim zakresem wymaga wyboru dokładnego roku.',
          code: 'YEAR_SELECTION_REQUIRED',
        },
        { status: 400 }
      );
    }

    if (!adventureText) {
      return NextResponse.json(
        { error: 'Brak tekstu przygody do przeanalizowania' },
        { status: 400 }
      );
    }

    const apiKey =
      request.headers.get('X-Gemini-Api-Key')?.trim() ||
      process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Wklej swój klucz Google AI Studio w ustawieniach',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    const manifest = findEraManifest(
      eraContext.effectiveYear,
      eraContext.countryCode,
      eraContext.regionProfile
    );
    const eraRules = buildEraNarrativeRules(eraContext);
    const genAI = getGenAI(apiKey);
    const research = await runHistoricalResearch(genAI, eraContext);

    const charactersSummary = characters && characters.length > 0
      ? characters.map(c => `- ${c.name} (${c.occupation}): ${c.background}`).join('\n')
      : 'Brak zdefiniowanych badaczy (generowanie domyślnego asymetrycznego setupu).';

    const prompt = `Jesteś zaawansowanym projektantem scenariuszy Call of Cthulhu RPG. Twoim zadaniem jest stworzenie nieliniowego setupu przygody w oparciu o dostarczony tekst scenariusza i karty badaczy.

${eraRules}

Manifest epoki: ${manifest?.id ?? 'brak zatwierdzonego manifestu - użyj neutralnych szczegółów bez marek i domysłów'}.

Zweryfikowany research preflight: ${research.summary || 'brak dopuszczonych źródeł online - użyj neutralnych szczegółów bez marek i domysłów'}.

BADACZE:
${charactersSummary}

TEKST PRZYGODY / NOTATKI:
${adventureText}

ZADANIE:
Przekształć tę przygodę w nieliniową strukturę konfliktu (Bunkier) i wygeneruj indywidualne asymetryczne plotki/haczyki. Zwróć wynik jako poprawny JSON o następującej strukturze:

{
  "conflicts": [
    {
      "resource": "Główny punkt zderzenia/obiekt/lokacja o którą toczy się spór (np. 'Złoty totem w kaplicy')",
      "factions": [
        {
          "id": "faction_1",
          "name": "Nazwa pierwszej frakcji/NPC",
          "description": "Krótki opis frakcji",
          "goal": "Czego konkretnie pożądają w odniesieniu do zasobu",
          "motivation": "Dlaczego tego chcą (głębokie pragnienie, np. strach przed śmiercią, chęć władzy)"
        },
        {
          "id": "faction_2",
          "name": "Nazwa drugiej frakcji/NPC",
          "description": "Krótki opis frakcji przeciwnej",
          "goal": "Czego pożądają sprzecznego",
          "motivation": "Dlaczego (ich motywacja)"
        }
      ]
    }
  ],
  "setupAsymmetry": {
    "rumors": [
      "Sprzeczna plotka #1 (ogólna, krążąca w miasteczku)",
      "Sprzeczna plotka #2 (podważająca plotkę #1)"
    ],
    "characterHooks": [
      {
        "characterId": "ID postaci (przepisz z wejścia dla kogo to jest)",
        "personalHook": "Indywidualny sekret lub osobisty powód zaangażowania w śledztwo, powiązany z tłem postaci i przygody"
      }
    ],
    "duetCohesion": {
      "sharedRelationship": "Wspólny mianownik / relacja spajająca badaczy (dlaczego pracują/podróżują razem)",
      "sharedIncitingIncident": "Wydarzenie otwierające, które sprowadziło ich oboje w to konkretne miejsce i czas"
    }
  }
}

Wygeneruj 1-2 główne konflikty, asymetryczne haczyki oraz spójność dla drużyny (duetCohesion). Odpowiedz wyłącznie czystym kodem JSON.`;

    const generateSetup = (retryInstruction = '') =>
      genAI.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: `${prompt}${retryInstruction}` }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 3072,
          responseMimeType: 'application/json',
        },
      });

    const result = await generateSetup();
    let data: Record<string, unknown>;
    try {
      data = parseSetupJson(result.text ?? '');
    } catch (initialParseError) {
      const repaired = await generateSetup(
        '\n\nPOPRZEDNIA ODPOWIEDŹ BYŁA NIEKOMPLETNYM JSON-em. Spróbuj jeszcze raz. Zwróć wyłącznie jeden kompletny obiekt JSON zgodny ze schematem, bez komentarzy i bez markdownu. Używaj krótkich opisów, aby odpowiedź nie została ucięta.'
      );
      try {
        data = parseSetupJson(repaired.text ?? '');
      } catch {
        throw initialParseError;
      }
    }
    const conflicts = Array.isArray(data.conflicts)
      ? data.conflicts.filter(
          (conflict): conflict is Record<string, unknown> =>
            Boolean(conflict && typeof conflict === 'object')
        )
      : [];
    const factions = conflicts.flatMap((conflict) =>
      Array.isArray(conflict.factions)
        ? conflict.factions.filter(
            (faction): faction is Record<string, unknown> =>
              Boolean(faction && typeof faction === 'object')
          )
        : []
    );
    const setupAsymmetry =
      data.setupAsymmetry && typeof data.setupAsymmetry === 'object'
        ? (data.setupAsymmetry as Record<string, unknown>)
        : {};
    const openingScene =
      setupAsymmetry.duetCohesion &&
      typeof setupAsymmetry.duetCohesion === 'object'
        ? (setupAsymmetry.duetCohesion as Record<string, unknown>)
        : {};
    const phaseResults: SetupPhaseResult[] = [
      {
        phase: 'era',
        status: 'passed',
        critical: true,
        retryable: false,
        durationMs: 0,
        estimatedCostUsd: 0,
        completedAt: new Date().toISOString(),
      },
      {
        phase: 'adventure-graph',
        status: conflicts.length > 0 ? 'passed' : 'failed',
        critical: true,
        retryable: true,
        durationMs: 0,
        estimatedCostUsd: 0,
        message: conflicts.length > 0 ? undefined : 'Model nie zwrócił konfliktu przygody.',
        completedAt: new Date().toISOString(),
      },
      {
        phase: 'historical-research',
        status: research.status,
        critical: false,
        retryable: true,
        durationMs: 0,
        estimatedCostUsd: 0,
        message: research.message,
        completedAt: new Date().toISOString(),
      },
    ];
    const worldSetup: WorldSetupBundleV1 = {
      schemaVersion: 1,
      id: `world_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      scenarioId: body.scenarioId?.trim() || 'custom-adventure',
      adventureTitle: body.adventureTitle?.trim() || 'Własna przygoda',
      createdAt: new Date().toISOString(),
      canonRevision: 1,
      eraContext,
      eraManifestId: manifest?.id ?? null,
      adventureGraph: data,
      factions,
      npcs: [],
      locations: [],
      items: [],
      events: [],
      openingScene,
      nearestBranches: conflicts,
      adventureContent: adventureText,
      supplementalInformation: research.summary ? [research.summary] : [],
      sources: [
        ...(Array.isArray(body.sources) ? body.sources : []),
        ...research.sources,
      ],
      knowledgeGaps:
        manifest?.approvalStatus === 'approved' && research.status === 'passed'
          ? []
          : [
              'Brak zatwierdzonego manifestu lub kompletu zweryfikowanych źródeł dla wybranego roku i kraju.',
              ...(research.quarantinedSources.length > 0
                ? [`Kwarantanna nowych domen: ${research.quarantinedSources.map((source) => source.url).join(', ')}`]
                : []),
            ],
      exceptions: [],
      phaseResults,
    };

    if (hasBlockingSetupFailure(phaseResults)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Preflight wykrył krytyczny błąd setupu przygody.',
          code: 'WORLD_SETUP_BLOCKED',
          setup: data,
          worldSetup,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      setup: data,
      worldSetup,
    });
  } catch (error) {
    if (error instanceof WorldSetupValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    console.error('Setup generation error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas generowania setupu przygody' },
      { status: 500 }
    );
  }
}
