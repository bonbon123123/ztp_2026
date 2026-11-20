import { NextResponse } from "next/server";
import { identitySpec } from "../../../../lib/swagger";

export async function GET() {
  return NextResponse.json(identitySpec());
}
