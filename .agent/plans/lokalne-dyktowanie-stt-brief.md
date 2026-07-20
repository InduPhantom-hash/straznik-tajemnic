## Brief: lokalne dyktowanie wiadomości PL/EN
**Co**: Ikona mikrofonu w polu wiadomości, lokalna transkrypcja offline po polsku i angielsku.
**Jak**: `whisper.cpp` + jeden wielojęzyczny model `base` Q5/Q8; język dziedziczony z ustawień całej aplikacji.
**Dystrybucja**: Wspólny kod i model, ale osobne natywne paczki macOS i Windows; żadnego pobierania po instalacji.
**Zakres MVP**: nagraj -> zatrzymaj -> rozpoznaj -> wstaw tekst, bez automatycznego wysłania.
**Pliki**: `docs/ROADMAP-MECHANIKI-AI.md`, komponent wiadomości, warstwa STT, skrypty paczkowania.
**Test**: offline smoke test na świeżej paczce obu systemów, pomiar opóźnienia i testy błędów mikrofonu/modelu.
**Ryzyko**: różnice natywnego runtime'u, rozmiar modelu i jakość `base` przy hałasie/nazwach własnych.
