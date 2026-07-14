import { MessageFlags, PermissionFlagsBits, roleMention } from 'discord.js'
import { UserError } from '../../lib/errors.ts'
import type { ComponentHandler } from '../types.ts'
import { ROLE_SIGNUP_PREFIX } from '../ui/panels.ts'

export const roleSignupHandler: ComponentHandler = {
  prefix: ROLE_SIGNUP_PREFIX,
  async execute(interaction, deps) {
    if (!interaction.inCachedGuild()) return
    // customId is untrusted client input — re-validate everything it claims.
    const roleId = interaction.customId.split(':')[1]
    if (!roleId) throw new UserError('Malformed button.')

    const { guild, member } = interaction
    const role =
      guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null))
    if (!role) throw new UserError('That role no longer exists.')
    if (role.managed || role.id === guild.id)
      throw new UserError('That role cannot be self-assigned.')

    const me = guild.members.me
    if (
      !me?.permissions.has(PermissionFlagsBits.ManageRoles) ||
      me.roles.highest.comparePositionTo(role) <= 0
    ) {
      throw new UserError('I cannot manage that role right now (permissions or role order).')
    }

    const had = member.roles.cache.has(role.id)
    if (had) await member.roles.remove(role.id, 'role signup toggle')
    else await member.roles.add(role.id, 'role signup toggle')

    await interaction.reply({
      content: had ? `Removed ${roleMention(role.id)}.` : `Added ${roleMention(role.id)}.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    })
    deps.logger.debug({ userId: member.id, roleId: role.id, added: !had }, 'role toggled')
  },
}
