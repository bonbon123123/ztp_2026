import { Pool, PoolClient } from "pg";

// Testy integracyjne modułu identity (rejestracja, logowanie, sesja w cookie auth_token).
// Baza: każdy test w transakcji wycofywanej na końcu (jak w products.test.ts / notifications.test.ts).

const realPool = new Pool({ connectionString: process.env.DATABASE_URL });
let mockClient: PoolClient;

jest.mock("../lib/db", () => ({
  pool: {
    query: (text: string, params?: unknown[]) => mockClient.query(text, params),
  },
}));

import { POST as REGISTER } from "../app/api/v1/auth/register/route";
import { POST as LOGIN } from "../app/api/v1/auth/login/route";
import { GET as ME } from "../app/api/v1/auth/me/route";
import { POST as LOGOUT } from "../app/api/v1/auth/logout/route";
import { SESSION_MAX_AGE_SECONDS } from "../lib/Service/auth";

const BASE = "http://localhost/api/v1/auth";
const RUN = Date.now(); // unikalny znacznik — e-maile z tego przebiegu
const PASSWORD = "StrongPass1!";

const email = (name: string) => `${name}.${RUN}@example.com`;

const registerPayload = (mail: string, overrides: object = {}) => ({
  email: mail,
  password: PASSWORD,
  confirm_password: PASSWORD,
  first_name: "Jan",
  last_name: "Kowalski",
  ...overrides,
});

function jsonRequest(path: string, body?: unknown, cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = `auth_token=${cookie}`;
  return new Request(`${BASE}/${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const meRequest = (cookie?: string) =>
  new Request(`${BASE}/me`, { headers: cookie ? { Cookie: `auth_token=${cookie}` } : {} });

/** Wartość auth_token z nagłówka Set-Cookie odpowiedzi. */
function tokenFrom(res: Response) {
  const m = /auth_token=([^;]*)/.exec(res.headers.get("set-cookie") ?? "");
  return m ? m[1] : null;
}

async function registerAndLogin(name: string) {
  const mail = email(name);
  expect((await REGISTER(jsonRequest("register", registerPayload(mail)))).status).toBe(201);
  const res = await LOGIN(jsonRequest("login", { email: mail, password: PASSWORD }));
  expect(res.status).toBe(200);
  return { mail, token: tokenFrom(res)!, res };
}

const sessionByToken = async (token: string) =>
  (await mockClient.query("SELECT * FROM user_sessions WHERE session_token = $1", [token])).rows[0];

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
  const { rows } = await realPool.query("SELECT COUNT(*)::int AS n FROM users WHERE email LIKE $1", [`%.${RUN}@%`]);
  expect(rows[0].n).toBe(0);
  await realPool.end();
});

describe("POST /api/v1/auth/register", () => {
  it("201, zwraca użytkownika bez hasła; w bazie hash PBKDF2 w formacie salt$hash", async () => {
    const mail = email("rejestracja");
    const res = await REGISTER(jsonRequest("register", registerPayload(mail)));
    expect(res.status).toBe(201);
    const user = await res.json();
    expect(user).toMatchObject({ email: mail, first_name: "Jan", last_name: "Kowalski", is_active: true });
    expect(user.id).toEqual(expect.any(Number));
    expect(user).not.toHaveProperty("password_hash");
    expect(user).not.toHaveProperty("password");

    const { rows } = await mockClient.query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    const stored: string = rows[0].password_hash;
    expect(stored).not.toContain(PASSWORD);
    expect(stored).toMatch(/^[0-9a-f]{32}\$[0-9a-f]{64}$/); // 16 B salt + 32 B SHA-256, hex
  });

  it("to samo hasło u dwóch użytkowników daje różne hashe (losowy salt)", async () => {
    await REGISTER(jsonRequest("register", registerPayload(email("salt1"))));
    await REGISTER(jsonRequest("register", registerPayload(email("salt2"))));
    const { rows } = await mockClient.query("SELECT password_hash FROM users WHERE email IN ($1, $2)", [
      email("salt1"),
      email("salt2"),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].password_hash).not.toBe(rows[1].password_hash);
  });

  it.each([
    ["za krótkie", "Ab1!", "co najmniej 8 znaków"],
    ["bez wielkiej litery", "weakpass1!", "wielką literę"],
    ["bez cyfry", "WeakPass!!", "cyfrę"],
    ["bez znaku specjalnego", "WeakPass11", "znak specjalny"],
  ])("422 dla słabego hasła: %s", async (_label, password, message) => {
    const res = await REGISTER(
      jsonRequest("register", registerPayload(email("slabe"), { password, confirm_password: password }))
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.join(" ")).toContain(message);
  });

  it("422 gdy hasło i potwierdzenie się różnią", async () => {
    const res = await REGISTER(
      jsonRequest("register", registerPayload(email("rozne"), { confirm_password: "OtherPass1!" }))
    );
    expect(res.status).toBe(422);
    expect((await res.json()).details).toContain(
      "confirm_password: hasło i potwierdzenie hasła muszą być takie same"
    );
  });

  it("422 dla złego e-maila i za krótkiego imienia", async () => {
    const res = await REGISTER(jsonRequest("register", registerPayload("to-nie-email", { first_name: "J" })));
    expect(res.status).toBe(422);
    const details: string[] = (await res.json()).details;
    expect(details.some((d) => d.startsWith("email:"))).toBe(true);
    expect(details.some((d) => d.startsWith("first_name:"))).toBe(true);
  });

  it("409 gdy konto z tym e-mailem już istnieje (bez względu na wielkość liter)", async () => {
    const mail = email("duplikat");
    expect((await REGISTER(jsonRequest("register", registerPayload(mail)))).status).toBe(201);
    const res = await REGISTER(jsonRequest("register", registerPayload(mail.toUpperCase())));
    expect(res.status).toBe(409);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("200, ustawia cookie auth_token (HttpOnly, SameSite=lax, Max-Age=1800) i zapisuje sesję", async () => {
    const { mail, token, res } = await registerAndLogin("login");
    expect((await res.json()).user.email).toBe(mail);

    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    expect(cookie).toContain("Path=/");
    expect(SESSION_MAX_AGE_SECONDS).toBe(1800);

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(await sessionByToken(token)).toBeDefined();
  });

  it("401 dla złego hasła i nieistniejącego konta, bez cookie", async () => {
    const mail = email("zlehaslo");
    await REGISTER(jsonRequest("register", registerPayload(mail)));
    const bad = await LOGIN(jsonRequest("login", { email: mail, password: "WrongPass1!" }));
    expect(bad.status).toBe(401);
    expect(tokenFrom(bad)).toBeNull();
    const none = await LOGIN(jsonRequest("login", { email: email("brak"), password: PASSWORD }));
    expect(none.status).toBe(401);
  });

  it("403 dla nieaktywnego konta", async () => {
    const mail = email("nieaktywny");
    await REGISTER(jsonRequest("register", registerPayload(mail)));
    await mockClient.query("UPDATE users SET is_active = FALSE WHERE email = $1", [mail]);
    const res = await LOGIN(jsonRequest("login", { email: mail, password: PASSWORD }));
    expect(res.status).toBe(403);
  });

  it("ponowne logowanie z cookie nadpisuje sesję — stara znika z bazy", async () => {
    const { token: first } = await registerAndLogin("nadpisanie");
    const other = email("nadpisanie2");
    await REGISTER(jsonRequest("register", registerPayload(other)));

    const res = await LOGIN(jsonRequest("login", { email: other, password: PASSWORD }, first));
    expect(res.status).toBe(200);
    const second = tokenFrom(res)!;
    expect(second).not.toBe(first);
    expect(await sessionByToken(first)).toBeUndefined();
    expect(await sessionByToken(second)).toBeDefined();

    // stare cookie już nic nie daje
    expect((await ME(meRequest(first))).status).toBe(401);
    expect((await (await ME(meRequest(second))).json()).email).toBe(other);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("200 z cookie, przedłuża sesję (last_used_at) i odświeża cookie", async () => {
    const { mail, token } = await registerAndLogin("me");
    // cofamy ostatnią aktywność o 10 min — nadal w limicie 30 min
    await mockClient.query(
      "UPDATE user_sessions SET last_used_at = now() - interval '10 minutes' WHERE session_token = $1",
      [token]
    );
    const before = new Date((await sessionByToken(token)).last_used_at).getTime();

    const res = await ME(meRequest(token));
    expect(res.status).toBe(200);
    expect((await res.json()).email).toBe(mail);
    expect(res.headers.get("set-cookie")).toContain(`auth_token=${token}`);
    expect(res.headers.get("set-cookie")).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);

    const after = new Date((await sessionByToken(token)).last_used_at).getTime();
    expect(after - before).toBeGreaterThan(9 * 60 * 1000);
  });

  it("401 bez cookie i z nieznanym tokenem", async () => {
    expect((await ME(meRequest())).status).toBe(401);
    expect((await ME(meRequest("nieistniejacy-token"))).status).toBe(401);
  });

  it("401 'Sesja wygasła' po 30 min bezczynności, rekord sesji usunięty", async () => {
    const { token } = await registerAndLogin("wygasla");
    await mockClient.query(
      "UPDATE user_sessions SET last_used_at = now() - interval '31 minutes' WHERE session_token = $1",
      [token]
    );
    const res = await ME(meRequest(token));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Sesja wygasła");
    expect(await sessionByToken(token)).toBeUndefined();
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("204, usuwa sesję z bazy i kasuje cookie; potem /me → 401", async () => {
    const { token } = await registerAndLogin("logout");
    const res = await LOGOUT(jsonRequest("logout", undefined, token));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/auth_token=;.*Max-Age=0/);
    expect(await sessionByToken(token)).toBeUndefined();
    expect((await ME(meRequest(token))).status).toBe(401);
  });

  it("204 także bez cookie", async () => {
    expect((await LOGOUT(jsonRequest("logout"))).status).toBe(204);
  });
});
