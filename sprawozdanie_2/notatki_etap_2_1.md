# Sprawozdanie Projekt 2 — materiał z etapu 2.1

Sekcje ułożone wg szablonu `imie_nazwisko_grupa_sprawozdanie_projekt_2.docx`.
Ścieżki kodu są względem `Clone/nextboilerplate/` (poza `sql/`, który leży w `ztp_2026/sql/`).
📸 = zrzut do zrobienia. Dodane w commicie `11b4970 lab 2.1`.

Sekcje z 2.2/2.3 (PUSH/ntfy, Email/MailHog, worker, idempotencja, Prometheus) — później.

---

## Wstęp

Projekt rozszerza aplikację z Projektu 1 (Next.js + PostgreSQL) o moduł planowania powiadomień.
Powiadomienie ma treść, kanał (EMAIL / PUSH), odbiorcę, planowany moment wysyłki ze strefą
czasową i status. Opcjonalnie może dotyczyć konkretnego produktu (`product_id`). Moment wysyłki
jest zawsze zapisywany w UTC, a zmiany statusu pilnuje maszyna stanów.

---

## Opis struktury projektu — moduł Notifications

Next.js nie ma modułów jak FastAPI, więc moduł powiadomień to osobne pliki w tych samych
warstwach co produkty (obok nich, nie w środku):

```
app/
├── api/
│   ├── v1/
│   │   ├── products/...                 // lab 1
│   │   └── notifications/               // warstwa web (kontrolery)
│   │       ├── route.ts                 // GET lista, POST
│   │       └── [id]/
│   │           ├── route.ts             // GET po id
│   │           └── status/route.ts      // PATCH status
│   └── docs/
│       ├── products/route.ts            // spec OpenAPI produktów (JSON)
│       └── notifications/route.ts       // spec OpenAPI powiadomień (JSON)
├── product-docs/page.tsx                // Swagger UI — produkty
├── notifications-docs/page.tsx          // Swagger UI — powiadomienia
├── components/
│   ├── SwaggerDocs.tsx                  // wspólny komponent Swagger UI
│   ├── NotificationPoster.tsx           // formularz nowego powiadomienia
│   └── NotificationList.tsx             // lista + przycisk Anuluj
└── page.js                              // strona główna
lib/
├── Model/notification.ts                // statusy, kanały, typy
├── Repository/notification.ts           // zapytania SQL
├── Service/
│   ├── notification.ts                  // logika biznesowa
│   ├── notificationStateMachine.ts      // maszyna stanów
│   └── notificationValidators.ts        // walidacja + konwersja do UTC
└── swagger.ts                           // konfiguracja dokumentacji
sql/003.Notifications.sql                // tabela notifications
```

Tabela w bazie — `sql/003.Notifications.sql:1-14`:
- `scheduled_at TIMESTAMPTZ` (linia 6) — moment wysyłki w UTC,
- `channel` i `status` mają CHECK na dozwolone wartości (linie 4, 8-9), status domyślnie `PENDING`,
- `product_id ... REFERENCES products(id) ON DELETE SET NULL` (linia 10) — opcjonalne powiązanie z produktem,
- indeks `(status, scheduled_at)` (linia 14) — pod wyszukiwanie gotowych do wysyłki w 2.2.

📸 1. (opcjonalnie) Schemat ERD z nową tabelą `notifications` połączoną z `products` — tak jak w sprawozdaniu 1.

---

## Interaktywna dokumentacja — podstrony i realizacja w kodzie

Dwie osobne podstrony:
- http://localhost:3000/product-docs — tylko endpointy produktów (7 operacji),
- http://localhost:3000/notifications-docs — tylko endpointy powiadomień (4 operacje).

Jak to działa:
1. Nad każdą funkcją `GET/POST/PATCH...` w `route.ts` jest komentarz JSDoc `@swagger` z opisem
   endpointu w formacie OpenAPI, np. `app/api/v1/notifications/route.ts:29-55` (POST)
   i `app/api/v1/notifications/[id]/status/route.ts:7-45` (PATCH).
2. Biblioteka `next-swagger-doc` skanuje folder i składa z komentarzy specyfikację —
   `lib/swagger.ts:92-101` (produkty, `apiFolder: "app/api/v1/products"`) i `lib/swagger.ts:103-112`
   (powiadomienia, `apiFolder: "app/api/v1/notifications"`). Osobny folder = osobna dokumentacja.
   Wspólne schematy (Notification, NotificationCreate, statusy) — `lib/swagger.ts:56-90`.
3. Specyfikacja jest wystawiana jako JSON: `app/api/docs/notifications/route.ts:4-6`
   (`/api/docs/notifications`) i `app/api/docs/products/route.ts:4-6`.
4. Strony `app/notifications-docs/page.tsx:5-7` i `app/product-docs/page.tsx:5-7` renderują
   komponent `SwaggerDocs` (`app/components/SwaggerDocs.tsx:34-54`), który ładuje Swagger UI
   i wskazuje mu URL specyfikacji.

Odpowiednik z instrukcji (FastAPI `app.mount("/notifications-docs", ...)`) — tu zamiast mountowania
osobnej aplikacji są dwie strony, każda z własnym plikiem specyfikacji.

📸 2. `/notifications-docs` — widok całej strony (4 endpointy + Schemas).
📸 3. `/product-docs` — widok całej strony (endpointy produktów).
📸 4. (opcjonalnie) Fragment kodu: komentarz `@swagger` nad POST w `app/api/v1/notifications/route.ts`.

---

## Moduł planowania i obsługi powiadomień

### Opis implementacji w architekturze warstwowej

Moduł powiadomień korzysta z tej samej architektury warstwowej co produkty z Projektu 1.
Żądania przechodzą przez warstwy zawsze w tej samej kolejności, a każda warstwa komunikuje się
tylko ze swoimi sąsiadami i „wie” tylko to, co musi wiedzieć, żeby spełnić swoją rolę.

Warstwy:

Klient - wysyła żądanie HTTP z danymi w JSON
    przeglądarka (formularz na stronie głównej) i Swagger UI

Kontroler - odczytuje id i treść żądania, wywołuje serwis, obsługuje AppError, żeby klient dostał
tylko kod HTTP i komunikat
    app/api/v1/notifications/**/route.ts

Serwis - walidacja (strefa czasowa, data w przyszłości, odbiorca, istnienie produktu), konwersja
czasu do UTC i maszyna stanów, więc logika biznesowa; przy błędzie rzuca AppError
    lib/Service/notification.ts, notificationValidators.ts, notificationStateMachine.ts

Repozytorium - zapytania SQL: SELECT, INSERT, UPDATE
    lib/Repository/notification.ts

PostgreSQL - tabela notifications

Dzięki temu moduł powiadomień mógł korzystać z gotowych elementów z Projektu 1 (połączenie z bazą,
obsługa błędów, repozytorium produktów do sprawdzenia product_id) bez zmieniania ich.

Endpointy:

| Metoda | URL | Kod | Gdzie |
|---|---|---|---|
| GET | `/api/v1/notifications` | 200 | `route.ts:21-27` |
| POST | `/api/v1/notifications` | 201 / 422 | `route.ts:56-63` |
| GET | `/api/v1/notifications/{id}` | 200 / 404 / 400 | `[id]/route.ts:33-40` |
| PATCH | `/api/v1/notifications/{id}/status` | 200 / 404 / 422 | `[id]/status/route.ts:46-54` |

Walidacje (`lib/Service/notificationValidators.ts`):
- treść niepusta — linie 6-8,
- kanał EMAIL lub PUSH — linie 10-12,
- odbiorca wymagany, dla EMAIL poprawny adres — linie 14-20,
- strefa czasowa podana i poprawna (IANA) — linie 23-33,
- data w poprawnym formacie i w przyszłości — linie 46-66,
- `product_id` opcjonalny, ale jeśli jest — produkt musi istnieć — `lib/Service/notification.ts:28-37`.

📸 5. Swagger: POST `/api/v1/notifications` — poprawne utworzenie (201, w odpowiedzi `status: PENDING`).
📸 6. Swagger: POST z błędami (np. `"timezone": "Mars/Base"`, pusty `content`, `product_id: 9999`) → 422 z listą `details`.
📸 7. Swagger: GET `/api/v1/notifications/{id}` dla nieistniejącego id → 404.
📸 8. Strona główna (`http://localhost:3000`) — formularz „Nowe powiadomienie” z odpowiedzią 201 i lista powiadomień.

### Maszyna stanów — stany dozwolone i zabezpieczenia przed niedozwolonymi

Statusy — `lib/Model/notification.ts:2-7`: PENDING (oczekujące), SENT (wysłane),
FAILED (nieudane), CANCELLED (anulowane).

Dozwolone przejścia — `lib/Service/notificationStateMachine.ts:4-13`:

```
PENDING ──► SENT
   │──────► FAILED
   └──────► CANCELLED
SENT, FAILED, CANCELLED — stany końcowe (pusty zbiór przejść)
```

`canTransition(current, next)` — linie 16-18 — sprawdza, czy `next` jest w zbiorze dozwolonych.

Zabezpieczenia (trzy poziomy):
1. **Serwis** — `lib/Service/notification.ts:62-74`: nieznany status → 422 (linie 65-67),
   brak powiadomienia → 404 (linia 69), niedozwolone przejście → 422
   „Przejście ze statusu X do Y jest niedozwolone.” (linie 70-72).
2. **Baza** — CHECK na kolumnie `status` (`sql/003.Notifications.sql:8-9`) — nie da się zapisać
   innej wartości nawet z pominięciem aplikacji.
3. **UI** — przycisk „Anuluj” na liście pokazuje się tylko przy PENDING (`app/components/NotificationList.tsx:70`).

📸 9. Swagger: PATCH `/{id}/status` z `{"status": "CANCELLED"}` na PENDING → 200.
📸 10. Swagger: PATCH tego samego id z `{"status": "SENT"}` → 422 „Przejście ze statusu CANCELLED do SENT jest niedozwolone.”
📸 11. (opcjonalnie) Lista na stronie głównej po kliknięciu „Anuluj” — status CANCELLED, przycisk znika.

### Kanały komunikacji

Na tym etapie kanał jest tylko polem modelu: `lib/Model/notification.ts:11-15` (EMAIL, PUSH),
walidacja `notificationValidators.ts:10-12`, CHECK w bazie `003.Notifications.sql:4`.
Faktyczna wysyłka (MailHog / ntfy) — etap 2.2.

---

## Planowanie czasowe z uwzględnieniem konwersji do UTC

Klient wysyła `scheduled_at` i `timezone`, np.:

```json
{ "scheduled_at": "2026-12-01T09:00:00", "timezone": "Europe/Warsaw" }
```

Sama godzina nie wystarcza — 09:00 w Warszawie i w Nowym Jorku to różne momenty. Dlatego:

1. `validateTimezone` (`notificationValidators.ts:23-33`) — sprawdza strefę przez `IANAZone.isValidZone` (Luxon).
2. `convertToUtc` (`notificationValidators.ts:40-43`) — `DateTime.fromISO(scheduledAt, { zone })` czyta
   datę bez offsetu jako czas lokalny w podanej strefie, `.toUTC()` przelicza do UTC.
   Jeśli data ma już offset (`Z`, `+01:00`), ten offset ma pierwszeństwo.
3. `validateScheduledAt` (`notificationValidators.ts:46-66`) — porównuje wynik z `DateTime.utc()`;
   data z przeszłości → 422.
4. Do bazy trafia moment w UTC (`lib/Service/notification.ts:44`), kolumna `TIMESTAMPTZ`;
   oryginalna strefa zapisana obok w `timezone` (do wyświetlania czasu lokalnego).

Dlaczego biblioteka zamiast stałego przesunięcia: Warszawa ma +1 zimą i +2 latem (DST),
inne strefy mają inne offsety — Luxon zna te reguły.

Sprawdzone przykłady:

| Wejście | Strefa | Zapisane w UTC |
|---|---|---|
| 2026-12-01T09:00 | Europe/Warsaw | 2026-12-01T08:00Z (zima, +1) |
| 2027-07-01T09:00 | Europe/Warsaw | 2027-07-01T07:00Z (lato, +2) |
| 2026-12-01T09:00 | America/New_York | 2026-12-01T14:00Z (−5) |
| 2026-12-01T09:00Z | Europe/Warsaw | 2026-12-01T09:00Z (offset w dacie wygrywa) |

📸 12. Swagger: POST z `2026-12-01T09:00:00` + `Europe/Warsaw` → w odpowiedzi `scheduled_at: 2026-12-01T08:00:00.000Z`.
📸 13. Swagger: ten sam POST z datą lipcową → `07:00Z` (pokazuje DST).
📸 14. Swagger: POST z datą z przeszłości → 422 „planowana data wysyłki musi wskazywać przyszły moment”.
📸 15. Terminal: `docker exec -it postgres_ztp_project1 psql -U appuser appdb -c "SELECT id, scheduled_at, timezone, status FROM notifications;"` — UTC w bazie.
📸 16. (opcjonalnie) Lista na stronie głównej — kolumny „zaplanowane (UTC)” i „lokalnie” obok siebie.
