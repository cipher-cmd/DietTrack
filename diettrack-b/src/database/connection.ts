import { Pool } from 'pg';
import logger from '@/utils/logger';

let pool: Pool | null = null;

/**
 * Create or reuse a Postgres pool. In tests, return an in-memory mock.
 */
export function getDatabase():
  | Pool
  | { query: (query: string, params?: any[]) => Promise<{ rows: any[] }> } {
  if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DB) {
    // Very tiny in-memory mock for unit tests
    return {
      async query(query: string) {
        if (
          query.startsWith(
            'SELECT free_analyses_used, subscription_status FROM users'
          )
        ) {
          return {
            rows: [
              { subscription_status: 'free_trial', free_analyses_used: 0 },
            ],
          };
        }
        return { rows: [] };
      },
    };
  }

  // Real Postgres
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });

    pool.on('error', (err) => logger.warn('Postgres pool error', { err }));
    logger.info('Postgres connection pool initialized');
  }
  return pool;
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
}

export async function connectDatabase() {
  logger.info('Connecting to database...');
}
