"use client";

import { NewSessionForm } from '@/components/ui/new-session-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function NewCampaignPage() {
  const router = useRouter();
  const t = useTranslations('Page');
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
      
      const newSession = {
        id: Date.now().toString(),
        name: sessionName,
        description: description || '',
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      setSessions(prev => [...prev, newSession]);

      
      console.log('New campaign created:', newSession);


      router.push('/campaigns');

      return true;
    } catch (error) {
      console.error('Failed to create campaign:', error);
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
        <h1 className="text-3xl font-mono font-bold text-foreground">{t('newCampaignTitle')}</h1>
      </div>

      <NewSessionForm onSave={handleSaveSession} onClose={handleClose} />
    </div>
  );
}