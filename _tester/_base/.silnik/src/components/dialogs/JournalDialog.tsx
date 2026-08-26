'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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

interface JournalSampleSeed {
  id: string;
  title: string;
  content: string;
  date: string; // ISO
  tags: string[];
  involvedCharacter?: string;
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
  const t = useTranslations('JournalDialog');
  const locale = useLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'pl-PL';

  // Przykładowa kronika (seed demo) - tresci w messages/*.json per jezyk.
  const samples = t.raw('samples') as JournalSampleSeed[];
  const [entries, setEntries] = useState<JournalEntry[]>(() =>
    samples.map((s) => ({
      ...s,
      date: new Date(s.date),
    }))
  );

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
                {t('eyebrow')}
              </div>
              <DialogTitle className="mt-1 font-display uppercase tracking-[0.1em] text-2xl font-bold text-foreground">
                {t('title')}
              </DialogTitle>
            </div>
            <span className="hidden sm:inline-flex items-center font-special-elite text-xs uppercase tracking-[0.08em] text-primary border border-primary/45 px-3 py-1.5">
              {t('entriesBadge', { count: entries.length })}
            </span>
          </div>
          <DialogDescription className="font-serif italic text-muted-foreground">
            {t('description')}
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
                  placeholder={t('searchPlaceholder')}
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
                {t('newEntry')}
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
                          <span>{entry.date.toLocaleDateString(intlLocale)}</span>
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
                  placeholder={t('titlePlaceholder')}
                  value={newEntry.title}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, title: e.target.value })
                  }
                  className="font-display"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder={t('tagsPlaceholder')}
                    value={newEntry.tags}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, tags: e.target.value })
                    }
                    className="flex-1 font-special-elite"
                  />
                  {/* FEATURE:#11 - Data przygodowa */}
                  <Input
                    placeholder={t('datePlaceholder')}
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
                        <SelectValue placeholder={t('allPlayers')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">👥 {t('allPlayers')}</SelectItem>
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
                  placeholder={t('contentPlaceholder')}
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
                    {t('save')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="text-muted-foreground border-brass/30 hover:border-brass/60 hover:text-brass font-display font-semibold uppercase tracking-[0.16em]"
                  >
                    {t('cancel')}
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
                      {selectedEntry.date.toLocaleDateString(intlLocale, {
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
                  {t('selectEntryTitle')}
                </h3>
                <p className="font-serif italic text-muted-foreground">
                  {t('selectEntryHint')}
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
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
