import { pool } from "../db";
import type { Notification, NotificationInput, NotificationStatus } from "../Model/notification";

const COLUMNS = `id, content, channel, recipient, scheduled_at, timezone, status, product_id, created_at`;

export async function create(n: NotificationInput): Promise<Notification> {
  const { rows } = await pool.query(
    `INSERT INTO notifications (content, channel, recipient, scheduled_at, timezone, status, product_id)
     VALUES ($1, $2, $3, $4, $5, 'PENDING', $6) RETURNING ${COLUMNS}`,
    [n.content, n.channel, n.recipient, n.scheduled_at, n.timezone, n.product_id]
  );
  return rows[0];
}

export async function findAll(): Promise<Notification[]> {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM notifications ORDER BY id`);
  return rows;
}

export async function findById(id: number): Promise<Notification | undefined> {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM notifications WHERE id = $1`, [id]);
  return rows[0];
}

export async function updateStatus(id: number, status: NotificationStatus): Promise<Notification> {
  const { rows } = await pool.query(
    `UPDATE notifications SET status = $1 WHERE id = $2 RETURNING ${COLUMNS}`,
    [status, id]
  );
  return rows[0];
}

/** Powiadomienia gotowe do realizacji: PENDING z planowanym czasem <= teraz (UTC). */
export async function findReady(): Promise<Notification[]> {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM notifications
     WHERE status = 'PENDING' AND scheduled_at <= now()
     ORDER BY scheduled_at`
  );
  return rows;
}

/** Zapis wyniku wysyłki — tylko jeśli rekord nadal jest PENDING (nie nadpisze anulowania w międzyczasie). */
export async function setStatusIfPending(id: number, status: NotificationStatus): Promise<Notification | undefined> {
  const { rows } = await pool.query(
    `UPDATE notifications SET status = $1 WHERE id = $2 AND status = 'PENDING' RETURNING ${COLUMNS}`,
    [status, id]
  );
  return rows[0];
}
