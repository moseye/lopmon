# Lopmon

A Discord bot (discord.js 14, TypeScript, PostgreSQL) with two v0.1 features:

- **`/create-role-signup @role "prompt"`** — posts a message with a button members click to toggle a role on/off (staff-only command; button is for everyone).
- **`/mycolor <hex>`** — gives you a cosmetic role that colors your name. Color roles are shared per hex and garbage-collected when unused.
- **`/ping`** — health check.

See [planning/v0.1-implementation-plan.md](planning/v0.1-implementation-plan.md) for the full design.

## Stack

Node 24 · TypeScript 7 (type-check) · tsx (dev) / esbuild (build) · discord.js 14 · Drizzle ORM + `pg` · PostgreSQL 18 · pino · zod · Biome · pnpm.

## Setup

```bash
pnpm install
cp .env.example .env    # then fill in your Discord credentials + DATABASE_URL
```

Invite the bot with the **Manage Roles** permission, and drag Lopmon's role **above** any color roles it will manage.

## Develop

```bash
pnpm db:generate        # generate SQL migrations from src/infra/db/schema.ts (already committed)
pnpm db:migrate         # apply migrations to DATABASE_URL
pnpm deploy-commands    # register slash commands to your dev guild (instant)
pnpm dev                # run with hot-reload
```

Quality gates:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Run with Docker

```bash
docker compose up --build
```

Compose stands up PostgreSQL 18, runs migrations, then starts the bot. Slash commands still need `pnpm deploy-commands` once against your guild.
