import { NextResponse } from "next/server";
import * as service from "../../../../../lib/Service/product";
import { handleError } from "../../../../../lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await service.get(id));
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    return NextResponse.json(await service.update(id, body));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await service.remove(id));
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    return NextResponse.json(await service.patch(id, body));
  } catch (e) {
    return handleError(e);
  }
}