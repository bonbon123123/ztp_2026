import { NextResponse } from "next/server";
import * as service from "../../../../../lib/Service/notification";
import { handleError } from "../../../../../lib/errors";

/**
 * @swagger
 * /api/v1/notifications/process-ready:
 *   post:
 *     tags: [Notifications]
 *     summary: Przetwarzanie wsadowe gotowych powiadomień
 *     description: Wysyła wszystkie powiadomienia PENDING, których scheduled_at <= teraz (UTC) — to samo, co robi worker w każdym cyklu.
 *     responses:
 *       200:
 *         description: Liczba przetworzonych powiadomień
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processed_count:
 *                   type: integer
 *                   example: 2
 */
export async function POST() {
  try {
    return NextResponse.json({ processed_count: await service.processReadyNotifications() });
  } catch (e) {
    return handleError(e);
  }
}
