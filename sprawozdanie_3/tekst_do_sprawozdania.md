# TEKST DO SPRAWOZDANIA — PROJEKT 3 (mock, etap 3.1)

Układ wg szablonu `lab3/imie_nazwisko_grupa_sprawozdanie_projekt_3.docx`.
Na razie uzupełnione tylko sekcje etapu 3.1 (moduł identity). Pozostałe punkty szablonu są
nagłówkami z dopiskiem „(etap 3.2/3.3)”.
`[ZRZUT: plik.png]` = plik z folderu `sprawozdanie_3/zrzuty/`. Ścieżki względem `Clone/nextboilerplate/`.

---

Sprawozdanie Projekt 3 - Koszyk zakupów
Numer albumu: 191849
Imię: Piotr
Nazwisko: Stach
Grupa: 3

## 1. Wstęp

### a. Opis dodanych do struktury projektu modułów - Moduł identity oraz cart

Moduł identity (etap 3.1). Tak jak przy powiadomieniach, w Next.js nie ma osobnego „modułu”
jak w FastAPI. Moduł identity to osobne pliki w tych samych warstwach (Model, Repository,
Service, route handlery), w jakich są produkty i powiadomienia.

```
app
├── api
│   ├── docs
│   │   └── identity
│   │        └── route.ts           // spec OpenAPI modułu identity (JSON)
│   └── v1
│       └── auth
│           ├── register/route.ts   // POST /api/v1/auth/register
│           ├── login/route.ts      // POST /api/v1/auth/login  - ustawia cookie
│           ├── me/route.ts         // GET  /api/v1/auth/me     - przedłuża sesję
│           └── logout/route.ts     // POST /api/v1/auth/logout - usuwa sesję i cookie
├── components
│   └── AuthPanel.tsx               // panel konta na stronie głównej
├── identity-docs
│   └── page.tsx                    // podstrona Swaggera /identity-docs
└── page.js                         // + link „Dokumentacja identity” i AuthPanel

lib
├── Model
│   └── user.ts                     // typy User / UserRow / UserSession, toUser() bez hasha
├── Repository
│   ├── user.ts                     // SQL: tabela users
│   └── userSession.ts              // SQL: tabela user_sessions
├── Service
│   ├── auth.ts                     // logika: register, login, getCurrentUser, logout
│   ├── authValidators.ts           // walidacja e-maila, hasła, imienia i nazwiska
│   └── passwordHasher.ts           // PBKDF2 + salt
├── authCookie.ts                   // warstwa web: odczyt/zapis cookie auth_token
└── swagger.ts                      // + identitySpec

sql/005.Identity.sql                // tabele users i user_sessions
__tests__/auth.test.ts              // testy integracyjne modułu identity
```

Moduł cart — (etap 3.2)

### b. Opis głównych założeń projektu oraz zależności między modułami: identity, cart, notifications

Identity jest samodzielny i nie zależy od produktów ani powiadomień. Na zewnątrz wystawia
funkcję `getCurrentUser(token)` (`lib/Service/auth.ts`). Na jej podstawie kolejne moduły
(koszyk, zamówienia) ustalą, który użytkownik wysyła żądanie.

Endpointy produktów i powiadomień zostają publiczne. Wymagania projektu 3 łączą z zalogowanym
użytkownikiem dopiero koszyk i zamówienia (etap 3.2).

Zależności cart → identity i cart → notifications — (etap 3.2/3.3)

Interaktywna dokumentacja: trzecia podstrona Swaggera, zrobiona tak samo jak dwie poprzednie
(`next-swagger-doc` skanuje komentarze `@swagger` w `app/api/v1/auth`):

    http://localhost:3000/identity-docs

[ZRZUT: 01-identity-docs.png]  podstrona /identity-docs - 4 endpointy modułu identity
(kłódka przy /me i /logout = endpoint korzysta z cookie auth_token, schemat `cookieAuth`)

---

## 2. Model użytkownika i sesji

Dwie nowe tabele (`sql/005.Identity.sql`):

- `users` - id, email (UNIQUE), password_hash, first_name, last_name,
  is_active (DEFAULT TRUE), created_at
- `user_sessions` - id, user_id (FK → users, ON DELETE CASCADE), session_token (UNIQUE),
  created_at, last_used_at

Usunięcie użytkownika usuwa też jego sesje (CASCADE). Unikalny email i token są dodatkowo
pilnowane przez bazę, a nie tylko przez kod.

Rejestracja (`POST /api/v1/auth/register`, `register()` w `lib/Service/auth.ts`) sprawdza:
- poprawny format e-maila,
- hasło: min. 8 znaków, wielka litera, cyfra, znak specjalny (wyrażenia regularne
  w `lib/Service/authValidators.ts` - `validatePasswordStrength`),
- hasło = potwierdzenie (`confirm_password`),
- imię i nazwisko: od 2 do 50 znaków,
- czy konto z tym e-mailem już nie istnieje → 409.

Błędy walidacji wracają jako 422 z listą `details`, tak jak w produktach i powiadomieniach.
E-mail jest zapisywany małymi literami, więc `Jan@x.pl` i `jan@x.pl` to to samo konto.
Odpowiedź nigdy nie zawiera `password_hash` (`toUser()` w `lib/Model/user.ts`).

[ZRZUT: 02-register-422-slabe-haslo.png]  słabe hasło - 422 z listą brakujących wymagań
[ZRZUT: 03-register-201.png]              poprawna rejestracja - 201, odpowiedź bez hasła
[ZRZUT: 04-register-409-duplikat.png]     ponowna rejestracja tego samego e-maila - 409

### a. Opis hashowania hasła i zastosowanego algorytmu

Hasło nigdy nie trafia do bazy w postaci jawnej. Zapisywany jest tylko skrót liczony
funkcją PBKDF2 (Key Derivation Function) z biblioteki standardowej (`crypto` w Node.js,
odpowiednik `hashlib` w Pythonie).
     lib/Service/passwordHasher.ts

- algorytm: PBKDF2-HMAC-SHA256, 100 000 iteracji (`PBKDF2_ITERATIONS`). Wielokrotne
  liczenie skrótu celowo spowalnia każdą próbę, przez co brute-force jest dużo droższy
  niż przy pojedynczym SHA-256,
- salt: 16 losowych bajtów (`randomBytes(16)`, hex) generowane osobno dla każdego hasła.
  To samo hasło u dwóch użytkowników daje inny skrót, więc rainbow tables nie działają,
- zapis w bazie: `salt$hash` (`hashPassword`),
- logowanie (`verifyPassword`): salt jest wycinany z zapisanej wartości, skrót liczony
  ponownie z podanego hasła i porównywany funkcją `timingSafeEqual`. Porównanie w stałym
  czasie nie zdradza, ile początkowych znaków się zgadza.

[ZRZUT: 12-baza-sesje.png]  (górna część) rekord w users - password_hash w formacie salt$hash,
bez jawnego hasła

### b. Opis obsługi ciasteczka wraz z zrzutami ekranu - swagger

Sesja ma dwie części: rekord w `user_sessions` po stronie serwera i cookie `auth_token`
w przeglądarce. W cookie jest tylko losowy token sesji (`randomBytes(32)`, base64url),
bez żadnych danych użytkownika.

Logowanie (`POST /api/v1/auth/login`):
1. szuka użytkownika po e-mailu i sprawdza hasło → 401 przy złym e-mailu lub haśle
   (ten sam komunikat w obu przypadkach, żeby nie dało się sprawdzić, które konta istnieją),
2. sprawdza `is_active` → 403 dla nieaktywnego konta,
3. tworzy token i zapisuje sesję w `user_sessions`,
4. ustawia cookie w odpowiedzi.
     lib/Service/auth.ts - login,  app/api/v1/auth/login/route.ts

Ustawienia cookie (`lib/authCookie.ts`, `setAuthCookie`):
- `HttpOnly` - JavaScript na stronie nie odczyta cookie (`document.cookie`), co chroni przed
  kradzieżą tokenu przez XSS,
- `SameSite=Lax` - przeglądarka nie dołącza cookie do żądań POST wysłanych z obcej strony
  (ochrona przed CSRF),
- `Secure=false` - działa po HTTP na localhost; na produkcji z HTTPS powinno być `true`,
- `Max-Age=1800` - 30 minut, ta sama stała co ważność sesji w bazie (`SESSION_MAX_AGE_SECONDS`),
- `Path=/` - cookie jest wysyłane do wszystkich endpointów aplikacji.

Przy kolejnych żądaniach przeglądarka sama dołącza cookie, a serwer odczytuje token
z nagłówka `Cookie` (`readAuthToken`).

[ZRZUT: 05-login-200.png]          logowanie w Swaggerze - 200 i dane użytkownika
[ZRZUT: 06-cookie-auth-token.png]  ciasteczka przeglądarki po logowaniu (auth_token, HttpOnly,
                                   SameSite=Lax, wygasa za 30 min) i po wylogowaniu (brak)
[ZRZUT: 11-curl-set-cookie.png]    nagłówek Set-Cookie z odpowiedzi login, me i logout (curl -i)
[ZRZUT: 07-me-200.png]             GET /me w Swaggerze - cookie dołączone automatycznie, 200
[ZRZUT: 08-logout-204.png]         wylogowanie - 204
[ZRZUT: 09-me-401-po-wylogowaniu.png]  GET /me po wylogowaniu - 401 „Brak aktywnej sesji”

Uwaga do zrzutu 05: Swagger UI nie pokazuje nagłówka `Set-Cookie`. Przeglądarka ukrywa go
przed JavaScriptem (należy do tzw. forbidden response headers), więc nagłówek widać
na zrzucie 11 z curla, a samo zapisane ciasteczko na zrzucie 06.

Wylogowanie (`POST /api/v1/auth/logout`) usuwa sesję po obu stronach. Rekord znika z bazy
(`logout` → `deleteByToken`), a cookie jest nadpisywane pustą wartością z `Max-Age=0`
(`clearAuthCookie`), więc przeglądarka je usuwa.

Panel na stronie głównej (w stylu pozostałych komponentów) wywołuje te same endpointy:

[ZRZUT: 10-strona-glowna-panel.png]  panel „Konto (identity)” - rejestracja, logowanie,
                                     „Kim jestem (/me)”, wyloguj; wynik /me po zalogowaniu

### c. Opis mechanizmów odpowiadających za nadpisywanie sesji, wygasanie sesji po określonym czasie i jej przedłużenie

Nadpisywanie sesji:
Jeśli do `POST /login` dołączone jest już cookie `auth_token`, poprzednia sesja jest
najpierw usuwana z bazy, a dopiero potem powstaje nowa. Przeglądarka ma więc zawsze
jedną aktywną sesję (także przy przelogowaniu na inne konto), a w bazie nie zostają
osierocone rekordy.
     app/api/v1/auth/login/route.ts - `if (previous) await auth.logout(previous)`

Wygasanie sesji (sliding session, 30 min bezczynności):
`getCurrentUser()` (`lib/Service/auth.ts`) przy każdym użyciu sesji:
1. szuka sesji po tokenie → brak = 401 „Brak aktywnej sesji”,
2. sprawdza `isSessionExpired(last_used_at)`, czyli czy od ostatniej aktywności minęło
   więcej niż 1800 s → jeśli tak: usuwa sesję z bazy i zwraca 401 „Sesja wygasła”,
3. sprawdza, czy użytkownik istnieje i jest aktywny → jeśli nie: usuwa sesję i zwraca 401.
Wygasła sesja jest więc nie tylko odrzucana, ale też od razu kasowana z bazy.

Przedłużanie sesji:
Liczy się czas od ostatniej aktywności, a nie od logowania. Po stronie serwera poprawne
użycie sesji ustawia `last_used_at = teraz` (`sessionRepo.touch`). Po stronie klienta
`GET /me` ustawia cookie ponownie z `Max-Age=1800`, więc jego ważność też liczy się od nowa.
Bez tego cookie wygasłoby w przeglądarce po 30 min od logowania, mimo że sesja w bazie
dalej byłaby ważna.
     app/api/v1/auth/me/route.ts,  lib/Repository/userSession.ts - touch

[ZRZUT: 12-baza-sesje.png]  stan user_sessions krok po kroku:
  1) login → nowa sesja (created_at = last_used_at),
  2) /me po 3 s → last_used_at przesunięte (przedłużenie),
  3) ponowny login z tym samym cookie → stara sesja (id 45) usunięta, nowa (id 46),
  4) last_used_at cofnięte o 31 min → /me zwraca 401 „Sesja wygasła”, w bazie 0 sesji.

---

## 3. Koszyk produktów — (etap 3.2)

### a. Opis mechanizmu zatwierdzenia koszyka — (etap 3.2)
- agregacja danych — (etap 3.2)
- utworzenie rekordu zamówienia — (etap 3.2)
- generowanie numeru zamówienia — (etap 3.2)
- czyszczenie grupy roboczej — (etap 3.2)

### b. Command Pattern — (etap 3.2/3.3)

### c. CQRS, powiadomienia i idempotencja — (etap 3.3)

---

## 4. Testy integracyjne

Testy uruchamiają route handlery bezpośrednio i działają na prawdziwej bazie, tak jak
w poprzednich projektach. Każdy test działa w transakcji wycofywanej na końcu (mock `lib/db`),
a `afterAll` sprawdza, że w `users` nie został żaden rekord z tego przebiegu.
     __tests__/auth.test.ts - 18 testów

### Rejestracja / logowanie (etap 3.1)
- rejestracja → 201, w odpowiedzi brak `password_hash`; w bazie hash w formacie `salt$hash`
  (32 + 64 znaki hex), różny od hasła,
- to samo hasło u dwóch użytkowników → różne hashe (losowy salt),
- słabe hasło → 422 (4 przypadki: za krótkie, bez wielkiej litery, bez cyfry, bez znaku
  specjalnego), niezgodne potwierdzenie → 422, zły e-mail / za krótkie imię → 422,
- duplikat e-maila (także inną wielkością liter) → 409,
- login → 200 i `Set-Cookie` z `HttpOnly`, `SameSite=lax`, `Max-Age=1800`, `Path=/`,
  sesja zapisana w bazie,
- złe hasło / nieistniejące konto → 401 bez cookie; nieaktywne konto → 403,
- ponowny login z cookie → stara sesja usunięta, stare cookie daje już 401,
- /me z cookie → 200, `last_used_at` przesunięte, cookie odświeżone; bez cookie → 401,
- sesja nieużywana 31 min → 401 „Sesja wygasła” i rekord usunięty z bazy,
- logout → 204, sesja usunięta, cookie z `Max-Age=0`, potem /me → 401.

[ZRZUT: 13-npm-test.png]  18/18 testów identity oraz cały zestaw `npm test` 37/37
(produkty, powiadomienia, identity — poprzednie testy dalej przechodzą)

Pozostałe punkty szablonu — (etap 3.2/3.3):
- dodanie produktów do koszyka — (etap 3.2)
- checkout — (etap 3.2)
- utworzenie zamówienia — (etap 3.2)
- zakończenie zamówienia, zmiana statusu na COMPLETED — (etap 3.3)
- Idempotency-Key — (etap 3.3)
- blokada ponownego wykonania operacji z innym kluczem dla zakończonego zamówienia — (etap 3.3)
- powiadomienia EMAIL i PUSH po zakończeniu zamówienia — (etap 3.3)
