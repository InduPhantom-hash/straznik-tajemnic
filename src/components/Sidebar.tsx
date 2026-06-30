// src/components/Sidebar.tsx
import { BookUser, Swords, Settings, Library } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { name: 'Pulpit', icon: Library, href: '/' },
  { name: 'Ustawienia AI', icon: Settings, href: '/settings' },
  // Ukryte funkcje - komentowane ale nie usunięte
  // { name: 'Postacie', icon: BookUser, href: '/characters' },
  // { name: 'Kampanie', icon: Swords, href: '/campaigns' },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-border">
        <h1 className="text-2xl font-mono text-foreground">Zew Cthulhu</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center px-4 py-2 text-foreground/80 rounded-md hover:bg-primary/10 hover:text-foreground transition-colors group"
          >
            <item.icon className="h-5 w-5 mr-3 text-primary/60 group-hover:text-primary" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};
