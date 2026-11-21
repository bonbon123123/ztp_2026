# Projekt 3 (0 - 20 pkt)

| Etap 1 - 5 pkt | Etap 2 - 8 pkt | Etap 3 - 7 pkt |
|---|---|---|
| Moduł `identity` w architekturze warstwowej oraz endpointy `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout` z osobną dokumentacją `/identity-docs` - **1 pkt** | Moduł `cart` w architekturze warstwowej, endpointy koszyka oraz osobna dokumentacja `/cart-docs` - **2 pkt** | State Machine zamówień (`PENDING`, `COMPLETED`, `CANCELLED`) i walidacja przejść - **1 pkt** |
| Tabele `users` i `user_sessions`, rejestracja, walidacja i hashowanie PBKDF2 + salt - **2 pkt** | Walidacja ilości produktów i dostępności magazynowej - **1 pkt** | Rozwinięty Command Pattern, handlery i CQRS (query service) - **2 pkt** |
| Logowanie sesyjne z cookie `auth_token`, nadpisywaniem, wygasaniem i przedłużaniem sesji - **2 pkt** | Checkout z Command Pattern: utworzenie zamówienia, przypisanie użytkownika, numer `ZAM-YYYYMMDD-000001`, snapshot, aktualizacja magazynu i wyczyszczenie koszyka - **4 pkt** | Idempotencja `Idempotency-Key`, `processed_commands` i blokada ponownego zakończenia zamówienia - **2 pkt** |
| | Historia zamówień: `GET /orders` i `GET /orders/{order_id}` z pozycjami, cenami i sumą - **1 pkt** | Powiadomienia EMAIL i PUSH po zakończeniu zamówienia, bez duplikatów, obsługiwane przez workera - **1 pkt** |
| | | Testy integracyjne pełnego procesu, statusów, idempotencji i powiadomień (`test_basket.py`) - **1 pkt** |
| **Razem: 5 pkt** | **Razem: 8 pkt** | **Razem: 7 pkt** |

## Skala ocen

| Punkty | Ocena |
|---:|:---:|
| 0-10 | 2,0 |
| 11-12 | 3,0 |
| 13-14 | 3,5 |
| 15-16 | 4,0 |
| 17-18 | 4,5 |
| 19-20 | 5,0 |
