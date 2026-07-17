"use client";

import { Card } from './card';
import { BookOpen, X } from 'lucide-react';
import { Button } from './button';

interface QuickReferencesProps {
  onClose?: () => void;
  pdfRulesAvailable?: boolean; // Czy są dostępne zasady z PDF
}

export function QuickReferences({
  onClose,
  pdfRulesAvailable = false
}: QuickReferencesProps) {

  return (
    <Card className="bg-card border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground font-mono">📚 Quick References</h2>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Zasady gry powinny być załadowane z pliku PDF w sekcji Dokumenty
        </p>
      </div>

      <div className="p-12 text-center">
        <BookOpen className="w-24 h-24 mx-auto mb-6 opacity-30 text-muted-foreground" />
        <h3 className="text-xl font-semibold text-foreground mb-4">
          Brak załadowanych zasad
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Aby korzystać z Quick References, załaduj plik PDF z zasadami gry w sekcji Dokumenty. 
          Zasady będą dostępne dla AI podczas prowadzenia sesji.
        </p>
        {pdfRulesAvailable && (
          <p className="text-green-400 text-sm">
            ✓ Plik PDF z zasadami został załadowany i jest dostępny dla AI
          </p>
        )}
      </div>
    </Card>
  );
}

