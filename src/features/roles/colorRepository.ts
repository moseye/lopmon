import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '../../infra/db/index.ts'
import { colorRole, userColor } from '../../infra/db/schema.ts'

/** Postgres-backed dedup + ownership store for color roles. No discord.js here. */
export class ColorRepository {
  readonly #db: Database

  constructor(db: Database) {
    this.#db = db
  }

  /** Shared role id for a canonical hex, if one exists. */
  async findRoleByHex(guildId: string, hex: string): Promise<string | null> {
    const rows = await this.#db
      .select({ roleId: colorRole.roleId })
      .from(colorRole)
      .where(and(eq(colorRole.guildId, guildId), eq(colorRole.hex, hex)))
      .limit(1)
    return rows[0]?.roleId ?? null
  }

  /** True if roleId is a /mycolor-managed color role in this guild. */
  async isColorRole(guildId: string, roleId: string): Promise<boolean> {
    const rows = await this.#db
      .select({ roleId: colorRole.roleId })
      .from(colorRole)
      .where(and(eq(colorRole.guildId, guildId), eq(colorRole.roleId, roleId)))
      .limit(1)
    return rows.length > 0
  }

  async insertColorRole(guildId: string, hex: string, roleId: string): Promise<void> {
    await this.#db
      .insert(colorRole)
      .values({ guildId, hex, roleId })
      .onConflictDoNothing({ target: [colorRole.guildId, colorRole.hex] })
  }

  async deleteColorRoleByRoleId(guildId: string, roleId: string): Promise<void> {
    await this.#db
      .delete(colorRole)
      .where(and(eq(colorRole.guildId, guildId), eq(colorRole.roleId, roleId)))
  }

  /** The user's current color role id, if any. */
  async getUserRole(guildId: string, userId: string): Promise<string | null> {
    const rows = await this.#db
      .select({ roleId: userColor.roleId })
      .from(userColor)
      .where(and(eq(userColor.guildId, guildId), eq(userColor.userId, userId)))
      .limit(1)
    return rows[0]?.roleId ?? null
  }

  async setUserRole(guildId: string, userId: string, roleId: string): Promise<void> {
    await this.#db
      .insert(userColor)
      .values({ guildId, userId, roleId })
      .onConflictDoUpdate({
        target: [userColor.guildId, userColor.userId],
        set: { roleId, updatedAt: sql`now()` },
      })
  }

  async clearUserRole(guildId: string, userId: string): Promise<void> {
    await this.#db
      .delete(userColor)
      .where(and(eq(userColor.guildId, guildId), eq(userColor.userId, userId)))
  }

  /** How many users still reference a role id — 0 means it can be garbage-collected. */
  async countRoleHolders(guildId: string, roleId: string): Promise<number> {
    const rows = await this.#db
      .select({ n: sql<number>`count(*)::int` })
      .from(userColor)
      .where(and(eq(userColor.guildId, guildId), eq(userColor.roleId, roleId)))
    return rows[0]?.n ?? 0
  }
}
