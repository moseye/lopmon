import type { Client } from 'discord.js'
import type { Deps } from '../../deps.ts'
import type { Registry } from '../registry.ts'
import { registerClientReady } from './clientReady.ts'
import { registerInteractionCreate } from './interactionCreate.ts'

export function registerEvents(client: Client, registry: Registry, deps: Deps): void {
  registerClientReady(client, deps)
  registerInteractionCreate(client, registry, deps)
}
