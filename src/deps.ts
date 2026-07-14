import type pg from 'pg'
import type { Config } from './config.ts'
import { ColorRepository } from './features/roles/colorRepository.ts'
import type { Database } from './infra/db/index.ts'
import type { Logger } from './lib/logger.ts'

/** The container passed to every command / component handler. */
export interface Deps {
  config: Config
  logger: Logger
  db: Database
  pool: pg.Pool
  colorRepo: ColorRepository
}

export function buildDeps(input: {
  config: Config
  logger: Logger
  db: Database
  pool: pg.Pool
}): Deps {
  return {
    ...input,
    colorRepo: new ColorRepository(input.db),
  }
}
