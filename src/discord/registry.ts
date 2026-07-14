import type { Command, ComponentHandler } from './types.ts'

export interface Registry {
  commands: Map<string, Command>
  components: Map<string, ComponentHandler>
}

export function buildRegistry(commands: Command[], components: ComponentHandler[]): Registry {
  return {
    commands: new Map(commands.map((c) => [c.data.name, c])),
    components: new Map(components.map((h) => [h.prefix, h])),
  }
}
