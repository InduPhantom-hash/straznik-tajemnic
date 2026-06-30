# 🔐 Security Policy - Zew-App v4.0

---

## 🛡️ Bezpieczeństwo API Keys

### Przechowywanie

- ✅ Klucze w `.env.local` (nie commitowane)
- ✅ `.gitignore` zawiera `.env*`
- ✅ Service Account JSON (`google-cloud-key.json`) w `.gitignore`
- ❌ Nigdy nie hardcoduj kluczy w kodzie
- ❌ Sekrety nie idą do PostHog/Sentry (browser-side telemetry)

### Minimalne uprawnienia

Service Account powinien mieć tylko:

- `Storage Admin` (dla GCS)
- `Cloud Text-to-Speech API User`
- `Vertex AI User` (dla Imagen 3 fallback Tier 2)

---

## 🔒 Ochrona danych

### Dane użytkownika

- Sesje przechowywane w localStorage (klient) + namespace `sessions/{id}` w Pinecone
- Opcjonalny backup do Google Cloud Storage (signed URLs)
- Single-instance architecture (1 browser = 1 grupa do 4 graczy Hot Seat)
- Brak auth w v4.0 (Clerk planowany w IND-168 dla beta deploy)
- PostHog telemetry zbiera tylko nie-PII eventy (`chat_message_sent`, `ai_request_completed` z namespaces ale BEZ sessionId)
- Sentry breadcrumbs nie zawierają kluczy ani treści wiadomości

### Transmisja

- ✅ HTTPS dla produkcji
- ✅ Signed URLs dla prywatnych plików w GCS
- ✅ CORS skonfigurowany dla dozwolonych domen

---

## 🚨 Raportowanie luk

Jeśli znalazłeś lukę bezpieczeństwa:

1. **NIE** publikuj publicznie
2. Skontaktuj się prywatnie przez email
3. Opisz szczegóły luki
4. Poczekaj na potwierdzenie i fix

---

## ✅ Security Checklist

- [ ] Klucze API w `.env.local`
- [ ] `.gitignore` zawiera `.env*` i `*.json` (klucze)
- [ ] Service Account z minimalnymi uprawnieniami
- [ ] HTTPS w produkcji
- [ ] CORS skonfigurowany poprawnie
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

_Wersja: 4.0.0 · Ostatnia aktualizacja: 2026-05-23_
