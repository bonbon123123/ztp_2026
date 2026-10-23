import { Pool, PoolClient } from "pg";


const realPool = new Pool({ connectionString: process.env.DATABASE_URL });
let mockClient: PoolClient;

jest.mock("../lib/db", () => ({
    pool: {
        query: (text: string, params?: unknown[]) => mockClient.query(text, params),
    },
}));

import { POST } from "../app/api/v1/products/route";
import { PUT } from "../app/api/v1/products/[id]/route";
import { GET as GET_HISTORY } from "../app/api/v1/products/[id]/history/route";


const URL = "http://localhost/api/v1/products";

function jsonRequest(url: string, method: string, body: unknown) {
    return new Request(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

const validProduct = {
    name: "Jestbulka",
    price: 2.5,
    quantity: 10,
    category_id: 1,
};

// --- każdy test w osobnej transakcji, wycofywanej na końcu ---
beforeEach(async () => {
    mockClient = await realPool.connect();
    await mockClient.query("BEGIN");
});

afterEach(async () => {
    await mockClient.query("ROLLBACK");
    mockClient.release();
});

afterAll(async () => {
    // dowód, że testy nie zostawiły śladów
    const { rows } = await realPool.query(
        "SELECT COUNT(*)::int AS n FROM products WHERE name ILIKE 'Jest%'"
    );
    expect(rows[0].n).toBe(0);
    await realPool.end();
});

// --- testy ---
describe("POST /api/v1/products", () => {
    it("dodaje poprawny produkt (201)", async () => {
        const res = await POST(jsonRequest(URL, "POST", validProduct));
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body).toMatchObject({
            name: "Jestbulka",
            price: 2.5,
            quantity: 10,
            category_id: 1,
        });
        expect(body.id).toEqual(expect.any(Number));
    });

    it("odrzuca produkt z błędami walidacji (400)", async () => {
        const res = await POST(
            jsonRequest(URL, "POST", {
                name: "ab",          // za krótka
                price: 999,          // poza widełkami kategorii 1 (1–30)
                quantity: -1,        // ujemna
                category_id: 1,
            })
        );
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toBe("Błąd walidacji");
        expect(body.details).toEqual(
            expect.arrayContaining([
                expect.stringContaining("name"),
                expect.stringContaining("price"),
                expect.stringContaining("quantity"),
            ])
        );
    });
});

describe("PUT /api/v1/products/{id}", () => {
    it("poprawnie zmienia produkt (200)", async () => {
        const created = await (await POST(jsonRequest(URL, "POST", validProduct))).json();

        const changes = { name: "Jestrogal", price: 5, quantity: 3, category_id: 1 };
        const res = await PUT(jsonRequest(`${URL}/${created.id}`, "PUT", changes), ctx(created.id));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({ id: created.id, ...changes });
    });
});

describe("GET /api/v1/products/{id}/history", () => {
    it("zapisuje utworzenie i zmianę produktu", async () => {
        const created = await (await POST(jsonRequest(URL, "POST", validProduct))).json();
        await PUT(
            jsonRequest(`${URL}/${created.id}`, "PUT", { ...validProduct, price: 7, quantity: 1 }),
            ctx(created.id)
        );

        const res = await GET_HISTORY(new Request(`${URL}/${created.id}/history`), ctx(created.id));
        const history = await res.json();

        expect(res.status).toBe(200);
        expect(history).toHaveLength(2);

        expect(history[0].action).toBe("CREATE");
        expect(history[0].old_data).toBeNull();
        expect(Number(history[0].new_data.price)).toBe(2.5);

        expect(history[1].action).toBe("UPDATE");
        expect(Number(history[1].old_data.price)).toBe(2.5);
        expect(Number(history[1].new_data.price)).toBe(7);
        expect(history[1].new_data.quantity).toBe(1);
    });
});