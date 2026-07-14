import {
  type ChatInputCommandInteraction,
  DiscordAPIError,
  type Guild,
  type GuildMember,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type Role,
  SlashCommandBuilder,
} from 'discord.js'
import type { Deps } from '../../deps.ts'
import { canonicalizeHex, HexInput, hexToRoleColor } from '../../features/roles/hex.ts'
import { botCanManageRole } from '../../features/roles/manageable.ts'
import { UserError } from '../../lib/errors.ts'
import { createKeyedMutex } from '../../lib/keyedMutex.ts'
import type { Command } from '../types.ts'

// Serializes every color mutation per guild (single-process only). See withGuildLock usage below.
const withGuildLock = createKeyedMutex()

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

    // Serialize all color mutations in this guild so F4 (find→create dedup) and F5 (GC vs a
    // concurrent adopter) can no longer interleave. Deferring FIRST is required — a queued lock
    // wait must not eat the 3s ack window. Rests on the single-process v0.1 deployment; a
    // multi-instance deploy would replace this with pg_advisory_xact_lock(hashtext(guild_id)).
    // Errors thrown inside propagate through the returned promise to interactionCreate's catch.
    await withGuildLock(guild.id, async () => {
      deps.logger.debug({ guildId: guild.id, userId: member.id }, 'mycolor: lock acquired')
      try {
        if (raw.toLowerCase() === 'clear') {
          const removed = await removeUserColor(deps, guild, member)
          await interaction.editReply(
            removed ? 'Removed your color role.' : 'You have no color role.',
          )
          return
        }
        await setUserColor(deps, interaction, guild, member, raw)
      } finally {
        deps.logger.debug({ guildId: guild.id, userId: member.id }, 'mycolor: lock released')
      }
    })
  },
}

/** Assign (creating or reusing) the color role for `raw`, swapping out any previous one. */
async function setUserColor(
  deps: Deps,
  interaction: ChatInputCommandInteraction<'cached'>,
  guild: Guild,
  member: GuildMember,
  raw: string,
): Promise<void> {
  const parsed = HexInput.safeParse(raw)
  if (!parsed.success) {
    throw new UserError(parsed.error.issues[0]?.message ?? 'Invalid hex color.')
  }
  const hex = canonicalizeHex(parsed.data)

  // Reuse the shared role for this hex, else create it just under the bot's role.
  let roleId = await deps.colorRepo.findRoleByHex(guild.id, hex)
  let role = roleId ? (guild.roles.cache.get(roleId) ?? (await fetchRole(guild, roleId))) : null
  if (roleId && !role) {
    // DB row is stale (role deleted out-of-band, confirmed via 10011) — drop it and recreate.
    await deps.colorRepo.deleteColorRoleByRoleId(guild.id, roleId)
    roleId = null
  }

  if (!role) {
    role = await guild.roles.create({
      name: hex,
      colors: { primaryColor: hexToRoleColor(hex) },
      permissions: [],
      hoist: false,
      mentionable: false,
      reason: `Color role for ${hex}`,
    })
    await deps.colorRepo.insertColorRole(guild.id, hex, role.id)
  } else {
    // Reused role: it may now sit above the bot (F10) or be a legacy colorless #000000 (F6).
    const me = guild.members.me
    if (!me || !botCanManageRole(me, role)) {
      throw new UserError(
        `That color role (**${role.name}**) sits above my highest role — ask an admin to move my role up.`,
      )
    }
    if (role.colors.primaryColor === 0) {
      role = await role.setColors({ primaryColor: hexToRoleColor(hex) })
    }
  }

  // Name color comes from the highest-positioned *colored* role, so lift this role as high as
  // the bot can reach — on every assignment, whether just created or reused.
  await liftAsHighAsPossible(deps, guild, role.id)

  // Add the new role and record ownership BEFORE removing the old, so the GC refcount no longer
  // counts this user against the old role. Thread the fresh member returned by add/remove: the
  // original member's role cache is stale permanently under Guilds-only intents (no
  // GUILD_MEMBER_UPDATE), so overrideNote must read the post-change clone.
  const prev = await deps.colorRepo.getUserRole(guild.id, member.id)
  let fresh = member
  if (!fresh.roles.cache.has(role.id)) fresh = await fresh.roles.add(role.id, `mycolor ${hex}`)
  await deps.colorRepo.setUserRole(guild.id, member.id, role.id)

  if (prev && prev !== role.id) {
    try {
      fresh = await fresh.roles.remove(prev, 'mycolor: replace previous color')
    } catch (error) {
      // Graceful degradation: user briefly wears two color roles; `fresh` still holds `prev`,
      // so overrideNote correctly warns about the leftover higher role.
      deps.logger.warn({ err: error, prev }, 'could not remove previous color role')
    }
    await gcRoleIfUnused(deps, guild, prev)
  }

  await interaction.editReply(`Your name is now ${hex}.${overrideNote(fresh, role)}`)
  deps.logger.info({ userId: member.id, hex, roleId: role.id }, 'role color set')
}

/**
 * Fetch a role, distinguishing "role gone" (10011 or cache miss → null) from a transient REST
 * failure (rethrown). Treating a transient failure as role-gone would delete a live DB row and
 * resurrect the duplicate-role bug — the exact invariant this workstream protects.
 */
async function fetchRole(guild: Guild, roleId: string): Promise<Role | null> {
  try {
    return await guild.roles.fetch(roleId)
  } catch (error) {
    if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownRole) {
      return null
    }
    throw error
  }
}

/** Lift a role to just below the bot's highest role — the top of what the bot can manage. */
async function liftAsHighAsPossible(deps: Deps, guild: Guild, roleId: string): Promise<void> {
  const me = guild.members.me
  if (!me) return
  const target = Math.max(1, me.roles.highest.position - 1)
  // Intentional graceful degradation (raw-position PATCH only coincides in normalized guilds),
  // but no longer silent.
  await guild.roles
    .setPositions([{ role: roleId, position: target }])
    .catch((error) => deps.logger.debug({ err: error, roleId }, 'could not lift color role'))
}

/**
 * If the member still has a higher colored role, ITS color wins over ours. A bot cannot move
 * roles above its own, so surface a clear note asking an admin to raise Lopmon's role.
 */
function overrideNote(member: GuildMember, colorRole: Role): string {
  const higher = member.roles.cache.find(
    (r) => r.id !== colorRole.id && r.hexColor !== '#000000' && r.comparePositionTo(colorRole) > 0,
  )
  return higher
    ? ` Heads up: your **${higher.name}** role sits higher and overrides this color — ask an admin to move my role above it.`
    : ''
}

/**
 * Delete a color role (and its DB row) once no user references it.
 *
 * Elevated role + zero holders = the hex stays blocked until an admin demotes/deletes the role.
 * Intentional: creating a second role for the hex would resurrect the duplicate-role bug the
 * moment the old one is demoted.
 */
async function gcRoleIfUnused(deps: Deps, guild: Guild, roleId: string): Promise<void> {
  if ((await deps.colorRepo.countRoleHolders(guild.id, roleId)) > 0) return
  try {
    await guild.roles.delete(roleId, 'color role no longer used')
  } catch (error) {
    if (!(error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownRole)) {
      // Transient failure — keep the row so dedup still tracks the live role.
      deps.logger.warn({ err: error, roleId }, 'gc: could not delete color role; keeping row')
      return
    }
    // 10011: role already gone — proceed to row cleanup.
  }
  await deps.colorRepo.deleteColorRoleByRoleId(guild.id, roleId)
}

/**
 * Remove the caller's current color role and GC it if now unused. Returns false when the caller
 * had no stored role. Throws (no false success) if the removal genuinely fails.
 */
async function removeUserColor(deps: Deps, guild: Guild, member: GuildMember): Promise<boolean> {
  const prev = await deps.colorRepo.getUserRole(guild.id, member.id)
  if (!prev) return false

  try {
    await member.roles.remove(prev, 'mycolor clear')
    // 204 (including member-didn't-have-it) → removed.
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      if (error.code === RESTJSONErrorCodes.UnknownRole) {
        // 10011: role deleted out-of-band — treat as removed, fall through to cleanup.
      } else if (error.code === RESTJSONErrorCodes.MissingPermissions) {
        throw new UserError(
          'I could not remove your color role — make sure my role is above it and I still have **Manage Roles**.',
        )
      } else {
        throw error
      }
    } else {
      throw error
    }
  }

  await deps.colorRepo.clearUserRole(guild.id, member.id)
  await gcRoleIfUnused(deps, guild, prev)
  return true
}
