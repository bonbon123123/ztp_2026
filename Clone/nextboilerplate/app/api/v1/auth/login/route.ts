import { NextResponse } from "next/server";
import * as auth from "../../../../../lib/Service/auth";
import { handleError } from "../../../../../lib/errors";
import { readAuthToken, setAuthCookie } from "../../../../../lib/authCookie";

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Identity]
 *     summary: Logowanie — tworzy sesję i ustawia cookie auth_token
 *     description: >
 *       Jeśli żądanie ma już cookie auth_token, poprzednia sesja jest najpierw usuwana z bazy
 *       (jedna aktywna sesja na przeglądarkę). Odpowiedź ustawia
 *       `Set-Cookie: auth_token=...; Max-Age=1800; Path=/; HttpOnly; SameSite=lax`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Zalogowano
 *         headers:
 *           Set-Cookie:
 *             description: auth_token (HttpOnly, SameSite=lax, Max-Age=1800)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Niepoprawny e-mail lub hasło
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Konto nieaktywne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    // nadpisanie sesji: stara sesja z tej przeglądarki znika, zanim powstanie nowa
    const previous = readAuthToken(req);
    if (previous) await auth.logout(previous);

    const { user, token } = await auth.login(body);
    return setAuthCookie(NextResponse.json({ user }), token);
  } catch (e) {
    return handleError(e);
  }
}
