// FILE: backend/src/config/db.ts
// PostgreSQL connection pool — parameterized queries only, no ORM

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Shared PostgreSQL connection pool.
 * Uses DATABASE_URL from environment — never hardcode credentials.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Error] Unexpected error on idle client:', err.message);
});

/**
 * Verifies database connectivity at startup.
 * @returns Promise<void>
 */
export async function verifyDbConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] PostgreSQL connection verified.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[DB] Failed to connect to PostgreSQL: ${message}`);
  }
}
