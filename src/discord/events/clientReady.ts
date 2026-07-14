import { type Client, Events } from 'discord.js'
import type { Deps } from '../../deps.ts'

export function registerClientReady(client: Client, deps: Deps): void {
  client.once(Events.ClientReady, (c) => {
    deps.logger.info({ tag: c.user.tag, id: c.user.id }, 'Lopmon ready')
  })
}
