import { NextResponse } from "next/server";
import * as auth from "../../../../../lib/Service/auth";
import { handleError } from "../../../../../lib/errors";
import { clearAuthCookie, readAuthToken } from "../../../../../lib/authCookie";

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Identity]
 *     summary: Wylogowanie — usuwa sesję z bazy i cookie z przeglądarki
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       204:
 *         description: Wylogowano (także gdy sesji już nie było)
 */
export async function POST(req: Request) {
  try {
    await auth.logout(readAuthToken(req));
    return clearAuthCookie(new NextResponse(null, { status: 204 }));
  } catch (e) {
    return handleError(e);
  }
}
