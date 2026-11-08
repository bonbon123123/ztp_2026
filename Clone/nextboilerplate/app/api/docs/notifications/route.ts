import { NextResponse } from "next/server";
import { notificationsSpec } from "../../../../lib/swagger";

export async function GET() {
  return NextResponse.json(notificationsSpec());
}
