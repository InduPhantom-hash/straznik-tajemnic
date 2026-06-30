# ADR-001: Wybór Google Gemini jako głównego modelu AI

**Status:** Zaakceptowane  
**Data:** 2025-09  
**Autorzy:** Phantom Development Team

---

## Kontekst

Potrzebowaliśmy modelu AI do prowadzenia sesji RPG Call of Cthulhu jako Game Master. Wymagania:
- Długi context window (dla podręczników PDF)
- Dobra jakość narracji w języku polskim
- Streaming responses
- Rozsądne koszty

## Rozważane opcje

1. **OpenAI GPT-4** - wysoka jakość, ale drogi, mniejszy context
2. **Anthropic Claude** - dobry context, ale ograniczone API
3. **Google Gemini 2.5** - 1M tokenów context, competitive pricing

## Decyzja

Wybrano **Google Gemini 2.5** (Flash/Pro).

## Uzasadnienie

- ✅ **1M tokenów context** - możliwość wgrania całych podręczników
- ✅ **Streaming** - szybsze odpowiedzi
- ✅ **Cena** - competitive ($0.075-1.25/1M input)
- ✅ **Gemini Vision** - analiza obrazów (portrety, lokacje)
- ✅ **Integracja z Google Cloud** - TTS, Storage, Imagen

## Konsekwencje

- Zależność od ekosystemu Google
- Gemini File API dla cache promptów
- Fallback do tańszych modeli (Flash-Lite) dla kontroli kosztów

---

**Powiązane:** ADR-002, ADR-003
