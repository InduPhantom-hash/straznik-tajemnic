import { notFound } from 'next/navigation';

/**
 * Catch-all pod segmentem [locale]: dowolny nieznany URL w obrębie lokalizacji
 * trafia tu i wywola notFound(), co renderuje [locale]/not-found.tsx z poprawnym
 * locale (zamiast rootowego not-found z hardcode'owanym tekstem).
 */
export default function LocaleCatchAllPage() {
  notFound();
}
