import pg from 'pg'
import type { Logger } from '../../lib/logger.ts'

const { Pool } = pg

export function createPool(databaseUrl: string, logger: Logger): pg.Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
  // An idle-client error must never crash the process (that would drop the gateway heartbeat).
  pool.on('error', (err) => logger.error({ err }, 'postgres idle client error'))
  return pool
}
