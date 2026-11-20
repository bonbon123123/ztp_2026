import { NextResponse } from "next/server";
import * as auth from "../../../../../lib/Service/auth";
import { handleError } from "../../../../../lib/errors";
import { readAuthToken, setAuthCookie } from "../../../../../lib/authCookie";

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Identity]
 *     summary: Aktualnie zalogowany użytkownik (przedłuża sesję)
 *     description: >
 *       Sliding session — po stronie serwera last_used_at = teraz, po stronie klienta
 *       cookie jest ustawiane ponownie z Max-Age=1800. Sesja nieużywana dłużej niż 30 min
 *       jest usuwana z bazy i zwracane jest 401.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dane użytkownika
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Brak sesji, sesja wygasła lub konto nieaktywne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(req: Request) {
  try {
    const token = readAuthToken(req);
    const user = await auth.getCurrentUser(token);
    return setAuthCookie(NextResponse.json(user), token!);
  } catch (e) {
    return handleError(e);
  }
}
