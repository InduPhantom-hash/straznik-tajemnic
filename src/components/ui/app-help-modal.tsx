'use client';

import type { FC } from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_HELP_DATA, HelpCategory } from '@/lib/data/app-help-data';
import {
  Layout,
  Bot,
  Sparkles,
  User,
  BookOpen,
  Dices,
  Package,
  ShieldCheck,
  Heart,
  MessageSquare,
  Compass,
  ExternalLink,
  HelpCircle,
  X
} from 'lucide-react';
import { Button } from './button';

interface AppHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICON_MAP: Record<string, FC<{ className?: string }>> = {
  Layout,
  Bot,
  Sparkles,
  User,
  BookOpen,
  Dices,
  Package,
  ShieldCheck,
  Heart,
  MessageSquare,
  Compass,
  ExternalLink,
};

export const AppHelpModal: FC<AppHelpModalProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState<'ui' | 'ai-gm' | 'player-guide'>('ui');

  const renderIcon = (name?: string, className: string = 'w-5 h-5') => {
    if (!name || !ICON_MAP[name]) return <HelpCircle className={className} />;
    const IconComp = ICON_MAP[name];
    return <IconComp className={className} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[92vw] max-h-[88vh] flex flex-col p-0 bg-[#0d0f12] text-amber-100 border-amber-900/60 shadow-2xl overflow-hidden rounded-xl">
        {/* Nagłówek Art Déco */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-[#14181d] via-[#1a2027] to-[#14181d] border-b border-amber-900/40 relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-600/30 text-amber-400 shadow-inner">
              <HelpCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-serif tracking-wider text-amber-200 flex items-center gap-2">
                Encyklopedia Aplikacji & Przewodnik Gracza
              </DialogTitle>
              <p className="text-xs text-amber-400/70 mt-0.5 font-sans">
                Dowiedz się jak korzystać z interfejsu, jak działa Wirtualny Strażnik i jak budować niepowtarzalny klimat.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Zawartość modalu z zakładkami */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'ui' | 'ai-gm' | 'player-guide')}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Nawigacja Zakładek */}
          <div className="px-5 pt-3 bg-[#111418] border-b border-amber-900/30">
            <TabsList className="bg-amber-950/40 border border-amber-900/40 p-1 rounded-lg grid grid-cols-3 gap-1">
              {APP_HELP_DATA.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-serif transition-all data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200 data-[state=active]:border-amber-600/40 data-[state=active]:shadow"
                >
                  {renderIcon(category.icon, 'w-4 h-4 text-amber-400')}
                  <span className="truncate">{category.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Treść Zakładek */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-gradient-to-b from-[#0e1115] to-[#0a0c0e]">
            {APP_HELP_DATA.map((category: HelpCategory) => (
              <TabsContent key={category.id} value={category.id} className="mt-0 space-y-5 outline-none">
                <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/30 text-xs text-amber-300/80 leading-relaxed font-sans">
                  {category.description}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-[#13171c]/90 border border-amber-900/40 hover:border-amber-700/50 transition-all shadow-md flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start gap-3 mb-2.5">
                          <div className="p-2 rounded-md bg-amber-950/80 border border-amber-800/40 text-amber-400 group-hover:text-amber-300 transition-colors shrink-0">
                            {renderIcon(item.iconName, 'w-4 h-4')}
                          </div>
                          <div>
                            <h4 className="text-sm font-serif font-semibold text-amber-200 tracking-wide">
                              {item.title}
                            </h4>
                            {item.subtitle && (
                              <p className="text-[11px] text-amber-500/80 font-sans mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-amber-100/75 leading-relaxed font-sans mb-3">
                          {item.description}
                        </p>

                        {item.bulletPoints && item.bulletPoints.length > 0 && (
                          <ul className="space-y-1.5 my-2">
                            {item.bulletPoints.map((pt, idx) => (
                              <li key={idx} className="text-[11px] text-amber-300/90 flex items-start gap-2 leading-tight">
                                <span className="text-amber-500 font-bold select-none">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {/* Stopka Modalu */}
        <div className="p-3.5 px-5 bg-[#12151a] border-t border-amber-900/40 flex items-center justify-between">
          <span className="text-[11px] text-amber-500/70 font-mono">
            Strażnik Tajemnic v4.0 • System Call of Cthulhu 7E
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-amber-900/60 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 text-xs px-4"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
