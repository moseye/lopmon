import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import type { Command } from '../types.ts'

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check that Lopmon is alive.')
    .toJSON(),
  async execute(interaction) {
    const ws = Math.max(0, Math.round(interaction.client.ws.ping))
    await interaction.reply({ content: `Pong! WebSocket ${ws}ms`, flags: MessageFlags.Ephemeral })
  },
}
