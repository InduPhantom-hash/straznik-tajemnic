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
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Plus, Search, BookOpen, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// FEATURE:#11 - Data przygodowa w dzienniku
interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: Date;
  inGameDate?: string; // Data w przygodzie, np. "12 grudnia 1925"
  tags: string[];
  involvedCharacter?: string; // Nazwa postaci której dotyczy wpis
}

interface JournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters?: { id: string; name: string }[]; // Lista postaci do wyboru
}

export const JournalDialog: FC<JournalDialogProps> = ({
  open,
  onOpenChange,
  characters = [],
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: '1',
      title: 'Pierwsze spotkanie z profesorem Armitage',
      content:
        'Profesor Armitage wydawał się bardzo zaniepokojony. Mówił o dziwnych wydarzeniach w bibliotece Miskatonic. Wspomniał o zaginionych książkach i dziwnych dźwiękach dochodzących z piwnic. Jego ręce drżały, gdy pokazywał mi pożółkłe strony z dziennikiem Wilbura Whateleya.',
      date: new Date('2025-09-17'),
      tags: ['Arkham', 'Biblioteka', 'Profesor Armitage'],
    },
    {
      id: '2',
      title: 'Odkrycie w piwnicach biblioteki',
      content:
        'W piwnicach znaleźliśmy dziwne symbole na ścianach. Wyglądały na bardzo stare, prawdopodobnie z czasów założenia uniwersytetu. Dr. Nojks rozpoznała niektóre z nich jako pochodzące z kultów starożytnych.',
      date: new Date('2025-09-16'),
      tags: ['Piwnice', 'Symbole', 'Kulty'],
      involvedCharacter: 'Helena Nowak',
    },
    {
      id: '3',
      title: 'Nocna wizyta w Innsmouth',
      content:
        'Nigdy nie zapomnę tego, co zobaczyłem na nadbrzeżu. Postacie przemykające między magazynami, ich dziwny, kołyszący chód. Zapach słonej wody i czegoś... gnijącego. Mieszkańcy patrzyli na mnie z wrogością, a ich oczy... Boże, te oczy były zbyt duże, zbyt rybiej formy.',
      date: new Date('2025-09-15'),
      tags: ['Innsmouth', 'Nadbrzeże', 'Dziwni mieszkańcy'],
      involvedCharacter: 'Edward Kowalski',
    },
    {
      id: '4',
      title: 'List od doktora Morgana',
      content:
        'Otrzymałem niepokojący list od dr. Morgana z sanatorium Arkham. Pisze o pacjencie, który mówi w nieznanym języku i rysuje na ścianach te same symbole, które widzieliśmy w piwnicach. Pacjent twierdzi, że \\"Oni nadchodzą ze gwiazd\\" i że \\"bramy zostaną otwarte\\". Muszę go odwiedzić.',
      date: new Date('2025-09-14'),
      tags: ['Sanatorium Arkham', 'Dr. Morgan', 'Przepowiednia'],
    },
    {
      id: '5',
      title: 'Starożytny rytuał pod Bolton',
      content:
        'Podążając za wskazówkami z dziennika Whateleya, dotarliśmy do kamiennego kręgu na wzgórzach koło Bolton. Znaki na kamieniach pulsowały słabym, zielonkawym światłem kiedy zbliżył się zmierzch. Jeden z nas zemdlał i mówił przez sen w języku, którego nikt nie rozpoznał. Musimy wrócić przy pełni księżyca.',
      date: new Date('2025-09-13'),
      tags: ['Bolton', 'Kamienny krąg', 'Rytuał', 'Whateley'],
      involvedCharacter: 'Helena Nowak',
    },
    {
      id: '6',
      title: 'Tajemnica zegara w ratuszu',
      content:
        'Miejscowi mówią, że stary zegar w wieży ratusza zatrzymał się dokładnie o 3:33 w nocy, kiedy zaginął burmistrz Harrington. Od tamtej pory nikt nie ośmiela się go naprawić. Słyszałem dziwne dźwięki dobiegające z wieży - jakby ktoś chodził tam w środku nocy.',
      date: new Date('2025-09-12'),
      tags: ['Ratusz', 'Zegar', 'Burmistrz Harrington', 'Zaginięcie'],
    },
    {
      id: '7',
      title: 'Przesłuchanie Josepha Curwena',
      content:
        'Joseph Curwen, antykwariusz z Salem, zgodził się odpowiedzieć na nasze pytania. Jego sklep pełen był zakurzonych tomów i dziwnych artefaktów. Kiedy zapytałem o Necronomicon, pobladł i kazał mi natychmiast wyjść. Zanim zamknął drzwi, szepnął: \\"Niektóra wiedza kosztuje więcej niż rozum.\\"',
      date: new Date('2025-09-11'),
      tags: ['Salem', 'Antykwariat', 'Joseph Curwen', 'Necronomicon'],
    },
    {
      id: '8',
      title: "Sen o R'lyeh",
      content:
        "Trzecią noc z rzędu śniłem o zatopionej metropolii. Cyklopowe mury z ciemnego kamienia, niemożliwe kąty architektury, które bolały moje oczy. Na końcu zawsze widzę TO - coś ogromnego, co czeka w ciemności morskich głębin. Budzę się z krzykiem i nie mogę przestać myśleć o słowach: \\\"Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn.\\\"",
      date: new Date('2025-09-10'),
      tags: ['Koszmary', "R'lyeh", 'Cthulhu', 'Wizje'],
      involvedCharacter: 'Edward Kowalski',
    },
  ]);

  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    tags: '',
    involvedCharacter: '',
    inGameDate: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (entry.involvedCharacter &&
        entry.involvedCharacter
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const handleAddEntry = () => {
    if (newEntry.title && newEntry.content) {
      const entry: JournalEntry = {
        id: Date.now().toString(),
        title: newEntry.title,
        content: newEntry.content,
        date: new Date(),
        inGameDate: newEntry.inGameDate || undefined, // FEATURE:#11
        tags: newEntry.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        involvedCharacter: newEntry.involvedCharacter || undefined,
      };
      setEntries([entry, ...entries]);
      setNewEntry({
        title: '',
        content: '',
        tags: '',
        involvedCharacter: '',
        inGameDate: '',
      });
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="screen">
        {/* Narożniki déco */}
        <span className="pointer-events-none absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-brass/55" />

        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-special-elite text-xs uppercase tracking-[0.32em] text-primary">
                Kronika śledztwa
              </div>
              <DialogTitle className="mt-1 font-display uppercase tracking-[0.1em] text-2xl font-bold text-foreground">
                Dziennik Przygody
              </DialogTitle>
            </div>
            <span className="hidden sm:inline-flex items-center font-special-elite text-xs uppercase tracking-[0.08em] text-primary border border-primary/45 px-3 py-1.5">
              Wpisy · {entries.length}
            </span>
          </div>
          <DialogDescription className="font-serif italic text-muted-foreground">
            Zapisz swoje obserwacje, odkrycia i przemyślenia
          </DialogDescription>
        </DialogHeader>

        {/* Separator déco */}
        <div className="flex items-center gap-4 my-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold" />
        </div>

        <div className="flex h-[600px]">
          {/* Lista wpisów - kronika */}
          <div className="w-1/3 border-r border-brass/30 pr-4">
            <div className="space-y-4">
              {/* Wyszukiwarka */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brass/70 w-4 h-4" />
                <Input
                  placeholder="Szukaj w dzienniku..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 font-special-elite"
                />
              </div>

              {/* Przycisk dodawania */}
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full text-[#04110f] bg-primary border border-primary hover:brightness-110 font-display font-semibold uppercase tracking-[0.16em]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nowy wpis
              </Button>

              {/* Oś czasu wpisów */}
              <div className="relative pl-7 max-h-[440px] overflow-y-auto">
                {/* Linia osi czasu déco */}
                <div className="absolute left-[6px] top-1 bottom-1 w-px bg-gradient-to-b from-brass/50 to-brass/10" />

                <div className="space-y-3">
                  {filteredEntries.map((entry) => {
                    const isActive = selectedEntry?.id === entry.id;
                    return (
                      <div
                        key={entry.id}
                        className={`relative border bg-card cursor-pointer transition-colors p-3 ${
                          isActive
                            ? 'border-primary/60 bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                            : 'border-brass/22 hover:border-brass/45'
                        }`}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        {/* Węzeł osi czasu */}
                        <span
                          className={`absolute -left-[26px] top-4 w-2.5 h-2.5 rounded-full ${
                            isActive ? 'bg-primary' : 'bg-brass'
                          }`}
                        />
                        <h4 className="font-display text-sm text-foreground mb-1 line-clamp-2 tracking-[0.02em]">
                          {entry.title}
                        </h4>
                        <div className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.08em] text-muted-foreground mb-2">
                          <span>{entry.date.toLocaleDateString('pl-PL')}</span>
                          {entry.involvedCharacter && (
                            <span className="inline-flex items-center gap-1 text-primary border border-primary/40 px-2 py-0.5">
                              <User className="w-3 h-3" />
                              {entry.involvedCharacter}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="font-special-elite text-xs uppercase tracking-[0.04em] text-brass border border-brass/40 px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                          {entry.tags.length > 2 && (
                            <span className="font-special-elite text-xs uppercase tracking-[0.04em] text-muted-foreground border border-brass/25 px-2 py-0.5">
                              +{entry.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Szczegóły wpisu */}
          <div className="flex-1 pl-4">
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  placeholder="Tytuł wpisu..."
                  value={newEntry.title}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, title: e.target.value })
                  }
                  className="font-display"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Tagi (oddzielone przecinkami)..."
                    value={newEntry.tags}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, tags: e.target.value })
                    }
                    className="flex-1 font-special-elite"
                  />
                  {/* FEATURE:#11 - Data przygodowa */}
                  <Input
                    placeholder="Data w przygodzie np. 12.12.1925"
                    value={newEntry.inGameDate}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, inGameDate: e.target.value })
                    }
                    className="w-40 font-special-elite"
                  />
                  {characters.length > 0 && (
                    <Select
                      value={newEntry.involvedCharacter || 'all'}
                      onValueChange={(v) =>
                        setNewEntry({
                          ...newEntry,
                          involvedCharacter: v === 'all' ? '' : v,
                        })
                      }
                    >
                      <SelectTrigger className="w-48">
                        <User className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Wszyscy gracze" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">👥 Wszyscy gracze</SelectItem>
                        {characters.map((char) => (
                          <SelectItem key={char.id} value={char.name}>
                            👤 {char.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Textarea
                  placeholder="Treść wpisu..."
                  value={newEntry.content}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, content: e.target.value })
                  }
                  className="min-h-[300px] font-serif"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddEntry}
                    className="text-[#04110f] bg-primary border border-primary hover:brightness-110 font-display font-semibold uppercase tracking-[0.16em]"
                  >
                    Zapisz
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="text-muted-foreground border-brass/30 hover:border-brass/60 hover:text-brass font-display font-semibold uppercase tracking-[0.16em]"
                  >
                    Anuluj
                  </Button>
                </div>
              </div>
            ) : selectedEntry ? (
              <div className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-6 space-y-4">
                {/* Narożniki déco karty wpisu */}
                <span className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/50" />
                <span className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/50" />
                <div>
                  <h3 className="font-display uppercase tracking-[0.08em] text-xl font-bold text-foreground mb-3">
                    {selectedEntry.title}
                  </h3>
                  <div className="flex items-center gap-3 font-special-elite text-xs uppercase tracking-[0.1em] mb-4">
                    {/* FEATURE:#11 - Data przygodowa */}
                    {selectedEntry.inGameDate && (
                      <span className="text-primary">
                        📅 {selectedEntry.inGameDate}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {selectedEntry.date.toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    {selectedEntry.involvedCharacter && (
                      <span className="inline-flex items-center gap-1 text-primary border border-primary/40 px-2 py-0.5">
                        <User className="w-3 h-3" />
                        {selectedEntry.involvedCharacter}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedEntry.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="font-special-elite text-xs uppercase tracking-[0.04em] text-brass border border-brass/40 px-2.5 py-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Separator className="bg-brass/30" />
                <div className="max-w-none">
                  <p className="font-serif text-foreground leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedEntry.content}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <BookOpen className="w-16 h-16 text-brass/50 mb-4" />
                <h3 className="font-display uppercase tracking-[0.1em] text-lg font-bold text-foreground mb-2">
                  Wybierz wpis z kroniki
                </h3>
                <p className="font-serif italic text-muted-foreground">
                  Kliknij na wpis po lewej stronie, aby go przeczytać
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Separator déco */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold" />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 text-muted-foreground bg-brass/[0.04] border border-brass/45 hover:bg-brass/10 hover:text-brass font-display font-semibold uppercase tracking-[0.16em]"
            onClick={() => onOpenChange(false)}
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
