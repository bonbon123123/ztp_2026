import { NextResponse } from "next/server";
import * as auth from "../../../../../lib/Service/auth";
import * as cart from "../../../../../lib/Service/cart";
import { handleError } from "../../../../../lib/errors";
import { readAuthToken } from "../../../../../lib/authCookie";

/**
 * @swagger
 * /api/v1/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Dodanie produktu do koszyka
 *     description: Ilość musi być dodatnią liczbą całkowitą i nie większą niż stan magazynowy. Produkt, który już jest w koszyku → 409 (zmiana ilości przez PATCH).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemCreate'
 *     responses:
 *       201:
 *         description: Koszyk po dodaniu produktu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Brak aktywnej sesji
 *       404:
 *         description: Produkt nie istnieje
 *       409:
 *         description: Produkt jest już w koszyku
 *       422:
 *         description: Błędna ilość (ujemna, 0, ułamek, tekst) lub większa niż stan magazynu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  try {
    const user = await auth.getCurrentUser(readAuthToken(req));
    const body = await req.json().catch(() => null);
    return NextResponse.json(await cart.addItem(user.id, body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
