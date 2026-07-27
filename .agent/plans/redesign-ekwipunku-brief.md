## Brief: Redesign Ekwipunku & Dokumentów (Sesja 2)
**Co**: Powiększenie modalu Ekwipunku i stylizacja na immersyjny interfejs cRPG (jak Dziennik).
**Jak**: Zmiana `EquipmentDetailDialog` na szeroki modal 85vw, obramowania mosiężne, centrowanie dokumentów fabularnych w `DiegeticDocumentViewer` zapobiegające rozjeżdżaniu.
**Pliki**: `equipment-detail-dialog.tsx`, `diegetic-document-viewer.tsx`, `predefined-characters-selector.tsx`
**Test**: Uruchomienie aplikacji i kliknięcie na dokument z poziomu Karty Postaci (Ekwipunek).
**Ryzyko**: Zepsucie czytelności tekstu (overflow) przy wąskich ekranach smartfonów.
