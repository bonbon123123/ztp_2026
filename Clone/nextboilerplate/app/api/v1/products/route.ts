import { NextResponse } from "next/server";
import * as service from "../../../../lib/Service/product";
import { handleError } from "../../../../lib/errors";

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     summary: Lista produktów
 *     responses:
 *       200:
 *         description: Wszystkie produkty
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
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
 * /api/v1/products:
 *   post:
 *     tags: [Products]
 *     summary: Dodanie produktu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Utworzony produkt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Błąd walidacji
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