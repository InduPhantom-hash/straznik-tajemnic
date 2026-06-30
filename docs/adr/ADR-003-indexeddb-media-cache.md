# ADR-003: IndexedDB dla Persistent Media Cache

**Status:** Zaakceptowane  
**Data:** 2025-12  
**Autorzy:** Phantom Development Team

---

## Kontekst

Generowane media (obrazy, audio TTS) są kosztowne i wolne do regenerowania.
Potrzebowaliśmy persistent cache aby:
- Uniknąć ponownego generowania tych samych zasobów
- Przyspieszyć ładowanie sesji
- Zmniejszyć koszty API

## Rozważane opcje

1. **localStorage** - prosty, ale limit 5MB
2. **sessionStorage** - analogicznie, nietrwały
3. **IndexedDB** - duża pojemność, trwały, async API
4. **Cache API (Service Worker)** - dobry dla statycznych zasobów

## Decyzja

Wybrano **IndexedDB** z pomocą abstrakcji `persistent-media-cache.ts`.

## Uzasadnienie

- ✅ **Pojemność** - praktycznie nieograniczona (do limitu dysku)
- ✅ **Trwałość** - przetrwa zamknięcie przeglądarki
- ✅ **Binarne dane** - natywne wsparcie dla Blob/ArrayBuffer
- ✅ **Async** - nie blokuje UI
- ✅ **Indeksowanie** - szybkie wyszukiwanie po kluczach

## Implementacja

```typescript
// persistent-media-cache.ts
export const persistentMediaCache = {
  saveImage(key: string, imageUrl: string): Promise<void>,
  getImage(key: string): Promise<string | null>,
  saveAudio(key: string, blob: Blob): Promise<void>,
  getAudio(key: string): Promise<Blob | null>,
};
```

## Konsekwencje

- Async API wymaga await/then
- Quota może być ograniczona przez przeglądarkę
- Potrzeba mechanizmu czyszczenia starych wpisów

---

**Powiązane:** PERFORMANCE.md
