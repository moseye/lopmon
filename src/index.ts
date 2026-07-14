import { loadConfig } from './config.ts'
import { buildDeps } from './deps.ts'
import { createClient } from './discord/client.ts'
import { commands } from './discord/commands/index.ts'
import { components } from './discord/components/index.ts'
import { registerEvents } from './discord/events/index.ts'
import { beginShutdown, drainInFlight } from './discord/events/interactionCreate.ts'
import { buildRegistry } from './discord/registry.ts'
import { createDatabase } from './infra/db/index.ts'
import { createPool } from './infra/db/pool.ts'
import { createLogger } from './lib/logger.ts'

async function main(): Promise<void> {
  const config = loadConfig()
  const logger = createLogger({ level: config.logLevel, pretty: !config.isProduction })
  const pool = createPool(config.databaseUrl, logger)
  const db = createDatabase(pool)
  const deps = buildDeps({ config, logger, db, pool })

  const client = createClient()
  const registry = buildRegistry(commands, components)
  registerEvents(client, registry, deps)

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'shutting down')
    let code = 0
    try {
      beginShutdown()
      const { timedOut } = await drainInFlight()
      if (timedOut) logger.warn('drain timed out; proceeding')
      await client.destroy()
      await pool.end()
    } catch (error) {
      logger.error({ err: error }, 'shutdown error')
      code = 1
    } finally {
      process.exit(code)
    }
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  await client.login(config.discord.token)
}

main().catch((error) => {
  console.error('fatal:', error)
  process.exit(1)
})
