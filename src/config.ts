import { z } from 'zod'

const DiscordEnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
})

const DatabaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
})

const RuntimeEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

const BotEnvSchema = DiscordEnvSchema.extend(DatabaseEnvSchema.shape).extend(RuntimeEnvSchema.shape)
const DatabaseScriptEnvSchema = DatabaseEnvSchema.extend(RuntimeEnvSchema.shape)
const DiscordScriptEnvSchema = DiscordEnvSchema.extend(RuntimeEnvSchema.shape)

type RuntimeConfig = Readonly<{
  logLevel: string
  isProduction: boolean
}>

export type DiscordConfig = Readonly<{
  discord: Readonly<{ token: string; clientId: string; guildId: string }>
}> &
  RuntimeConfig

export type DatabaseConfig = Readonly<{
  databaseUrl: string
}> &
  RuntimeConfig

export type Config = DiscordConfig & DatabaseConfig

function parse<T extends z.ZodType>(schema: T): z.infer<T> {
  // Load ./.env in dev; in prod/CI/Docker the env is injected, so a missing file is fine.
  try {
    process.loadEnvFile()
  } catch {
    /* no .env file present */
  }

  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment:\n${issues}`)
  }
  return parsed.data
}

function runtimeConfig(env: z.infer<typeof RuntimeEnvSchema>): RuntimeConfig {
  return {
    logLevel: env.LOG_LEVEL,
    isProduction: env.NODE_ENV === 'production',
  }
}

function discordConfig(env: z.infer<typeof DiscordEnvSchema>): DiscordConfig['discord'] {
  return {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.DISCORD_GUILD_ID,
  }
}

export function loadConfig(): Config {
  const env = parse(BotEnvSchema)
  return Object.freeze({
    discord: discordConfig(env),
    databaseUrl: env.DATABASE_URL,
    ...runtimeConfig(env),
  })
}

export function loadDatabaseConfig(): DatabaseConfig {
  const env = parse(DatabaseScriptEnvSchema)
  return Object.freeze({ databaseUrl: env.DATABASE_URL, ...runtimeConfig(env) })
}

export function loadDiscordConfig(): DiscordConfig {
  const env = parse(DiscordScriptEnvSchema)
  return Object.freeze({ discord: discordConfig(env), ...runtimeConfig(env) })
}
