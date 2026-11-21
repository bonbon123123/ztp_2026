import { NextResponse } from "next/server";
import * as auth from "../../../../../../lib/Service/auth";
import * as cart from "../../../../../../lib/Service/cart";
import { handleError } from "../../../../../../lib/errors";
import { readAuthToken } from "../../../../../../lib/authCookie";

type Ctx = { params: Promise<{ item_id: string }> };

/**
 * @swagger
 * /api/v1/cart/items/{item_id}:
 *   patch:
 *     tags: [Cart]
 *     summary: Zmiana ilości produktu w koszyku
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: item_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemUpdate'
 *     responses:
 *       200:
 *         description: Koszyk po zmianie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Brak aktywnej sesji
 *       404:
 *         description: Pozycja nie istnieje w koszyku użytkownika
 *       422:
 *         description: Błędna ilość lub większa niż stan magazynu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await auth.getCurrentUser(readAuthToken(req));
    const { item_id } = await params;
    const body = await req.json().catch(() => null);
    return NextResponse.json(await cart.updateItem(user.id, item_id, body));
  } catch (e) {
    return handleError(e);
  }
}

/**
 * @swagger
 * /api/v1/cart/items/{item_id}:
 *   delete:
 *     tags: [Cart]
 *     summary: Usunięcie pozycji z koszyka
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: item_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Koszyk po usunięciu pozycji
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Brak aktywnej sesji
 *       404:
 *         description: Pozycja nie istnieje w koszyku użytkownika
 */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const user = await auth.getCurrentUser(readAuthToken(req));
    const { item_id } = await params;
    return NextResponse.json(await cart.removeItem(user.id, item_id));
  } catch (e) {
    return handleError(e);
  }
}
