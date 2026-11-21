import { NextResponse } from "next/server";
import * as auth from "../../../../lib/Service/auth";
import * as cart from "../../../../lib/Service/cart";
import { handleError } from "../../../../lib/errors";
import { readAuthToken } from "../../../../lib/authCookie";

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Koszyk zalogowanego użytkownika
 *     description: Koszyk jest tworzony automatycznie przy pierwszym użyciu. Wartości pozycji, liczba sztuk i suma są liczone na bieżąco z aktualnych cen.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Koszyk z pozycjami i sumą
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Brak aktywnej sesji
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(req: Request) {
  try {
    const user = await auth.getCurrentUser(readAuthToken(req));
    return NextResponse.json(await cart.getCart(user.id));
  } catch (e) {
    return handleError(e);
  }
}
