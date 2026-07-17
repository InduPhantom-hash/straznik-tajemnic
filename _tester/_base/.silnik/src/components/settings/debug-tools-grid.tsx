import Link from 'next/link';
import { Bug, Volume2, Image, MessageSquare, Database } from 'lucide-react';

export function DebugToolsGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      <Link
        href="/debug-tts"
        className="flex flex-col items-center gap-1 p-3 border border-brass/30 bg-[#16130f] hover:border-brass/60 hover:bg-brass/[0.06] transition-colors"
      >
        <Volume2 className="w-5 h-5 text-brass" />
        <span className="text-xs text-center font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
          TTS Debug
        </span>
      </Link>

      <Link
        href="/debug-images"
        className="flex flex-col items-center gap-1 p-3 border border-brass/30 bg-[#16130f] hover:border-brass/60 hover:bg-brass/[0.06] transition-colors"
      >
        <Image className="w-5 h-5 text-brass" />
        <span className="text-xs text-center font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
          Images Debug
        </span>
      </Link>

      <Link
        href="/debug-chat"
        className="flex flex-col items-center gap-1 p-3 border border-brass/30 bg-[#16130f] hover:border-brass/60 hover:bg-brass/[0.06] transition-colors"
      >
        <MessageSquare className="w-5 h-5 text-brass" />
        <span className="text-xs text-center font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
          Chat Debug
        </span>
      </Link>

      <Link
        href="/debug-cache"
        className="flex flex-col items-center gap-1 p-3 border border-brass/30 bg-[#16130f] hover:border-brass/60 hover:bg-brass/[0.06] transition-colors"
      >
        <Database className="w-5 h-5 text-brass" />
        <span className="text-xs text-center font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
          Cache Debug
        </span>
      </Link>

      <Link
        href="/debug"
        className="flex flex-col items-center gap-1 p-3 border border-brass/40 bg-[#1a1610] hover:border-brass/70 hover:bg-brass/[0.08] transition-colors"
      >
        <Bug className="w-5 h-5 text-gold" />
        <span className="text-xs text-center font-special-elite uppercase tracking-[0.08em] text-foreground/80">
          Debug Hub
        </span>
      </Link>
    </div>
  );
}
