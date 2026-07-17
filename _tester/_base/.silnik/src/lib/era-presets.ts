/**
 * Era Presets
 * 
 * Konfiguracja epok historycznych dla systemu podróży.
 * Definiuje dostępność transportu, szybkości i ryzyka.
 */

import { EraSettings, GameEra } from './types';

// ============================================================================
// ERA DEFINITIONS
// ============================================================================

export const ERA_PRESETS: Record<GameEra, EraSettings> = {
    '1890s': {
        id: '1890s',
        name: 'Epoka Wiktoriańska / Gaslight',
        description: 'Era gaslampowych latarni, dyliżansów i statków parowych. Telegraf to szczyt technologii.',
        transport: {
            flight: { available: 'none', risk: 'high', avgSpeedKmh: 0 },
            train: { available: 'common', risk: 'low', avgSpeedKmh: 50 },
            ship: { available: 'common', risk: 'medium', avgSpeedKmh: 25 },
            car: { available: 'none', risk: 'high', avgSpeedKmh: 0 },
            horse: { available: 'common', risk: 'medium', avgSpeedKmh: 15 },
        },
        communication: 'days',
        worldRules: `**Zasady Świata (1890s - Gaslight):**
- Podróże są długie i męczące. Transatlantyckie rejsy trwają 1-2 tygodnie.
- Samochody i samoloty NIE ISTNIEJĄ.
- Pociągi parowe są najszybszym środkiem transportu lądowego.
- Komunikacja: Telegraf (godziny), Listy (tygodnie). Telefon jest rzadkością.
- Elektryczność to nowinka - większość budynków oświetlana jest gazem.
- Broń: Rewolwery, szable, strzelby. Brak automatycznej broni.`,
    },

    '1920s': {
        id: '1920s',
        name: 'Szalone Lata Dwudzieste / Classic',
        description: 'Era jazzu, prohibicji i pierwszych samolotów. Automobil staje się powszechny.',
        transport: {
            flight: { available: 'rare', risk: 'high', avgSpeedKmh: 150 },
            train: { available: 'common', risk: 'low', avgSpeedKmh: 80 },
            ship: { available: 'common', risk: 'medium', avgSpeedKmh: 35 },
            car: { available: 'common', risk: 'medium', avgSpeedKmh: 50 },
            horse: { available: 'rare', risk: 'low', avgSpeedKmh: 15 },
        },
        communication: 'hours',
        worldRules: `**Zasady Świata (1920s - Classic CoC):**
- Samoloty są luksusem, hałaśliwe i niebezpieczne. Loty transatlantyckie to wyczyn.
- Automobil: Ford Model T jest powszechny, ale awarie na długich trasach częste.
- Pociągi ekspresowe (Orient Express) łączą Europę. Luksusowe i komfortowe.
- Statki pasażerskie: RMS Olympic, Mauretania. Transatlantyk 5-7 dni.
- Komunikacja: Telefon (w miastach), Telegram (szybki na dystans), Radio (nowinka).
- Broń: Pistolety automatyczne (Colt 1911), Tommy Gun (gangsterzy), shotguny.`,
    },

    '1940s': {
        id: '1940s',
        name: 'Lata Czterdzieste / Noir',
        description: 'Era II Wojny Światowej, detektywów w prochowcach i zimnej wojny.',
        transport: {
            flight: { available: 'common', risk: 'medium', avgSpeedKmh: 300 },
            train: { available: 'common', risk: 'low', avgSpeedKmh: 100 },
            ship: { available: 'common', risk: 'medium', avgSpeedKmh: 40 },
            car: { available: 'common', risk: 'low', avgSpeedKmh: 70 },
            horse: { available: 'rare', risk: 'low', avgSpeedKmh: 15 },
        },
        communication: 'hours',
        worldRules: `**Zasady Świata (1940s - Noir):**
- Samoloty śmigłowe są powszechne. Podróż transatlantycka 12-20 godzin.
- Samochody są standardem, ale benzyna może być racjonowana (wojna).
- Pociągi diesle, szybsze i niezawodne.
- Komunikacja: Telefon powszechny, Radio, Wczesna telewizja (eksperymentalna).
- Broń: M1 Garand, Thompson, Luger P08.`,
    },

    'modern': {
        id: 'modern',
        name: 'Współczesność',
        description: 'Internet, smartfony, odrzutowce. Świat jest mały.',
        transport: {
            flight: { available: 'common', risk: 'low', avgSpeedKmh: 850 },
            train: { available: 'common', risk: 'low', avgSpeedKmh: 200 },
            ship: { available: 'rare', risk: 'low', avgSpeedKmh: 45 },
            car: { available: 'common', risk: 'low', avgSpeedKmh: 100 },
            horse: { available: 'rare', risk: 'low', avgSpeedKmh: 15 },
        },
        communication: 'instant',
        worldRules: `**Zasady Świata (Modern):**
- Lot transatlantycki: 7-10 godzin. Tanie linie lotnicze.
- Samochody niezawodne. GPS, nawigacja.
- Komunikacja: Smartphone, Internet, wideokonferencje. @natychmiastowa.
- Broń: Glock, AR-15, Tazer. Kamery wszędzie.
- Problem: Trudniej ukryć nadprzyrodzone - świadkowie mają telefony z kamerami.`,
    },

    'future': {
        id: 'future',
        name: 'Przyszłość / Sci-Fi',
        description: 'Kolonie kosmiczne, AI, cyberpunk lub postapokalipsa.',
        transport: {
            flight: { available: 'common', risk: 'low', avgSpeedKmh: 2000 },
            train: { available: 'common', risk: 'low', avgSpeedKmh: 500 },
            ship: { available: 'rare', risk: 'low', avgSpeedKmh: 100 },
            car: { available: 'common', risk: 'low', avgSpeedKmh: 200 },
            horse: { available: 'none', risk: 'low', avgSpeedKmh: 0 },
        },
        communication: 'instant',
        worldRules: `**Zasady Świata (Future):**
- Transport: Maglev, drony osobowe, loty suborbitalne.
- Komunikacja: Neurolinkowe implanty, telepatia technologiczna.`,
    },
};

// ============================================================================
// HELPERS
// ============================================================================

/** Pobierz preset dla danej epoki */
export function getEraPreset(era: GameEra): EraSettings {
    return ERA_PRESETS[era] || ERA_PRESETS['1920s'];
}

/** Pobierz tekst worldRules do wstrzyknięcia w prompt AI */
export function getEraPromptInjection(era: GameEra): string {
    return getEraPreset(era).worldRules;
}

/** Lista dostępnych epok dla UI */
export function getAvailableEras(): { id: GameEra; name: string }[] {
    return Object.values(ERA_PRESETS).map(e => ({ id: e.id, name: e.name }));
}
