import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

// One shared role per (guild, canonical hex) — the dedup source of truth.
export const colorRole = pgTable(
  'color_role',
  {
    guildId: text('guild_id').notNull(),
    hex: text('hex').notNull(), // canonical '#RRGGBB'
    roleId: text('role_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.hex] })],
)

// One color role per user — powers swap-on-change and the GC refcount.
export const userColor = pgTable(
  'user_color',
  {
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    roleId: text('role_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.guildId, t.userId] }),
    index('user_color_role_idx').on(t.guildId, t.roleId),
  ],
)
