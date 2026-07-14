import {
  channelMention,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  roleMention,
  SlashCommandBuilder,
} from 'discord.js'
import { UserError } from '../../lib/errors.ts'
import type { Command } from '../types.ts'
import { roleSignupRow } from '../ui/panels.ts'

export const createRoleSignup: Command = {
  data: new SlashCommandBuilder()
    .setName('create-role-signup')
    .setDescription('Post a message members can click to self-assign a role.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setContexts(InteractionContextType.Guild)
    .addRoleOption((o) => o.setName('role').setDescription('Role to hand out').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('prompt')
        .setDescription('Message shown above the button')
        .setRequired(true)
        .setMaxLength(1500),
    )
    .toJSON(),

  async execute(interaction, deps) {
    if (!interaction.inCachedGuild()) throw new UserError('Run this in a server.')
    const role = interaction.options.getRole('role', true)
    const prompt = interaction.options.getString('prompt', true)

    const me = interaction.guild.members.me
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new UserError('I need the **Manage Roles** permission.')
    }
    if (role.managed || role.id === interaction.guild.id) {
      throw new UserError('That role cannot be self-assigned (it is managed or @everyone).')
    }
    if (me.roles.highest.comparePositionTo(role) <= 0) {
      throw new UserError(
        `My highest role must be above ${roleMention(role.id)}. Move my role up and try again.`,
      )
    }

    // Invoker hierarchy gate mirroring Discord's native rule (strictly below your highest role;
    // guild owner exempt; Administrator is NOT exempt — matches GuildMember#manageable).
    // setDefaultMemberPermissions(ManageRoles) is only a default admins can override in
    // Integrations settings, so this in-handler check is load-bearing. The clicker who later
    // presses the button is intentionally unprivileged — enforcement is creation-time by design.
    const invoker = interaction.member
    if (
      interaction.guild.ownerId !== invoker.id &&
      invoker.roles.highest.comparePositionTo(role) <= 0
    ) {
      throw new UserError('You can only create signups for roles below your own highest role.')
    }
    // Residual: if an admin later drags the role above the creator's rank, existing panels still
    // hand it out (same as every panel bot; admins can delete the message).

    // Color roles are managed by /mycolor's refcount; a signup would add/remove them with no
    // user_color bookkeeping, so GC could later delete the role off a holder's back.
    if (await deps.colorRepo.isColorRole(interaction.guild.id, role.id)) {
      throw new UserError('That role is managed by /mycolor and cannot be used in a signup.')
    }

    const channel = interaction.channel
    if (!channel?.isSendable()) throw new UserError('I cannot send messages in this channel.')
    // isSendable() only checks the channel TYPE — verify the bot's actual access here,
    // otherwise channel.send throws a raw DiscordAPIError 50001 (Missing Access).
    const perms = channel.permissionsFor(me)
    const sendPerm = channel.isThread()
      ? PermissionFlagsBits.SendMessagesInThreads
      : PermissionFlagsBits.SendMessages
    if (!perms?.has(PermissionFlagsBits.ViewChannel) || !perms.has(sendPerm)) {
      throw new UserError(
        'I need **View Channel** and **Send Messages** permission in this channel.',
      )
    }

    await channel.send({
      content: `${prompt}\n\nClick the button to toggle ${roleMention(role.id)}.`,
      components: [roleSignupRow(role.id)],
      allowedMentions: { parse: [] },
    })
    await interaction.reply({
      content: `Signup posted in ${channelMention(channel.id)} for ${roleMention(role.id)}.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    })
    deps.logger.info({ roleId: role.id, guildId: interaction.guildId }, 'role signup created')
  },
}
