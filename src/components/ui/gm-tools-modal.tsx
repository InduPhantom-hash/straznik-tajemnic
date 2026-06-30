'use client';

import { Card } from './card';
import { Button } from './button';
import { NPCManager } from './npc-manager';
import { RandomEventGenerator } from './random-event-generator';
import { LocationManager } from './location-manager';
import { SessionTimeline } from './session-timeline';
import { QuickReferences } from './quick-references';
import { CombatSystem } from './combat-system';
import { X } from 'lucide-react';

interface GMToolsModalProps {
  tool: string;
  onClose: () => void;
  // activeCharacter był używany tylko przez Kalkulator Testów (usunięty w D1 - Tacka
  // sterowana [TEST:]). Pole zostaje opcjonalne dla zgodności z callerem (page.tsx).
  activeCharacter?: unknown;
  currentLocation?: string;
  sessionId?: string;
}

export function GMToolsModal({
  tool,
  onClose,
  currentLocation,
  sessionId,
}: GMToolsModalProps) {
  const renderTool = () => {
    switch (tool) {
      case 'npc-manager':
        return (
          <NPCManager
            onClose={onClose}
            currentLocation={currentLocation}
            sessionId={sessionId}
          />
        );
      case 'random-events':
        return (
          <RandomEventGenerator
            onClose={onClose}
            currentLocation={currentLocation}
          />
        );
      case 'location-manager':
        return (
          <LocationManager onClose={onClose} currentSessionId={sessionId} />
        );
      case 'session-timeline':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground font-mono">
                📜 Oś Czasu Sesji
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <SessionTimeline sessionId={sessionId} />
          </div>
        );
      case 'quick-references':
        return (
          <QuickReferences
            onClose={onClose}
            pdfRulesAvailable={!!currentLocation} // Tymczasowo, powinno sprawdzać czy PDF jest załadowany
          />
        );
      case 'initiative-tracker':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground font-mono">
                ⚔️ Tracker Inicjatywy
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mb-4">
              Tracker inicjatywy jest dostępny poprzez System Walki w
              narzędziach głównych. Automatycznie uruchamia się gdy AI wykryje
              walkę w narracji.
            </p>
            <Button
              onClick={onClose}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Zamknij
            </Button>
          </div>
        );
      default:
        return (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Nieznane narzędzie: {tool}</p>
            <Button onClick={onClose} className="mt-4">
              Zamknij
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-card border-border max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">{renderTool()}</div>
      </Card>
    </div>
  );
}
