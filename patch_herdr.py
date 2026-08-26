import re

with open('/Users/phantom/.gemini/config/skills/herdr/SKILL.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "4. **Pane 4 (Audytor)**: `herdr agent start audytor --kind codex` (Model: Codex Terra 5.6). Zadanie: Ostateczna weryfikacja kodu napisanego przez Kodera, uruchomienie builda i weryfikacja wygenerowanych zrzutów E2E. Wydaje końcowe \"Zatwierdzam\".",
    "4. **Pane 4 (Audytor)**: `herdr agent start audytor --kind codex` (Model: Codex Terra 5.6). Zadanie: Ostateczna weryfikacja kodu napisanego przez Kodera, uruchomienie builda i weryfikacja logów.\n5. **Pane 5 (Walidator Wizji)**: `herdr agent start walidator --model gemini-3.7-flash-med`. Zadanie: Ogląda wygenerowane przez Playwright zrzuty ekranu (screenshots E2E). Rygorystycznie szuka polskich słów (jeśli ekran miał być w innej wersji językowej, np. 'en'). Jeśli znajdzie polskie słowo (tzw. 'slop') - zgłasza błąd i oznacza zadanie jako niewykonane."
)

content = content.replace(
    "7. Gdy Koder zamelduje \"done\", zleć weryfikację Audytorowi.\n8. Zarządzaj tym w pełni autonomicznie, informując użytkownika o postępach.",
    "7. Gdy Koder zamelduje \"done\", zleć weryfikację Audytorowi.\n8. Po weryfikacji Audytora (build przechodzi), zleć pracę Walidatorowi Wizji, podając ścieżki do zrzutów z Downloads/.\n9. Jeśli Walidator zgłosi problem (np. polskie napisy na EN screenie), zwróć logi z powrotem do Kodera do poprawki.\n10. Zarządzaj tym w pełni autonomicznie, informując użytkownika o postępach."
)

with open('/Users/phantom/.gemini/config/skills/herdr/SKILL.md', 'w', encoding='utf-8') as f:
    f.write(content)

