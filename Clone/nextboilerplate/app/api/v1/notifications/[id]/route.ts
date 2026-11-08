import { NextResponse } from "next/server";
import * as service from "../../../../../lib/Service/notification";
import { handleError } from "../../../../../lib/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Powiadomienie po id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Powiadomienie
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
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await service.get(id));
  } catch (e) {
    return handleError(e);
  }
}
