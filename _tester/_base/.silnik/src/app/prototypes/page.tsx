'use client';

import Link from 'next/link';
import { Beaker, Dices, Brain, ArrowLeft, Film } from 'lucide-react';

type PrototypeStatus = 'ready' | 'wip' | 'planned';

interface Prototype {
  name: string;
  slug: string;
  description: string;
  icon: typeof Brain;
  status: PrototypeStatus;
}

const prototypes: Prototype[] = [
  {
    name: 'Cutscene Player',
    slug: 'cutscene',
    description: 'Auto-GM - automatyczna narracja w stylu cutscenki filmowej',
    icon: Film,
    status: 'ready',
  },
  {
    name: 'Dice 3D',
    slug: 'dice-3d',
    description: 'Trójwymiarowe kości z fizyką (planowane)',
    icon: Dices,
    status: 'planned',
  },
];

/**
 * Prototypes Lab - Sandbox do testowania nowych funkcjonalności
 * Dostępny tylko w trybie deweloperskim
 */
export default function PrototypesIndex() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="text-muted-foreground hover:text-brass text-sm mb-6 inline-flex items-center gap-1 transition-colors font-display uppercase tracking-wider"
        >
          <ArrowLeft size={16} />
          Powrót do gry
        </Link>

        {/* Header */}
        <h1 className="text-3xl font-bold font-display uppercase tracking-wider text-brass flex items-center gap-3 mb-2">
          <Beaker className="w-8 h-8 text-primary" />
          Prototypes Lab
        </h1>
        <p className="text-muted-foreground mb-8">
          Sandbox do testowania nowych funkcjonalności Zew-App. 
          Prototypy są izolowane od głównej aplikacji.
        </p>

        {/* Prototypes Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {prototypes.map((proto) => {
            const isReady = proto.status === 'ready';
            const CardContent = (
              <div className="flex items-start gap-4">
                <proto.icon className={`w-10 h-10 ${isReady ? 'text-brass group-hover:scale-110' : 'text-muted-foreground/60'} transition-transform`} />
                <div>
                  <h2 className="text-xl font-semibold font-display tracking-wider text-foreground flex items-center gap-2">
                    {proto.name}
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                      proto.status === 'ready' 
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : proto.status === 'wip'
                        ? 'bg-gold/20 text-gold border border-gold/40'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {proto.status === 'ready' ? 'READY' : proto.status === 'wip' ? 'WIP' : 'PLANNED'}
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {proto.description}
                  </p>
                </div>
              </div>
            );

            if (isReady) {
              return (
                <Link
                  key={proto.slug}
                  href={`/prototypes/${proto.slug}`}
                  className="block p-6 bg-card border border-brass/30 rounded-lg hover:border-brass hover:bg-brass/5 transition-colors group"
                >
                  {CardContent}
                </Link>
              );
            }

            return (
              <div
                key={proto.slug}
                className="block p-6 bg-card/50 border border-border/50 rounded-lg opacity-60 cursor-not-allowed"
              >
                {CardContent}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-card border border-border rounded-lg">
          <h3 className="text-sm font-semibold font-display tracking-wider text-brass mb-2">ℹ️ O prototypach</h3>
          <ul className="text-muted-foreground text-sm space-y-1">
            <li>• Prototypy są izolowane - błędy nie wpływają na główną grę</li>
            <li>• Użyj ich do testowania pomysłów przed pełną implementacją</li>
            <li>• Katalog <code className="bg-muted px-1 rounded text-foreground">/prototypes/</code> może być ukryty w produkcji</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
