import { type Client, Events, type Interaction, MessageFlags } from 'discord.js'
import type { Deps } from '../../deps.ts'
import { UserError } from '../../lib/errors.ts'
import type { Registry } from '../registry.ts'

export function registerInteractionCreate(client: Client, registry: Registry, deps: Deps): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
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
  })
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
