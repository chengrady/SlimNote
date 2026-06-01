import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../electron.vite.config.ts', import.meta.url), 'utf8')

describe('electron-vite compatibility config', () => {
  it('uses the maintained Electron entry files instead of drifting src shims', () => {
    assert.match(source, /input:\s*resolve\('electron\/main\.js'\)/)
    assert.match(source, /input:\s*resolve\('electron\/preload\.js'\)/)
    assert.doesNotMatch(source, /input:\s*resolve\('src\/main\/index\.js'\)/)
    assert.doesNotMatch(source, /input:\s*resolve\('src\/preload\/index\.js'\)/)
  })
})
