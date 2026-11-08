// Przykładowe powiadomienia do obserwacji metryk w Prometheusie.
// Uruchomienie (aplikacja musi działać: npm run dev):  npm run seed
// Co robi:
//  - 8 powiadomień EMAIL/PUSH zaplanowanych co ~20 s w ciągu najbliższych ~3 min
//    → worker wysyła je po kolei: notifications_pending_total spada, notifications_sent_total rośnie,
//  - 2 powiadomienia anulowane od razu (PENDING → CANCELLED),
//  - 1 powiadomienie oznaczone jako nieudane (PENDING → FAILED, dozwolone przejście maszyny stanów),
//  - 2 powiadomienia na jutro — zostają PENDING.
// Można uruchamiać wielokrotnie (każde uruchomienie dokłada nowe rekordy).

const BASE = process.env.SEED_BASE_URL ?? "http://localhost:3000";
const API = `${BASE}/api/v1/notifications`;
const TZ = "Europe/Warsaw";

// czas w UTC z offsetem "Z" — jednoznaczny niezależnie od strefy (patrz instrukcja 2.2, pkt 7)
const at = (secondsFromNow) => new Date(Date.now() + secondsFromNow * 1000).toISOString();

async function create(content, channel, secondsFromNow) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      channel,
      recipient: channel === "EMAIL" ? "student@example.com" : "test",
      scheduled_at: at(secondsFromNow),
      timezone: TZ,
    }),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`POST ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function setStatus(id, status) {
  const res = await fetch(`${API}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`PATCH ${res.status}: ${JSON.stringify(await res.json())}`);
}

const created = [];

// 8 powiadomień wysyłanych przez worker w ciągu ~3 min
for (let i = 0; i < 8; i++) {
  const channel = i % 2 === 0 ? "EMAIL" : "PUSH";
  const n = await create(`Demo ${channel} #${i + 1}`, channel, 30 + i * 20);
  created.push(`#${n.id} ${channel} → wysyłka ${n.scheduled_at}`);
}

// 2 anulowane
for (const channel of ["EMAIL", "PUSH"]) {
  const n = await create(`Demo ${channel} anulowane`, channel, 3600);
  await setStatus(n.id, "CANCELLED");
  created.push(`#${n.id} ${channel} → CANCELLED`);
}

// 1 nieudane
const failed = await create("Demo PUSH nieudane", "PUSH", 3600);
await setStatus(failed.id, "FAILED");
created.push(`#${failed.id} PUSH → FAILED`);

// 2 na jutro (zostają PENDING)
for (const channel of ["EMAIL", "PUSH"]) {
  const n = await create(`Demo ${channel} jutro`, channel, 24 * 3600);
  created.push(`#${n.id} ${channel} → PENDING (jutro)`);
}

console.log(`Utworzono ${created.length} powiadomień:\n  ${created.join("\n  ")}`);
console.log(`Metryki: ${BASE}/metrics   Prometheus: http://localhost:9090`);
