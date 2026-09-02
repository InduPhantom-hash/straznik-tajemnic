# Katalog systemów

Ten katalog wskazuje granice odpowiedzialności i źródła prawdy. Używaj go przed
zmianą przekrojową razem z [mapą runtime](MAPA-POWIAZAN.md).

| System | Źródło prawdy | Odpowiedzialność |
| --- | --- | --- |
| Sesja i stan gry | modele oraz storage aplikacji | Trwały stan kampanii, postaci, scen i zdarzeń. |
| Mechanika | kod reguł i modele domenowe | Rzuty, zasoby, ekwipunek, konsekwencje oraz walidacja. |
| Narracja AI | warstwa chat i prompty | Opisuje świat i proponuje narrację; nie zastępuje stanu mechaniki. |
| Kontekst epoki | manifesty epok i `ResolvedEraContext` | Rok, miejsce, ograniczenia i dane wejściowe świata. |
| Start przygody | preflight świata oraz scenariusz | Waliduje dane przed rozpoczęciem rozgrywki. |
| Ekwipunek | katalog oraz `EquipmentItem[]` | Deterministyczny ekwipunek startowy i zdobyte przedmioty. |
| Media i portrety | manifesty assetów | Dobór i trwałe odwołania do obrazów postaci oraz scen. |
| Dokumentacja | `docs/` w `main` | Decyzje, architektura, mapa zależności i workflow. |
| Planowanie | GitHub Issues | Karty pracy, priorytety, akceptacja i zależności. |

## Reguła zmiany

Jeżeli zmiana dotyka więcej niż jednego wiersza, najpierw aktualizuj kartę Issue
o ścieżkę runtime i zakres, a przed zamknięciem zaktualizuj ten katalog oraz mapę
powiązań. Audyt architektury jest osobnym etapem odczytowym.
