import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const settingsStoreSource = readFileSync(new URL('../src/renderer/stores/settings.js', import.meta.url), 'utf8')
const settingsDialogSource = readFileSync(new URL('../src/renderer/components/SettingsDialog.vue', import.meta.url), 'utf8')
const aiAssistantSource = readFileSync(new URL('../src/renderer/components/AiAssistantPanel.vue', import.meta.url), 'utf8')
const editorPanelSource = readFileSync(new URL('../src/renderer/components/EditorPanel.vue', import.meta.url), 'utf8')
const rootIndexHtmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const indexHtmlSource = readFileSync(new URL('../src/renderer/index.html', import.meta.url), 'utf8')
const zhLocaleSource = readFileSync(new URL('../src/renderer/locales/zh-CN.json', import.meta.url), 'utf8')
const enLocaleSource = readFileSync(new URL('../src/renderer/locales/en-US.json', import.meta.url), 'utf8')

function sourceBetween(source, start, end) {
  const normalizedSource = source.replace(/\r\n/g, '\n')
  const startIndex = normalizedSource.indexOf(start)
  const endIndex = normalizedSource.indexOf(end, startIndex + start.length)
  assert.notEqual(startIndex, -1, `Missing source start marker: ${start}`)
  assert.notEqual(endIndex, -1, `Missing source end marker: ${end}`)
  return normalizedSource.slice(startIndex, endIndex)
}

function cssRule(source, selector) {
  const normalizedSource = source.replace(/\r\n/g, '\n')
  const selectorIndex = normalizedSource.indexOf(`${selector} {`)
  assert.notEqual(selectorIndex, -1, `Missing CSS selector: ${selector}`)
  const ruleEndIndex = normalizedSource.indexOf('\n}', selectorIndex)
  assert.notEqual(ruleEndIndex, -1, `Missing CSS rule end for: ${selector}`)
  return normalizedSource.slice(selectorIndex, ruleEndIndex)
}

function assertFontSizeVariable(source, selector, variableName) {
  assert.match(cssRule(source, selector), new RegExp(`font-size:\\s*var\\(${variableName.replaceAll('-', '\\-')}`))
}

describe('v1.6.1 scoped changes', () => {
  it('separates UI font size from editor/code font size without adding UI font family settings', () => {
    const appearanceSectionSource = sourceBetween(settingsDialogSource, "id: 'appearance',\n    title: t('settings.appearance')", "id: 'editor',\n    title: t('settings.editor')")
    const editorSectionSource = sourceBetween(settingsDialogSource, "id: 'editor',\n    title: t('settings.editor')", "id: 'shortcuts',\n    title: t('settings.shortcuts')")

    assert.match(settingsStoreSource, /uiFontSize:\s*14/)
    assert.match(settingsStoreSource, /function normalizeUiFontSize/)
    assert.match(settingsStoreSource, /--app-ui-font-size/)
    assert.match(settingsDialogSource, /const uiFontSizeInput = ref\('14'\)/)
    assert.match(settingsDialogSource, /id:\s*'ui-font-size'[\s\S]*control:\s*'ui-font-size'/)
    assert.match(settingsDialogSource, /id:\s*'appearance-font-reading'[\s\S]*rowIds:\s*\['ui-font-size'\]/)
    assert.match(settingsDialogSource, /id:\s*'editor-font-reading'[\s\S]*rowIds:\s*\['font-size',\s*'font-family',\s*'preview'\]/)
    assert.match(appearanceSectionSource, /id:\s*'ui-font-size'/)
    assert.doesNotMatch(appearanceSectionSource, /id:\s*'font-size'|id:\s*'font-family'|id:\s*'preview'/)
    assert.match(editorSectionSource, /id:\s*'font-size'/)
    assert.match(editorSectionSource, /id:\s*'font-family'/)
    assert.match(editorSectionSource, /id:\s*'preview'/)
    assert.match(settingsDialogSource, /fontFamily:\s*localSettings\.value\.fontFamily/)
    assert.match(settingsDialogSource, /fontSize:\s*`\$\{Math\.max\(8,\s*localSettings\.value\.fontSize \|\| 14\)\}px`/)
    assert.doesNotMatch(settingsDialogSource, /uiFontFamily|ui-font-family/)
    assert.match(zhLocaleSource, /"uiFontSize":\s*"界面字号"/)
    assert.match(zhLocaleSource, /"codeFontSize":\s*"代码字号"/)
    assert.match(enLocaleSource, /"uiFontSize":\s*"Interface Font Size"/)
    assert.match(enLocaleSource, /"codeFontSize":\s*"Code Font Size"/)
  })

  it('uses interface font size variables across settings and AI assistant UI text', () => {
    for (const variableName of ['--ui-font-size-2xs', '--ui-font-size-xs', '--ui-font-size-sm', '--ui-font-size-md', '--ui-font-size-lg', '--ui-font-size-xl']) {
      assert.match(settingsStoreSource, new RegExp(variableName.replaceAll('-', '\\-')))
    }

    assertFontSizeVariable(settingsDialogSource, '.settings-return-button', '--field-font-size')
    assertFontSizeVariable(settingsDialogSource, '.settings-nav-item-title', '--field-font-size')
    assertFontSizeVariable(settingsDialogSource, '.settings-nav-label', '--ui-font-size-xs')
    assertFontSizeVariable(settingsDialogSource, '.settings-toolbar-copy h4', '--ui-font-size-xl')
    assertFontSizeVariable(settingsDialogSource, '.settings-group-head h5', '--ui-font-size-md')
    assertFontSizeVariable(settingsDialogSource, '.settings-row-title', '--field-font-size')
    assertFontSizeVariable(settingsDialogSource, '.ai-settings-row-copy strong', '--ui-font-size-md')
    assertFontSizeVariable(settingsDialogSource, '.ai-settings-row-copy span', '--field-font-size')

    assertFontSizeVariable(aiAssistantSource, '.ai-panel-title', '--ui-font-size-sm')
    assertFontSizeVariable(aiAssistantSource, '.ai-session-history-search', '--ui-font-size-md')
    assertFontSizeVariable(aiAssistantSource, '.ai-session-history-name', '--field-font-size')
    assertFontSizeVariable(aiAssistantSource, '.ai-session-history-meta', '--ui-font-size-xs')
    assertFontSizeVariable(aiAssistantSource, '.ai-context-chip-main', '--ui-font-size-sm')
    assertFontSizeVariable(aiAssistantSource, '.ai-quick-action-trigger', '--ui-font-size-sm')
    assertFontSizeVariable(aiAssistantSource, '.ai-input', '--ui-font-size-sm')
  })

  it('applies editor code font size setting changes to every open tab', () => {
    assert.match(editorPanelSource, /watch\(\(\) => settingsStore\.settings\.fontSize/)
    assert.match(editorPanelSource, /const previousFontSize = Number\(oldFontSize\) \|\| lastSettingsFontSize\.value/)
    assert.match(editorPanelSource, /editorStore\.tabs\.forEach\(tab => \{/)
    assert.match(editorPanelSource, /editorStore\.updateTabFontSize\(tab\.id,\s*nextFontSize\)/)
    assert.doesNotMatch(editorPanelSource, /tabFontSize === previousFontSize/)
  })

  it('supports drag-and-drop sorting for AI model rows', () => {
    assert.match(settingsDialogSource, /const draggingAiModelId = ref\(''\)/)
    assert.match(settingsDialogSource, /function startAiModelDrag\(modelId,\s*event\)/)
    assert.match(settingsDialogSource, /function dropAiModel\(targetModelId\)/)
    assert.match(settingsDialogSource, /@dragstart="startAiModelDrag\(model\.id,\s*\$event\)"/)
    assert.match(settingsDialogSource, /@drop\.prevent="dropAiModel\(model\.id\)"/)
    assert.match(settingsDialogSource, /\.ai-model-list-head,[\s\S]*\.ai-model-row\s*{[\s\S]*grid-template-columns:\s*28px\s+minmax\(78px,\s*0\.9fr\)\s+minmax\(96px,\s*1fr\)\s+88px;/)
  })

  it('localizes AI assistant copy failures', () => {
    assert.doesNotMatch(aiAssistantSource, /Failed to copy AI result/)
    assert.match(aiAssistantSource, /t\('ai\.copyFailed/)
    assert.match(zhLocaleSource, /"copyFailed":\s*"复制 AI 回复失败"/)
    assert.match(enLocaleSource, /"copyFailed":\s*"Failed to copy AI reply"/)
  })

  it('keeps AI streaming output pinned only when the conversation is near the bottom', () => {
    assert.match(aiAssistantSource, /function isConversationNearBottom\(/)
    assert.match(aiAssistantSource, /const shouldFollowScroll = isConversationNearBottom\(\)/)
    assert.match(aiAssistantSource, /if \(payload\.text && shouldFollowScroll\) scrollConversationToBottom\(\)/)
  })

  it('keeps the context resizer hit area from covering the left edge of the Markdown outline', () => {
    assert.match(editorPanelSource, /\.context-resizer\s*{[\s\S]*margin-left:\s*-6px;[\s\S]*margin-right:\s*0;/)
  })

  it('keeps the root HTML pointed at the Vite renderer entry during development', () => {
    assert.match(rootIndexHtmlSource, /<script type="module" src="\/src\/renderer\/main\.js"><\/script>/)
    assert.doesNotMatch(rootIndexHtmlSource, /src="\.\/assets\/index-[^"]+\.js"/)
    assert.doesNotMatch(rootIndexHtmlSource, /href="\.\/assets\/index-[^"]+\.css"/)
  })

  it('allows HTTP and HTTPS Markdown images through the renderer CSP', () => {
    assert.match(rootIndexHtmlSource, /img-src 'self' data: https: http:;/)
    assert.match(indexHtmlSource, /img-src 'self' data: https: http:;/)
  })
})
