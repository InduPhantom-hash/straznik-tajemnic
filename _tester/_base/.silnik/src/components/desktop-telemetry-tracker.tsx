'use client';

import { useEffect } from 'react';

/**
 * Globalny monitor błędów po stronie klienta (Zero-dependency).
 * Przechwytuje nieobsłużone wyjątki skryptów i odrzucone obietnice w przeglądarce,
 * przesyłając je do lokalnego endpointu telemetrycznego /api/desktop/telemetry,
 * skąd trafiają prosto do pliku logu sesji (session-*.log).
 */
export function DesktopTelemetryTracker() {
  useEffect(() => {
    const sendTelemetry = (payload: {
      level: 'ERROR' | 'WARN' | 'INFO';
      message: string;
      details?: Record<string, unknown> | null;
    }) => {
      try {
        if (typeof window === 'undefined' || !window.fetch) return;
        fetch('/api/desktop/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            source: 'browser-window'
          }),
          keepalive: true
        }).catch(() => {
          // Ciche niepowodzenie, aby nie wywołać pętli błędów
        });
      } catch {
        // Ciche niepowodzenie
      }
    };

    const handleError = (event: ErrorEvent) => {
      sendTelemetry({
        level: 'ERROR',
        message: event.message || 'Nieznany błąd JavaScript w przeglądarce',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      sendTelemetry({
        level: 'ERROR',
        message: reason?.message || String(reason) || 'Nieobsłużone odrzucenie obietnicy (Promise)',
        details: {
          stack: reason?.stack
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
