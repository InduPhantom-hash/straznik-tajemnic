'use client';

import type { FC } from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Character } from '@/lib/types';

interface CharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCharacter?: Character;
  characters?: Character[];
  onCharacterSwitch?: (character: Character) => void;
  onCharacterCreate?: () => void;
  onCharacterManage?: () => void;
}

export const CharacterDialog: FC<CharacterDialogProps> = ({
  open,
  onOpenChange,
  activeCharacter,
  characters = [],
  onCharacterSwitch,
  onCharacterCreate,
  onCharacterManage,
}) => {
  const [view, setView] = useState<'list' | 'details'>('list');

  // Aktualnie wyświetlana postać (dla widoku szczegółów)
  const displayedCharacter = activeCharacter;

  // Funkcja do wyboru postaci
  const handleSelectCharacter = (character: Character) => {
    if (onCharacterSwitch) {
      onCharacterSwitch(character);
    }
    onOpenChange(false); // Zamknij dialog po wyborze
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="wide"
        className="bg-gradient-to-b from-card to-background border-2 border-emerald-600/50 shadow-2xl shadow-emerald-500/10"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-special-elite text-foreground text-xl">
            <span className="text-2xl">👤</span>
            {view === 'list' ? 'Zarządzanie Postaciami' : 'Karta Postaci'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {view === 'list'
              ? 'Wybierz postać z listy lub stwórz nową'
              : 'Przeglądaj charakterystyki i umiejętności postaci'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* WIDOK LISTY POSTACI */}
          {view === 'list' && (
            <>
              {/* Aktywna postać (jeśli jest) */}
              {activeCharacter && (
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    Aktywna postać:
                  </div>
                  <Card
                    className="bg-amber-900/20 border-amber-500 cursor-pointer hover:bg-amber-900/30 transition-colors"
                    onClick={() => setView('details')}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-amber-600 text-white">
                          {activeCharacter.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-bold text-foreground">
                          {activeCharacter.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {activeCharacter.occupation}
                        </div>
                      </div>
                      <Badge className="bg-amber-600">Aktywna</Badge>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Lista innych postaci */}
              {characters.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {activeCharacter ? 'Inne postacie:' : 'Dostępne postacie:'}
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {characters
                      .filter((char) => char.id !== activeCharacter?.id)
                      .map((char) => (
                        <Card
                          key={char.id}
                          className="bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSelectCharacter(char)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-muted text-foreground text-sm">
                                {char.name
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium text-foreground">
                                {char.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {char.occupation}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCharacter(char);
                              }}
                            >
                              Wybierz
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Brak postaci */}
              {characters.length === 0 && !activeCharacter && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">👤</div>
                  <p className="text-muted-foreground mb-4">
                    Nie masz jeszcze żadnych postaci
                  </p>
                  <Button
                    onClick={onCharacterCreate}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    ➕ Stwórz pierwszą postać
                  </Button>
                </div>
              )}

              {/* Przyciski akcji */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Zamknij
                </Button>
                <Button
                  onClick={onCharacterCreate}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  ➕ Nowa postać
                </Button>
                {characters.length > 0 && (
                  <Button variant="outline" onClick={onCharacterManage}>
                    Zarządzaj
                  </Button>
                )}
              </div>
            </>
          )}

          {/* WIDOK SZCZEGÓŁÓW POSTACI */}
          {view === 'details' && displayedCharacter && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('list')}
                className="mb-2"
              >
                ← Powrót do listy
              </Button>

              {/* Podstawowe informacje */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-muted text-foreground">
                        {displayedCharacter.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-foreground">
                        {displayedCharacter.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {displayedCharacter.occupation}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Wiek:</span>
                      <p className="text-foreground">
                        {displayedCharacter.age} lat
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PW:</span>
                      <p className="text-foreground">{displayedCharacter.hp}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Poczytalność:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">
                          {displayedCharacter.san}
                        </span>
                        <Progress
                          value={
                            (displayedCharacter.san / displayedCharacter.pow) *
                            100
                          }
                          className="w-16 h-2"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator className="bg-border" />

              {/* Charakterystyki */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Charakterystyki
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        name: 'Siła',
                        value: displayedCharacter.str || 0,
                        max: 100,
                      },
                      {
                        name: 'Zręczność',
                        value: displayedCharacter.dex || 0,
                        max: 100,
                      },
                      {
                        name: 'Kondycja',
                        value: displayedCharacter.con || 0,
                        max: 100,
                      },
                      {
                        name: 'Wygląd',
                        value: displayedCharacter.app || 0,
                        max: 100,
                      },
                      {
                        name: 'Siła Woli',
                        value: displayedCharacter.pow || 0,
                        max: 100,
                      },
                      {
                        name: 'Wykształcenie',
                        value: displayedCharacter.edu || 0,
                        max: 100,
                      },
                      {
                        name: 'Budowa Ciała',
                        value: displayedCharacter.siz || 0,
                        max: 100,
                      },
                      {
                        name: 'Inteligencja',
                        value: displayedCharacter.int || 0,
                        max: 100,
                      },
                      {
                        name: 'Szczęście',
                        value: displayedCharacter.luck || 0,
                        max: 100,
                      },
                    ].map((char) => (
                      <div key={char.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{char.name}</span>
                          <span className="text-foreground">
                            {char.value}/{char.max}
                          </span>
                        </div>
                        <Progress
                          value={(char.value / char.max) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Zamknij
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onCharacterManage}
                >
                  Zarządzaj
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
