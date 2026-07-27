# Plan Implementacji: Ekwipunek, Dziennik i Tablica Badacza 2.0 (Phased Approach)

Plan podzielony na 3 etapy (sesje) z nastawieniem na estetykę klasycznych gier cRPG, realistycznego śledztwa i immersyjnego przeglądania dokumentów. Zapisano dla przyszłych sesji roboczych.

---

## 📅 Podział na Sesje (Etapy)

### Sesja 1: Dziennik Misji (Redesign cRPG) & Auto-Loot na Czacie
Skupimy się na całkowitym przebudowaniu logiki wpisów z czatu i tego, jak wyglądają w dzienniku.
*   **Auto-Loot (Czat):** Usunięcie bezużytecznych przycisków ("Dodaj teraz", "Nie teraz") z kart przedmiotów na czacie. Od teraz, jeśli AI wygeneruje przedmiot fabularny, trafia on fizycznie w tle do Ekwipunku postaci. Karta na czacie jest tylko wizualnym potwierdzeniem zdobycia łupu.
*   **Rozmiar Dziennika Misji:** Zmiana modalu dziennika na `w-[85vw] h-[85vh]` z subtelną ramką dopasowaną do ciemnego drewna/mosiądzu. Ukrycie "obrzydliwych białych pasków scrollowania".
*   **Redesign Zakładek Dziennika (cRPG Style):**
    *   **Postacie (NPC):** Zamiast suchych boxów – styl karty akt. Imię, krótki opis (kto to jest), co od nas chciał, powiązane zlecenia.
    *   **Lokacje:** Nazwa, adres, notatka o wydarzeniach, które miały tam miejsce.
    *   **Przedmioty Fabularne:** Filtrowanie tylko dla "Quest Items", opis fabularny i lore.
*   **Fix Synchronizacji Odkryć:** Naprawa błędu rozjazdu typów z czatu (np. `npc`) z typami w dzienniku (`encyclopedia_character`), dzięki czemu nowe odkrycia będą sprawnie lądować w zakładkach.

### Sesja 2: Redesign Ekwipunku & Immersyjny System Dokumentów
*   Rozszerzenie modalu Ekwipunku (`EquipmentDetailDialog`) do rozmiaru `85vw / 85vh` i ujednolicenie designu z resztą aplikacji (ciemne drewno, rdza, stary papier).
*   **Immersyjny Podgląd Dokumentów:** Przedmioty w ekwipunku będą miały własne winietki i krótki (2-zdaniowy) opis w domyślnym foncie. Jednak kliknięcie "Przeczytaj" otworzy dedykowany **Immersive Document Viewer**, dynamicznie stylizowany zależnie od typu dokumentu:
    *   **Gazeta:** Układ szpaltowy, duży tytuł (np. *Boston Globe*), data, wtopiona w tekst miniaturka, czarno-biały filtr vintage.
    *   **Dowód Tożsamości / Akta:** Zdjęcie profilowe NPC z karty postaci, pieczątki ("TOP SECRET", "ARCHIVE"), urzędowy układ.
    *   **List / Notatka:** Tekst na pożółkłym papierze, z zachowaniem czytelnego (nieodręcznego) fontu szeryfowego, ale z klimatycznymi odstępami i podpisami.
    *   **Urzędowe dokumenty:** Odpowiednie nagłówki dopasowane do epoki i klimatu przygody.

### Sesja 3: Tablica Badacza 2.0 (True Detective Aesthetic)
*   **Szuflada Poszlak (Clue Drawer):** Implementacja panelu z prawej strony na odłożone poszlaki. Usunięcie elementu z planszy po prostu przesuwa go do szuflady, zabezpieczając przed permanentnym skasowaniem i "spamem" pustej tablicy.
*   **Korkowa Tablica (Background):** Użycie spójnej z klimatem gry, przyciemnionej tekstury starego korka jako tła roboczego (vintage, nie zbyt modern).
*   **Realistyczny Wygląd (Visual Overhaul):** Wymiana kwadratowych boksów na estetykę śledczą:
    *   **Wizualizacje:** Poszlaki stają się wyglądającymi jak zdjęcia "polaroidami", wycinkami z gazet lub wyrwanymi kartkami z notatnika.
    *   **Pinezki i Sznurki:** Połączenia między węzłami jako naprężone czerwone nitki. Pinezki stylizowane na metalowe/plastikowe łebki trzymające notatki pod lekkim kątem rotacji.

---

## 🎯 Jak to będzie działać po zmianach (Wizja Końcowa)

Kiedy wprowadzisz te zmiany i zaczniesz nową przygodę:
1. Podczas rozmowy bohater niezależny daje Ci **Wycinek z Gazety**. Na czacie nie musisz nic klikać. Otrzymujesz klimatyczne potwierdzenie i gazeta fizycznie trafia do Ekwipunku.
2. Otwierasz Ekwipunek (zajmujący wygodne 85% ekranu). Klikasz na wycinek z gazety, a tam zamiast płaskiego tekstu otwiera się pełnoekranowy modal ucharakteryzowany na wycinek z prawdziwego *Boston Globe* z epoki, z zachowaniem czytelnego fontu.
3. Bohater niezależny ląduje w **Dzienniku Misji**. Wchodzisz w odpowiednią zakładkę (też 85% ekranu) i widzisz jego akta: imię, notatkę, i jego zdjęcie, bez brzydkich, przeglądarkowych suwaków psujących imersję.
4. Gdy wejdziesz w **Tablicę Badacza**, zobaczysz klimatyczną, starą, korkową powierzchnię. Będziesz mógł wyciągnąć polaroid wycinka gazety z prawej Szuflady Poszlak, przypiąć pinezką do tablicy i pociągnąć z niego czerwoną włóczkę do zdjęcia bohatera niezależnego.
