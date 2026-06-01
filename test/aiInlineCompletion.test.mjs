import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  buildInlineCompletionStyleVars,
  buildInlineCompletionContext,
  cleanInlineCompletionText,
  normalizeInlineCompletionSettings,
  shouldRequestInlineCompletion
} from '../src/renderer/utils/aiInlineCompletion.js'

describe('ai inline completion helpers', () => {
  it('enables inline completion by default', () => {
    assert.equal(normalizeInlineCompletionSettings().enabled, true)
    assert.equal(normalizeInlineCompletionSettings().colorPreset, 'cyan')
    assert.equal(normalizeInlineCompletionSettings().opacity, 0.7)
  })

  it('normalizes settings with conservative defaults and clamps user input', () => {
    const settings = normalizeInlineCompletionSettings({
      enabled: true,
      delayMs: 20,
      maxChars: 9999,
      prefixChars: 10,
      suffixChars: 99999,
      includeLog: true,
      colorPreset: 'red',
      customColor: '#0ff',
      opacity: 0.99,
      languages: ['Markdown', 'markdown', 'SQL']
    })

    assert.equal(settings.enabled, true)
    assert.equal(settings.delayMs, 150)
    assert.equal(settings.maxChars, 1200)
    assert.equal(settings.prefixChars, 200)
    assert.equal(settings.suffixChars, 8000)
    assert.equal(settings.includeLog, true)
    assert.equal(settings.colorPreset, 'red')
    assert.equal(settings.customColor, '#00ffff')
    assert.equal(settings.opacity, 0.9)
    assert.deepEqual(settings.languages, ['markdown', 'sql'])
  })

  it('builds theme-aware inline completion style variables', () => {
    const style = buildInlineCompletionStyleVars({ colorPreset: 'cyan', opacity: 0.7 }, 'dark')

    assert.equal(style['--inline-completion-color'], 'rgba(34, 211, 238, 0.7)')
    assert.match(style['--inline-completion-keycap-border'], /rgba\(34, 211, 238,/)
    assert.equal(style['--vscode-editorGhostText-foreground'], 'rgba(34, 211, 238, 0.7)')
  })

  it('falls back from retired custom colors to the default preset', () => {
    const settings = normalizeInlineCompletionSettings({ colorPreset: 'custom', customColor: '#ff00ff' })

    assert.equal(settings.colorPreset, 'cyan')
  })

  it('checks trigger conditions before asking the model', () => {
    const settings = normalizeInlineCompletionSettings({ enabled: true })

    assert.equal(shouldRequestInlineCompletion({ settings, content: '写一段产品方案', cursorOffset: 7, language: 'markdown' }), true)
    assert.equal(shouldRequestInlineCompletion({ settings, content: 'a', cursorOffset: 1, language: 'markdown' }), false)
    assert.equal(shouldRequestInlineCompletion({ settings, content: 'SELECT *', cursorOffset: 8, language: 'sql', hasSelection: true }), false)
    assert.equal(shouldRequestInlineCompletion({ settings, content: 'INFO boot', cursorOffset: 9, language: 'log' }), false)
    assert.equal(shouldRequestInlineCompletion({ settings: { ...settings, includeLog: true }, content: 'INFO boot', cursorOffset: 9, language: 'log' }), true)
  })

  it('requests suggestions on useful new empty lines', () => {
    const settings = normalizeInlineCompletionSettings({ enabled: true })

    assert.equal(shouldRequestInlineCompletion({ settings, content: '### 2026年5月\n', cursorOffset: 12, language: 'markdown' }), true)
    assert.equal(shouldRequestInlineCompletion({ settings, content: '今天完成了登录页调整。\n', cursorOffset: 12, language: 'markdown' }), true)
    assert.equal(shouldRequestInlineCompletion({ settings, content: '- 第一项\n', cursorOffset: 6, language: 'markdown' }), true)
    assert.equal(shouldRequestInlineCompletion({ settings, content: '\n', cursorOffset: 1, language: 'markdown' }), false)
    assert.equal(shouldRequestInlineCompletion({ settings, content: '### 2026年5月\n\n', cursorOffset: 13, language: 'markdown' }), false)
    assert.equal(shouldRequestInlineCompletion({ settings, content: '###\n', cursorOffset: 4, language: 'markdown' }), false)
    assert.equal(shouldRequestInlineCompletion({ settings, content: '```js\n', cursorOffset: 6, language: 'markdown' }), false)
  })

  it('builds bounded prefix and suffix context around the cursor', () => {
    const content = `${'a'.repeat(500)}<cursor>${'b'.repeat(500)}`
    const cursorOffset = content.indexOf('<cursor>')
    const context = buildInlineCompletionContext({
      settings: { enabled: true, prefixChars: 220, suffixChars: 80 },
      content: content.replace('<cursor>', ''),
      cursorOffset,
      language: 'plaintext',
      fileName: 'note.txt'
    })

    assert.equal(context.fileName, 'note.txt')
    assert.equal(context.prefix.length, 220)
    assert.equal(context.suffix.length, 80)
    assert.equal(context.language, 'plaintext')
  })

  it('cleans fences, explanation prefixes, repeated prefixes, and long text', () => {
    const cleanedFence = cleanInlineCompletionText('```js\nconsole.log(1)\n```', { settings: { maxChars: 120 } })
    assert.equal(cleanedFence, 'console.log(1)')

    const cleanedRepeat = cleanInlineCompletionText('world and keep going', {
      prefix: 'hello world',
      settings: { maxChars: 120 }
    })
    assert.equal(cleanedRepeat, ' and keep going')

    const cleanedLong = cleanInlineCompletionText(`Here is: ${'x'.repeat(300)}. ${'y'.repeat(300)}`, { settings: { maxChars: 160 } })
    assert.ok(cleanedLong.length <= 160)
    assert.equal(/^Here is/i.test(cleanedLong), false)
  })
})

describe('ai inline completion wiring', () => {
  it('wires independent main-process IPC and preload APIs', () => {
    const mainSource = readFileSync(new URL('../electron/main.js', import.meta.url), 'utf8')
    const preloadSource = readFileSync(new URL('../electron/preload.js', import.meta.url), 'utf8')

    assert.match(mainSource, /aiInlineCompletionRequests\s*=\s*new Map/)
    assert.match(mainSource, /ai:inline-completion-start/)
    assert.match(mainSource, /ai:inline-completion-stop/)
    assert.match(mainSource, /buildInlineCompletionRequestSettings/)
    assert.match(mainSource, /shouldDisableThinkingForInlineCompletion/)
    assert.match(preloadSource, /startAIInlineCompletion/)
    assert.match(preloadSource, /onAIInlineCompletionChunk/)
  })

  it('wires Monaco and Milkdown editor affordances', () => {
    const monacoSource = readFileSync(new URL('../src/renderer/components/MonacoEditor.vue', import.meta.url), 'utf8')
    const milkdownSource = readFileSync(new URL('../src/renderer/components/MilkdownEditor.vue', import.meta.url), 'utf8')

    assert.match(monacoSource, /registerInlineCompletionsProvider/)
    assert.match(monacoSource, /editor\.action\.inlineSuggest\.trigger/)
    assert.match(monacoSource, /onDidCompositionStart/)
    assert.match(monacoSource, /inlineCompletionProvider/)
    assert.match(monacoSource, /function applyInlineCompletionStyle\(\)/)
    assert.match(monacoSource, /--vscode-editorGhostText-foreground/)
    assert.match(milkdownSource, /PluginKey\('slimnote-inline-completion'\)/)
    assert.match(milkdownSource, /event\.key === 'Tab'/)
    assert.match(milkdownSource, /event\.key === 'Escape'/)
  })
})
