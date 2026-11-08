import { NextResponse } from "next/server";
import * as service from "../../../../../lib/Service/product";
import { handleError } from "../../../../../lib/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Produkt po id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produkt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produkt nie istnieje
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

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Pełna aktualizacja produktu
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
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Zaktualizowany produkt
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
 *       404:
 *         description: Produkt nie istnieje
 */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    return NextResponse.json(await service.update(id, body));
  } catch (e) {
    return handleError(e);
  }
}

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Usunięcie produktu
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usunięto
 *       404:
 *         description: Produkt nie istnieje
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await service.remove(id));
  } catch (e) {
    return handleError(e);
  }
}

/**
 * @swagger
 * /api/v1/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Częściowa aktualizacja produktu
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
 *             $ref: '#/components/schemas/ProductPatch'
 *     responses:
 *       200:
 *         description: Zaktualizowany produkt
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
 *       404:
 *         description: Produkt nie istnieje
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    return NextResponse.json(await service.patch(id, body));
  } catch (e) {
    return handleError(e);
  }
}

