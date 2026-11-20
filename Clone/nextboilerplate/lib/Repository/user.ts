import { pool } from "../db";
import type { UserInput, UserRow } from "../Model/user";

const COLUMNS = `id, email, password_hash, first_name, last_name, is_active, created_at`;

export async function create(u: UserInput): Promise<UserRow> {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [u.email, u.password_hash, u.first_name, u.last_name]
  );
  return rows[0];
}

export async function findByEmail(email: string): Promise<UserRow | undefined> {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [email]);
  return rows[0];
}

export async function findById(id: number): Promise<UserRow | undefined> {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0];
}
