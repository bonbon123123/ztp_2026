import { pool } from "../db";

export async function findCategory(id: number) {
  const { rows } = await pool.query(
    "SELECT id, name, min_price::float AS min_price, max_price::float AS max_price FROM categories WHERE id = $1",
    [id]
  );
  return rows[0] as { id: number; name: string; min_price: number; max_price: number } | undefined;
}

export async function isForbidden(name: string) {
  const { rows } = await pool.query(
    "SELECT 1 FROM forbidden_names WHERE LOWER($1) LIKE '%' || LOWER(name) || '%'",
    [name]
  );
  return rows.length > 0;
}