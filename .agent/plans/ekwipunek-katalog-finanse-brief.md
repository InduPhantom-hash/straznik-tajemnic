## Brief: Ekwipunek, Finanse, Fallbacki UI
**Co**: Przywrócenie odciętego Ekwipunku, implementacja Finansów 7e i naprawa spadających obrazków.
**Jak**: Wydobywamy kod z folderu `_tester`, piszemy tabele zamożności w `credit-rating.ts` i zamieniamy `display: none` w logice `onError` na wektory SVG.
**Pliki**: `equipment-catalog.ts`, `credit-rating.ts`, `equipment-modal.tsx`, `equipment-detail-dialog.tsx`, `acquired-item-card.tsx`.
**Test**: `npm run build` oraz testy dla przywróconych skryptów.
**Ryzyko**: Wyciąganie dawno pisanego kodu testera może kłócić się z nowoczesnymi zmianami w `types.ts`.
