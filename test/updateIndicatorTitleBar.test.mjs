import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const titleBarSource = readFileSync(new URL('../src/renderer/components/TitleBar.vue', import.meta.url), 'utf8')
const mainEditorSource = readFileSync(new URL('../src/renderer/views/MainEditor.vue', import.meta.url), 'utf8')

describe('update indicator title bar entry', () => {
  it('renders a help-adjacent download arrow button only when an update is available', () => {
    assert.match(titleBarSource, /showUpdateEntry/)
    assert.match(titleBarSource, /class="title-update-button"/)
    assert.match(titleBarSource, /requestMenuAction\('open-update-dialog'\)/)
    assert.match(titleBarSource, /M10 4v8/)
    assert.match(titleBarSource, /M6 8l4 4 4-4/)
  })

  it('passes update availability from the editor shell and opens the existing update dialog from the icon', () => {
    assert.match(mainEditorSource, /:show-update-entry="hasPendingUpdateNotice"/)
    assert.match(mainEditorSource, /const hasPendingUpdateNotice = computed\(\(\) => \['available', 'downloaded'\]\.includes\(latestUpdateState\.value\?\.status\)\)/)
    assert.match(mainEditorSource, /case 'open-update-dialog':[\s\S]*openUpdateDialogFromIndicator\(\)/)
    assert.match(mainEditorSource, /function openUpdateDialogFromIndicator\(\)/)
    assert.match(mainEditorSource, /function handleUpdateStateChanged\(state\) \{[\s\S]*applyUpdateState\(state, \{ silent: !showUpdateDialog\.value \}\)/)
  })
})
