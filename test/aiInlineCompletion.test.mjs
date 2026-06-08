import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  buildInlineCompletionStyleVars,
  buildInlineCompletionContext,
  cleanInlineCompletionText,
  consumeInlineCompletionLine,
  normalizeInlineCompletionSettings,
  resolveInlineCompletionAcceptText,
  shouldRequestInlineCompletion
} from '../src/renderer/utils/aiInlineCompletion.js'

describe('ai inline completion helpers', () => {
  it('enables inline completion by default', () => {
    assert.equal(normalizeInlineCompletionSettings().enabled, true)
    assert.equal(normalizeInlineCompletionSettings().maxChars, 600)
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
      opacity: 1.2,
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
    assert.equal(settings.opacity, 1)
    assert.equal(settings.acceptMode, 'line')
    assert.deepEqual(settings.languages, ['markdown', 'sql'])
  })

  it('supports line-by-line or snippet inline completion acceptance', () => {
    const suggestion = '### 2026年6月3日\n1. 京东到付码通道映射全量发布；\n2. 排查部分线上问题；'

    assert.equal(resolveInlineCompletionAcceptText(suggestion), '### 2026年6月3日')
    assert.equal(resolveInlineCompletionAcceptText(suggestion, { acceptMode: 'line' }), '### 2026年6月3日')
    assert.equal(resolveInlineCompletionAcceptText(suggestion, { acceptMode: 'snippet' }), suggestion)
    assert.deepEqual(consumeInlineCompletionLine(suggestion), {
      acceptedText: '### 2026年6月3日\n',
      remainingText: '1. 京东到付码通道映射全量发布；\n2. 排查部分线上问题；'
    })
    assert.equal(normalizeInlineCompletionSettings({ acceptMode: 'snippet' }).acceptMode, 'snippet')
    assert.equal(normalizeInlineCompletionSettings({ acceptMode: 'unknown' }).acceptMode, 'line')
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
    assert.doesNotMatch(mainSource, /Keep the completion short and natural\./)
    assert.match(mainSource, /obvious continuation can be completed coherently/)
    assert.match(mainSource, /known text, poem, quote, list, table, heading sequence, or log pattern/)
    assert.match(mainSource, /const maxChars = clampNumber\(payload\.maxChars, 600, 20, 1200\)/)
    assert.match(preloadSource, /startAIInlineCompletion/)
    assert.match(preloadSource, /onAIInlineCompletionChunk/)
  })

  it('wires Monaco and Milkdown editor affordances', () => {
    const monacoSource = readFileSync(new URL('../src/renderer/components/MonacoEditor.vue', import.meta.url), 'utf8')
    const milkdownSource = readFileSync(new URL('../src/renderer/components/MilkdownEditor.vue', import.meta.url), 'utf8')

    assert.match(monacoSource, /registerInlineCompletionsProvider/)
    assert.match(monacoSource, /editor\.action\.inlineSuggest\.trigger/)
    assert.match(monacoSource, /monaco\.KeyCode\.Tab[\s\S]*acceptInlineCompletionLine/)
    assert.match(monacoSource, /monaco\.KeyMod\.Shift \| monaco\.KeyCode\.Tab[\s\S]*acceptInlineCompletionSnippet/)
    assert.doesNotMatch(monacoSource, /editor\.action\.inlineSuggest\.acceptNextLine/)
    assert.match(monacoSource, /editor\.action\.inlineSuggest\.commit/)
    assert.match(monacoSource, /acceptedInsertText/)
    assert.match(monacoSource, /remainingText && !\/\[\\r\\n\]\$\/\.test\(acceptedText\)/)
    assert.match(monacoSource, /Tab接受 \| Shift\+Tab接受全部/)
    assert.match(monacoSource, /INLINE_COMPLETION_LINE_HINT_TEXT = "'Tab接受'"/)
    assert.match(monacoSource, /lineCount > 1 \? INLINE_COMPLETION_SNIPPET_HINT_TEXT : INLINE_COMPLETION_LINE_HINT_TEXT/)
    assert.match(monacoSource, /--inline-completion-hint-text/)
    assert.match(monacoSource, /content: var\(--inline-completion-hint-text, 'Tab接受'\)/)
    assert.match(monacoSource, /MutationObserver/)
    assert.match(monacoSource, /getBoundingClientRect\(\)/)
    assert.match(monacoSource, /a\.rect\.top - b\.rect\.top/)
    assert.match(monacoSource, /a\.rect\.left - b\.rect\.left/)
    assert.match(monacoSource, /dataset\.inlineCompletionHint = index === 0 \? 'primary' : 'secondary'/)
    assert.match(monacoSource, /data-inline-completion-hint="primary"/)
    assert.match(monacoSource, /opacity: 0\.72/)
    assert.match(monacoSource, /showToolbar: 'never'/)
    assert.match(monacoSource, /view-line:has\(\.ghost-text-decoration\)/)
    assert.match(monacoSource, /content: none/)
    assert.match(monacoSource, /\.inlineSuggestionsHints[\s\S]*display: none !important/)
    assert.doesNotMatch(monacoSource, /getAcceptMode/)
    assert.match(monacoSource, /onDidCompositionStart/)
    assert.match(monacoSource, /inlineCompletionProvider/)
    assert.match(monacoSource, /function applyInlineCompletionStyle\(\)/)
    assert.match(monacoSource, /--vscode-editorGhostText-foreground/)
    assert.match(milkdownSource, /PluginKey\('slimnote-inline-completion'\)/)
    assert.match(milkdownSource, /event\.key === 'Tab'/)
    assert.match(milkdownSource, /event\.shiftKey \? acceptInlineCompletionSnippet\(\) : acceptInlineCompletionLine\(\)/)
    assert.match(milkdownSource, /consumeInlineCompletionLine/)
    assert.match(milkdownSource, /remainingText/)
    assert.doesNotMatch(milkdownSource, /resolveAcceptText/)
    assert.match(milkdownSource, /event\.key === 'Escape'/)
  })

  it('keeps Monaco token cancellation from aborting active AI requests', () => {
    const monacoSource = readFileSync(new URL('../src/renderer/components/MonacoEditor.vue', import.meta.url), 'utf8')
    const requestCancellationBlock = monacoSource.match(/const tokenCleanup = token\?\.onCancellationRequested\?\.\(\(\) => \{[\s\S]*?\n      \}\)/)?.[0] || ''

    assert.match(requestCancellationBlock, /request-cancelled/)
    assert.doesNotMatch(requestCancellationBlock, /provider\.cancel\?\.\(\)/)
    assert.match(monacoSource, /cachedInlineCompletion/)
    assert.match(monacoSource, /insertText: suggestion/)
    assert.doesNotMatch(monacoSource, /insertText: acceptText/)
  })
})
