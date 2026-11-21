import { NextResponse } from "next/server";
import * as auth from "../../../../../lib/Service/auth";
import { createCheckoutCommand } from "../../../../../lib/Service/checkoutCommand";
import { handleCheckout } from "../../../../../lib/Service/checkoutHandler";
import { handleError } from "../../../../../lib/errors";
import { readAuthToken } from "../../../../../lib/authCookie";

/**
 * @swagger
 * /api/v1/cart/checkout:
 *   post:
 *     tags: [Cart]
 *     summary: Złożenie zamówienia z koszyka (checkout)
 *     description: >
 *       Jedna operacja biznesowa (Command Pattern, jedna transakcja): walidacja koszyka i stanu magazynu,
 *       utworzenie zamówienia z numerem ZAM-YYYYMMDD-000001, snapshot pozycji, zmniejszenie stanu
 *       magazynowego i wyczyszczenie koszyka.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Utworzone zamówienie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Brak aktywnej sesji
 *       422:
 *         description: Pusty koszyk lub niewystarczający stan magazynowy (nic nie zostaje zapisane)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  try {
    const user = await auth.getCurrentUser(readAuthToken(req));
    const command = createCheckoutCommand(user.id);
    return NextResponse.json(await handleCheckout(command), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
