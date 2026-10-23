import { pool } from "../db";

export async function findByProductId(productId: number) {
    const { rows } = await pool.query(
        `SELECT id, action, old_data, new_data, changed_at
     FROM product_history WHERE product_id = $1
     ORDER BY changed_at, id`,
        [productId]
    );
    return rows;
}