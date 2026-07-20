# 🔐 Security Policy - Strażnik Tajemnic AI v4.0

---

## 🛡️ Bezpieczeństwo API Keys

### Przechowywanie

- ✅ Klucze w `.env.local` (nie commitowane) lub podawane z poziomu UI w przeglądarce
- ✅ `.gitignore` zawiera `.env*`
- ✅ Service Account JSON (`google-cloud-key.json`) w `.gitignore`
- ❌ Nigdy nie hardcoduj kluczy w kodzie
- ❌ Sekrety nie idą do PostHog/Sentry (browser-side telemetry)

### Minimalne uprawnienia

Service Account / Klucz API powinien posiadać minimalny niezbędny zakres:

- Gemini API Key (czat, embeddingi, TTS, obrazy)
- Opcjonalne providery (Vertex AI / Replicate / Google Cloud TTS) tylko w przypadku korzystania z dedykowanych presety

---

## 🔒 Ochrona danych

### Dane użytkownika

- Sesje i stan gry przechowywane w `localStorage` (klient) oraz zapisywane na dysku (`data/saves/`)
- Lokalny indeks RAG zasad przechowywany binarnie na dysku (`data/rag/*.bin` w formacie Float32)
- Single-instance architecture (1 browser = 1 gra = 1-2 graczy Hot Seat)
- Brak bazy w chmurze, braku wymogu logowania i zewnętrznej autentykacji
- PostHog telemetry zbiera tylko nie-PII eventy (`chat_message_sent`, `ai_request_completed` bez sessionId)
- Sentry breadcrumbs nie zawierają kluczy ani treści wiadomości

### Transmisja

- ✅ HTTPS dla zapytań do Gemini API
- ✅ Cały stan sesji i indeks wektorowy RAG pozostaje lokalnie u użytkownika

---

## 🚨 Raportowanie luk

Jeśli znalazłeś lukę bezpieczeństwa:

1. **NIE** publikuj publicznie
2. Skontaktuj się prywatnie przez email
3. Opisz szczegóły luki
4. Poczekaj na potwierdzenie i fix

---

## ✅ Security Checklist

- [ ] Klucze API w `.env.local` lub wpisane w interfejsie
- [ ] `.gitignore` zawiera `.env*` i `*.json` (klucze)
- [ ] Brak wrażliwych danych w logach i analityce
- [ ] Regularne aktualizacje zależności

---

## 🔄 Aktualizacje bezpieczeństwa

```bash
# Sprawdź podatności
npm audit

# Napraw automatycznie
npm audit fix

# Aktualizuj zależności
npm update
```

---

_Wersja: 4.0.0 · Ostatnia aktualizacja: 2026-07-20_

