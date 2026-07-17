/**
 * Auto Summary Service
 * 
 * Automatycznie streszcza stare wiadomości przed archiwizacją.
 * Używa Gemini Flash (tani model) do generowania streszczeń.
 */

import type { Message, CloudContextChunk } from './cloud-context-service';
import { DEFAULT_GEMINI_MODEL } from './ai-providers/constants';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUMMARY_MODEL = DEFAULT_GEMINI_MODEL; // Tani, szybki model (SSOT: ai-providers/constants)

const SUMMARY_SYSTEM_PROMPT = `Jesteś asystentem do streszczania sesji RPG Call of Cthulhu.

ZADANIE: Streść poniższą część sesji w 3-5 zdaniach.

ZACHOWAJ:
- Imiona NPC i ich role
- Nazwy lokacji
- Kluczowe odkrycia i wydarzenia
- Ważne decyzje gracza
- Fakty fabularne (kto jest sprawcą, co się wydarzyło)

POMIŃ:
- Szczegółowe opisy atmosfery
- Powtarzające się elementy
- Techniczne testy kości
- Nieistotne dialogi

FORMAT: Pisz w czasie przeszłym, zwięźle. Maksymalnie 200 słów.`;

// ============================================================================
// INTERFACES
// ============================================================================

export interface SummaryResult {
    summary: string;
    keyFacts: string[];
    mentionedNPCs: string[];
    mentionedLocations: string[];
    processingTime: number;
}

// ============================================================================
// AUTO SUMMARY SERVICE
// ============================================================================

class AutoSummaryService {
    private apiEndpoint = '/api/context/summarize';

    /**
     * Streścij chunk wiadomości używając Gemini Flash
     */
    async summarizeChunk(messages: Message[]): Promise<SummaryResult> {
        const startTime = Date.now();

        try {
            // Przygotuj tekst do streszczenia
            const conversationText = messages
                .map(m => `${m.role === 'user' ? 'GRACZ' : 'MG'}: ${m.content}`)
                .join('\n\n');

            // Wywołaj API
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'summarize',
                    text: conversationText,
                    model: SUMMARY_MODEL
                })
            });

            if (!response.ok) {
                throw new Error(`Summary API error: ${response.status}`);
            }

            const result = await response.json();

            return {
                summary: result.summary || this.createFallbackSummary(messages),
                keyFacts: result.keyFacts || [],
                mentionedNPCs: result.mentionedNPCs || [],
                mentionedLocations: result.mentionedLocations || [],
                processingTime: Date.now() - startTime
            };
        } catch (error) {
            console.warn('⚠️ Summary generation failed, using fallback:', error);

            return {
                summary: this.createFallbackSummary(messages),
                keyFacts: [],
                mentionedNPCs: [],
                mentionedLocations: [],
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Streścij chunk bez API (lokalnie, szybko)
     */
    createFallbackSummary(messages: Message[]): string {
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        // Wyciągnij pierwsze zdania z odpowiedzi AI
        const aiHighlights = assistantMessages
            .slice(0, 3)
            .map(m => {
                const firstSentence = m.content.match(/^[^.!?]+[.!?]/);
                return firstSentence ? firstSentence[0].slice(0, 80) : m.content.slice(0, 80);
            })
            .filter(s => s.length > 20);

        // Wyciągnij akcje gracza
        const playerActions = userMessages
            .slice(0, 3)
            .map(m => m.content.slice(0, 60))
            .filter(s => s.length > 10);

        let summary = '';

        if (playerActions.length > 0) {
            summary += `Gracz: ${playerActions.join('; ')}. `;
        }

        if (aiHighlights.length > 0) {
            summary += `Narracja: ${aiHighlights.join(' ')}`;
        }

        return summary || `Sesja zawierała ${messages.length} wiadomości.`;
    }

    /**
     * Wyekstrahuj kluczowe fakty z tekstu
     */
    extractKeyFacts(text: string): string[] {
        const facts: string[] = [];

        const patterns = [
            /(?:odkrywasz|dowiadujesz się|zauważasz)\s+([^.!?]+[.!?])/gi,
            /(?:okazuje się|teraz wiesz|to oznacza)\s+([^.!?]+[.!?])/gi,
            /(?:mordercą jest|sprawcą jest|winny jest)\s+([^.!?]+[.!?])/gi
        ];

        for (const pattern of patterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                if (match[1] && match[1].length > 15 && match[1].length < 150) {
                    facts.push(match[1].trim());
                }
            }
        }

        return [...new Set(facts)].slice(0, 5);
    }

    /**
     * Aktualizuj chunk o streszczenie
     */
    async updateChunkWithSummary(chunk: CloudContextChunk): Promise<CloudContextChunk> {
        const result = await this.summarizeChunk(chunk.messages);

        return {
            ...chunk,
            summary: result.summary,
            keyFacts: result.keyFacts.map(f => ({
                content: f,
                category: 'plot' as const,
                source: 'ai' as const,
                confidence: 0.8
            })),
            mentionedNPCs: [...new Set([...chunk.mentionedNPCs, ...result.mentionedNPCs])],
            mentionedLocations: [...new Set([...chunk.mentionedLocations, ...result.mentionedLocations])]
        };
    }

    /**
     * Batch summarize - streścij wiele chunków
     */
    async batchSummarize(chunks: CloudContextChunk[]): Promise<CloudContextChunk[]> {
        const results: CloudContextChunk[] = [];

        for (const chunk of chunks) {
            if (!chunk.summary) {
                const updated = await this.updateChunkWithSummary(chunk);
                results.push(updated);

                // Małe opóźnienie między requestami
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                results.push(chunk);
            }
        }

        return results;
    }
}

// Singleton export
export const autoSummaryService = new AutoSummaryService();

// Export dla API route
export { SUMMARY_SYSTEM_PROMPT, SUMMARY_MODEL };
