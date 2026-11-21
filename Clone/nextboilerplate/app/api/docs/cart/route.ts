import { NextResponse } from "next/server";
import { cartSpec } from "../../../../lib/swagger";

export async function GET() {
  return NextResponse.json(cartSpec());
}
