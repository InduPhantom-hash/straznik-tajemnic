"use client";

import { Journal, JournalEntry } from '@/components/ui/journal';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const handleClose = () => {
    router.push('/');
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
        <h1 className="text-3xl font-mono font-bold text-foreground">Dziennik Gracza</h1>
      </div>

      <Journal entries={entries} onEntriesChange={setEntries} onClose={handleClose} />
    </div>
  );
}
