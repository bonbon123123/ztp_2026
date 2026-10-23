import { pool } from "../db";

export type ProductInput = { name: string; price: number; quantity: number; category_id: number };

const SELECT = `
  SELECT p.id, p.name, p.price::float AS price, p.quantity,
         p.category_id, c.name AS category
  FROM products p JOIN categories c ON c.id = p.category_id`;

export async function findAll() {
  const { rows } = await pool.query(`${SELECT} ORDER BY p.id`);
  return rows;
}

export async function findById(id: number) {
  const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
  return rows[0];
}

export async function nameTaken(name: string, excludeId = 0) {
  const { rows } = await pool.query(
    "SELECT 1 FROM products WHERE LOWER(name) = LOWER($1) AND id <> $2",
    [name, excludeId]
  );
  return rows.length > 0;
}

export async function create(p: ProductInput) {
  const { rows } = await pool.query(
    "INSERT INTO products (name, price, quantity, category_id) VALUES ($1,$2,$3,$4) RETURNING id",
    [p.name, p.price, p.quantity, p.category_id]
  );
  return findById(rows[0].id);
}

export async function update(id: number, p: ProductInput) {
  await pool.query(
    "UPDATE products SET name=$1, price=$2, quantity=$3, category_id=$4 WHERE id=$5",
    [p.name, p.price, p.quantity, p.category_id, id]
  );
  return findById(id);
}

export async function remove(id: number) {
  const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}