import { NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/auth-user';
import { getUserUsage, resetUserUsage, BUDGET_USD } from '@/lib/user-usage';

/**
 * Odczyt/reset licznika zużycia per-konto (IND-168 Faza 6, tryb wielokontowy).
 *
 * `userId` pochodzi z zalogowanej sesji Clerk (`resolveUserId`, bezpieczne
 * źródło). Trasa chroniona bramką Clerk (proxy.ts) - gdy Clerk włączony,
 * niezalogowany request nie dotrze tu (auth.protect). Gdy Clerk wyłączony (dev),
 * `resolveUserId` zwraca 'local' - zachowanie single-instance bez zmian.
 *
 * Rejestracja zużycia (POST) NIE istnieje - liczniki karmione są wyłącznie
 * server-side z punktów generacji (chat/imagen/tts), nie z przeglądarki, więc
 * klient nie może zafałszować budżetu.
 */

/** GET - status budżetu konta (akumulator + limit $10). */
export async function GET() {
  try {
    const userId = await resolveUserId('local');
    const usage = await getUserUsage(userId);
    return NextResponse.json({ success: true, usage, budgetUsd: BUDGET_USD });
  } catch (error) {
    console.error('❌ Błąd odczytu zużycia konta:', error);
    return NextResponse.json(
      {
        error: 'Nie udało się odczytać zużycia konta',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/** DELETE - wyzeruj licznik zużycia konta (ścieżka Pełnego Resetu). */
export async function DELETE() {
  try {
    const userId = await resolveUserId('local');
    const deleted = await resetUserUsage(userId);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('❌ Błąd resetu zużycia konta:', error);
    return NextResponse.json(
      {
        error: 'Nie udało się wyzerować zużycia konta',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
