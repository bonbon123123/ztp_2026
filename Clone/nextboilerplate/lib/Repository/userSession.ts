import { pool } from "../db";
import type { UserSession } from "../Model/user";

const COLUMNS = `id, user_id, session_token, created_at, last_used_at`;

export async function create(userId: number, token: string, now: Date): Promise<UserSession> {
  const { rows } = await pool.query(
    `INSERT INTO user_sessions (user_id, session_token, created_at, last_used_at)
     VALUES ($1, $2, $3, $3) RETURNING ${COLUMNS}`,
    [userId, token, now]
  );
  return rows[0];
}

export async function findByToken(token: string): Promise<UserSession | undefined> {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM user_sessions WHERE session_token = $1`, [token]);
  return rows[0];
}

/** Przedłużenie sesji (sliding session) — przesunięcie czasu ostatniej aktywności. */
export async function touch(id: number, now: Date): Promise<void> {
  await pool.query(`UPDATE user_sessions SET last_used_at = $1 WHERE id = $2`, [now, id]);
}

export async function deleteById(id: number): Promise<void> {
  await pool.query(`DELETE FROM user_sessions WHERE id = $1`, [id]);
}

export async function deleteByToken(token: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM user_sessions WHERE session_token = $1`, [token]);
  return (rowCount ?? 0) > 0;
}
