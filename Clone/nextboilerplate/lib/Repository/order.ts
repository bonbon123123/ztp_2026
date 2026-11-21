import { pool, type Queryable } from "../db";
import type { OrderItem, OrderSummary } from "../Model/cart";

const SUMMARY = `id, order_number, status, items_count, total_amount::float AS total_amount, created_at`;

/** Rekord zamówienia z tymczasowym numerem — właściwy numer powstaje z id (setOrderNumber). */
export async function create(
  userId: number,
  itemsCount: number,
  totalAmount: number,
  db: Queryable = pool
): Promise<{ id: number; created_at: Date }> {
  const { rows } = await db.query(
    `INSERT INTO orders (user_id, order_number, status, items_count, total_amount)
     VALUES ($1, 'TEMP-' || gen_random_uuid(), 'PENDING', $2, $3) RETURNING id, created_at`,
    [userId, itemsCount, totalAmount]
  );
  return rows[0];
}

export async function setOrderNumber(orderId: number, orderNumber: string, db: Queryable = pool) {
  await db.query(`UPDATE orders SET order_number = $1 WHERE id = $2`, [orderNumber, orderId]);
}

export async function addItem(
  orderId: number,
  item: { product_id: number; product_name: string; unit_price: number; quantity: number; line_total: number },
  db: Queryable = pool
) {
  await db.query(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orderId, item.product_id, item.product_name, item.unit_price, item.quantity, item.line_total]
  );
}

export async function findByUser(userId: number): Promise<OrderSummary[]> {
  const { rows } = await pool.query(`SELECT ${SUMMARY} FROM orders WHERE user_id = $1 ORDER BY id DESC`, [userId]);
  return rows;
}

/** Zamówienie tylko jeśli należy do użytkownika (cudze = jak nieistniejące). */
export async function findForUser(
  orderId: number,
  userId: number,
  db: Queryable = pool
): Promise<(OrderSummary & { user_id: number }) | undefined> {
  const { rows } = await db.query(`SELECT ${SUMMARY}, user_id FROM orders WHERE id = $1 AND user_id = $2`, [orderId, userId]);
  return rows[0];
}

export async function findItems(orderId: number, db: Queryable = pool): Promise<OrderItem[]> {
  const { rows } = await db.query(
    `SELECT id, product_id, product_name, unit_price::float AS unit_price, quantity, line_total::float AS line_total
     FROM order_items WHERE order_id = $1 ORDER BY id`,
    [orderId]
  );
  return rows;
}
