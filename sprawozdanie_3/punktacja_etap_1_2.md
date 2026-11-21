# Projekt 3 — punktowane elementy etapów 1 i 2 (13/20 pkt)

Ścieżki względem `Clone/nextboilerplate/` (chyba że podano inaczej). Zrzuty: `sprawozdanie_3/zrzuty/`.

## Etap 1 — 5 pkt (`sprawozdanie_etap_3_1.docx`)

### 1) Moduł `identity` w warstwach + endpointy + `/identity-docs` — 1 pkt
- Model: `lib/Model/user.ts`
- Repozytoria (SQL): `lib/Repository/user.ts`, `lib/Repository/userSession.ts`
- Serwis: `lib/Service/auth.ts` (`register`, `login`, `getCurrentUser`, `logout`)
- Web: `app/api/v1/auth/register|login|me|logout/route.ts`, `lib/authCookie.ts`
- Dokumentacja: `app/identity-docs/page.tsx`, `app/api/docs/identity/route.ts`, `identitySpec` w `lib/swagger.ts`
- Zrzut: `01`

### 2) Tabele, rejestracja, walidacja, PBKDF2 + salt — 2 pkt
- Tabele `users`, `user_sessions`: `sql/005.Identity.sql` (katalog główny repo)
- Walidacja: `lib/Service/authValidators.ts` — e-mail, hasło (≥8, wielka litera, cyfra, znak specjalny), potwierdzenie, imię/nazwisko → 422; istniejący e-mail → 409
- Hashowanie: `lib/Service/passwordHasher.ts` — PBKDF2-SHA256, 100 000 iteracji, losowy salt 16 B, zapis `salt$hash`, porównanie `timingSafeEqual`
- Zrzuty: `02`, `03`, `04`, `12` (hash w bazie)

### 3) Logowanie sesyjne z cookie `auth_token` — 2 pkt
- Cookie HttpOnly, SameSite=Lax, Max-Age=1800: `lib/authCookie.ts`
- Nadpisywanie: ponowny login usuwa starą sesję — `app/api/v1/auth/login/route.ts`
- Wygasanie: 30 min bezczynności → sesja usunięta, 401 — `isSessionExpired`, `getCurrentUser` w `lib/Service/auth.ts`
- Przedłużanie: `last_used_at = teraz` + `/me` odświeża cookie — `app/api/v1/auth/me/route.ts`, `touch` w `lib/Repository/userSession.ts`
- Zrzuty: `05`–`09`, `11` (Set-Cookie), `12` (sesja krok po kroku)

## Etap 2 — 8 pkt (`sprawozdanie_etap_3_2.docx`)

### 4) Moduł `cart` w warstwach + endpointy + `/cart-docs` — 2 pkt
- Model: `lib/Model/cart.ts`
- Repozytoria: `lib/Repository/cart.ts`, `lib/Repository/order.ts`
- Serwis: `lib/Service/cart.ts` (`getCart`, `addItem`, `updateItem`, `removeItem`, agregacja w `buildCartResponse`)
- Web: `app/api/v1/cart/route.ts` (GET), `cart/items/route.ts` (POST), `cart/items/[item_id]/route.ts` (PATCH, DELETE), `cart/checkout/route.ts` (POST) — wszystkie wymagają logowania (401 bez cookie)
- Tabele `carts`, `cart_items`, `orders`, `order_items`: `sql/006.Cart.sql`
- Dokumentacja: `app/cart-docs/page.tsx`, `app/api/docs/cart/route.ts`, `cartSpec` w `lib/swagger.ts`
- Zrzuty: `32-01`, `32-02`, `32-05`, `32-06`

### 5) Walidacja ilości i stanu magazynu — 1 pkt
- `lib/Service/cartValidators.ts` (`validateQuantity`, `validateStock`)
- ujemna / 0 / ułamek / tekst → 422; więcej niż stan → 422 (POST i PATCH); nieistniejący produkt → 404; duplikat → 409
- Zrzuty: `32-03` (ilość 1.5), `32-04` (więcej niż stan)

### 6) Checkout z Command Pattern — 4 pkt
- Komenda (same dane): `lib/Service/checkoutCommand.ts` → `CheckoutCommand { userId }`
- Handler (kroki procesu): `lib/Service/checkoutHandler.ts` → `handleCheckout`, całość w jednej transakcji:

| Wymaganie | Gdzie |
|---|---|
| utworzenie zamówienia | `createOrder` |
| przypisanie użytkownika | `userId` z sesji (nie z body) |
| numer `ZAM-YYYYMMDD-000001` | `generateOrderNumber` |
| snapshot | `createOrderItems` — nazwa, cena, ilość, wartość w `order_items` |
| aktualizacja magazynu | `decreaseStock` (+ `lockAndCheckStock`: blokada wierszy i ponowne sprawdzenie stanu) |
| wyczyszczenie koszyka | `cartRepo.clearItems` |

- pusty koszyk → 422; brak towaru przy checkout → 422 i nic się nie zapisuje
- Zrzuty: `32-07`, `32-08`, `32-11` (baza przed/po), `32-12` (brak towaru, snapshot ceny)

### 7) Historia zamówień — 1 pkt
- `lib/Service/order.ts`, `app/api/v1/orders/route.ts`, `app/api/v1/orders/[order_id]/route.ts`
- `GET /orders` — lista zamówień zalogowanego; `GET /orders/{id}` — numer, pozycje z cenami i ilościami, suma; cudze → 404
- Zrzuty: `32-09`, `32-10`

## Etap 3 — 7 pkt: niezrobione
State machine, CQRS, idempotencja, powiadomienia, testy pełnego procesu. (`orders.status` istnieje z domyślnym `PENDING`, bez logiki.)

**Etapy 1 i 2 = 13 pkt → ocena 3,5** (jeśli wszystko uznane).

## Szybkie sprawdzenie
1. `cd Clone/nextboilerplate && npm run dev`
2. http://localhost:3000/identity-docs → `register`, `login`
3. http://localhost:3000/cart-docs (cookie działa, ta sama domena) → `POST /cart/items` `{"product_id": 1, "quantity": 2}` → `GET /cart` → `POST /cart/checkout` → `GET /orders` → `GET /orders/{id}`
