import { NextResponse } from "next/server";
import * as service from "../../../../lib/Service/product";
import { handleError } from "../../../../lib/errors";

export async function GET() {
  try {
    return NextResponse.json(await service.list());
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    return NextResponse.json(await service.create(body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}