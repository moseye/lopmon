import { MessageFlags, roleMention } from 'discord.js'
import { botCanManageRole } from '../../features/roles/manageable.ts'
import { UserError } from '../../lib/errors.ts'
import type { ComponentHandler } from '../types.ts'
import { ROLE_SIGNUP_PREFIX } from '../ui/panels.ts'

export const roleSignupHandler: ComponentHandler = {
  prefix: ROLE_SIGNUP_PREFIX,
  async execute(interaction, deps) {
    // Throw, not silent return: a bare return leaves the button click unacknowledged.
    if (!interaction.inCachedGuild()) throw new UserError('Run this in a server.')
    // customId is untrusted client input — re-validate everything it claims.
    const roleId = interaction.customId.split(':')[1]
    if (!roleId) throw new UserError('Malformed button.')

    const { guild, member } = interaction
    const role =
      guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null))
    if (!role) throw new UserError('That role no longer exists.')

    const me = guild.members.me
    if (!me || !botCanManageRole(me, role)) {
      throw new UserError(
        `I cannot manage ${roleMention(role.id)} right now — it must sit below my highest role and not be managed. Ask an admin to move my role up.`,
      )
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
