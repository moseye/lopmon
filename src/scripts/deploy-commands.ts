import { REST, Routes } from 'discord.js'
import { loadConfig } from '../config.ts'
import { commands } from '../discord/commands/index.ts'
import { createLogger } from '../lib/logger.ts'

// Guild-scoped registration updates instantly (global commands can take up to an hour).
async function main(): Promise<void> {
  const config = loadConfig()
  const logger = createLogger({ level: config.logLevel, pretty: true })
  const rest = new REST().setToken(config.discord.token)
  const body = commands.map((c) => c.data)

  await rest.put(Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId), {
    body,
  })
  logger.info({ count: body.length, guildId: config.discord.guildId }, 'guild commands registered')
}

main().catch((error) => {
  console.error('deploy-commands failed:', error)
  process.exit(1)
})
