import { NextResponse } from "next/server";
import { buildMetrics } from "../../lib/Service/metrics";
import { handleError } from "../../lib/errors";

// GET /metrics — format tekstowy Prometheusa. Zapytanie do bazy = dane niecache'owane,
// więc przy cacheComponents handler działa w czasie żądania. Opis w Swaggerze: lib/swagger.ts (metricsPath).
export async function GET() {
  try {
    return new NextResponse(await buildMetrics(), {
      headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  } catch (e) {
    return handleError(e);
  }
}
