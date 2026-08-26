"use client";

import { SettingsModal } from '@/components/ui/settings-modal';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-primary/10 rounded-md transition-colors text-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-4xl font-mono font-bold text-foreground">⚙️ Ustawienia</h1>
        </div>

        <SettingsModal open={true} onClose={handleClose} />
      </div>
    </div>
  );
}
