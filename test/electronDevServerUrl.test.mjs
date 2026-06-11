import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../electron/main.js', import.meta.url), 'utf8')

describe('Electron development renderer URL', () => {
  it('loads the renderer from the Vite-provided dev server URL', () => {
    assert.match(source, /VITE_DEV_SERVER_URL/)
    assert.doesNotMatch(source, /loadURL\(['"]http:\/\/localhost:5173['"]\)/)
  })
})
