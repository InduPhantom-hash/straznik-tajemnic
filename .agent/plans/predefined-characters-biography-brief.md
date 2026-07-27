# Brief: Rozbudowa biografii postaci i customowy scrollbar UI

**Co**: Wzbogacenie 46 postaci predefiniowanych o głębokie historie biograficzne z mechaniki CoC 7e RAW oraz dodanie klimatycznego paska przewijania Dark Art Déco.  
**Jak**: Rozbudowa pól `backstory`, `description` i `traits` w `src/lib/immersion/predefined-characters.ts` oraz dodanie stylów `.custom-scrollbar` w `src/app/globals.css`.  
**Pliki**: `src/lib/immersion/predefined-characters.ts`, `src/app/globals.css`, `src/components/ui/predefined-characters-selector.tsx`.  
**Test**: `npx jest src/lib/immersion/predefined-characters.test.ts` oraz weryfikacja wizualna modalu postaci.  
**Ryzyko**: Niskie – struktura statystyk i identyfikatorów postaci pozostanie nieznieniona.  
