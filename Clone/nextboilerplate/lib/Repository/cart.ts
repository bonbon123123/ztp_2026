import { pool, type Queryable } from "../db";
import type { CartItemRow } from "../Model/cart";

const ITEM_SELECT = `
  SELECT ci.id AS item_id, ci.product_id, p.name AS product_name, p.price::float AS unit_price,
         ci.quantity, p.quantity AS available_quantity
  FROM cart_items ci JOIN products p ON p.id = ci.product_id`;

export type CartRow = { id: number; user_id: number; updated_at: string };

/** Koszyk użytkownika; jeśli jeszcze nie istnieje — tworzony (bez osobnego endpointu). */
export async function getOrCreateCart(userId: number, db: Queryable = pool): Promise<CartRow> {
  const found = await db.query(`SELECT id, user_id, updated_at FROM carts WHERE user_id = $1`, [userId]);
  if (found.rows[0]) return found.rows[0];
  // ON CONFLICT: dwa równoległe żądania nie utworzą dwóch koszyków (user_id UNIQUE)
  await db.query(`INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  const { rows } = await db.query(`SELECT id, user_id, updated_at FROM carts WHERE user_id = $1`, [userId]);
  return rows[0];
}

export async function findItems(cartId: number, db: Queryable = pool): Promise<CartItemRow[]> {
  const { rows } = await db.query(`${ITEM_SELECT} WHERE ci.cart_id = $1 ORDER BY ci.id`, [cartId]);
  return rows;
}

export async function findItem(cartId: number, itemId: number): Promise<CartItemRow | undefined> {
  const { rows } = await pool.query(`${ITEM_SELECT} WHERE ci.cart_id = $1 AND ci.id = $2`, [cartId, itemId]);
  return rows[0];
}

export async function hasProduct(cartId: number, productId: number) {
  const { rows } = await pool.query(`SELECT 1 FROM cart_items WHERE cart_id = $1 AND product_id = $2`, [cartId, productId]);
  return rows.length > 0;
}

export async function addItem(cartId: number, productId: number, quantity: number) {
  await pool.query(`INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)`, [cartId, productId, quantity]);
  await touch(cartId);
}

export async function updateItemQuantity(cartId: number, itemId: number, quantity: number) {
  await pool.query(`UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3`, [quantity, itemId, cartId]);
  await touch(cartId);
}

export async function removeItem(cartId: number, itemId: number) {
  const { rowCount } = await pool.query(`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`, [itemId, cartId]);
  await touch(cartId);
  return (rowCount ?? 0) > 0;
}

/** Czyszczenie koszyka po checkout. */
export async function clearItems(cartId: number, db: Queryable = pool) {
  await db.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
  await touch(cartId, db);
}

async function touch(cartId: number, db: Queryable = pool) {
  await db.query(`UPDATE carts SET updated_at = now() WHERE id = $1`, [cartId]);
}
