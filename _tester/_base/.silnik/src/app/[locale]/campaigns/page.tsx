"use client";

import { SessionList } from '@/components/ui/session-list';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CampaignsPage() {
  const handleLoadSession = (sessionId: string) => {
    console.log('Loading session:', sessionId);
    // Tutaj można dodać logikę ładowania sesji
  };

  const handleDeleteSession = (sessionId: string) => {
    console.log('Deleting session:', sessionId);
    // Tutaj można dodać logikę usuwania sesji
  };

  const handleClose = () => {
    // Funkcja zamykania - nie używana w tej implementacji strony
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="p-2 hover:bg-primary/10 rounded-md transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-mono font-bold text-foreground">Kampanie</h1>
      </div>

      <SessionList 
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onClose={handleClose}
      />
    </div>
  );
}
