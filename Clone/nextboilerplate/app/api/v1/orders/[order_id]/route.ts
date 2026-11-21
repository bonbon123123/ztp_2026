import { NextResponse } from "next/server";
import * as auth from "../../../../../lib/Service/auth";
import * as orders from "../../../../../lib/Service/order";
import { handleError } from "../../../../../lib/errors";
import { readAuthToken } from "../../../../../lib/authCookie";

type Ctx = { params: Promise<{ order_id: string }> };

/**
 * @swagger
 * /api/v1/orders/{order_id}:
 *   get:
 *     tags: [Orders]
 *     summary: Szczegóły zamówienia z pozycjami
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zamówienie z pozycjami (ceny z chwili zakupu) i sumą
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Brak aktywnej sesji
 *       404:
 *         description: Zamówienie nie istnieje lub należy do innego użytkownika
 */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const user = await auth.getCurrentUser(readAuthToken(req));
    const { order_id } = await params;
    return NextResponse.json(await orders.getOrder(user.id, order_id));
  } catch (e) {
    return handleError(e);
  }
}
