import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const mainEditorSource = readFileSync(new URL('../src/renderer/views/MainEditor.vue', import.meta.url), 'utf8')
const titleBarSource = readFileSync(new URL('../src/renderer/components/TitleBar.vue', import.meta.url), 'utf8')

describe('browser preview electron API guards', () => {
  it('registers main editor Electron menu listeners through an optional helper', () => {
    assert.match(mainEditorSource, /function addElectronListener\(eventName, handler\)/)
    assert.match(mainEditorSource, /const listener = window\.electronAPI\?\.\[eventName\]/)
    assert.match(mainEditorSource, /const electronAPI = typeof window === 'undefined' \? null : window\.electronAPI/)
    assert.doesNotMatch(mainEditorSource, /window\.electronAPI\.onMenuNewFile\(/)
    assert.doesNotMatch(mainEditorSource, /window\.electronAPI\.onAppOpenFile\(/)
    assert.doesNotMatch(mainEditorSource, /window\.electronAPI\.consumePendingOpenFiles/)
  })

  it('guards title bar window-state listeners for browser preview', () => {
    assert.match(titleBarSource, /const electronAPI = typeof window === 'undefined' \? null : window\.electronAPI/)
    assert.doesNotMatch(titleBarSource, /await window\.electronAPI\.isMaximized\(\)/)
    assert.doesNotMatch(titleBarSource, /window\.electronAPI\.onWindowMaximized\(/)
  })
})
