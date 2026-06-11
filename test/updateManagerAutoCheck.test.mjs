import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'

const require = createRequire(import.meta.url)
const { createUpdateManager } = require('../electron/updateManager.js')

function createFakeUpdater() {
  const updater = new EventEmitter()
  updater.autoDownload = true
  updater.autoInstallOnAppQuit = true
  updater.feed = null
  updater.checkCount = 0
  updater.setFeedURL = (feed) => {
    updater.feed = feed
  }
  updater.checkForUpdates = async () => {
    updater.checkCount += 1
    updater.emit('checking-for-update')
    const updateInfo = {
      version: '1.7.0',
      releaseName: 'SlimNote 1.7.0',
      releaseDate: '2026-06-09T00:00:00.000Z'
    }
    updater.emit('update-available', updateInfo)
    return { updateInfo }
  }
  updater.downloadUpdate = async () => {}
  updater.quitAndInstall = () => {}
  return updater
}

function createPackagedApp(userData) {
  return {
    isPackaged: true,
    getPath: (name) => {
      assert.equal(name, 'userData')
      return userData
    },
    getVersion: () => '1.6.1'
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('update manager automatic checks', () => {
  it('checks once at startup and schedules the next automatic check with the configured interval', async () => {
    const userData = mkdtempSync(join(tmpdir(), 'slimnote-update-'))
    const updater = createFakeUpdater()
    const sentStates = []
    const manager = createUpdateManager({
      app: createPackagedApp(userData),
      updater,
      getMainWindow: () => ({
        isDestroyed: () => false,
        webContents: {
          send: (channel, payload) => sentStates.push({ channel, payload })
        }
      }),
      releaseUrl: 'https://example.test/releases',
      feed: { provider: 'github', owner: 'chengrady', repo: 'SlimNote' },
      autoCheckDelayMs: 1,
      autoCheckIntervalMs: 25
    })

    try {
      assert.equal(updater.autoDownload, false)
      assert.equal(updater.autoInstallOnAppQuit, false)
      assert.deepEqual(updater.feed, { provider: 'github', owner: 'chengrady', repo: 'SlimNote' })

      manager.scheduleAutoCheck()
      await wait(10)
      assert.equal(updater.checkCount, 1)
      assert.ok(sentStates.some(({ channel, payload }) => channel === 'update-state-changed' && payload.status === 'available' && payload.source === 'auto' && payload.latestVersion === '1.7.0'))

      await wait(30)
      assert.equal(updater.checkCount, 2)
    } finally {
      manager.destroy()
      rmSync(userData, { recursive: true, force: true })
    }
  })
})
