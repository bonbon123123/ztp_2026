import { NextResponse } from "next/server";
import * as service from "../../../../../../lib/Service/product";
import { handleError } from "../../../../../../lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await service.getHistory(id));
  } catch (e) {
    return handleError(e);
  }
}