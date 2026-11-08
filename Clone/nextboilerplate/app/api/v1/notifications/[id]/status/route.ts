import { NextResponse } from "next/server";
import * as service from "../../../../../../lib/Service/notification";
import { handleError } from "../../../../../../lib/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/v1/notifications/{id}/status:
 *   patch:
 *     tags: [Notifications]
 *     summary: Zmiana statusu (maszyna stanów)
 *     description: Dozwolone tylko PENDING → SENT / FAILED / CANCELLED. SENT, FAILED i CANCELLED są stanami końcowymi.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/NotificationStatus'
 *     responses:
 *       200:
 *         description: Zaktualizowane powiadomienie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Nie znaleziono
 *       422:
 *         description: Niedozwolone przejście lub nieznany status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    return NextResponse.json(await service.updateStatus(id, body));
  } catch (e) {
    return handleError(e);
  }
}
