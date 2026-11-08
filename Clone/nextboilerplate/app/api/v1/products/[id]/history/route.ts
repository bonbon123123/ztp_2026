import { NextResponse } from "next/server";
import * as service from "../../../../../../lib/Service/product";
import { handleError } from "../../../../../../lib/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/v1/products/{id}/history:
 *   get:
 *     tags: [Products]
 *     summary: Historia zmian produktu
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Wpisy historii (CREATE/UPDATE/DELETE, stary i nowy stan)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductHistory'
 *       404:
 *         description: Brak historii
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await service.getHistory(id));
  } catch (e) {
    return handleError(e);
  }
}