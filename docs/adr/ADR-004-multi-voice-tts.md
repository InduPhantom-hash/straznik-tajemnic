# ADR-004: Multi-Voice TTS dla immersyjnego słuchowiska

**Status:** Zaakceptowane  
**Data:** 2025-12  
**Autorzy:** Phantom Development Team

---

## Kontekst

Pojedynczy głos narratora nie oddaje pełnej immersji - dialogy NPC brzmiały "płasko".
Potrzebowaliśmy różnych głosów dla:
- Narratora (główny głos lektora)
- NPC męskich (różne głosy)
- NPC żeńskich (różne głosy)

## Rozważane opcje

1. **Jeden głos** - prosty, tani, ale mniej immersyjny
2. **Ręczne przypisanie** - użytkownik wybiera głos per NPC
3. **Automatyczne wykrywanie** - AI parsuje tekst i przypisuje głosy

## Decyzja

**Automatyczne Multi-Voice TTS** z preloadingiem.

## Uzasadnienie

- ✅ **Immersja** - słuchowisko zamiast audiobooka
- ✅ **Automatyzacja** - `voice-matcher.ts` wykrywa NPC i płeć
- ✅ **Preloading** - `tts-preloader.ts` redukuje opóźnienia
- ✅ **Elastyczność** - użytkownik może dostosować głosy

## Implementacja

```typescript
// voice-matcher.ts
function matchVoiceToSpeaker(segment: TextSegment): VoiceId {
  if (segment.type === 'narrator') return NARRATOR_VOICE;
  if (segment.npcGender === 'female') return pickFemaleVoice();
  return pickMaleVoice();
}
```

## Konsekwencje

- Wyższe koszty TTS (więcej wywołań API)
- Większa złożoność parsowania tekstu
- Potrzeba stable voice pool aby NPC brzmiał spójnie

---

**Powiązane:** VOICE_SYSTEM_GUIDE.md
