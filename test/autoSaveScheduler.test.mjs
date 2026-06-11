import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createAutoSaveScheduler, DEFAULT_AUTO_SAVE_DELAY_SECONDS, normalizeAutoSaveDelaySeconds } from '../src/renderer/utils/autoSaveScheduler.js'

function createFakeTimers() {
  const timers = []
  return {
    timers,
    setTimer(callback, delay) {
      const timer = { callback, delay, active: true }
      timers.push(timer)
      return timer
    },
    clearTimer(timer) {
      timer.active = false
    },
    async fire(timer) {
      if (!timer.active) return
      timer.active = false
      await timer.callback()
    }
  }
}

describe('auto save scheduler', () => {
  it('treats auto save delay as seconds and migrates legacy millisecond values', () => {
    assert.equal(DEFAULT_AUTO_SAVE_DELAY_SECONDS, 10)
    assert.equal(normalizeAutoSaveDelaySeconds(undefined), 10)
    assert.equal(normalizeAutoSaveDelaySeconds(2), 2)
    assert.equal(normalizeAutoSaveDelaySeconds('5'), 5)
    assert.equal(normalizeAutoSaveDelaySeconds(2000), 2)
    assert.equal(normalizeAutoSaveDelaySeconds(500), 1)
  })

  it('debounces dirty tabs with file paths and skips unnamed tabs', async () => {
    const fakeTimers = createFakeTimers()
    const writes = []
    const savedIds = []
    const tabs = [
      { id: 'saved', filePath: 'D:\\notes\\today.md', content: 'draft', encoding: 'utf-8', isDirty: true },
      { id: 'untitled', filePath: null, content: 'new note', encoding: 'utf-8', isDirty: true }
    ]
    const scheduler = createAutoSaveScheduler({
      getTabs: () => tabs,
      getSettings: () => ({ autoSave: true, autoSaveDelay: 3 }),
      writeFile: async (filePath, content, encoding) => {
        writes.push({ filePath, content, encoding })
      },
      markSaved: (tabId) => {
        savedIds.push(tabId)
        const tab = tabs.find(item => item.id === tabId)
        if (tab) tab.isDirty = false
      },
      setTimer: fakeTimers.setTimer,
      clearTimer: fakeTimers.clearTimer
    })

    scheduler.schedule()

    assert.equal(fakeTimers.timers.length, 1)
    assert.equal(fakeTimers.timers[0].delay, 3000)

    await fakeTimers.fire(fakeTimers.timers[0])

    assert.deepEqual(writes, [{ filePath: 'D:\\notes\\today.md', content: 'draft', encoding: 'utf-8' }])
    assert.deepEqual(savedIds, ['saved'])
  })

  it('does not mark a tab saved when content changes while the write is in flight', async () => {
    const fakeTimers = createFakeTimers()
    const savedIds = []
    const tabs = [
      { id: 'note', filePath: 'D:\\notes\\today.md', content: 'draft one', encoding: 'utf-8', isDirty: true }
    ]
    const scheduler = createAutoSaveScheduler({
      getTabs: () => tabs,
      getSettings: () => ({ autoSave: true, autoSaveDelay: 1 }),
      writeFile: async () => {
        tabs[0].content = 'draft two'
        tabs[0].isDirty = true
      },
      markSaved: (tabId) => {
        savedIds.push(tabId)
      },
      setTimer: fakeTimers.setTimer,
      clearTimer: fakeTimers.clearTimer
    })

    scheduler.schedule()
    await fakeTimers.fire(fakeTimers.timers[0])

    assert.deepEqual(savedIds, [])
    assert.equal(tabs[0].isDirty, true)
  })

  it('clears pending timers when auto save is disabled', () => {
    const fakeTimers = createFakeTimers()
    let autoSave = true
    const tabs = [
      { id: 'note', filePath: 'D:\\notes\\today.md', content: 'draft', encoding: 'utf-8', isDirty: true }
    ]
    const scheduler = createAutoSaveScheduler({
      getTabs: () => tabs,
      getSettings: () => ({ autoSave, autoSaveDelay: 1 }),
      writeFile: async () => {},
      markSaved: () => {},
      setTimer: fakeTimers.setTimer,
      clearTimer: fakeTimers.clearTimer
    })

    scheduler.schedule()
    autoSave = false
    scheduler.schedule()

    assert.equal(fakeTimers.timers[0].active, false)
  })
})
