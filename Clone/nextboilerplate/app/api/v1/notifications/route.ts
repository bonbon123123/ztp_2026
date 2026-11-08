import { NextResponse } from "next/server";
import * as service from "../../../../lib/Service/notification";
import { handleError } from "../../../../lib/errors";

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Lista powiadomień
 *     responses:
 *       200:
 *         description: Wszystkie powiadomienia (scheduled_at w UTC)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 */
export async function GET() {
  try {
    return NextResponse.json(await service.list());
  } catch (e) {
    return handleError(e);
  }
}

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Utworzenie powiadomienia (status początkowy PENDING)
 *     description: scheduled_at bez offsetu jest interpretowane jako czas lokalny w strefie `timezone` i zapisywane w UTC.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationCreate'
 *     responses:
 *       201:
 *         description: Utworzone powiadomienie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       422:
 *         description: Błąd walidacji (strefa, data z przeszłości, pusta treść, nieistniejący produkt...)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    return NextResponse.json(await service.create(body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
