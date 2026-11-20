import { NextResponse } from "next/server";
import * as auth from "../../../../../lib/Service/auth";
import { handleError } from "../../../../../lib/errors";

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Identity]
 *     summary: Rejestracja użytkownika
 *     description: Walidacja danych i złożoności hasła; hasło zapisywane jako PBKDF2-SHA256 z losowym saltem.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Utworzony użytkownik (bez hasła i hasha)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       409:
 *         description: Konto z takim adresem e-mail już istnieje
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Błąd walidacji (e-mail, słabe hasło, niezgodne potwierdzenie, imię/nazwisko)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    return NextResponse.json(await auth.register(body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
