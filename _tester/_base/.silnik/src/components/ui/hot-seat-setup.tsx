'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

type PlayMode = 'solo' | 'duet';

interface HotSeatSetupProps {
  open: boolean;
  onClose: () => void;
  onChooseSolo: (player1Name: string) => void;
  onStartHotSeat: (player1Name: string, player2Name: string) => void;
}

/**
 * Modal wyboru trybu gry: Solo (1 osoba) lub Duet (2 osoby przy jednej klawiaturze).
 * Postaci NIE wybiera się tutaj - binding postaci do graczy to osobna faza.
 */
export function HotSeatSetup({
  open,
  onClose,
  onChooseSolo,
  onStartHotSeat,
}: HotSeatSetupProps) {
  const [mode, setMode] = useState<PlayMode>('solo');
  const [player1Name, setPlayer1Name] = useState('Gracz 1');
  const [player2Name, setPlayer2Name] = useState('Gracz 2');

  const canStart =
    mode === 'solo'
      ? !!player1Name.trim()
      : !!player1Name.trim() && !!player2Name.trim();

  const handleStart = () => {
    if (!canStart) return;
    if (mode === 'solo') {
      onChooseSolo(player1Name.trim());
    } else {
      onStartHotSeat(player1Name.trim(), player2Name.trim());
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="wide">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            🎮 Tryb gry
          </DialogTitle>
          <DialogDescription>
            Grasz sam czy we dwoje przy jednej klawiaturze?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Przełącznik trybu */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('solo')}
              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-colors ${
                mode === 'solo'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-border hover:border-emerald-500/50'
              }`}
            >
              <span className="text-base font-semibold">
                {mode === 'solo' ? '◉' : '○'} Solo
              </span>
              <span className="text-xs text-muted-foreground">1 osoba</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('duet')}
              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-colors ${
                mode === 'duet'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-border hover:border-emerald-500/50'
              }`}
            >
              <span className="text-base font-semibold">
                {mode === 'duet' ? '◉' : '○'} Duet
              </span>
              <span className="text-xs text-muted-foreground">2 osoby</span>
            </button>
          </div>

          {/* Gracz 1 */}
          <div
            className="space-y-3 p-4 rounded-lg border-2"
            style={{ borderColor: '#4ade80' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: '#4ade80' }}
              />
              <Label className="text-base font-semibold">
                {mode === 'duet' ? 'Gracz 1' : 'Gracz'}
              </Label>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Imię gracza
              </Label>
              <Input
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                placeholder="np. Kasia"
                className="mt-1"
              />
            </div>
          </div>

          {/* Gracz 2 - tylko w duecie */}
          {mode === 'duet' && (
            <div
              className="space-y-3 p-4 rounded-lg border-2"
              style={{ borderColor: '#f472b6' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: '#f472b6' }}
                />
                <Label className="text-base font-semibold">Gracz 2</Label>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Imię gracza
                </Label>
                <Input
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  placeholder="np. Tomek"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Info */}
          {mode === 'duet' && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 Kliknij na pasek u góry ekranu aby zmienić gracza.</p>
              <p>💡 Aktywny gracz widzi kolorową ramkę wokół UI.</p>
            </div>
          )}

          {/* Przyciski */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button
              onClick={handleStart}
              disabled={!canStart}
              className="bg-gradient-to-r from-green-500 to-pink-500 hover:from-green-600 hover:to-pink-600"
            >
              🎮 Rozpocznij
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default HotSeatSetup;
