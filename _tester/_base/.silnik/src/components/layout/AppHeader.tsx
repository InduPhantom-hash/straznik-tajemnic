"use client";

import type { FC } from 'react';
import Link from 'next/link';
import { Library, Settings } from 'lucide-react';

export const AppHeader: FC = () => {
  return (
    <div className="h-20 flex items-center justify-center border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm">
      <h1 className="text-3xl font-mono font-bold text-foreground tracking-wide drop-shadow-sm">
        Zew Cthulhu
      </h1>
    </div>
  );
};

export const AppNavigation: FC = () => {
  return (
    <nav className="flex-1 px-6 py-8 space-y-3">
      <Link
        href="/"
        className="flex items-center px-4 py-3 text-foreground/80 rounded-xl hover:bg-primary/10 hover:text-foreground transition-all group border border-transparent hover:border-primary/20 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105"
      >
        <Library className="h-5 w-5 mr-3 text-primary/60 group-hover:text-primary transition-colors" />
        <span className="font-medium font-mono">Pulpit</span>
      </Link>
      <Link
        href="/settings"
        className="flex items-center px-4 py-3 text-foreground/80 rounded-xl hover:bg-primary/10 hover:text-foreground transition-all group border border-transparent hover:border-primary/20 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105"
      >
        <Settings className="h-5 w-5 mr-3 text-primary/60 group-hover:text-primary transition-colors" />
        <span className="font-medium font-mono">Ustawienia AI</span>
      </Link>
    </nav>
  );
};
