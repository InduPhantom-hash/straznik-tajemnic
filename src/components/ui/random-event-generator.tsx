"use client";

import { useState } from 'react';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { generateRandomEvent, EventType, ThreatLevel, RandomEvent } from '@/lib/random-event-generator';
import { Shuffle, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface RandomEventGeneratorProps {
  onClose?: () => void;
  onEventGenerated?: (event: RandomEvent) => void;
  currentLocation?: string;
}

export function RandomEventGenerator({
  onClose,
  onEventGenerated,
  currentLocation
}: RandomEventGeneratorProps) {
  const [eventType, setEventType] = useState<EventType | 'all'>('all');
  const [threatLevel, setThreatLevel] = useState<ThreatLevel | 'random'>('random');
  const [context, setContext] = useState('');
  const [generatedEvent, setGeneratedEvent] = useState<RandomEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<RandomEvent[]>([]);

  const handleGenerate = () => {
    const event = generateRandomEvent(
      eventType === 'all' ? undefined : eventType,
      threatLevel === 'random' ? undefined : threatLevel,
      currentLocation,
      context.trim() || undefined
    );

    setGeneratedEvent(event);
    setEventHistory([event, ...eventHistory.slice(0, 9)]); // Ostatnie 10 wydarzeń

    if (onEventGenerated) {
      onEventGenerated(event);
    }
  };

  const handleUseInGame = () => {
    if (generatedEvent && onEventGenerated) {
      onEventGenerated(generatedEvent);
    }
  };

  const getThreatColor = (level: ThreatLevel) => {
    switch (level) {
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'extreme': return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
  };

  const getTypeLabel = (type: EventType) => {
    switch (type) {
      case 'encounter': return 'Spotkanie';
      case 'atmospheric': return 'Atmosferyczne';
      case 'cosmic': return 'Kosmiczne';
      case 'urban': return 'Miejskie';
      case 'research': return 'Badawcze';
      case 'travel': return 'Podróż';
    }
  };

  return (
    <Card className="bg-card border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shuffle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground font-mono">🎲 Generator Wydarzeń</h2>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Automatyczne losowanie wydarzeń według zasad CoC7
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Konfiguracja */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Typ wydarzenia</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType | 'all')}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
            >
              <option value="all">Wszystkie typy</option>
              <option value="encounter">Spotkanie</option>
              <option value="atmospheric">Atmosferyczne</option>
              <option value="cosmic">Kosmiczne</option>
              <option value="urban">Miejskie</option>
              <option value="research">Badawcze</option>
              <option value="travel">Podróż</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Poziom zagrożenia</label>
            <select
              value={threatLevel}
              onChange={(e) => setThreatLevel(e.target.value as ThreatLevel | 'random')}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
            >
              <option value="random">Losowy</option>
              <option value="low">Niski</option>
              <option value="medium">Średni</option>
              <option value="high">Wysoki</option>
              <option value="extreme">Ekstremalny</option>
            </select>
          </div>

          {currentLocation && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Lokalizacja</label>
              <div className="px-3 py-2 bg-muted/50 rounded-md text-foreground">
                {currentLocation}
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Kontekst (opcjonalnie)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Dodatkowy kontekst dla wydarzenia..."
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground min-h-[80px]"
            />
          </div>
        </div>

        {/* Przycisk generowania */}
        <Button
          onClick={handleGenerate}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="lg"
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Wygeneruj Wydarzenie
        </Button>

        {/* Wygenerowane wydarzenie */}
        {generatedEvent && (
          <Card className={`bg-muted/50 border ${getThreatColor(generatedEvent.threatLevel)}`}>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">{generatedEvent.title}</h3>
                    <Badge className={getThreatColor(generatedEvent.threatLevel)}>
                      {generatedEvent.threatLevel === 'low' ? 'Niski' :
                       generatedEvent.threatLevel === 'medium' ? 'Średni' :
                       generatedEvent.threatLevel === 'high' ? 'Wysoki' : 'Ekstremalny'}
                    </Badge>
                    <Badge variant="outline">
                      {getTypeLabel(generatedEvent.type)}
                    </Badge>
                  </div>
                  {generatedEvent.location && (
                    <p className="text-sm text-muted-foreground mb-2">
                      📍 {generatedEvent.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-foreground whitespace-pre-line">{generatedEvent.description}</p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  onClick={handleUseInGame}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Użyj w Grze
                </Button>
                <Button
                  onClick={handleGenerate}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Losuj Ponownie
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Historia wydarzeń */}
        {eventHistory.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Historia Wydarzeń</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventHistory.map(event => (
                <Card key={event.id} className="bg-muted/30 border-border">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{event.title}</span>
                        <Badge className={getThreatColor(event.threatLevel)} variant="outline">
                          {event.threatLevel}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(event.type)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGeneratedEvent(event);
                          if (onEventGenerated) {
                            onEventGenerated(event);
                          }
                        }}
                      >
                        Użyj
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

