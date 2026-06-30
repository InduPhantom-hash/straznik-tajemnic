"use client";

import { NewSessionForm } from '@/components/ui/new-session-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewCampaignPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Array<{
    id: string;
    name: string;
    description: string;
    createdAt: string;
    status: string;
  }>>([]);

  const handleClose = () => {
    router.push('/');
  };

  const handleSaveSession = async (sessionName: string, description?: string) => {
    try {
      // Tutaj można dodać logikę zapisywania do API lub localStorage
      const newSession = {
        id: Date.now().toString(),
        name: sessionName,
        description: description || '',
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      setSessions(prev => [...prev, newSession]);

      // Symulacja sukcesu
      console.log('Nowa kampania utworzona:', newSession);

      // Przekieruj do strony kampanii lub głównej
      router.push('/campaigns');

      return true;
    } catch (error) {
      console.error('Błąd podczas tworzenia kampanii:', error);
      return false;
    }
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
        <h1 className="text-3xl font-mono font-bold text-foreground">Rozpocznij Nową Kampanię</h1>
      </div>

      <NewSessionForm onSave={handleSaveSession} onClose={handleClose} />
    </div>
  );
}
