/**
 * Travel Service
 * 
 * Obsługuje estymację czasu podróży z wykorzystaniem AI.
 * Integruje kontekst epoki, środki transportu i TimeManager.
 */

import { GoogleGenAI } from '@google/genai';
import { GameEra, GameTime } from './types';
import { getEraPreset, ERA_PRESETS } from './era-presets';
import { timeManager } from './time-manager';
import { DEFAULT_GEMINI_MODEL } from './ai-providers/constants';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TravelRequest {
    from: string;
    to: string;
    era: GameEra;
    preferredTransport?: 'flight' | 'train' | 'ship' | 'car' | 'horse' | 'auto';
}

export interface TravelResult {
    durationMinutes: number;
    durationText: string;        // "3 dni i 14 godzin"
    transport: string;           // "Pociąg ekspresowy"
    route: string;               // "Arkham → Boston → Atlantic City → Nowy Jork"
    risks: string[];             // ["Opóźnienia pogodowe", "Bandyci na pustyni"]
    cost: string;                // "~15 dolarów"
    narrativeDescription: string; // Opis fabularny podróży
    arrivalTime: GameTime;       // Czas po podróży
}

// ============================================================================
// TRAVEL AGENT PROMPT
// ============================================================================

function buildTravelAgentPrompt(request: TravelRequest): string {
    const era = getEraPreset(request.era);

    // Buduj listę dostępnych środków transportu
    const transportList = Object.entries(era.transport)
        .filter(([_, t]) => t.available !== 'none')
        .map(([name, t]) => `- ${name}: dostępność=${t.available}, ryzyko=${t.risk}, ~${t.avgSpeedKmh} km/h`)
        .join('\n');

    return `Jesteś ekspertem od historycznych podróży. Oceń podróż z ${request.from} do ${request.to} w epoce ${era.name}.

## KONTEKST EPOKI
${era.worldRules}

## DOSTĘPNE ŚRODKI TRANSPORTU
${transportList}

## PREFEROWANY TRANSPORT
${request.preferredTransport || 'auto (wybierz najlepszy)'}

## ZADANIE
Oszacuj podróż i odpowiedz w formacie JSON:
{
  "durationMinutes": <liczba minut>,
  "durationText": "<czytelny opis czasu, np. '3 dni i 14 godzin'>",
  "transport": "<wybrany środek transportu>",
  "route": "<trasa z przesiadkami>",
  "risks": ["<ryzyko 1>", "<ryzyko 2>"],
  "cost": "<przybliżony koszt w walucie epoki>",
  "narrativeDescription": "<1-2 zdania opisu fabularnego podróży w stylu Lovecrafta>"
}

WAŻNE:
- Bądź HISTORYCZNIE DOKŁADNY dla epoki ${request.era}
- Uwzględnij realne odległości geograficzne
- Opisz ryzyka charakterystyczne dla epoki i środka transportu
- durationMinutes MUSI być liczbą całkowitą`;
}

// ============================================================================
// TRAVEL SERVICE
// ============================================================================

class TravelService {
    private ai: GoogleGenAI | null = null;

    /**
     * Inicjalizacja z kluczem API
     */
    initialize(apiKey: string): void {
        if (!apiKey) {
            console.warn('⚠️ TravelService: No API key provided');
            return;
        }
        this.ai = new GoogleGenAI({ apiKey });
        console.log('🚂 TravelService initialized');
    }

    /**
     * Oszacuj czas podróży używając AI
     */
    async estimateTravel(request: TravelRequest): Promise<TravelResult | null> {
        if (!this.ai) {
            console.error('❌ TravelService not initialized');
            return this.fallbackEstimate(request);
        }

        try {
            const prompt = buildTravelAgentPrompt(request);
            const result = await this.ai.models.generateContent({
                model: DEFAULT_GEMINI_MODEL,
                contents: prompt,
                config: {
                    temperature: 0.3, // Niska temperatura dla dokładności
                    maxOutputTokens: 1024,
                },
            });
            const response = result.text ?? '';

            // Parsuj JSON z odpowiedzi
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('⚠️ AI response did not contain valid JSON');
                return this.fallbackEstimate(request);
            }

            const parsed = JSON.parse(jsonMatch[0]) as Omit<TravelResult, 'arrivalTime'>;

            // Oblicz czas przybycia
            const arrivalTime = this.calculateArrivalTime(parsed.durationMinutes);

            console.log(`🚂 Travel estimated: ${request.from} → ${request.to} = ${parsed.durationText}`);

            return {
                ...parsed,
                arrivalTime
            };

        } catch (error) {
            console.error('❌ Travel estimation failed:', error);
            return this.fallbackEstimate(request);
        }
    }

    /**
     * Wykonaj podróż - przesuń czas gry
     */
    async undertakeTravel(request: TravelRequest): Promise<TravelResult | null> {
        const estimate = await this.estimateTravel(request);
        if (!estimate) return null;

        // Przesuń czas w grze
        timeManager.advanceTime(estimate.durationMinutes);

        console.log(`🚂 Travel completed: Arrived at ${timeManager.formatDateTime()}`);
        return estimate;
    }

    /**
     * Fallback - prosta estymacja bez AI
     */
    private fallbackEstimate(request: TravelRequest): TravelResult {
        const era = getEraPreset(request.era);

        // Zakładamy ~500km dystans dla nieznanej trasy
        const distance = 500;

        // Wybierz najszybszy dostępny transport
        let bestSpeed = 0;
        let bestTransport = 'pieszo';

        for (const [name, t] of Object.entries(era.transport)) {
            if (t.available !== 'none' && t.avgSpeedKmh > bestSpeed) {
                bestSpeed = t.avgSpeedKmh;
                bestTransport = name;
            }
        }

        const hours = distance / (bestSpeed || 5);
        const durationMinutes = Math.round(hours * 60);

        return {
            durationMinutes,
            durationText: this.formatDuration(durationMinutes),
            transport: bestTransport,
            route: `${request.from} → ${request.to}`,
            risks: ['Standardowe ryzyka podróży'],
            cost: 'nieznany',
            narrativeDescription: `Podróż z ${request.from} do ${request.to} zajmuje ${this.formatDuration(durationMinutes)}.`,
            arrivalTime: this.calculateArrivalTime(durationMinutes)
        };
    }

    /**
     * Oblicz czas przybycia
     */
    private calculateArrivalTime(durationMinutes: number): GameTime {
        // Pobierz kopię aktualnego czasu i dodaj minuty
        const current = timeManager.getTime();

        // Symuluj advanceTime bez faktycznej zmiany stanu
        let { year, month, day, hour, minute } = current;
        minute += durationMinutes;

        while (minute >= 60) {
            minute -= 60;
            hour++;
        }
        while (hour >= 24) {
            hour -= 24;
            day++;
        }
        // Uproszczone - nie obsługujemy tu przełomu miesięcy dokładnie
        while (day > 28) {
            day -= 28;
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }

        return { year, month, day, hour, minute };
    }

    /**
     * Formatuj czas trwania
     */
    private formatDuration(minutes: number): string {
        if (minutes < 60) {
            return `${minutes} minut`;
        }

        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days === 0) {
            return `${hours} godzin`;
        } else if (remainingHours === 0) {
            return `${days} dni`;
        } else {
            return `${days} dni i ${remainingHours} godzin`;
        }
    }
}

// Singleton export
export const travelService = new TravelService();
