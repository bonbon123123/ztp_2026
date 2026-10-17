import { NextResponse } from "next/server";
import { pool } from "../../../../../lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  const { id } = await params;
  const num = Number(id);

  const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [num]);

  return NextResponse.json(rows[0]);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  const { id } = await params;
  const num = Number(id);

  const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [num]);

  return NextResponse.json(rows[0]);
}