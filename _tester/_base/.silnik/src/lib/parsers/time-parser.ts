import { TimeUpdate } from './types';

const MONTHS_PL = ['Stycznia', 'Lutego', 'Marca', 'Kwietnia', 'Maja', 'Czerwca',
    'Lipca', 'Sierpnia', 'Września', 'Października', 'Listopada', 'Grudnia'];

const MONTHS_NOMINATIVE_PL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

/**
 * Parses time updates from the AI's response text.
 * Example format: "AKTUALNY CZAS: 14 Stycznia 1925, 14:45, Środa, Dzień, Faza Księżyca: Rosnący Sierp 🌒"
 * We look for the exact "AKTUALNY CZAS:" or similar indicators.
 */
export function extractTimeUpdate(text: string): TimeUpdate | null {
    // Regex matches patterns like:
    // AKTUALNY CZAS: 14 Stycznia 1925, 14:45
    // Data: 14 Stycznia 1925, Czas: 14:45
    // 14 Stycznia 1925, 14:45

    // Basic regex targeting the standard format from the timeManager
    const timePattern = /(?:AKTUALNY CZAS:|Czas:)?\s*(\d{1,2})\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})(?:r\.?)?,\s*(\d{1,2})[.:](\d{2})/i;

    let match = timePattern.exec(text);

    // Also try another format if the first fails just in case AI slightly hallucinates the layout
    if (!match) {
        // Look for any date + time combo in text: 14 Stycznia 1925, 14:45
        const backupPattern = /(\d{1,2})\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4}).*?(\d{1,2})[.:](\d{2})/i;
        match = backupPattern.exec(text);
    }

    if (match) {
        const day = parseInt(match[1]);
        const monthStr = match[2];
        const year = parseInt(match[3]);
        const hour = parseInt(match[4]);
        const minute = parseInt(match[5]);

        let month = 0; // default January
        const normMonthStr = monthStr.toLowerCase();
        for (let i = 0; i < MONTHS_PL.length; i++) {
            if (
                MONTHS_PL[i].toLowerCase() === normMonthStr || 
                MONTHS_NOMINATIVE_PL[i].toLowerCase() === normMonthStr ||
                MONTHS_PL[i].toLowerCase().startsWith(normMonthStr.substring(0, 3))
            ) {
                month = i;
                break;
            }
        }

        if (!isNaN(day) && !isNaN(year) && !isNaN(hour) && !isNaN(minute)) {
            return {
                day,
                month,
                year,
                hour,
                minute
            };
        }
    }

    return null;
}

