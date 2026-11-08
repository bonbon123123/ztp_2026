import { Pool, PoolClient } from "pg";
import { DateTime } from "luxon";

// Testy integracyjne modułu powiadomień.
// Baza: każdy test w transakcji wycofywanej na końcu (jak w products.test.ts).
// Wysyłka: prawdziwa — do MailHoga (SMTP 1025, API 8025) i ntfy (8088), uruchomionych przez docker compose.

const realPool = new Pool({ connectionString: process.env.DATABASE_URL });
let mockClient: PoolClient;

jest.mock("../lib/db", () => ({
  pool: {
    query: (text: string, params?: unknown[]) => mockClient.query(text, params),
  },
}));

import { GET as GET_LIST, POST } from "../app/api/v1/notifications/route";
import { GET as GET_ONE } from "../app/api/v1/notifications/[id]/route";
import { POST as SEND_NOW } from "../app/api/v1/notifications/[id]/send-now/route";
import { POST as PROCESS_READY } from "../app/api/v1/notifications/process-ready/route";
import { GET as METRICS } from "../app/metrics/route";

const URL = "http://localhost/api/v1/notifications";
const MAILHOG_API = "http://localhost:8025/api/v2";
const NTFY = "http://localhost:8088";
const TOPIC = "test";

const RUN = Date.now(); // unikalny znacznik treści — żeby znaleźć wiadomości z tego przebiegu

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

// czas lokalny w Warszawie za 10 minut, bez offsetu (jak w testach referencyjnych)
const inTenMinutesWarsaw = () =>
  DateTime.now().setZone("Europe/Warsaw").plus({ minutes: 10 }).toFormat("yyyy-MM-dd'T'HH:mm:ss");

const pushPayload = (content = `Test PUSH ${RUN}`) => ({
  content,
  channel: "PUSH",
  recipient: TOPIC,
  scheduled_at: inTenMinutesWarsaw(),
  timezone: "Europe/Warsaw",
});

const emailPayload = (content = `Test EMAIL ${RUN}`) => ({
  content,
  channel: "EMAIL",
  recipient: "test@example.com",
  scheduled_at: inTenMinutesWarsaw(),
  timezone: "Europe/Warsaw",
});

async function create(payload: object) {
  const res = await POST(jsonRequest(URL, payload));
  expect(res.status).toBe(201);
  return res.json();
}

beforeEach(async () => {
  mockClient = await realPool.connect();
  await mockClient.query("BEGIN");
});

afterEach(async () => {
  await mockClient.query("ROLLBACK");
  mockClient.release();
});

afterAll(async () => {
  // dowód, że testy nie zostawiły śladów w bazie
  const { rows } = await realPool.query(
    "SELECT COUNT(*)::int AS n FROM notifications WHERE content LIKE $1",
    [`%${RUN}%`]
  );
  expect(rows[0].n).toBe(0);
  await realPool.end();
});

describe("GET /api/v1/notifications", () => {
  it("zwraca 200 i listę", async () => {
    const res = await GET_LIST();
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe("POST /api/v1/notifications", () => {
  it("tworzy PUSH, status PENDING, czas przeliczony do UTC", async () => {
    const payload = pushPayload();
    const created = await create(payload);

    const expectedUtc = DateTime.fromISO(payload.scheduled_at, { zone: "Europe/Warsaw" }).toUTC().toISO();
    expect(created).toMatchObject({
      content: payload.content,
      channel: "PUSH",
      recipient: TOPIC,
      timezone: "Europe/Warsaw",
      status: "PENDING",
    });
    expect(new Date(created.scheduled_at).toISOString()).toBe(new Date(expectedUtc!).toISOString());

    const list = await (await GET_LIST()).json();
    expect(list.some((n: { id: number }) => n.id === created.id)).toBe(true);
  });

  it("tworzy EMAIL widoczny w GET po id", async () => {
    const payload = emailPayload();
    const created = await create(payload);

    const res = await GET_ONE(new Request(`${URL}/${created.id}`), ctx(created.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: created.id,
      channel: "EMAIL",
      recipient: "test@example.com",
      status: "PENDING",
    });
  });
});

describe("walidacja", () => {
  it("odrzuca datę z przeszłości (422)", async () => {
    const past = DateTime.now().setZone("Europe/Warsaw").minus({ minutes: 5 }).toFormat("yyyy-MM-dd'T'HH:mm:ss");
    const res = await POST(jsonRequest(URL, { ...pushPayload(), scheduled_at: past }));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("planowana data wysyłki musi wskazywać przyszły moment")])
    );
  });

  it("odrzuca złą strefę, zły kanał i pustą treść (422)", async () => {
    const res = await POST(
      jsonRequest(URL, { content: " ", channel: "SMS", recipient: "x", scheduled_at: "2030-01-01T10:00", timezone: "Mars/Base" })
    );
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("content"),
        expect.stringContaining("channel"),
        expect.stringContaining("timezone"),
      ])
    );
  });
});

describe("POST /api/v1/notifications/{id}/send-now", () => {
  it("EMAIL → SENT i wiadomość dociera do MailHoga", async () => {
    const content = `Send-now EMAIL ${RUN}`;
    const created = await create(emailPayload(content));

    const res = await SEND_NOW(new Request(`${URL}/${created.id}/send-now`), ctx(created.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: created.id, channel: "EMAIL", status: "SENT" });

    const fetched = await (await GET_ONE(new Request(`${URL}/${created.id}`), ctx(created.id))).json();
    expect(fetched.status).toBe("SENT");

    const search = await (
      await fetch(`${MAILHOG_API}/search?kind=containing&query=${encodeURIComponent(content)}`)
    ).json();
    expect(search.total).toBeGreaterThanOrEqual(1);
    expect(search.items[0].Content.Headers.Subject[0]).toBe("Notification");
    expect(search.items[0].Content.Headers.To[0]).toBe("test@example.com");
  });

  it("PUSH → SENT i wiadomość dociera do ntfy", async () => {
    const content = `Send-now PUSH ${RUN}`;
    const created = await create(pushPayload(content));

    const res = await SEND_NOW(new Request(`${URL}/${created.id}/send-now`), ctx(created.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: created.id, channel: "PUSH", status: "SENT" });

    const lines = (await (await fetch(`${NTFY}/${TOPIC}/json?poll=1&since=1m`)).text())
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines.some((m) => m.message === content)).toBe(true);
  });

  it("drugie wysłanie tego samego powiadomienia → 422", async () => {
    const created = await create(pushPayload());
    await SEND_NOW(new Request(`${URL}/${created.id}/send-now`), ctx(created.id));

    const res = await SEND_NOW(new Request(`${URL}/${created.id}/send-now`), ctx(created.id));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Wykonać można wyłącznie powiadomienie w statusie PENDING.");
  });

  it("nieistniejące powiadomienie → 404", async () => {
    const res = await SEND_NOW(new Request(`${URL}/999999/send-now`), ctx(999999));
    expect(res.status).toBe(404);
  });

  it("niedostępny serwer ntfy → FAILED", async () => {
    const created = await create(pushPayload());
    const original = process.env.NTFY_URL;
    process.env.NTFY_URL = "http://localhost:1"; // nic tam nie nasłuchuje
    try {
      const res = await SEND_NOW(new Request(`${URL}/${created.id}/send-now`), ctx(created.id));
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe("FAILED");
    } finally {
      if (original === undefined) delete process.env.NTFY_URL;
      else process.env.NTFY_URL = original;
    }
  });
});

describe("POST /api/v1/notifications/process-ready", () => {
  it("wysyła powiadomienia, którym minął scheduled_at", async () => {
    // rekord z datą w przeszłości — wstawiony bezpośrednio, bo API nie pozwala na przeszłą datę
    const content = `Process-ready ${RUN}`;
    const { rows } = await mockClient.query(
      `INSERT INTO notifications (content, channel, recipient, scheduled_at, timezone, idempotency_key)
       VALUES ($1, 'PUSH', $2, now() - interval '1 minute', 'Europe/Warsaw', $3) RETURNING id`,
      [content, TOPIC, `notif_test_${RUN}`]
    );
    const id = rows[0].id;
    const future = await create(pushPayload()); // zaplanowane za 10 min — nie powinno zostać ruszone

    const res = await PROCESS_READY();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed_count).toBeGreaterThanOrEqual(1);

    const ready = await (await GET_ONE(new Request(`${URL}/${id}`), ctx(id))).json();
    expect(ready.status).toBe("SENT");
    const notYet = await (await GET_ONE(new Request(`${URL}/${future.id}`), ctx(future.id))).json();
    expect(notYet.status).toBe("PENDING");
  });
});

describe("idempotency_key", () => {
  it("serwer generuje unikalny klucz notif_… dla każdego powiadomienia", async () => {
    const a = await create(pushPayload());
    const b = await create(pushPayload());
    expect(a.idempotency_key).toMatch(/^notif_[A-Za-z0-9_-]{32}$/);
    expect(b.idempotency_key).toMatch(/^notif_/);
    expect(a.idempotency_key).not.toBe(b.idempotency_key);
  });

  it("klucz podany przez klienta jest ignorowany", async () => {
    const created = await create({ ...pushPayload(), idempotency_key: "moj_klucz" });
    expect(created.idempotency_key).not.toBe("moj_klucz");
    expect(created.idempotency_key).toMatch(/^notif_/);
  });
});

describe("GET /metrics", () => {
  const value = (text: string, name: string) => {
    const line = text.split("\n").find((l) => l.startsWith(name + " ") || l.startsWith(name + "{"));
    return Number(line?.split(" ").pop());
  };

  it("zwraca metryki w formacie Prometheus", async () => {
    const res = await METRICS();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    for (const name of ["sent", "failed", "pending", "cancelled"]) {
      expect(text).toContain(`# TYPE notifications_${name}_total gauge`);
      expect(text).toMatch(new RegExp(`^notifications_${name}_total \\d+$`, "m"));
    }
    expect(text).toContain('notifications_by_channel{status="SENT",channel="EMAIL"}');
    expect(text.match(/^notifications_by_channel\{/gm)).toHaveLength(8);
  });

  it("liczba oczekujących rośnie po utworzeniu powiadomienia", async () => {
    const before = await (await METRICS()).text();
    await create(emailPayload());
    const after = await (await METRICS()).text();
    expect(value(after, "notifications_pending_total")).toBe(value(before, "notifications_pending_total") + 1);
    expect(value(after, 'notifications_by_channel{status="PENDING",channel="EMAIL"}')).toBe(
      value(before, 'notifications_by_channel{status="PENDING",channel="EMAIL"}') + 1
    );
  });
});
