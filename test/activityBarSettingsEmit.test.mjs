import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../src/renderer/components/ActivityBar.vue', import.meta.url), 'utf8')

describe('activity bar settings action', () => {
  it('uses the script setup emit binding for workspace and settings events', () => {
    assert.match(source, /const emit = defineEmits\(\['select-view', 'toggle-collapse', 'open-settings'\]\)/)
    assert.match(source, /@click="selectView\(item\.id\)"/)
    assert.match(source, /@click="openSettings"/)
    assert.match(source, /if \(props\.activeView === viewId\) \{\s*emit\('toggle-collapse'\)\s*return\s*\}/)
    assert.match(source, /emit\('select-view', viewId\)/)
    assert.match(source, /function openSettings\(\) \{\s*emit\('open-settings'\)\s*\}/)
  })
})
