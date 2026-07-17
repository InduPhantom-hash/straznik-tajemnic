/**
 * 🎭 Scenariusze Testowe dla Full Playtest
 * 
 * Biblioteka akcji gracza używanych przez automat testowy.
 * Akcje są losowane i wysyłane do AI Game Mastera.
 */

// Akcje eksploracyjne
export const EXPLORATION_ACTIONS = [
    "Rozglądam się uważnie po pokoju",
    "Przeszukuję biurko w poszukiwaniu wskazówek",
    "Otwieram drzwi i wyglądając na korytarz",
    "Sprawdzam okno - czy da się je otworzyć?",
    "Zaglądam pod łóżko",
    "Przeszukuję szafę",
    "Sprawdzam czy w pokoju są jakieś ukryte przejścia",
    "Podnoszę dywan i sprawdzam podłogę",
    "Przeczytałem książkę leżącą na stole",
    "Badam dziwne ślady na ścianie",
];

// Akcje dialogowe z NPC
export const DIALOG_ACTIONS = [
    "Pytam o historię tego miejsca",
    "Czy mógłby mi pan opowiedzieć o dziwnych wydarzeniach?",
    'Mówię: "Szukam informacji o zniknięciach w okolicy"',
    "Obserwuję reakcję rozmówcy na moje pytania",
    "Próbuję zdobyć zaufanie NPC komplementując go",
    'Pytam wprost: "Wiesz coś o kulcie?"',
    "Daję napiwek i proszę o więcej informacji",
    "Pokazuję znaleziony przedmiot i pytam czy go rozpoznaje",
];

// Testy umiejętności
export const SKILL_TEST_ACTIONS = [
    "[kości] Rzucam na Spostrzegawczość aby zauważyć ukryte szczegóły",
    "[kości] Test Biblioteki - szukam informacji w dokumentach",
    "[kości] Psychologia - próbuję odczytać intencje NPC",
    "[kości] Ukrywanie - chowam się w cieniu",
    "[kości] Nasłuchiwanie - co słychać za drzwiami?",
    "[kości] Tropienie - szukam śladów",
    "[kości] Pierwsza Pomoc - opatruję ranę",
    "[kości] Perswazja - przekonuję strażnika by mnie przepuścił",
];

// Akcje walki
export const COMBAT_ACTIONS = [
    "Atakuję przeciwnika nożem myśliwskim",
    "Strzelam z rewolweru do potwora!",
    "Próbuję unikać ataku",
    "Rzucam się do ucieczki przez okno",
    "Blokuję atak i kontraatakuję",
    "Celnie mierzę w głowę przeciwnika",
    "Używam czegokolwiek co mam pod ręką jako broni",
];

// Akcje ekwipunku
export const INVENTORY_ACTIONS = [
    "Sprawdzam swój ekwipunek",
    "Używam latarki aby oświetlić ciemny korytarz",
    "Wyjmuję notatnik i zapisuję spostrzeżenia",
    "Sprawdzam ile mam jeszcze naboi",
    "Pakuję znaleziony przedmiot do torby",
    "Biorę apteczkę na wszelki wypadek",
];

// Akcje sanity-related
export const SANITY_ACTIONS = [
    "To co widzę jest niemożliwe... próbuję zachować spokój",
    "Zamykam oczy i liczę do dziesięciu",
    "Muszę się napić czegoś mocniejszego po tym co zobaczyłem",
    "Rozmawiam sam ze sobą żeby uspokoić nerwy",
];

// Starter message
export const START_GAME_MESSAGE = "Zaczynamy!";

// Session Zero responses
export const SESSION_ZERO_RESPONSES = {
    era: "Wybieram lata 1920",
    tone: "Preferuję klasyczny Purist - pełen grozy bez happy endów",
    safetyLines: "Nie mam specjalnych ograniczeń, chcę pełnego horroru Lovecraftowskiego",
    ready: "Jestem gotowy do rozpoczęcia przygody!",
};

// Character wizard inputs
export const TEST_CHARACTER = {
    name: "Edmund Blackwood",
    occupation: "Prywatny Detektyw",
    age: 35,
    residence: "Arkham, Massachusetts",
    birthplace: "Boston",
    backstory: "Były policjant który widział za dużo. Teraz prowadzi prywatne śledztwa w sprawach, których policja nie chce dotykać.",
};

// Funkcja losująca akcję z kategorii
export function getRandomAction(category: string[]): string {
    return category[Math.floor(Math.random() * category.length)];
}

// Funkcja generująca sekwencję akcji dla danej fazy
export function generateActionSequence(phase: 'high' | 'mid' | 'low', count: number): string[] {
    const actions: string[] = [];

    for (let i = 0; i < count; i++) {
        // Różne proporcje akcji dla różnych presetów
        if (phase === 'high') {
            // HIGH: więcej eksploracji i dialogów (testuje obrazy i głosy)
            const rand = Math.random();
            if (rand < 0.4) {
                actions.push(getRandomAction(EXPLORATION_ACTIONS));
            } else if (rand < 0.7) {
                actions.push(getRandomAction(DIALOG_ACTIONS));
            } else {
                actions.push(getRandomAction(SKILL_TEST_ACTIONS));
            }
        } else if (phase === 'mid') {
            // MID: więcej testów umiejętności i walki
            const rand = Math.random();
            if (rand < 0.3) {
                actions.push(getRandomAction(SKILL_TEST_ACTIONS));
            } else if (rand < 0.5) {
                actions.push(getRandomAction(COMBAT_ACTIONS));
            } else if (rand < 0.7) {
                actions.push(getRandomAction(DIALOG_ACTIONS));
            } else {
                actions.push(getRandomAction(EXPLORATION_ACTIONS));
            }
        } else {
            // LOW: szybkie interakcje i ekwipunek
            const rand = Math.random();
            if (rand < 0.4) {
                actions.push(getRandomAction(INVENTORY_ACTIONS));
            } else if (rand < 0.7) {
                actions.push(getRandomAction(EXPLORATION_ACTIONS));
            } else {
                actions.push(getRandomAction(SKILL_TEST_ACTIONS));
            }
        }
    }

    return actions;
}

// Delay helper
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Phase configuration
export const PHASE_CONFIG = {
    high: {
        preset: 'high',
        duration: 10 * 60 * 1000, // 10 minutes
        actionCount: 15,
        delayBetweenActions: 30000, // 30 seconds between actions
    },
    mid: {
        preset: 'mid',
        duration: 7 * 60 * 1000, // 7 minutes
        actionCount: 12,
        delayBetweenActions: 25000,
    },
    low: {
        preset: 'low',
        duration: 5 * 60 * 1000, // 5 minutes
        actionCount: 10,
        delayBetweenActions: 20000,
    },
};
