import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const settingsStoreSource = readFileSync(new URL('../src/renderer/stores/settings.js', import.meta.url), 'utf8')
const monacoEditorSource = readFileSync(new URL('../src/renderer/components/MonacoEditor.vue', import.meta.url), 'utf8')

describe('editor settings defaults', () => {
  it('keeps editor minimap disabled by default while still honoring the saved setting', () => {
    assert.match(settingsStoreSource, /minimap:\s*false/)
    assert.match(monacoEditorSource, /minimap:\s*{\s*enabled:\s*settingsStore\.settings\.minimap\s*}/)
    assert.match(monacoEditorSource, /minimap:\s*{\s*enabled:\s*newSettings\.minimap\s*}/)
  })
})
