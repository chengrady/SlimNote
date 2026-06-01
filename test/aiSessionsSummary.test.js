const assert = require('node:assert/strict')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { describe, it } = require('node:test')

describe('ai session summary persistence', () => {
  it('saves and reloads conversation summary metadata', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'slimnote-ai-sessions-'))
    const electronPath = require.resolve('electron')
    const aiSessionsPath = require.resolve('../electron/aiSessions')
    const previousElectronCache = require.cache[electronPath]

    require.cache[electronPath] = {
      id: electronPath,
      filename: electronPath,
      loaded: true,
      exports: {
        app: {
          getPath: () => tempDir
        }
      }
    }
    delete require.cache[aiSessionsPath]

    try {
      const { clearAISessions, listAISessions, saveAISession } = require('../electron/aiSessions')
      clearAISessions()

      const result = saveAISession({
        id: 'summary-session',
        summary: 'Earlier discussion: Task 852 passed.',
        summaryMessageCount: 18,
        summaryUpdatedAt: '2026-05-27T08:00:00.000Z',
        messages: [
          { role: 'user', content: 'Continue from earlier.', createdAt: '2026-05-27T08:01:00.000Z' }
        ]
      })

      assert.equal(result.success, true)
      assert.equal(result.session.summary, 'Earlier discussion: Task 852 passed.')
      assert.equal(result.session.summaryMessageCount, 18)
      assert.equal(result.session.summaryUpdatedAt, '2026-05-27T08:00:00.000Z')

      const [savedSession] = listAISessions()
      assert.equal(savedSession.summary, 'Earlier discussion: Task 852 passed.')
      assert.equal(savedSession.summaryMessageCount, 18)
      assert.equal(savedSession.summaryUpdatedAt, '2026-05-27T08:00:00.000Z')
    } finally {
      delete require.cache[aiSessionsPath]
      if (previousElectronCache) {
        require.cache[electronPath] = previousElectronCache
      } else {
        delete require.cache[electronPath]
      }
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
