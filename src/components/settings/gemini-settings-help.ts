/**
 * Polskie tooltips dla pól Gemini Settings.
 * Reused w gemini-settings.tsx (PR-C IND-12) — oddziela copy od layoutu.
 *
 * Każde pole ma:
 *  - label:  krótka etykieta (1-3 słowa)
 *  - desc:   1-zdaniowy opis dla HelpIcon
 *  - example: opcjonalny przykład / rekomendowane wartości
 */

export interface GeminiHelpEntry {
    label: string;
    desc: string;
    example?: string;
}

export const GEMINI_HELP: Record<string, GeminiHelpEntry> = {
    // === Sampling ===
    temperature: {
        label: 'Temperatura',
        desc: 'Kontrola losowości. Niższe = bardziej deterministyczne i powtarzalne, wyższe = kreatywniejsze i bardziej zaskakujące.',
        example: 'Zakres 0.0–2.0. Polecane: 0.7–0.9 dla narracji, 0.2 dla precyzji.',
    },
    topP: {
        label: 'Top-P',
        desc: 'AI rozważa tokeny których łączne prawdopodobieństwo nie przekracza topP.',
        example: 'Zakres 0.0–1.0. Polecane: 0.9.',
    },
    topK: {
        label: 'Top-K',
        desc: 'Liczba najprawdopodobniejszych tokenów rozważanych przy każdym kroku. Niższe = bardziej deterministyczne, wyższe = kreatywniejsze.',
        example: 'Zakres 1–100. Polecane: 40–60 dla narracji, 1 dla precyzyjnych odpowiedzi.',
    },
    maxOutputTokens: {
        label: 'Maks. tokeny odpowiedzi',
        desc: 'Twardy limit długości odpowiedzi AI. Po przekroczeniu odpowiedź jest urywana.',
        example: 'Zakres 100–8192. Dla długich narracji: 8192.',
    },
    candidateCount: {
        label: 'Liczba kandydatów',
        desc: 'Ile niezależnych odpowiedzi AI ma wygenerować na 1 prompt.',
        example: 'Domyślnie 1 — wystarcza.',
    },
    seed: {
        label: 'Ziarno losowości',
        desc: 'Ten sam seed = ten sam wynik dla tych samych ustawień. Dla testowania.',
        example: 'Zostaw puste = losowy.',
    },
    presencePenalty: {
        label: 'Kara za obecność',
        desc: 'Ujemne = AI powtarza tematy. Dodatnie = AI szuka nowych.',
        example: 'Zakres -2.0 do 2.0, neutralne = 0.',
    },
    frequencyPenalty: {
        label: 'Kara za częstość',
        desc: 'Ujemne = AI powtarza słowa. Dodatnie = AI używa zróżnicowanego słownictwa.',
        example: 'Zakres -2.0 do 2.0, neutralne = 0.',
    },
    stopSequences: {
        label: 'Ciągi stopujące',
        desc: 'AI zatrzyma generowanie gdy napotka jeden z tych ciągów. Max 5.',
        example: 'Np. "###" albo "KONIEC NARRACJI".',
    },

    // === Output ===
    responseMimeType: {
        label: 'Typ MIME odpowiedzi',
        desc: 'text/plain = zwykły tekst (domyślne). application/json = AI zwraca JSON (wymaga responseSchema).',
        example: 'application/json wymaga responseSchema.',
    },
    responseSchema: {
        label: 'Schema odpowiedzi (JSON)',
        desc: 'JSON Schema definiujący strukturę odpowiedzi AI. Dla power-userów — aplikacja jeszcze nie konsumuje structured output.',
        example: '{"type":"object","properties":{...}}',
    },

    // === Cache (IND-13) ===
    enableCache: {
        label: 'Włącz cache kontekstu',
        desc: 'Cache kontekstu Gemini — oszczędność do 90% tokenów input. Wymaga IND-13 dla pełnej integracji.',
    },
    cacheTTL: {
        label: 'Czas życia cache',
        desc: 'Po ilu milisekundach cache wygasa.',
        example: '3600000 = 1 godzina.',
    },
    cachedContent: {
        label: 'Treść cachowana',
        desc: 'Nazwa istniejącego cache (dla oszczędności tokenów). Wymaga IND-13 dla pełnej integracji.',
        example: 'cachedContents/abc123',
    },

    // === Thinking ===
    thinkingLevel: {
        label: 'Poziom rozumowania',
        desc: 'Gemini 3.x: jak głęboko AI ma "pomyśleć" przed odpowiedzią. Wyższe = wolniej i drożej, ale lepsza jakość.',
        example: 'auto / low / medium / high.',
    },

    // === Tools / Function Calling ===
    tools: {
        label: 'Narzędzia (Function Calling)',
        desc: 'JSON tablica deklaracji funkcji które AI może wywołać. Wymaga obsługi w aplikacji (w przygotowaniu).',
        example: '[{"name":"roll_dice","parameters":{...}}]',
    },
    toolConfig: {
        label: 'Konfiguracja narzędzi',
        desc: 'Jak AI wybiera narzędzia: auto / none / required / specific.',
        example: '{"function_calling_config":{"mode":"AUTO"}}',
    },

    // === Safety ===
    safetySettings: {
        label: 'Filtry bezpieczeństwa',
        desc: 'Cztery kategorie (Nękanie / Mowa nienawiści / Treści seksualne / Niebezpieczne) × cztery poziomy. Ostrożny default może blokować klimatyczny horror.',
        example: 'Kliknij "Horror authentic" dla autentycznego Lovecrafta (BLOCK_ONLY_HIGH).',
    },
    safetyHarassment: {
        label: 'Nękanie',
        desc: 'Filtruje treści zawierające nękanie, znęcanie, groźby personalne.',
    },
    safetyHateSpeech: {
        label: 'Mowa nienawiści',
        desc: 'Filtruje treści dyskryminujące lub atakujące grupy.',
    },
    safetySexuallyExplicit: {
        label: 'Treści seksualne',
        desc: 'Filtruje treści o charakterze seksualnym.',
    },
    safetyDangerousContent: {
        label: 'Niebezpieczne',
        desc: 'Filtruje treści instruujące do działań szkodliwych (broń, narkotyki, samobójstwo).',
    },
} as const;
