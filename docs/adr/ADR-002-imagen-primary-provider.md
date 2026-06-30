# ADR-002: Google Imagen jako główny provider obrazów

**Status:** Zaakceptowane  
**Data:** 2025-12  
**Autorzy:** Phantom Development Team

---

## Kontekst

Potrzebowaliśmy generatora obrazów AI dla:
- Portretów postaci i NPC
- Ilustracji lokacji
- Wizji i scen fabularnych

## Rozważane opcje

1. **Replicate (Stable Diffusion)** - tani, elastyczny, wolniejszy
2. **OpenAI DALL-E 3** - wysoka jakość, drogi
3. **Google Imagen 3/4** - dobra jakość, szybki, integracja z GCP
4. **Midjourney** - najlepsza jakość, brak API

## Decyzja

**Google Imagen** jako główny provider, **Replicate** jako fallback.

## Uzasadnienie

- ✅ **Szybkość** - 3-8s vs 10-30s (Replicate)
- ✅ **Integracja** - już używamy Google Cloud
- ✅ **Cena** - $0.03-0.04/obraz (competitive)
- ✅ **Jakość** - dobra dla stylu horror/vintage
- ✅ **Fallback** - Replicate automatycznie gdy Imagen niedostępny

## Konsekwencje

- Wymaganie Vertex AI API w GCP
- Billing musi być aktywny
- Replicate jako safety net

---

**Powiązane:** ADR-001
