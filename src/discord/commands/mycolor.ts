import {
  type Guild,
  type GuildMember,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  type Role,
  SlashCommandBuilder,
} from 'discord.js'
import type { Deps } from '../../deps.ts'
import { canonicalizeHex, HexInput, hexToInt } from '../../features/roles/hex.ts'
import { UserError } from '../../lib/errors.ts'
import type { Command } from '../types.ts'

export const myColor: Command = {
  data: new SlashCommandBuilder()
    .setName('mycolor')
    .setDescription('Give yourself a cosmetic role that colors your name.')
    .setContexts(InteractionContextType.Guild)
    .addStringOption((o) =>
      o
        .setName('hex')
        .setDescription('Hex color like #A020F0, or "clear" to remove yours')
        .setRequired(true)
        .setMaxLength(7),
    )
    .toJSON(),

  async execute(interaction, deps) {
    if (!interaction.inCachedGuild()) throw new UserError('Run this in a server.')
    const { guild, member } = interaction
    const raw = interaction.options.getString('hex', true).trim()

    const me = guild.members.me
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new UserError('I need the **Manage Roles** permission.')
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    if (raw.toLowerCase() === 'clear') {
      const removed = await removeUserColor(deps, guild, member.id)
      await interaction.editReply(removed ? 'Removed your color role.' : 'You have no color role.')
      return
    }

    const parsed = HexInput.safeParse(raw)
    if (!parsed.success) {
      throw new UserError(parsed.error.issues[0]?.message ?? 'Invalid hex color.')
    }
    const hex = canonicalizeHex(parsed.data)

    // Reuse the shared role for this hex, else create it just under the bot's role.
    let roleId = await deps.colorRepo.findRoleByHex(guild.id, hex)
    let role = roleId
      ? (guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null)))
      : null
    if (roleId && !role) {
      // DB row is stale (role deleted out-of-band) — drop it and recreate below.
      await deps.colorRepo.deleteColorRoleByRoleId(guild.id, roleId)
      roleId = null
    }
    if (!role) {
      role = await guild.roles.create({
        name: hex,
        colors: { primaryColor: hexToInt(hex) },
        permissions: [],
        hoist: false,
        mentionable: false,
        reason: `Color role for ${hex}`,
      })
      await deps.colorRepo.insertColorRole(guild.id, hex, role.id)
    }

    // Name color comes from the highest-positioned *colored* role, so lift this role as
    // high as the bot can reach — on every assignment, whether just created or reused.
    await liftAsHighAsPossible(guild, role.id)

    // Add the new role and record ownership BEFORE removing the old, so the GC
    // refcount no longer counts this user against the old role.
    const prev = await deps.colorRepo.getUserRole(guild.id, member.id)
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role.id, `mycolor ${hex}`)
    }
    await deps.colorRepo.setUserRole(guild.id, member.id, role.id)

    if (prev && prev !== role.id) {
      await member.roles.remove(prev).catch(() => {})
      await gcRoleIfUnused(deps, guild, prev)
    }

    await interaction.editReply(`Your name is now ${hex}.${overrideNote(member, role)}`)
    deps.logger.info({ userId: member.id, hex, roleId: role.id }, 'role color set')
  },
}

/** Lift a role to just below the bot's highest role — the top of what the bot can manage. */
async function liftAsHighAsPossible(guild: Guild, roleId: string): Promise<void> {
  const me = guild.members.me
  if (!me) return
  const target = Math.max(1, me.roles.highest.position - 1)
  await guild.roles.setPositions([{ role: roleId, position: target }]).catch(() => {})
}

/**
 * If the member still has a higher colored role, ITS color wins over ours. A bot cannot
 * move roles above its own, so surface a clear note asking an admin to raise Lopmon's role.
 */
function overrideNote(member: GuildMember, colorRole: Role): string {
  const higher = member.roles.cache.find(
    (r) => r.id !== colorRole.id && r.hexColor !== '#000000' && r.comparePositionTo(colorRole) > 0,
  )
  return higher
    ? ` Heads up: your **${higher.name}** role sits higher and overrides this color — ask an admin to move my role above it.`
    : ''
}

/** Delete a color role (and its DB row) once no user references it. */
async function gcRoleIfUnused(deps: Deps, guild: Guild, roleId: string): Promise<void> {
  if ((await deps.colorRepo.countRoleHolders(guild.id, roleId)) > 0) return
  await guild.roles.delete(roleId, 'color role no longer used').catch(() => {})
  await deps.colorRepo.deleteColorRoleByRoleId(guild.id, roleId)
}

/** Remove the caller's current color role and GC it if now unused. */
async function removeUserColor(deps: Deps, guild: Guild, userId: string): Promise<boolean> {
  const prev = await deps.colorRepo.getUserRole(guild.id, userId)
  if (!prev) return false
  const member = await guild.members.fetch(userId).catch(() => null)
  await member?.roles.remove(prev).catch(() => {})
  await deps.colorRepo.clearUserRole(guild.id, userId)
  await gcRoleIfUnused(deps, guild, prev)
  return true
}
