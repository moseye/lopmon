import { Client, GatewayIntentBits } from 'discord.js'

/**
 * Guilds intent only. The invoking member (with roles) rides in every interaction
 * payload, so role add/remove needs no privileged GUILD_MEMBERS intent.
 */
export function createClient(): Client {
  return new Client({ intents: [GatewayIntentBits.Guilds] })
}
