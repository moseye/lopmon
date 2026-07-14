import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadConfig, loadDatabaseConfig, loadDiscordConfig } from '../src/config.ts'

const ENV_KEYS = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'DATABASE_URL',
  'NODE_ENV',
  'LOG_LEVEL',
] as const

function withEnvironment<T>(
  env: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  fn: () => T,
): T {
  const cwd = process.cwd()
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  const emptyDirectory = mkdtempSync(join(tmpdir(), 'lopmon-config-'))

  try {
    process.chdir(emptyDirectory)
    for (const key of ENV_KEYS) delete process.env[key]
    Object.assign(process.env, env)
    return fn()
  } finally {
    process.chdir(cwd)
    for (const key of ENV_KEYS) {
      const value = original[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    rmSync(emptyDirectory, { recursive: true })
  }
}

test('loadDatabaseConfig succeeds without Discord variables', () => {
  withEnvironment(
    { DATABASE_URL: 'postgres://localhost/lopmon', NODE_ENV: 'test', LOG_LEVEL: 'debug' },
    () => {
      assert.deepEqual(loadDatabaseConfig(), {
        databaseUrl: 'postgres://localhost/lopmon',
        logLevel: 'debug',
        isProduction: false,
      })
    },
  )
})

test('loadDiscordConfig succeeds without a database variable', () => {
  withEnvironment(
    {
      DISCORD_TOKEN: 'token',
      DISCORD_CLIENT_ID: 'client',
      DISCORD_GUILD_ID: 'guild',
      NODE_ENV: 'production',
    },
    () => {
      assert.deepEqual(loadDiscordConfig(), {
        discord: { token: 'token', clientId: 'client', guildId: 'guild' },
        logLevel: 'info',
        isProduction: true,
      })
    },
  )
})

test('loadConfig reports every missing bot variable', () => {
  withEnvironment({}, () => {
    assert.throws(
      () => loadConfig(),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        for (const key of [
          'DISCORD_TOKEN',
          'DISCORD_CLIENT_ID',
          'DISCORD_GUILD_ID',
          'DATABASE_URL',
        ]) {
          assert.match(error.message, new RegExp(key))
        }
        return true
      },
    )
  })
})
