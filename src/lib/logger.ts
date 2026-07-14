import pino from 'pino'

export function createLogger(opts: { level: string; pretty: boolean }) {
  return pino({
    level: opts.level,
    ...(opts.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
          },
        }
      : {}),
  })
}

export type Logger = ReturnType<typeof createLogger>
