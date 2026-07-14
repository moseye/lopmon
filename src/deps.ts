import { ColorRepository } from './features/roles/colorRepository.ts'
import type { Database } from './infra/db/index.ts'
import type { Logger } from './lib/logger.ts'

/** The container passed to every command / component handler. */
export interface Deps {
  logger: Logger
  colorRepo: ColorRepository
}

export function buildDeps(input: { logger: Logger; db: Database }): Deps {
  return {
    logger: input.logger,
    colorRepo: new ColorRepository(input.db),
  }
}
