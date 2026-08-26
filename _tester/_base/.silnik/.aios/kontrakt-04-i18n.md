# Kontrakt Wykonawczy: Fix i18n (Character Sheet and Narrations)

## Cel
Aplikacja nie tłumaczy karty postaci, całego interfejsu przygody i narracji na język angielski po wybraniu języka angielskiego (pozostaje polski).

## Zadania dla Codexa:
1. Sprawdź czy plik `src/proxy.ts` istnieje i jeśli tak, ZMIEŃ JEGO NAZWĘ na `src/middleware.ts` i zaktualizuj referencje/konfigurację, aby `next-intl` poprawnie przepisywał trasy i ustawiał język, ponieważ Next.js ignoruje `proxy.ts` jako middleware. (Upewnij się, że nie psujesz istniejącej logiki proxy).
2. Zaktualizuj `src/lib/lovecraft-style-guide.ts`, `src/lib/prompts/gm-protocol.ts` oraz `src/lib/ai-settings/prompts-generator.ts` aby przyjmowały aktualny język (locale) i generowały instrukcje po angielsku, gdy wybrano `en`. 
3. Pobieraj wybrany `locale` w endpointach API (np. używając `cookies().get('NEXT_LOCALE')?.value` z `next/headers` lub upewnij się, że jest on poprawnie przesyłany z frontendu) i przekazuj go do funkcji generujących prompcy AI (m.in. w `/api/chat` oraz generatorze postaci).
4. Przejrzyj logikę tworzenia postaci (`src/components/desk/CharacterDossier.tsx` oraz api odpowiedzialne za inicjalizację - prawdopodobnie w `src/app/[locale]/characters` lub `/api/user/generate`) i upewnij się, że wartości atrybutów i umiejętności, które AI zwraca, uwzględniają odpowiedni język.
5. Upewnij się, że użyte są klucze z `next-intl` (`useTranslations`) zamiast hardkodowanych polskich stringów w głównych komponentach UI po uruchomieniu przygody.

## Wymagania Końcowe
- `npx tsc --noEmit` przechodzi bez błędów.
- `npm test` przechodzi bez błędów.
- Aplikacja respektuje wybraną wersję językową w interfejsie oraz w narracji generowanej przez LLM.

Zrealizuj te punkty bezpiecznie bez łamania istniejącej funkcjonalności.
