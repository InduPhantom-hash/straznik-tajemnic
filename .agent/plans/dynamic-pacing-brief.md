## Brief: Kontekstowy Pacing Narracji (Opcja A)
**Co**: Wprowadzenie dynamicznego dopasowania długości odpowiedzi AI (dialogi 30-70 słów, eksploracja 60-150 słów, otwarcie sceny 150-300 słów).
**Jak**: Zmiana wideł w `pacing-controller.ts`, dopisanie dyrektywy zwięzłości w `gm-protocol.ts` oraz `default-gm-prompt.md`.
**Pliki**: `pacing-controller.ts`, `gm-protocol.ts`, `default-gm-prompt.md`
**Test**: Testy jednostkowe `pacing-controller.test.ts` + sprawdzian typu TypeScript.
**Ryzyko**: Niskie - zmiana wpływa wyłącznie na prompty pomocnicze i dyrektywy pacingu.
