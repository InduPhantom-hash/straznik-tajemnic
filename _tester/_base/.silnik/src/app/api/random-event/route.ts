import { NextRequest, NextResponse } from 'next/server';
import { RANDOM_EVENTS, LOCATIONS, MYTHOS_CREATURES, NPC_ARCHETYPES, POLISH_FOLKLORE } from '@/lib/content-library';

// === TYPY ===

interface GameContext {
    mode: 'investigation' | 'combat' | 'chase' | 'dream' | 'ritual' | 'social' | 'exploration';
    timeOfDay: 'day' | 'night';
    location?: string;
    tension: 'low' | 'medium' | 'high';
    lastEvents?: string[];
}

interface RandomEventResponse {
    event: {
        id: string;
        category: string;
        title: string;
        description: string;
        mechanicalEffect?: string;
    };
    atmosphere?: {
        sight?: string;
        sound?: string;
        smell?: string;
        touch?: string;
    };
    suggestion?: string;
}

// === UTILITY FUNCTIONS ===

function detectGameMode(messages: string[]): GameContext['mode'] {
    const lastMessages = messages.slice(-5).join(' ').toLowerCase();

    if (lastMessages.includes('walka') || lastMessages.includes('atak') || lastMessages.includes('obrażeni')) {
        return 'combat';
    }
    if (lastMessages.includes('pościg') || lastMessages.includes('ucieka') || lastMessages.includes('goni')) {
        return 'chase';
    }
    if (lastMessages.includes('sen') || lastMessages.includes('koszmar') || lastMessages.includes('śni')) {
        return 'dream';
    }
    if (lastMessages.includes('rytuał') || lastMessages.includes('zaklęc') || lastMessages.includes('przyzw')) {
        return 'ritual';
    }
    if (lastMessages.includes('rozmaw') || lastMessages.includes('pyta') || lastMessages.includes('mówi')) {
        return 'social';
    }
    if (lastMessages.includes('bada') || lastMessages.includes('przeszuk') || lastMessages.includes('szuka')) {
        return 'investigation';
    }

    return 'exploration';
}

function detectTension(messages: string[]): GameContext['tension'] {
    const lastMessages = messages.slice(-10).join(' ').toLowerCase();

    // Keywords indicating high tension
    const highTensionKeywords = ['śmierć', 'krew', 'potwór', 'szaleństwo', 'krzyk', 'panika', 'horror'];
    const highCount = highTensionKeywords.filter(k => lastMessages.includes(k)).length;

    if (highCount >= 2) return 'high';
    if (highCount >= 1) return 'medium';

    // Keywords indicating low tension
    const lowTensionKeywords = ['spokojnie', 'odpoczynek', 'bezpiecznie', 'normalni', 'śmiej'];
    const lowCount = lowTensionKeywords.filter(k => lastMessages.includes(k)).length;

    if (lowCount >= 2) return 'low';

    return 'medium';
}

function detectNothingHappening(messages: string[]): boolean {
    // Chandler's Law: "When in doubt, have a man come through the door with a gun"
    const lastMessages = messages.slice(-3);

    // Check if last messages are simple exploration without events
    const boringKeywords = ['rozglądam się', 'czekam', 'nic ciekawego', 'idziemy dalej', 'sprawdzam'];
    const boringCount = lastMessages.filter(m =>
        boringKeywords.some(k => m.toLowerCase().includes(k))
    ).length;

    return boringCount >= 2;
}

function getRandomEvent(context: GameContext): RandomEventResponse['event'] {
    // Filter events by time of day
    let eligibleEvents = RANDOM_EVENTS.filter(e =>
        e.timeOfDay === 'either' || e.timeOfDay === context.timeOfDay
    );

    // Adjust category weights based on context
    if (context.tension === 'high') {
        // More horror events in high tension
        eligibleEvents = eligibleEvents.filter(e =>
            e.category === 'horror' || e.category === 'complication' || Math.random() < 0.3
        );
    } else if (context.tension === 'low') {
        // More atmospheric events in low tension
        eligibleEvents = eligibleEvents.filter(e =>
            e.category === 'atmospheric' || e.category === 'clue' || Math.random() < 0.4
        );
    }

    // Random selection
    return eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
}

function getAtmosphere(locationId?: string): RandomEventResponse['atmosphere'] {
    if (!locationId) return undefined;

    const location = LOCATIONS.find(l => l.id === locationId);
    if (!location) return undefined;

    return {
        sight: location.sights[Math.floor(Math.random() * location.sights.length)],
        sound: location.sounds[Math.floor(Math.random() * location.sounds.length)],
        smell: location.smells[Math.floor(Math.random() * location.smells.length)],
        touch: location.touches[Math.floor(Math.random() * location.touches.length)]
    };
}

function getSuggestion(context: GameContext, event: RandomEventResponse['event']): string {
    const suggestions: string[] = [];

    // Mode-specific suggestions
    switch (context.mode) {
        case 'investigation':
            suggestions.push('Rozważ dodanie tropu prowadzącego do głównej zagadki.');
            break;
        case 'social':
            suggestions.push('To dobry moment na wprowadzenie NPC z sekretem.');
            break;
        case 'exploration':
            suggestions.push('Rozważ budowanie atmosfery przez detale sensoryczne.');
            break;
        case 'combat':
            suggestions.push('Pamiętaj o dynamicznym opisie akcji i konsekwencjach.');
            break;
    }

    // Tension-specific
    if (context.tension === 'low' && Math.random() < 0.5) {
        suggestions.push('Napięcie jest niskie - rozważ subtelne zapowiedzi nadchodzących problemów.');
    }

    // Chandler's Law
    if (detectNothingHappening(context.lastEvents || [])) {
        suggestions.push('⚡ PRAWO CHANDLERA: Nic się nie dzieje - czas wprowadzić komplikację!');
    }

    return suggestions.join(' | ');
}

// === API HANDLER ===

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages = [], locationId, forceEvent = false } = body;

        // Detect context
        const context: GameContext = {
            mode: detectGameMode(messages),
            timeOfDay: new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'night' : 'day',
            location: locationId,
            tension: detectTension(messages),
            lastEvents: messages.slice(-5)
        };

        // Check if we should generate an event
        const shouldGenerate = forceEvent ||
            detectNothingHappening(messages) ||
            Math.random() < 0.2; // 20% random chance

        if (!shouldGenerate) {
            return NextResponse.json({
                generated: false,
                context,
                message: 'No event generated - game is progressing normally'
            });
        }

        // Generate event
        const event = getRandomEvent(context);
        const atmosphere = getAtmosphere(locationId);
        const suggestion = getSuggestion(context, event);

        const response: RandomEventResponse = {
            event,
            atmosphere,
            suggestion
        };

        return NextResponse.json({
            generated: true,
            context,
            ...response
        });

    } catch (error) {
        console.error('Random event API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate random event' },
            { status: 500 }
        );
    }
}

// GET endpoint for fetching content
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    switch (type) {
        case 'npc':
            if (id) {
                const npc = NPC_ARCHETYPES.find(n => n.id === id);
                return NextResponse.json(npc || { error: 'NPC not found' });
            }
            return NextResponse.json(NPC_ARCHETYPES);

        case 'creature':
            if (id) {
                const creature = MYTHOS_CREATURES.find(c => c.id === id);
                return NextResponse.json(creature || { error: 'Creature not found' });
            }
            return NextResponse.json(MYTHOS_CREATURES);

        case 'location':
            if (id) {
                const location = LOCATIONS.find(l => l.id === id);
                return NextResponse.json(location || { error: 'Location not found' });
            }
            return NextResponse.json(LOCATIONS);

        case 'events':
            return NextResponse.json(RANDOM_EVENTS);

        case 'polish':
            return NextResponse.json(POLISH_FOLKLORE);

        default:
            return NextResponse.json({
                available: ['npc', 'creature', 'location', 'events', 'polish'],
                usage: '/api/random-event?type=npc&id=traumatic-witness'
            });
    }
}
