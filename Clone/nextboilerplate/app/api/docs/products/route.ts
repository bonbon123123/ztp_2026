import { NextResponse } from "next/server";
import { productsSpec } from "../../../../lib/swagger";

export async function GET() {
  return NextResponse.json(productsSpec());
}
