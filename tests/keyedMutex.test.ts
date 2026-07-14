import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createKeyedMutex } from '../src/lib/keyedMutex.ts'

const flush = (): Promise<void> => new Promise((r) => setImmediate(r))

test('same key runs strictly serially', async () => {
  const withLock = createKeyedMutex()
  const order: string[] = []
  const a = withLock('k', async () => {
    order.push('a-start')
    await flush()
    order.push('a-end')
  })
  const b = withLock('k', async () => {
    order.push('b-start')
    await flush()
    order.push('b-end')
  })
  await Promise.all([a, b])
  assert.deepEqual(order, ['a-start', 'a-end', 'b-start', 'b-end'])
})

test('different keys interleave', async () => {
  const withLock = createKeyedMutex()
  const order: string[] = []
  const a = withLock('k1', async () => {
    order.push('a-start')
    await flush()
    order.push('a-end')
  })
  const b = withLock('k2', async () => {
    order.push('b-start')
    await flush()
    order.push('b-end')
  })
  await Promise.all([a, b])
  // Both start before either ends → the two keys ran concurrently.
  assert.deepEqual(order, ['a-start', 'b-start', 'a-end', 'b-end'])
})

test('a rejecting section rejects its caller but does not wedge the chain', async () => {
  const withLock = createKeyedMutex()
  await assert.rejects(
    withLock('k', async () => {
      throw new Error('boom')
    }),
    /boom/,
  )
  const next = await withLock('k', async () => 42)
  assert.equal(next, 42)
})

test('a rejecting section produces no unhandledRejection', async () => {
  const withLock = createKeyedMutex()
  const seen: unknown[] = []
  const onUnhandled = (reason: unknown): void => {
    seen.push(reason)
  }
  process.on('unhandledRejection', onUnhandled)
  try {
    // Caller deliberately does NOT await — the stored chain must still swallow the rejection.
    void withLock('k', async () => {
      throw new Error('boom')
    })
    await flush()
    await flush()
    assert.deepEqual(seen, [])
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

test('the tails map empties after all sections settle', async () => {
  const withLock = createKeyedMutex()
  await Promise.all([
    withLock('a', async () => undefined),
    withLock('a', async () => undefined),
    withLock('b', async () => undefined),
  ])
  await flush()
  assert.equal(withLock.size(), 0)
})
