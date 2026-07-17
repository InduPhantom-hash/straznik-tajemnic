'use client';

import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { ExternalLink, BookOpen, AlertTriangle } from 'lucide-react';

interface StepContentSourcesProps {
  onBack: () => void;
  onNext: () => void;
}

interface Source {
  name: string;
  desc: string;
  url: string;
}

// Plan prawny, warstwa 4: linkujemy do legalnych źródeł, NIE rozprowadzamy plików.
const SOURCES: Source[] = [
  {
    name: 'Black Monk',
    desc: 'Polski wydawca Zew Cthulhu 7e - podręczniki PDF/druk oraz sekcja darmowych materiałów (startery).',
    url: 'https://blackmonk.pl',
  },
  {
    name: 'DriveThruRPG',
    desc: 'Oryginały Call of Cthulhu 7e (EN) w PDF od Chaosium.',
    url: 'https://www.drivethrurpg.com',
  },
];

/**
 * Krok 2 kreatora: skąd legalnie wziąć podręcznik. Czysto linki + disclaimer.
 * Aplikacja nie zawiera ani nie rozprowadza treści Black Monk/Chaosium -
 * gracz korzysta z własnego egzemplarza.
 */
export function StepContentSources({
  onBack,
  onNext,
}: StepContentSourcesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <BookOpen className="w-5 h-5 text-brass mt-0.5 shrink-0" />
        <p>
          Strażnik Tajemnic to <strong>silnik</strong> - sam w sobie nie zawiera
          żadnego podręcznika. Podręcznik wnosisz Ty: pobierz darmowy starter
          albo kup pełne wydanie z legalnego źródła, a w następnym kroku wgraj
          swój plik PDF. Trafi on wyłącznie na Twój dysk.
        </p>
      </div>

      <div className="space-y-2">
        {SOURCES.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-brass/30 hover:border-brass/60 bg-[#1a1610] transition-colors p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground flex items-center gap-1">
                {s.name}
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
          </a>
        ))}
      </div>

      <Card className="bg-amber-900/20 border-amber-500/40">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-200/90">
              Projekt fanowski, niezwiązany i niewspierany przez Chaosium Inc.
              ani Black Monk. <em>Call of Cthulhu</em> / <em>Zew Cthulhu</em> to
              znaki towarowe Chaosium Inc. Korzystaj wyłącznie z własnych,
              legalnie nabytych egzemplarzy.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Wstecz
        </Button>
        <Button className="bg-primary hover:bg-primary/90" onClick={onNext}>
          Mam podręcznik, dalej
        </Button>
      </div>
    </div>
  );
}
