import type { ReactNode } from "react";
import { CampaignClock } from "@/components/ui/campaign-clock";
import { SubtreeErrorBoundary } from "@/components/ui/subtree-error-boundary";

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

      {/* Główny Panel - Czat z granicą izolacji awarii */}
      <main className="flex-1 overflow-hidden relative z-10">
        <SubtreeErrorBoundary componentName="ChatWindow" fallbackTitle="Błąd widoku czatu">
          {children}
        </SubtreeErrorBoundary>
      </main>

      {/* Sidebar - z granicą izolacji awarii */}
      <SubtreeErrorBoundary componentName="CthulhuSidebar" fallbackTitle="Błąd panelu bocznego">
        {sidebar}
      </SubtreeErrorBoundary>

      {/* Modals and Overlays */}
      <SubtreeErrorBoundary componentName="ModalsLayer" fallbackTitle="Błąd warstwy modalnej">
        {modals}
      </SubtreeErrorBoundary>
    </div>
  );
}
