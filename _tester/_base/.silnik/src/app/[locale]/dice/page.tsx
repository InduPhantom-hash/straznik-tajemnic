"use client";

import { DiceSystem, type DiceRoll } from '@/components/ui/dice-system';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function DicePage() {
  const router = useRouter();
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const t = useTranslations('Page');

  const handleClose = () => {
    router.push('/');
  };

  const handleRollComplete = (roll: DiceRoll) => {
    setRolls(prev => [roll, ...prev]);
    console.log(t('rollCompletedLog'), roll);
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
        <h1 className="text-3xl font-mono font-bold text-foreground">{t('diceSystemTitle')}</h1>
      </div>

      <DiceSystem onRollComplete={handleRollComplete} onClose={handleClose} />
    </div>
  );
}