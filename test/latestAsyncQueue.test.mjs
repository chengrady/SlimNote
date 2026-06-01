import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createSequentialLatestRunner } from '../src/renderer/utils/latestAsyncQueue.js'

describe('latest async queue', () => {
  it('runs tasks sequentially and marks older queued work as stale', async () => {
    const runner = createSequentialLatestRunner()
    const order = []

    const first = runner.run(async ({ isLatest }) => {
      order.push('first')
      await Promise.resolve()
      return isLatest() ? 'first' : 'stale'
    })
    const second = runner.run(async ({ isLatest }) => {
      order.push('second')
      return isLatest() ? 'second' : 'stale'
    })

    assert.equal(await first, 'stale')
    assert.equal(await second, 'second')
    assert.deepEqual(order, ['first', 'second'])
  })

  it('skips stale queued side effects before they run', async () => {
    const runner = createSequentialLatestRunner()
    const writes = []

    const first = runner.runLatest(async () => {
      writes.push('first')
      return 'first'
    }, () => 'stale')
    const second = runner.runLatest(async () => {
      writes.push('second')
      return 'second'
    }, () => 'stale')

    assert.equal(await first, 'stale')
    assert.equal(await second, 'second')
    assert.deepEqual(writes, ['second'])
  })
})
