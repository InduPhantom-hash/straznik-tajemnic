import type { ReactNode } from 'react';
import { CampaignClock } from '@/components/ui/campaign-clock';

interface ChatLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  modals: ReactNode;
}

export function ChatLayout({ children, sidebar, modals }: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"></div>
      </div>

      {/* Campaign Clock - Moved to ChatWindow header to avoid Sidebar overlap */}

      {/* Główny Panel - Czat */}
      <main className="flex-1 overflow-hidden relative z-10">{children}</main>

      {/* Sidebar - zawsze zamontowany (hostuje modale Sesja Zero / Wybór przygody
          i rejestruje ich funkcje otwierania). Na welcome ukrywa tylko swój panel
          wizualny wewnętrznie (hideSidebarPanel), więc welcome jest na całe okno. */}
      {sidebar}

      {/* Modals and Overlays */}
      {modals}
    </div>
  );
}
