import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { loadDatabaseConfig } from '../config.ts'
import { createDatabase } from '../infra/db/index.ts'
import { createPool } from '../infra/db/pool.ts'
import { createLogger } from '../lib/logger.ts'

async function main(): Promise<void> {
  const config = loadDatabaseConfig()
  const logger = createLogger({ level: config.logLevel, pretty: !config.isProduction })
  const pool = createPool(config.databaseUrl, logger)
  const db = createDatabase(pool)

  await migrate(db, { migrationsFolder: 'migrations' })
  logger.info('migrations applied')
  await pool.end()
}

main().catch((error) => {
  console.error('migrate failed:', error)
  process.exit(1)
})
