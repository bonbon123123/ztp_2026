import { Pool, PoolClient } from "pg";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Pula albo klient transakcji — repozytoria przyjmują oba, żeby dało się je wołać w withTransaction. */
export type Queryable = Pool | PoolClient;
