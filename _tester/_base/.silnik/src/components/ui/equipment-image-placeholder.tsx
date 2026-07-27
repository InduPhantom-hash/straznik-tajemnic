import { cn } from '@/lib/utils';
import type { EquipmentCategory } from '@/lib/types';
import {
  Sword,
  FileText,
  Sparkles,
  Wrench,
  Flame,
  HeartPulse,
  User,
  Package,
} from 'lucide-react';

/**
 * Klimatyczny placeholder SVG dla przedmiotów ekwipunku bez wygenerowanej
 * miniatury AI. Wyświetla ikonę kategorii na postarzanym tle z efektem
 * winiety i szumu, spójnym z estetyką Art-Deco / Lovecraft reszty aplikacji.
 *
 * Rozszerzenie istniejącego CategoryIcon z equipment-modal.tsx do pełnego
 * komponentu wizualnego placeholder.
 */

const CATEGORY_VISUALS: Record<
  string,
  { Icon: typeof Sword; gradient: string; accent: string; label: string }
> = {
  weapon: {
    Icon: Sword,
    gradient: 'from-[#2a1510] to-[#120a07]',
    accent: 'text-red-400/60',
    label: 'Bron',
  },
  document: {
    Icon: FileText,
    gradient: 'from-[#1a1812] to-[#0d0b07]',
    accent: 'text-amber-400/60',
    label: 'Dokument',
  },
  artifact: {
    Icon: Sparkles,
    gradient: 'from-[#1a1020] to-[#0a0710]',
    accent: 'text-purple-400/60',
    label: 'Artefakt',
  },
  tool: {
    Icon: Wrench,
    gradient: 'from-[#151a12] to-[#0a0d07]',
    accent: 'text-emerald-400/60',
    label: 'Narzedzie',
  },
  occult: {
    Icon: Flame,
    gradient: 'from-[#201015] to-[#10070a]',
    accent: 'text-rose-400/60',
    label: 'Okultyzm',
  },
  medical: {
    Icon: HeartPulse,
    gradient: 'from-[#121a1a] to-[#070d0d]',
    accent: 'text-teal-400/60',
    label: 'Medycyna',
  },
  personal: {
    Icon: User,
    gradient: 'from-[#1a1715] to-[#0d0b0a]',
    accent: 'text-brass/60',
    label: 'Osobiste',
  },
  armor: {
    Icon: Package,
    gradient: 'from-[#18160f] to-[#0c0b07]',
    accent: 'text-yellow-400/60',
    label: 'Ochrona',
  },
};

const DEFAULT_VISUAL = {
  Icon: Package,
  gradient: 'from-[#181510] to-[#0c0a07]',
  accent: 'text-brass/50',
  label: 'Przedmiot',
};

interface EquipmentImagePlaceholderProps {
  category: EquipmentCategory | string;
  itemName?: string;
  className?: string;
}

export function EquipmentImagePlaceholder({
  category,
  itemName,
  className,
}: EquipmentImagePlaceholderProps) {
  const visual = CATEGORY_VISUALS[category] || DEFAULT_VISUAL;
  const { Icon, gradient, accent, label } = visual;

  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center overflow-hidden',
        `bg-gradient-to-br ${gradient}`,
        className
      )}
    >
      {/* Szum / tekstura pergaminu */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Winieta */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 0 80px 30px rgba(0,0,0,0.6)',
      }} />

      {/* Ikona kategorii */}
      <div className="relative flex flex-col items-center gap-3 select-none">
        <Icon className={cn('w-16 h-16 drop-shadow-lg', accent)} strokeWidth={1} />
        <span className="font-special-elite text-[10px] uppercase tracking-[0.3em] text-[#8a7667]/70">
          {label}
        </span>
      </div>

      {/* Dekoracyjna ramka wewnetrzna */}
      <div className="absolute inset-3 border border-brass/10 pointer-events-none" />

      {/* Subtelna nazwa przedmiotu na dole */}
      {itemName && (
        <div className="absolute bottom-3 left-4 right-4 text-center">
          <span className="font-serif text-[11px] italic text-[#8a7667]/50 line-clamp-1">
            {itemName}
          </span>
        </div>
      )}
    </div>
  );
}
