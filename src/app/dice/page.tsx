"use client";

import { DiceSystem } from '@/components/ui/dice-system';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DicePage() {
  const router = useRouter();
  const [rolls, setRolls] = useState<any[]>([]);

  const handleClose = () => {
    router.push('/');
  };

  const handleRollComplete = (roll: any) => {
    setRolls(prev => [roll, ...prev]);
    console.log('Rzut kości wykonany:', roll);
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
        <h1 className="text-3xl font-mono font-bold text-foreground">System Kości</h1>
      </div>

      <DiceSystem onRollComplete={handleRollComplete} onClose={handleClose} />
    </div>
  );
}
