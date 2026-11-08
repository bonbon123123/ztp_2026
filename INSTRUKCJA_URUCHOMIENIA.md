# Uruchomienie projektu na nowym komputerze

Projekt: `Clone/nextboilerplate` (Next.js + PostgreSQL + MailHog + ntfy + Prometheus).

## 0. Wymagania

- **Git**
- **Node.js 20 lub nowszy** (projekt był robiony na Node 26), razem z npm
- **Docker** (na Windowsie/macOS Docker Desktop)

## 1. Pobranie repozytorium

```bash
git clone https://github.com/bonbon123123/ztp_2026.git
cd ztp_2026/Clone/nextboilerplate
npm install
```

## 2. Baza danych PostgreSQL

Postgres działa w osobnym kontenerze, a tabele tworzą pliki z katalogu `ztp_2026/sql/`.

```bash
docker run -d --name postgres_ztp_project1 --restart unless-stopped \
  -e POSTGRES_DB=appdb -e POSTGRES_USER=appuser -e POSTGRES_PASSWORD=apppassword \
  -p 5432:5432 postgres:16
```

Odczekaj ~5 s i wgraj tabele po kolei (z katalogu `ztp_2026/`):

```bash
cd ../..          # jesteś w ztp_2026/
for f in sql/001.Create.Tables sql/002.History.Table.sql sql/003.Notifications.sql sql/004.Notifications.Idempotency.sql; do
  docker exec -i postgres_ztp_project1 psql -U appuser appdb < "$f"
done
```

Windows (PowerShell), zamiast pętli wyżej:

```powershell
Get-Content sql\001.Create.Tables, sql\002.History.Table.sql, sql\003.Notifications.sql, sql\004.Notifications.Idempotency.sql | docker exec -i postgres_ztp_project1 psql -U appuser appdb
```

Sprawdzenie: `docker exec postgres_ztp_project1 psql -U appuser appdb -c "\dt"` powinno pokazać
5 tabel: categories, forbidden_names, notifications, product_history, products.

## 3. Plik .env

Plik `.env` nie jest w repozytorium. Utwórz `Clone/nextboilerplate/.env` z jedną linią:

```
DATABASE_URL=postgres://appuser:apppassword@localhost:5432/appdb
```

## 4. MailHog, ntfy i Prometheus

```bash
cd Clone/nextboilerplate
docker compose up -d
```

Kontenery mają `restart: unless-stopped`, więc po restarcie komputera wstają same.

**Windows / macOS:** Prometheus ma w `docker-compose.yml` ustawione `network_mode: host`.
W Docker Desktop host networking trzeba włączyć (Settings → Resources → Network →
„Enable host networking”, Docker Desktop 4.34+). Jeśli tej opcji nie ma:
1. w `docker-compose.yml`, w serwisie `prometheus`, zamień `network_mode: host` na:
   ```yaml
       ports:
         - "9090:9090"
   ```
2. w `.config/prometheus.yml` zmień target na `host.docker.internal:3000`,
3. `docker compose up -d` jeszcze raz.

## 5. Uruchomienie aplikacji

```bash
npm run dev
```

W terminalu powinno pojawić się `[WORKER] Uruchomiono worker. Interwał: 5 s`.

| Co | Adres |
|---|---|
| Strona główna (formularze, lista powiadomień) | http://localhost:3000 |
| Swagger — produkty | http://localhost:3000/product-docs |
| Swagger — powiadomienia | http://localhost:3000/notifications-docs |
| Metryki | http://localhost:3000/metrics |
| MailHog (maile) | http://localhost:8025 |
| ntfy (push, topic `test`) | http://localhost:8088/test |
| Prometheus | http://localhost:9090 |

Swagger UI ładuje się z internetu (CDN), więc dokumentacja wymaga połączenia.

## 6. Testy

Przy działającej bazie, MailHogu i ntfy (kroki 2 i 4):

```bash
npm test
```

Powinno przejść 19/19. Testy nie zmieniają bazy (transakcja + rollback), ale dokładają
wiadomości testowe w MailHogu i ntfy.

## 7. Przykładowe dane dla Prometheusa

Przy działającej aplikacji (`npm run dev`), w drugim terminalu:

```bash
npm run seed
```

Dodaje 13 powiadomień. Przez ~3 min worker je wysyła — w Prometheusie (http://localhost:9090)
wpisz np. `notifications_pending_total` albo `notifications_by_channel` i przełącz na Graph.

## Najczęstsze problemy

- **`ECONNREFUSED 127.0.0.1:5432`** — kontener Postgresa nie działa: `docker start postgres_ztp_project1`.
- **`relation "notifications" does not exist`** — nie wgrane pliki SQL (krok 2).
- **Port zajęty (5432, 8025, 1025, 8088, 9090)** — na tym komputerze działa już coś na tym porcie;
  zatrzymaj to albo zmień port po lewej stronie w `docker-compose.yml` / `docker run -p`.
- **Prometheus: target DOWN** — aplikacja nie działa na :3000 albo (Windows/macOS) patrz krok 4.
- **Worker nic nie wysyła** — sprawdź, czy w logu `npm run dev` jest `[WORKER] Uruchomiono worker`
  i czy powiadomienie ma status PENDING z datą, która już minęła.
