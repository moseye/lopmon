import { type Client, Events, type Interaction, MessageFlags } from 'discord.js'
import type { Deps } from '../../deps.ts'
import { UserError } from '../../lib/errors.ts'
import type { Registry } from '../registry.ts'

const inFlight = new Set<Promise<void>>()
let shuttingDown = false

/** Stop dispatching new interaction work before the Discord client is destroyed. */
export function beginShutdown(): void {
  shuttingDown = true
}

/** Wait for the interactions registered before shutdown, bounded by `timeoutMs`. */
export async function drainInFlight(timeoutMs = 8_000): Promise<{ timedOut: boolean }> {
  const settled = Promise.allSettled([...inFlight]).then(() => ({ timedOut: false }))
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<{ timedOut: boolean }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs)
    timer.unref()
  })

  const result = await Promise.race([settled, timeout])
  if (timer && !result.timedOut) clearTimeout(timer)
  return result
}

export function registerInteractionCreate(client: Client, registry: Registry, deps: Deps): void {
  client.on(Events.InteractionCreate, (interaction: Interaction) => {
    // EventEmitter dispatch is synchronous, so this promise is registered before shutdown can
    // flip the flag and take its drain snapshot.
    const run = dispatchInteraction(interaction, registry, deps)
    inFlight.add(run)
    void run.then(
      () => inFlight.delete(run),
      () => inFlight.delete(run),
    )
  })
}

async function dispatchInteraction(
  interaction: Interaction,
  registry: Registry,
  deps: Deps,
): Promise<void> {
  if (shuttingDown) {
    if (!interaction.isRepliable()) return
    await interaction
      .reply({ content: 'Restarting — try again in a moment.', flags: MessageFlags.Ephemeral })
      .catch(() => {})
    return
  }

  try {
    if (interaction.isChatInputCommand()) {
      const command = registry.commands.get(interaction.commandName)
      if (command) await command.execute(interaction, deps)
      return
    }
    if (interaction.isButton()) {
      const prefix = interaction.customId.split(':')[0] ?? ''
      const handler = registry.components.get(prefix)
      if (handler) await handler.execute(interaction, deps)
      return
    }
  } catch (error) {
    await handleError(interaction, error, deps)
  }
}

async function handleError(interaction: Interaction, error: unknown, deps: Deps): Promise<void> {
  const message =
    error instanceof UserError ? error.message : 'Something went wrong. Please try again.'
  if (!(error instanceof UserError)) {
    deps.logger.error({ err: error }, 'interaction handler failed')
  }
  if (!interaction.isRepliable()) return
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: message })
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral })
    }
  } catch {
    /* interaction token likely expired */
  }
}
