import { type GuildMember, PermissionFlagsBits, type Role } from 'discord.js'

/**
 * Discord-side preconditions for the bot to assign/move/delete a role.
 *
 * Prefer this over `role.editable`: that getter does not exclude @everyone and throws when the
 * bot's own GuildMember is uncached.
 */
export function botCanManageRole(me: GuildMember, role: Role): boolean {
  return (
    me.permissions.has(PermissionFlagsBits.ManageRoles) &&
    !role.managed &&
    role.id !== role.guild.id &&
    me.roles.highest.comparePositionTo(role) > 0
  )
}
