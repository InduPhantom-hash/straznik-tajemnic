# Research: Renderowanie Diegetycznych Rekwizytów (Listy, Akta, Legitymacje, Dokumenty)

Data: 2026-07-22  
Stack: Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS, Google Gemini API  

---

## 1. Obszar problemu

W aplikacji *Strażnik Tajemnic AI* gracz gromadzi w ekwipunku oraz na Tablicy Badacza przedmioty i rekwizyty zdobywane w trakcie śledztwa (poprzez tagi narracji `[ZDOBYTY_PRZEDMIOT]`). 

**Obecny stan:**
1. **Przechowywanie (`EquipmentItem` w `src/lib/types.ts`)**: Przedmioty posiadają kategorię (`category: 'document' | 'artifact' | ...`), flagę czytelności `isReadable: boolean`, tekst `readableContent` oraz opcjonalny `imageUrl`.
2. **Generowanie treści diegetycznej (`/api/equipment/read-item`)**: Endpoint Gemini LLM generuje klimatyczny tekst dokumentu w 1. osobie z danej epoki.
3. **Podgląd dokumentów (`EquipmentDetailDialog` w `equipment-detail-dialog.tsx`)**:
   - Dokumenty, listy i akta renderowane są w ujednoliconym, generycznym bloku `#ebdfc6` (parzaminowy papier z czarnym tekstem serif).
   - Brak wizualnego podziału na **legitymację prasową/dowód tożsamości z fotografią postaci**, **kopertę z pieczęcią pocztową i list**, **akta policyjne/dowodowe ze sznurkiem i pieczęcią**, czy **oficjalne pisma rządowe z godłem**.

---

## 2. Mapa powiązanych plików i komponentów

- **[equipment-modal.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/equipment-modal.tsx)**: Główny modal ekwipunku (podział na Broń, Wyposażenie, Finanse).
- **[equipment-detail-dialog.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/equipment-detail-dialog.tsx)**: Modal podglądu pojedynczego przedmiotu i czytnik dokumentów.
- **[read-item/route.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/app/api/equipment/read-item/route.ts)**: API generujące treść dokumentów z wykorzystaniem LLM.
- **[handout-instructions.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/prompts/handout-instructions.ts)**: Szablony struktur gazet, listów i dzienników przekazywane do promptu MG.
- **[handout-generator.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/handout-generator.tsx)**: Komponent i eksporter HTML->Canvas dla handoutów.
- **[types.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/types.ts)**: Główny schemat interfejsu `EquipmentItem`.

---

## 3. Propozycja nowej architektury Diegetic Visual Props

Dla zapewnienia unikalnego kształtu i oprawy visual prop dla każdego typu dokumentu z danej epoki (np. lata 20. XX wieku), wymagane jest wprowadzenie:

### A. Sub-typy dokumentów w `EquipmentItem`
Wyrozróżnienie pola `documentType`:
- `'press_pass'` / `'id_card'`: Legitymacja prasowa / Dowód tożsamości z ramką na zdjęcie badacza, numerem wydania, podpisem redaktora/szeryfa.
- `'evidence_envelope'`: Koperta na dowody rzeczowe policji w Bostonie/Arkham z adnotacjami śledczego i pieczątkami.
- `'letter'`: List osobisty / rękopis z fakturowaną kopertą i znaczkiem epoki.
- `'newspaper'`: Artykuł prasowy (np. *The Arkham Advertiser*, *Kurier Warszawski*) z układem szpaltowym.
- `'official_document'`: Oficjalne pismo rządowe/sądowe ze ślepą pieczęcią i nagłówkiem urzędowym.
- `'journal_page'`: Wpis z pamiętnika o poszarpanych brzegach.

### B. Komponent `DiegeticDocumentViewer`
Rozbudowa lub zastąpienie generycznej ramki tekstowej w `EquipmentDetailDialog` przez dynamiczny komponent dobierający layout HTML/CSS:
1. **Legitymacja prasowa**: Kartonik w odcieniach sepii, ze zdjęciem badacza pobranym z `character.portraitUrl`, godłem redakcji i wytłoczonym numerem legitymacji.
2. **Koperta na dowody**: Teczka/koperta z formularzem policyjnym (*Departament Policji – Biuro Dowodów Rzeczowych*), numerem sprawy i dopiskami śledczego.
3. **List**: Format przypominający papier czerpany z wycentrowanym adresem, znaczkiem i charakterystyczną czcionką maszynopisową/kaligraficzną.

---

## 4. Rekomendowane kroki

1. Przejście do kroku `/dev-2-plan` i przygotowanie szczegółowej specyfikacji komponentu `DiegeticDocumentViewer` oraz zmian w typowaniu `EquipmentItem`.
2. Zaktualizowanie endpointu `/api/equipment/read-item` tak, aby zwracał ustrukturyzowane JSON-y z podziałem na nagłówek, autora, numer legitymacji/sprawy oraz treść główną.
3. Integracja widoków w `EquipmentDetailDialog` oraz na karcie postaci.
