/**
 * Promise-chain mutex keyed by string. Serializes async sections sharing a key;
 * different keys run concurrently.
 *
 * Do NOT nest withLock calls on the same key — deadlock.
 */
export function createKeyedMutex() {
  const tails = new Map<string, Promise<void>>()

  function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve()
    const run = prev.then(fn)
    // Swallow here so the stored chain never rejects and the next waiter still runs; attaching
    // this handler also marks `run` as handled, so an un-awaited caller yields no
    // unhandledRejection. Callers keep the original `run` and still see the real result/rejection.
    const tail = run.then(
      () => undefined,
      () => undefined,
    )
    tails.set(key, tail)
    void tail.then(() => {
      if (tails.get(key) === tail) tails.delete(key)
    })
    return run
  }

  /** Number of keys with an in-flight or queued section — for tests/observability. */
  withLock.size = (): number => tails.size

  return withLock
}
