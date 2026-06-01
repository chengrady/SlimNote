import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../src/renderer/components/AiAssistantPanel.vue', import.meta.url), 'utf8')

async function loadKeyboardModule() {
  try {
    return await import('../src/renderer/utils/aiComposerKeyboard.js')
  } catch (error) {
    assert.fail(`Expected AI composer keyboard helper to be importable: ${error.message}`)
  }
}

describe('AI assistant composer keyboard shortcuts', () => {
  it('sends with Enter while preserving Shift+Enter for newlines', async () => {
    const { resolveAiComposerKeyAction } = await loadKeyboardModule()

    assert.equal(resolveAiComposerKeyAction({ key: 'Enter', shiftKey: false }, { canSend: true, isGenerating: false }), 'send')
    assert.equal(resolveAiComposerKeyAction({ key: 'Enter', shiftKey: true }, { canSend: true, isGenerating: false }), '')
    assert.equal(resolveAiComposerKeyAction({ key: 'Enter', isComposing: true }, { canSend: true, isGenerating: false }), '')
    assert.equal(resolveAiComposerKeyAction({ key: 'Enter', shiftKey: false }, { canSend: false, isGenerating: false }), '')
  })

  it('stops generation with Escape only while a response is streaming', async () => {
    const { resolveAiComposerKeyAction } = await loadKeyboardModule()

    assert.equal(resolveAiComposerKeyAction({ key: 'Escape' }, { canSend: true, isGenerating: true }), 'stop')
    assert.equal(resolveAiComposerKeyAction({ key: 'Escape' }, { canSend: true, isGenerating: false }), '')
  })

  it('wires Enter on the textarea and Escape on the panel', () => {
    assert.match(source, /<textarea[\s\S]*:title="composerInputTitle"[\s\S]*@keydown="handleComposerInputKeydown"[\s\S]*\/>/)
    assert.match(source, /:title="composerActionTitle"/)
    assert.match(source, /const composerInputTitle = computed/)
    assert.match(source, /const composerActionTitle = computed/)
    assert.match(source, /function handleComposerInputKeydown\(event\)/)
    assert.match(source, /function handlePanelKeydown\(event\)/)
    assert.match(source, /document\.addEventListener\('keydown', handlePanelKeydown, true\)/)
    assert.match(source, /document\.removeEventListener\('keydown', handlePanelKeydown, true\)/)
  })

  it('localizes shortcut hints for hover tooltips', () => {
    const zhCN = readFileSync(new URL('../src/renderer/locales/zh-CN.json', import.meta.url), 'utf8')
    const enUS = readFileSync(new URL('../src/renderer/locales/en-US.json', import.meta.url), 'utf8')

    assert.match(zhCN, /"inputShortcutHint": "Enter 发送，Shift\+Enter 换行"/)
    assert.match(zhCN, /"sendShortcutHint": "发送 \(Enter\)"/)
    assert.match(zhCN, /"stopShortcutHint": "停止生成 \(Esc\)"/)
    assert.match(enUS, /"inputShortcutHint": "Enter to send, Shift\+Enter for a new line"/)
    assert.match(enUS, /"sendShortcutHint": "Send \(Enter\)"/)
    assert.match(enUS, /"stopShortcutHint": "Stop Generating \(Esc\)"/)
  })
})
