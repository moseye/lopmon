import { z } from 'zod'

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  // Unused by the gateway bot (HTTP-interaction endpoints only); optional for parity.
  DISCORD_PUBLIC_KEY: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

export type Config = Readonly<{
  discord: { token: string; clientId: string; guildId: string; publicKey: string | undefined }
  databaseUrl: string
  nodeEnv: 'development' | 'production' | 'test'
  logLevel: string
  isProduction: boolean
}>

export function loadConfig(): Config {
  // Load ./.env in dev; in prod/CI/Docker the env is injected, so a missing file is fine.
  try {
    process.loadEnvFile()
  } catch {
    /* no .env file present */
  }

  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment:\n${issues}`)
  }

  const e = parsed.data
  return Object.freeze({
    discord: {
      token: e.DISCORD_TOKEN,
      clientId: e.DISCORD_CLIENT_ID,
      guildId: e.DISCORD_GUILD_ID,
      publicKey: e.DISCORD_PUBLIC_KEY,
    },
    databaseUrl: e.DATABASE_URL,
    nodeEnv: e.NODE_ENV,
    logLevel: e.LOG_LEVEL,
    isProduction: e.NODE_ENV === 'production',
  })
}
