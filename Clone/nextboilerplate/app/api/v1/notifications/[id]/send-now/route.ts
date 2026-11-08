import { NextResponse } from "next/server";
import * as service from "../../../../../../lib/Service/notification";
import { handleError } from "../../../../../../lib/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/v1/notifications/{id}/send-now:
 *   post:
 *     tags: [Notifications]
 *     summary: Wymuszenie wysyłki powiadomienia od razu
 *     description: Wysyła powiadomienie niezależnie od scheduled_at. Sukces → SENT, błąd wysyłki → FAILED. Tylko dla statusu PENDING.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Powiadomienie po próbie wysyłki (status SENT lub FAILED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Nie znaleziono
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Powiadomienie nie jest w statusie PENDING
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await service.sendNow(id));
  } catch (e) {
    return handleError(e);
  }
}
