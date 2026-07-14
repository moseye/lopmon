import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js'
import type { Deps } from '../deps.ts'

export interface Command {
  data: RESTPostAPIApplicationCommandsJSONBody
  execute(interaction: ChatInputCommandInteraction, deps: Deps): Promise<void>
}

export interface ComponentHandler {
  /** The customId prefix before the first ':'. */
  prefix: string
  execute(interaction: ButtonInteraction, deps: Deps): Promise<void>
}
