import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const mainEditorSource = readFileSync(new URL('../src/renderer/views/MainEditor.vue', import.meta.url), 'utf8')
const settingsStoreSource = readFileSync(new URL('../src/renderer/stores/settings.js', import.meta.url), 'utf8')
const settingsDialogSource = readFileSync(new URL('../src/renderer/components/SettingsDialog.vue', import.meta.url), 'utf8')
const zhLocaleSource = readFileSync(new URL('../src/renderer/locales/zh-CN.json', import.meta.url), 'utf8')
const enLocaleSource = readFileSync(new URL('../src/renderer/locales/en-US.json', import.meta.url), 'utf8')

describe('auto save integration', () => {
  it('normalizes auto save delay as seconds in settings persistence', () => {
    assert.match(settingsStoreSource, /DEFAULT_AUTO_SAVE_DELAY_SECONDS/)
    assert.match(settingsStoreSource, /autoSaveDelay:\s*DEFAULT_AUTO_SAVE_DELAY_SECONDS/)
    assert.match(settingsStoreSource, /normalizeAutoSaveDelaySeconds\(parsed\.autoSaveDelay/)
    assert.match(settingsStoreSource, /normalizeAutoSaveDelaySeconds\(newSettings\.autoSaveDelay/)
  })

  it('exposes auto save and delay seconds in the settings page', () => {
    assert.match(settingsDialogSource, /const autoSaveDelayInput = ref\('10'\)/)
    assert.match(settingsDialogSource, /rowIds:\s*\['auto-save',\s*'auto-save-delay'\]/)
    assert.match(settingsDialogSource, /id:\s*'auto-save'/)
    assert.match(settingsDialogSource, /id:\s*'auto-save-delay'/)
    assert.match(settingsDialogSource, /control:\s*'auto-save-delay'/)
    assert.match(settingsDialogSource, /function shouldShowSettingsRow\(row\)[\s\S]*row\?\.id === 'auto-save-delay'[\s\S]*localSettings\.value\.autoSave/)
    assert.match(settingsDialogSource, /filter\(row => shouldShowSettingsRow\(row\) && matchesRow\(row\) && matchesShortcutCategory\(row, section\.id\)\)/)
    assert.match(settingsDialogSource, /v-model="autoSaveDelayInput"[\s\S]*min="1"[\s\S]*max="60"[\s\S]*step="1"/)
    assert.match(settingsDialogSource, /commitAutoSaveDelay/)
    assert.match(settingsDialogSource, /autoSaveDelay,\s*tabSize/)
  })

  it('wires automatic saving through the main editor without prompting unnamed files', () => {
    assert.match(mainEditorSource, /createAutoSaveScheduler/)
    assert.match(mainEditorSource, /const autoSaveScheduler = createAutoSaveScheduler/)
    assert.match(mainEditorSource, /writeFileWithSelfChangeSuppression/)
    assert.match(mainEditorSource, /editorStore\.tabs\.map\(tab => \(\{[\s\S]*filePath:\s*tab\.filePath[\s\S]*content:\s*tab\.content[\s\S]*isDirty:\s*tab\.isDirty/)
    assert.match(mainEditorSource, /settingsStore\.settings\.autoSave/)
    assert.match(mainEditorSource, /settingsStore\.settings\.autoSaveDelay/)
    assert.match(mainEditorSource, /autoSaveScheduler\.schedule\(\)/)
    assert.match(mainEditorSource, /autoSaveScheduler\.dispose\(\)/)
  })

  it('localizes auto save settings with second-based delay wording', () => {
    assert.match(zhLocaleSource, /"autoSave":\s*"自动保存"/)
    assert.match(zhLocaleSource, /"autoSaveDelay":\s*"自动保存延迟（秒）"/)
    assert.match(zhLocaleSource, /"autoSaveDelayDesc":\s*"停止编辑后等待多少秒再写入磁盘"/)
    assert.match(enLocaleSource, /"autoSave":\s*"Auto Save"/)
    assert.match(enLocaleSource, /"autoSaveDelay":\s*"Auto Save Delay \(seconds\)"/)
    assert.match(enLocaleSource, /"autoSaveDelayDesc":\s*"Seconds to wait after editing stops before writing to disk"/)
  })
})
