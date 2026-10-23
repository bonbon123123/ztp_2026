import { NextResponse } from "next/server";

export class AppError extends Error {
  constructor(public status: number, message: string, public details?: string[]) {
    super(message);
  }
}

export function handleError(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
  }
  if ((e as { code?: string })?.code === "23505") {
    return NextResponse.json({ error: "Nazwa już istnieje" }, { status: 409 });
  }
  console.error(e);
  return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
}