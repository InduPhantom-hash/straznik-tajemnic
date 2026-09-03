'use client';

import Link from 'next/link';
import { Beaker, Dices, Brain, ArrowLeft, Film } from 'lucide-react';
import { useTranslations } from 'next-intl';

type PrototypeStatus = 'ready' | 'wip' | 'planned';

interface Prototype {
  name: string;
  slug: string;
  description: string;
  icon: typeof Brain;
  status: PrototypeStatus;
}

export default function PrototypesIndex() {
  const t = useTranslations('Page');

  const prototypes: Prototype[] = [
    {
      name: 'Cutscene Player',
      slug: 'cutscene',
      description: t('cutsceneDescription'),
      icon: Film,
      status: 'ready',
    },
    {
      name: 'Dice 3D',
      slug: 'dice-3d',
      description: t('dice3dDescription'),
      icon: Dices,
      status: 'planned',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('backToGame')}
        </Link>

        <h1 className="text-3xl font-bold text-emerald-500 flex items-center gap-3 mb-2">
          <Beaker className="w-8 h-8" />
          {t('key1')}
        </h1>
        <p className="text-zinc-400 mb-8">{t('headerDescription')}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {prototypes.map((proto) => {
            const isReady = proto.status === 'ready';
            const statusLabel =
              proto.status === 'ready'
                ? t('statusReady')
                : proto.status === 'wip'
                ? t('statusWip')
                : t('statusPlanned');
            const CardContent = (
              <div className="flex items-start gap-4">
                <proto.icon
                  className={`w-10 h-10 ${
                    isReady ? 'text-emerald-500 group-hover:scale-110' : 'text-zinc-600'
                  } transition-transform`}
                />
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    {proto.name}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        proto.status === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : proto.status === 'wip'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">{proto.description}</p>
                </div>
              </div>
            );

            if (isReady) {
              return (
                <Link
                  key={proto.slug}
                  href={`/prototypes/${proto.slug}`}
                  className="block p-6 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-emerald-500/50 transition-colors group"
                >
                  {CardContent}
                </Link>
              );
            }

            return (
              <div
                key={proto.slug}
                className="block p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-lg opacity-60 cursor-not-allowed"
              >
                {CardContent}
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">{t('aboutPrototypesTitle')}</h3>
          <ul className="text-zinc-500 text-sm space-y-1">
            <li>• {t('aboutPrototypesItem1')}</li>
            <li>• {t('aboutPrototypesItem2')}</li>
            <li>
              • {t('aboutPrototypesItem3Part1')}{' '}
              <code className="bg-zinc-800 px-1 rounded">/prototypes/</code>{' '}
              {t('aboutPrototypesItem3Part2')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
