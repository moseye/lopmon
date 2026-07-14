import { defineConfig } from 'drizzle-kit'

// `db:generate` only reads the schema (no DB connection needed).
// `db:migrate` is run by src/scripts/migrate.ts, not drizzle-kit, so it stays out of the prod image.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/db/schema.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/lopmon' },
})
