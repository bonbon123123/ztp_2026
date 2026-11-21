import { NextResponse } from "next/server";
import * as auth from "../../../../lib/Service/auth";
import * as orders from "../../../../lib/Service/order";
import { handleError } from "../../../../lib/errors";
import { readAuthToken } from "../../../../lib/authCookie";

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Historia zamówień zalogowanego użytkownika
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista zamówień (od najnowszego)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OrderSummary'
 *       401:
 *         description: Brak aktywnej sesji
 */
export async function GET(req: Request) {
  try {
    const user = await auth.getCurrentUser(readAuthToken(req));
    return NextResponse.json(await orders.listOrders(user.id));
  } catch (e) {
    return handleError(e);
  }
}
