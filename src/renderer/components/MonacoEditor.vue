<template>
  <div ref="editorContainer" class="monaco-editor-container" :style="inlineCompletionStyle"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { useSettingsStore } from '../stores/settings'
import { RENDERER_EVENTS, onRendererEvent } from '../utils/rendererEvents'
import { defineCustomThemes, applyTheme, defineSlimNoteEditorTheme } from '../utils/monacoThemes'
import { resolveMarkdownTheme } from '../utils/markdownThemes'
import { isMonospaceFontFamily } from '../utils/fontFamilies'
import { consumeInlineCompletionLine } from '../utils/aiInlineCompletion'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'plaintext'
  },
  theme: {
    type: String,
    default: 'light'
  },
  fontSize: {
    type: Number,
    default: 14
  },
  editorTheme: {
    type: String,
    default: ''  // 自定义编辑器主题，如 'dracula', 'nord' 等
  },
  inlineCompletionProvider: {
    type: Object,
    default: null
  },
  inlineCompletionStyle: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'scroll', 'cursor-change', 'change-font-size', 'paste-content'])

const settingsStore = useSettingsStore()
const editorContainer = ref()
let editor = null
let isSyncingScroll = false
let isComposing = false
let inlineCompletionDisposable = null
let inlineCompletionTriggerTimer = 0
let cachedInlineCompletion = null
let activeInlineCompletion = null
let isAcceptingInlineCompletionLine = false
let inlineCompletionHintObserver = null
let inlineCompletionHintFrame = 0
const rendererEventCleanups = []
const inlineCompletionStyleVarNames = [
  '--inline-completion-color',
  '--inline-completion-strong-color',
  '--inline-completion-keycap-bg',
  '--inline-completion-keycap-border',
  '--vscode-editorGhostText-foreground',
  '--vscode-editorGhostText-background',
  '--vscode-editorGhostText-border'
]
const INLINE_COMPLETION_LINE_HINT_TEXT = "'Tab接受'"
const INLINE_COMPLETION_SNIPPET_HINT_TEXT = "'Tab接受 | Shift+Tab接受全部'"
const INLINE_COMPLETION_GHOST_TEXT_SELECTOR = '.ghost-text-decoration, .ghost-text-decoration-preview, .suggest-preview-text .ghost-text'

function debugInlineCompletion(stage, details = {}) {
  console.info('[inline-completion][monaco]', stage, details)
}

function buildMarkdownListContinuation(lineContent, column) {
  const safeColumn = Math.max(1, Number(column) || 1)
  const beforeCursor = lineContent.slice(0, safeColumn - 1)
  const afterCursor = lineContent.slice(safeColumn - 1)

  if (afterCursor.trim().length > 0) {
    return null
  }

  const orderedEmptyMatch = beforeCursor.match(/^(\s*)(\d+)([.)])\s*$/)
  if (orderedEmptyMatch) {
    return '\n'
  }

  const orderedMatch = beforeCursor.match(/^(\s*)(\d+)([.)])\s+(.+)$/)
  if (orderedMatch) {
    const nextIndex = Number(orderedMatch[2]) + 1
    return `\n${orderedMatch[1]}${nextIndex}${orderedMatch[3]} `
  }

  const taskEmptyMatch = beforeCursor.match(/^(\s*)([-+*])\s\[(?: |x|X)\]\s*$/)
  if (taskEmptyMatch) {
    return '\n'
  }

  const taskMatch = beforeCursor.match(/^(\s*)([-+*])\s\[(?: |x|X)\]\s+(.+)$/)
  if (taskMatch) {
    return `\n${taskMatch[1]}${taskMatch[2]} [ ] `
  }

  const bulletEmptyMatch = beforeCursor.match(/^(\s*)([-+*])\s*$/)
  if (bulletEmptyMatch) {
    return '\n'
  }

  const bulletMatch = beforeCursor.match(/^(\s*)([-+*])\s+(.+)$/)
  if (bulletMatch) {
    return `\n${bulletMatch[1]}${bulletMatch[2]} `
  }

  return null
}

function handleMarkdownEnter() {
  if (!editor || props.language !== 'markdown') return false

  const selection = editor.getSelection()
  const model = editor.getModel()
  if (!selection || !model || !selection.isEmpty()) return false

  const lineNumber = selection.startLineNumber
  const column = selection.startColumn
  const lineContent = model.getLineContent(lineNumber)
  const continuationText = buildMarkdownListContinuation(lineContent, column)

  if (continuationText === null) {
    return false
  }

  editor.pushUndoStop()
  editor.executeEdits('markdown-list-auto-continue', [{
    range: selection,
    text: continuationText,
    forceMoveMarkers: true
  }])
  editor.pushUndoStop()
  editor.focus()
  return true
}

const MONOSPACE_FALLBACK = 'Consolas, "Cascadia Mono", "Courier New", monospace'

function waitForInlineCompletionDelay(delayMs, token) {
  return new Promise((resolve) => {
    if (token?.isCancellationRequested) {
      debugInlineCompletion('delay-cancelled', { reason: 'token-already-cancelled' })
      resolve(false)
      return
    }

    let cleanup = null
    const timeout = setTimeout(() => {
      cleanup?.dispose?.()
      resolve(!token?.isCancellationRequested)
    }, Math.max(0, Number(delayMs) || 0))

    cleanup = token?.onCancellationRequested?.(() => {
      debugInlineCompletion('delay-cancelled', { reason: 'token-cancelled-during-delay' })
      clearTimeout(timeout)
      cleanup?.dispose?.()
      resolve(false)
    })
  })
}

function disposeInlineCompletionProvider() {
  inlineCompletionDisposable?.dispose?.()
  inlineCompletionDisposable = null
  cachedInlineCompletion = null
  activeInlineCompletion = null
}

function applyInlineCompletionStyle() {
  if (!editorContainer.value) return
  const style = props.inlineCompletionStyle || {}
  const targets = [
    editorContainer.value,
    ...editorContainer.value.querySelectorAll('.monaco-editor')
  ]

  targets.forEach((target) => {
    inlineCompletionStyleVarNames.forEach((name) => {
      const value = style[name]
      if (typeof value === 'undefined' || value === null || value === '') {
        target.style.removeProperty(name)
        return
      }
      target.style.setProperty(name, String(value))
    })
  })
}

function applyInlineCompletionHintText(lineCount = 0) {
  if (!editorContainer.value) return
  const hintText = lineCount > 1 ? INLINE_COMPLETION_SNIPPET_HINT_TEXT : INLINE_COMPLETION_LINE_HINT_TEXT
  const targets = [
    editorContainer.value,
    ...editorContainer.value.querySelectorAll('.monaco-editor')
  ]

  targets.forEach((target) => {
    target.style.setProperty('--inline-completion-hint-text', hintText)
  })
}

function refreshInlineCompletionHintMarkers() {
  if (!editorContainer.value) return
  const ghostTexts = Array.from(editorContainer.value.querySelectorAll(INLINE_COMPLETION_GHOST_TEXT_SELECTOR))
    .map((ghostText) => ({
      ghostText,
      rect: ghostText.getBoundingClientRect()
    }))
    .sort((a, b) => {
      if (a.rect.top !== b.rect.top) return a.rect.top - b.rect.top
      return a.rect.left - b.rect.left
    })

  ghostTexts.forEach(({ ghostText }, index) => {
    ghostText.dataset.inlineCompletionHint = index === 0 ? 'primary' : 'secondary'
  })
}

function scheduleInlineCompletionHintMarkerRefresh() {
  if (!editorContainer.value || typeof window === 'undefined') return
  if (inlineCompletionHintFrame) window.cancelAnimationFrame(inlineCompletionHintFrame)
  inlineCompletionHintFrame = window.requestAnimationFrame(() => {
    inlineCompletionHintFrame = 0
    refreshInlineCompletionHintMarkers()
  })
}

function startInlineCompletionHintObserver() {
  if (!editorContainer.value || inlineCompletionHintObserver || typeof MutationObserver === 'undefined') return
  inlineCompletionHintObserver = new MutationObserver(() => {
    scheduleInlineCompletionHintMarkerRefresh()
  })
  inlineCompletionHintObserver.observe(editorContainer.value, {
    childList: true,
    subtree: true
  })
}

function stopInlineCompletionHintObserver() {
  inlineCompletionHintObserver?.disconnect?.()
  inlineCompletionHintObserver = null
  if (inlineCompletionHintFrame && typeof window !== 'undefined') {
    window.cancelAnimationFrame(inlineCompletionHintFrame)
  }
  inlineCompletionHintFrame = 0
}

function clearInlineCompletionTrigger() {
  if (!inlineCompletionTriggerTimer) return
  clearTimeout(inlineCompletionTriggerTimer)
  inlineCompletionTriggerTimer = 0
}

function triggerInlineCompletion() {
  if (!editor) {
    debugInlineCompletion('trigger-skipped', { reason: 'editor-missing' })
    return
  }
  if (isComposing) {
    debugInlineCompletion('trigger-skipped', { reason: 'composing' })
    return
  }
  if (!props.inlineCompletionProvider?.request) {
    debugInlineCompletion('trigger-skipped', { reason: 'provider-missing', language: props.language })
    return
  }
  debugInlineCompletion('trigger', { language: props.language })
  editor.trigger('slimnote-inline-completion', 'editor.action.inlineSuggest.trigger', {})
}

function scheduleInlineCompletionTrigger() {
  clearInlineCompletionTrigger()
  debugInlineCompletion('schedule-trigger', { language: props.language })
  inlineCompletionTriggerTimer = setTimeout(() => {
    inlineCompletionTriggerTimer = 0
    triggerInlineCompletion()
  }, 0)
}

function getInlineCompletionLineCount(text) {
  const normalized = typeof text === 'string' ? text.replace(/\r\n/g, '\n') : ''
  return normalized ? normalized.split('\n').length : 0
}

function rememberActiveInlineCompletion(model, position, suggestion, source = 'request') {
  const { remainingText } = consumeInlineCompletionLine(suggestion)
  const lineCount = getInlineCompletionLineCount(suggestion)
  activeInlineCompletion = {
    language: props.language,
    versionId: model.getVersionId(),
    cursorOffset: model.getOffsetAt(position),
    suggestion
  }
  applyInlineCompletionHintText(lineCount)
  scheduleInlineCompletionHintMarkerRefresh()
  debugInlineCompletion('active-set', {
    source,
    language: props.language,
    versionId: activeInlineCompletion.versionId,
    cursorOffset: activeInlineCompletion.cursorOffset,
    suggestionLength: suggestion.length,
    lineCount,
    remainingLength: remainingText.length
  })
}

function createInlineCompletionResult(model, position, suggestion, source = 'request') {
  rememberActiveInlineCompletion(model, position, suggestion, source)
  return {
    items: [{
      insertText: suggestion,
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
    }],
    suppressSuggestions: true
  }
}

function acceptInlineCompletionLine() {
  const model = editor?.getModel?.()
  const position = editor?.getPosition?.()
  const completion = activeInlineCompletion
  if (!model || !position || !completion?.suggestion) {
    debugInlineCompletion('accept-tab-line-skipped', { reason: !model ? 'model-missing' : (!position ? 'position-missing' : 'active-missing') })
    return
  }

  const versionId = model.getVersionId()
  const cursorOffset = model.getOffsetAt(position)
  if (completion.language !== props.language || completion.versionId !== versionId || completion.cursorOffset !== cursorOffset) {
    debugInlineCompletion('accept-tab-line-skipped', {
      reason: 'active-stale',
      language: props.language,
      activeLanguage: completion.language,
      versionId,
      activeVersionId: completion.versionId,
      cursorOffset,
      activeCursorOffset: completion.cursorOffset
    })
    activeInlineCompletion = null
    scheduleInlineCompletionTrigger()
    return
  }

  const { acceptedText, remainingText } = consumeInlineCompletionLine(completion.suggestion)
  const acceptedInsertText = remainingText && !/[\r\n]$/.test(acceptedText) ? `${acceptedText}\n` : acceptedText
  if (!acceptedText) {
    debugInlineCompletion('accept-tab-line-skipped', { reason: 'accepted-empty' })
    activeInlineCompletion = null
    return
  }

  debugInlineCompletion('accept-tab-line-custom', {
    acceptedLength: acceptedText.length,
    acceptedInsertLength: acceptedInsertText.length,
    appendedLineBreak: acceptedInsertText !== acceptedText,
    remainingLength: remainingText.length,
    lineCount: getInlineCompletionLineCount(completion.suggestion)
  })

  activeInlineCompletion = null
  isAcceptingInlineCompletionLine = true
  try {
    editor.pushUndoStop()
    const edited = editor.executeEdits('inline-completion-accept-line', [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: acceptedInsertText,
      forceMoveMarkers: true
    }])
    if (!edited) {
      debugInlineCompletion('accept-tab-line-skipped', { reason: 'execute-edits-failed' })
      editor.pushUndoStop()
      return
    }
    const nextPosition = model.getPositionAt(cursorOffset + acceptedInsertText.length)
    editor.setPosition(nextPosition)
    editor.pushUndoStop()
    editor.focus()

    if (remainingText) {
      const nextOffset = model.getOffsetAt(nextPosition)
      cachedInlineCompletion = {
        language: props.language,
        versionId: model.getVersionId(),
        cursorOffset: nextOffset,
        suggestion: remainingText
      }
      debugInlineCompletion('accept-tab-line-remaining', {
        language: props.language,
        versionId: cachedInlineCompletion.versionId,
        cursorOffset: nextOffset,
        remainingLength: remainingText.length,
        lineCount: getInlineCompletionLineCount(remainingText)
      })
      scheduleInlineCompletionTrigger()
    }
  } finally {
    isAcceptingInlineCompletionLine = false
  }
}

function acceptInlineCompletionSnippet() {
  debugInlineCompletion('accept-tab-snippet', { action: 'editor.action.inlineSuggest.commit', suggestionLength: activeInlineCompletion?.suggestion?.length || 0 })
  activeInlineCompletion = null
  editor?.trigger('slimnote-inline-completion', 'editor.action.inlineSuggest.commit', {})
}

function registerInlineCompletionProvider() {
  disposeInlineCompletionProvider()
  const provider = props.inlineCompletionProvider
  if (!provider?.request || !props.language) {
    debugInlineCompletion('provider-register-skipped', { reason: !provider?.request ? 'provider-missing' : 'language-missing', language: props.language })
    return
  }

  debugInlineCompletion('provider-register', { language: props.language })
  inlineCompletionDisposable = monaco.languages.registerInlineCompletionsProvider(props.language, {
    async provideInlineCompletions(model, position, _context, token) {
      if (!editor || isComposing || token?.isCancellationRequested) {
        debugInlineCompletion('provide-skipped', { reason: !editor ? 'editor-missing' : (isComposing ? 'composing' : 'cancelled'), language: props.language })
        return { items: [] }
      }

      const selection = editor.getSelection()
      if (!selection?.isEmpty?.()) {
        debugInlineCompletion('provide-skipped', { reason: 'selection-not-empty', language: props.language })
        return { items: [] }
      }

      const versionId = model.getVersionId()
      const cursorOffset = model.getOffsetAt(position)
      if (cachedInlineCompletion
        && cachedInlineCompletion.language === props.language
        && cachedInlineCompletion.versionId === versionId
        && cachedInlineCompletion.cursorOffset === cursorOffset
        && cachedInlineCompletion.suggestion) {
        const suggestion = cachedInlineCompletion.suggestion
        cachedInlineCompletion = null
        debugInlineCompletion('cache-hit', { language: props.language, cursorOffset, versionId, suggestionLength: suggestion.length, lineCount: getInlineCompletionLineCount(suggestion) })
        return createInlineCompletionResult(model, position, suggestion, 'cache')
      }

      const delayMs = provider.getDelayMs?.() ?? 500
      debugInlineCompletion('delay-start', { delayMs, language: props.language, lineNumber: position.lineNumber, column: position.column })
      const shouldContinue = await waitForInlineCompletionDelay(delayMs, token)
      if (!shouldContinue || isComposing || token?.isCancellationRequested) {
        debugInlineCompletion('provide-skipped', { reason: !shouldContinue ? 'delay-cancelled' : (isComposing ? 'composing-after-delay' : 'cancelled-after-delay'), language: props.language })
        return { items: [] }
      }

      const tokenCleanup = token?.onCancellationRequested?.(() => {
        debugInlineCompletion('request-cancelled', { reason: 'token-cancelled', language: props.language, cursorOffset, versionId })
      })
      let suggestion = ''
      try {
        debugInlineCompletion('request-start', { language: props.language, cursorOffset, contentLength: model.getValueLength(), versionId })
        suggestion = await provider.request({
          source: 'monaco',
          content: model.getValue(),
          cursorOffset,
          language: props.language,
          editorMode: 'source',
          contentVersion: versionId
        }).finally(() => {
          tokenCleanup?.dispose?.()
        })
      } catch (error) {
        debugInlineCompletion('request-error', { message: error?.message || String(error || '') })
        return { items: [] }
      }

      const currentPosition = editor.getPosition()
      debugInlineCompletion('request-complete', { suggestionLength: suggestion.length, lineCount: getInlineCompletionLineCount(suggestion), cancelled: Boolean(token?.isCancellationRequested), versionChanged: model.getVersionId() !== versionId })
      if (suggestion && token?.isCancellationRequested && model.getVersionId() === versionId) {
        cachedInlineCompletion = { language: props.language, versionId, cursorOffset, suggestion }
        debugInlineCompletion('cache-store', { language: props.language, cursorOffset, versionId, suggestionLength: suggestion.length, lineCount: getInlineCompletionLineCount(suggestion) })
        scheduleInlineCompletionTrigger()
        return { items: [] }
      }
      if (!suggestion || token?.isCancellationRequested || model.getVersionId() !== versionId) return { items: [] }
      if (!currentPosition || currentPosition.lineNumber !== position.lineNumber || currentPosition.column !== position.column) {
        debugInlineCompletion('provide-skipped', { reason: 'cursor-moved', currentLineNumber: currentPosition?.lineNumber, currentColumn: currentPosition?.column, lineNumber: position.lineNumber, column: position.column })
        return { items: [] }
      }

      return createInlineCompletionResult(model, position, suggestion, 'request')
    },
    freeInlineCompletions() {}
  })
}

function resolveEditorFontFamily(fontFamily) {
  if (!fontFamily || !isMonospaceFontFamily(fontFamily)) {
    return MONOSPACE_FALLBACK
  }

  return `${fontFamily}, ${MONOSPACE_FALLBACK}`
}

function getUnicodeHighlightOptions(enabled = true) {
  if (!enabled) {
    return {
      ambiguousCharacters: false,
      invisibleCharacters: false,
      nonBasicASCII: false
    }
  }

  return {
    ambiguousCharacters: true,
    invisibleCharacters: true
  }
}

function applyIndentationOptions(targetEditor, tabSize) {
  if (!targetEditor) return

  const normalizedTabSize = Number(tabSize) || 4

  targetEditor.updateOptions({
    tabSize: normalizedTabSize,
    insertSpaces: true,
    detectIndentation: false,
    useTabStops: true,
    autoIndent: 'advanced'
  })

  const model = targetEditor.getModel()
  if (model) {
    model.updateOptions({
      tabSize: normalizedTabSize,
      indentSize: normalizedTabSize,
      insertSpaces: true,
      trimAutoWhitespace: true
    })
  }
}

function resolveMonacoTheme(appTheme = settingsStore.settings.theme, language = props.language, requestedTheme = props.editorTheme) {
  if (requestedTheme) {
    return requestedTheme
  }

  const resolvedTheme = settingsStore.effectiveTheme || resolveMarkdownTheme(settingsStore.settings.themeRef, appTheme)
  return defineSlimNoteEditorTheme(resolvedTheme, language)
}

const handleUndo = () => {
  editor?.trigger('keyboard', 'undo', null)
}

const handleRedo = () => {
  editor?.trigger('keyboard', 'redo', null)
}

const handleFind = () => {
  editor?.getAction('actions.find')?.run()
}

const handleReplace = () => {
  editor?.getAction('editor.action.startFindReplaceAction')?.run()
}

const handleSelectAll = () => {
  editor?.trigger('keyboard', 'editor.action.selectAll', null)
}

const handleWheel = (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    e.stopPropagation()
    
    const delta = e.deltaY > 0 ? -1 : 1
    const currentSize = props.fontSize || settingsStore.settings.fontSize
    const newSize = Math.max(8, Math.min(72, currentSize + delta))
    
    if (newSize !== currentSize) {
      emit('change-font-size', newSize)
    }
  }
}

onMounted(() => {
  if (!editorContainer.value) return

  rendererEventCleanups.push(
    onRendererEvent(RENDERER_EVENTS.UNDO, handleUndo),
    onRendererEvent(RENDERER_EVENTS.REDO, handleRedo),
    onRendererEvent(RENDERER_EVENTS.FIND, handleFind),
    onRendererEvent(RENDERER_EVENTS.REPLACE, handleReplace),
    onRendererEvent(RENDERER_EVENTS.SELECT_ALL, handleSelectAll)
  )
  // Use capture phase to intercept the event before Monaco consumes it
  editorContainer.value.addEventListener('wheel', handleWheel, { passive: false, capture: true })

  // 初始化自定义主题
  defineCustomThemes()

  // 配置 Monaco Editor
  monaco.languages.register({ id: 'log' });
  monaco.languages.setMonarchTokensProvider('log', {
    tokenizer: {
      root: [
        // Date/Time: 2025-12-24 19:00:32,459
        [/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(,\d{3})?/, "custom-date"],
        // Date/Time: 2025/12/24 19:00:32
        [/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/, "custom-date"],
        // Time: 19:00:32.459
        [/\d{2}:\d{2}:\d{2}(\.\d{3})?/, "custom-date"],

        // Log Levels
        [/INFO\b/, "custom-info"],
        [/WARN\b/, "custom-notice"],
        [/ERROR\b/, "custom-error"],
        [/DEBUG\b/, "custom-debug"],
        [/FATAL\b/, "custom-error"],
        [/TRACE\b/, "custom-debug"],

        // Brackets content like [131] or [main]
        [/\[.*?\]/, "custom-content"],
        
        // Fallback for old style [error] etc if they exist
        [/\[error.*/, "custom-error"],
        [/\[notice.*/, "custom-notice"],
        [/\[info.*/, "custom-info"],
      ]
    }
  });

  monaco.editor.defineTheme('logTheme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'custom-info', foreground: '408080' },
      { token: 'custom-error', foreground: 'ff0000', fontStyle: 'bold' },
      { token: 'custom-notice', foreground: 'FFA500' },
      { token: 'custom-date', foreground: '008800' },
      { token: 'custom-content', foreground: '0000FF' },
      { token: 'custom-debug', foreground: '808080' },
    ],
    colors: {}
  });

  monaco.editor.defineTheme('logThemeDark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'custom-info', foreground: '4EC9B0' },
      { token: 'custom-error', foreground: 'F44747', fontStyle: 'bold' },
      { token: 'custom-notice', foreground: 'DCDCAA' },
      { token: 'custom-date', foreground: '6A9955' },
      { token: 'custom-content', foreground: '569CD6' },
      { token: 'custom-debug', foreground: '808080' },
    ],
    colors: {}
  });

  // 确定初始主题
  const initialTheme = resolveMonacoTheme()

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    theme: initialTheme,
    fontSize: props.fontSize || settingsStore.settings.fontSize,
    fontFamily: resolveEditorFontFamily(settingsStore.settings.fontFamily),
    tabSize: settingsStore.settings.tabSize,
    insertSpaces: true,
    detectIndentation: false,
    useTabStops: true,
    autoIndent: 'advanced',
    wordWrap: settingsStore.settings.wordWrap ? 'on' : 'off',
    lineNumbers: settingsStore.settings.lineNumbers ? 'on' : 'off',
    minimap: {
      enabled: settingsStore.settings.minimap
    },
    contextmenu: false, // Disable default context menu to use Electron's native one
    automaticLayout: true,
    scrollBeyondLastLine: false,
    padding: {
      top: 16,
      bottom: 32
    },
    renderWhitespace: 'selection',
    formatOnPaste: true,
    formatOnType: true,
    mouseWheelZoom: false,
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: 'off',
    inlineSuggest: {
      enabled: true,
      mode: 'prefix',
      suppressSuggestions: true,
      showToolbar: 'never'
    },
    unicodeHighlight: getUnicodeHighlightOptions(settingsStore.settings.unicodeHighlight),
    bracketPairColorization: {
      enabled: props.language === 'json'
    },
    guides: {
      bracketPairs: props.language === 'json',
      indentation: true,
      highlightActiveIndentation: true
    }
  })

  editor.onDidCompositionStart(() => {
    isComposing = true
    clearInlineCompletionTrigger()
    cachedInlineCompletion = null
    activeInlineCompletion = null
    props.inlineCompletionProvider?.cancel?.()
  })

  editor.onDidCompositionEnd(() => {
    isComposing = false
  })

  applyInlineCompletionStyle()
  startInlineCompletionHintObserver()
  registerInlineCompletionProvider()

  editor.addCommand(monaco.KeyCode.Enter, () => {
    if (handleMarkdownEnter()) {
      return
    }

    editor.trigger('keyboard', 'type', { text: '\n' })
  })

  editor.addCommand(
    monaco.KeyCode.Tab,
    acceptInlineCompletionLine,
    'inlineSuggestionVisible && !editorTabMovesFocus && !suggestWidgetVisible'
  )

  editor.addCommand(
    monaco.KeyMod.Shift | monaco.KeyCode.Tab,
    acceptInlineCompletionSnippet,
    'inlineSuggestionVisible && !editorTabMovesFocus && !suggestWidgetVisible'
  )

  applyIndentationOptions(editor, settingsStore.settings.tabSize)

  // 粘贴时自动格式化 JSON
  editor.onDidPaste((e) => {
    const model = editor.getModel()
    const pastedText = model?.getValueInRange(e.range) || ''
    const fullContent = model?.getValue() || ''
    const startOffset = model ? model.getOffsetAt(e.range.getStartPosition()) : 0
    const endOffset = model ? model.getOffsetAt(e.range.getEndPosition()) : 0
    const surroundingContent = `${fullContent.slice(0, startOffset)}${fullContent.slice(endOffset)}`

    emit('paste-content', {
      text: pastedText,
      hadContentBeforePaste: surroundingContent.trim().length > 0
    })

    if (props.language !== 'json') return

    if (!model) return

    // 获取粘贴的内容
    if (!pastedText.trim()) return

    // 尝试解析并格式化
    try {
      const parsed = JSON.parse(pastedText)
      const formatted = JSON.stringify(parsed, null, 2)

      // 如果内容有变化，替换它
      if (formatted !== pastedText) {
        editor.executeEdits('auto-format', [{
          range: e.range,
          text: formatted
        }])
      }
    } catch {
      // 解析失败，不做处理
    }
  })

  // 监听内容变化
  editor.onDidChangeModelContent(() => {
    if (!isAcceptingInlineCompletionLine) {
      cachedInlineCompletion = null
      activeInlineCompletion = null
      props.inlineCompletionProvider?.cancel?.()
    }
    const value = editor.getValue()
    emit('update:modelValue', value)
    scheduleInlineCompletionTrigger()
  })

  // 监听主题变化
  watch(() => settingsStore.settings.theme, (newTheme) => {
    monaco.editor.setTheme(resolveMonacoTheme(newTheme, props.language, props.editorTheme))
  })

  // 监听语言变化
  watch(() => props.language, (newLang) => {
    if (editor) {
      const model = editor.getModel()
      if (model) {
        monaco.editor.setModelLanguage(model, newLang)
        editor.updateOptions({
          bracketPairColorization: {
            enabled: newLang === 'json'
          },
          guides: {
            bracketPairs: newLang === 'json',
            indentation: true,
            highlightActiveIndentation: true
          }
        })
        monaco.editor.setTheme(resolveMonacoTheme(settingsStore.settings.theme, newLang, props.editorTheme))
        registerInlineCompletionProvider()
      }
    }
  })

  // 监听滚动
  editor.onDidScrollChange((e) => {
    const model = editor.getModel()
    if (model && !isSyncingScroll) {
      const scrollHeight = editor.getScrollHeight()
      const scrollTop = editor.getScrollTop()
      const clientHeight = editor.getLayoutInfo().height
      const maxScrollable = Math.max(scrollHeight - clientHeight, 0)
      const ratio = maxScrollable > 0 ? Math.min(Math.max(scrollTop / maxScrollable, 0), 1) : 0
      emit('scroll', { scrollTop, scrollHeight, clientHeight, ratio })
    }
  })

  // 监听光标位置变化
  editor.onDidChangeCursorPosition((e) => {
    if (!isAcceptingInlineCompletionLine) {
      cachedInlineCompletion = null
      activeInlineCompletion = null
      props.inlineCompletionProvider?.cancel?.()
    }
    emit('cursor-change', { line: e.position.lineNumber, column: e.position.column })
  })

  // 监听右键菜单
  editor.onContextMenu((e) => {
    e.event.preventDefault()
    window.electronAPI.showEditorContextMenu()
  })
})

onUnmounted(() => {
  rendererEventCleanups.splice(0).forEach((cleanup) => cleanup())
  clearInlineCompletionTrigger()
  stopInlineCompletionHintObserver()
  if (editorContainer.value) {
    editorContainer.value.removeEventListener('wheel', handleWheel)
  }
  if (editor) {
    disposeInlineCompletionProvider()
    editor.dispose()
  }
})

// 监听属性变化
watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getValue()) {
    cachedInlineCompletion = null
    activeInlineCompletion = null
    editor.setValue(newValue)
  }
})

watch(() => props.language, (newLang) => {
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel(), newLang)
    editor.updateOptions({
      bracketPairColorization: {
        enabled: newLang === 'json'
      },
      guides: {
        bracketPairs: newLang === 'json',
        indentation: true,
        highlightActiveIndentation: true
      }
    })
    registerInlineCompletionProvider()
  }
})

watch(() => props.inlineCompletionProvider, () => {
  registerInlineCompletionProvider()
})

watch(() => props.inlineCompletionStyle, () => {
  applyInlineCompletionStyle()
}, { deep: true })

watch(() => props.theme, (newTheme) => {
  if (editor) {
    monaco.editor.setTheme(resolveMonacoTheme(newTheme, props.language, props.editorTheme))
    applyInlineCompletionStyle()
  }
})

watch(() => props.fontSize, (newSize) => {
  if (editor) {
    editor.updateOptions({ fontSize: newSize })
  }
})

// 监听编辑器主题变化
watch(() => props.editorTheme, (newTheme) => {
  if (editor) {
    setEditorTheme(newTheme)
    applyInlineCompletionStyle()
  }
})

// 监听设置变化
watch(() => settingsStore.settings, (newSettings) => {
  if (!editor) return
  
  monaco.editor.setTheme(resolveMonacoTheme(newSettings.theme, props.language, props.editorTheme))
  applyInlineCompletionStyle()

  editor.updateOptions({
    // fontSize: newSettings.fontSize, // Use prop instead
    fontFamily: resolveEditorFontFamily(newSettings.fontFamily),
    wordWrap: newSettings.wordWrap ? 'on' : 'off',
    unicodeHighlight: getUnicodeHighlightOptions(newSettings.unicodeHighlight),
    lineNumbers: newSettings.lineNumbers ? 'on' : 'off',
    minimap: {
      enabled: newSettings.minimap
    },
  })

  applyIndentationOptions(editor, newSettings.tabSize)
}, { deep: true })

function triggerAction(actionId) {
  if (editor) {
    editor.trigger('source', actionId)
  }
}

function getSelection() {
  if (!editor) return ''
  const selection = editor.getSelection()
  return editor.getModel().getValueInRange(selection)
}

function insertText(text) {
  if (!editor) return
  const selection = editor.getSelection()
  const id = { major: 1, minor: 1 }
  const op = { range: selection, text: text, forceMoveMarkers: true }
  editor.executeEdits('my-source', [op])
  editor.focus()
}

function replaceSelection(text) {
  insertText(text)
}

// 跳转到指定行
function jumpToLine(lineNumber, column = 1) {
  if (!editor) return
  editor.revealLineInCenter(lineNumber)
  editor.setPosition({ lineNumber, column })
  editor.focus()
}

function setScrollRatio(ratio) {
  if (!editor) return

  const scrollHeight = editor.getScrollHeight()
  const clientHeight = editor.getLayoutInfo().height
  const maxScrollable = Math.max(scrollHeight - clientHeight, 0)
  const safeRatio = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0

  isSyncingScroll = true
  editor.setScrollTop(maxScrollable * safeRatio)
  requestAnimationFrame(() => {
    isSyncingScroll = false
  })
}

function findNext(query, options = {}) {
  if (!editor || !query) return false

  const model = editor.getModel()
  if (!model) return false

  const matches = model.findMatches(
    query,
    false,
    Boolean(options.isRegex),
    Boolean(options.matchCase),
    null,
    true
  )

  if (!matches.length) {
    return false
  }

  const currentPosition = editor.getPosition()
  const nextMatch = matches.find((match) => {
    if (!currentPosition) return true
    return match.range.startLineNumber > currentPosition.lineNumber
      || (match.range.startLineNumber === currentPosition.lineNumber && match.range.startColumn > currentPosition.column)
  }) || matches[0]

  editor.setSelection(nextMatch.range)
  editor.revealRangeInCenter(nextMatch.range)
  editor.focus()
  return true
}

function scrollToBottom() {
  if (!editor) return
  editor.setScrollTop(editor.getScrollHeight())
  editor.focus()
}

function setWordWrap(enabled) {
  if (!editor) return
  editor.updateOptions({ wordWrap: enabled ? 'on' : 'off' })
}

// 设置编辑器主题
function setEditorTheme(themeId) {
  if (!editor) return
  applyTheme(resolveMonacoTheme(settingsStore.settings.theme, props.language, themeId))
  applyInlineCompletionStyle()
}

// 获取编辑器实例
function getEditor() {
  return editor
}

defineExpose({
  triggerAction,
  getSelection,
  insertText,
  replaceSelection,
  jumpToLine,
  setScrollRatio,
  findNext,
  scrollToBottom,
  setWordWrap,
  setEditorTheme,
  getEditor
})

onUnmounted(() => {
  stopInlineCompletionHintObserver()
  if (editorContainer.value) {
    editorContainer.value.removeEventListener('wheel', handleWheel, { capture: true })
  }
  if (editor) {
    disposeInlineCompletionProvider()
    editor.dispose()
  }
  rendererEventCleanups.splice(0).forEach((cleanup) => cleanup())
})
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
}

.monaco-editor-container :deep(.ghost-text-decoration),
.monaco-editor-container :deep(.ghost-text-decoration-preview),
.monaco-editor-container :deep(.ghost-text),
.monaco-editor-container :deep(.suggest-preview-text .ghost-text) {
  color: var(--inline-completion-color, rgba(34, 211, 238, 0.7)) !important;
  opacity: 1 !important;
  font-style: normal;
}

.monaco-editor-container :deep(.ghost-text-decoration::after),
.monaco-editor-container :deep(.ghost-text-decoration-preview::after),
.monaco-editor-container :deep(.suggest-preview-text .ghost-text::after) {
  content: none;
  display: none;
  margin-left: 8px;
  padding: 1px 5px;
  border: 1px solid var(--inline-completion-keycap-border, rgba(34, 211, 238, 0.46));
  border-radius: 5px;
  color: var(--inline-completion-strong-color, rgba(34, 211, 238, 0.86));
  background: var(--inline-completion-keycap-bg, rgba(34, 211, 238, 0.16));
  font-family: var(--font-family-ui, system-ui, sans-serif);
  font-size: 0.82em;
  font-weight: 600;
  line-height: 1.25;
  opacity: 0.72;
  vertical-align: 0.06em;
}

.monaco-editor-container :deep(.ghost-text-decoration[data-inline-completion-hint="primary"]::after),
.monaco-editor-container :deep(.ghost-text-decoration-preview[data-inline-completion-hint="primary"]::after),
.monaco-editor-container :deep(.suggest-preview-text .ghost-text[data-inline-completion-hint="primary"]::after) {
  content: var(--inline-completion-hint-text, 'Tab接受');
  display: inline-block;
}

.monaco-editor-container :deep(.view-line:has(.ghost-text-decoration) ~ .view-line:has(.ghost-text-decoration) .ghost-text-decoration::after),
.monaco-editor-container :deep(.view-line:has(.ghost-text-decoration-preview) ~ .view-line:has(.ghost-text-decoration-preview) .ghost-text-decoration-preview::after),
.monaco-editor-container :deep(.view-line:has(.suggest-preview-text .ghost-text) ~ .view-line:has(.suggest-preview-text .ghost-text) .suggest-preview-text .ghost-text::after) {
  content: none;
  display: none;
}

.monaco-editor-container :deep(.inlineSuggestionsHints) {
  display: none !important;
  border-color: var(--inline-completion-keycap-border, rgba(34, 211, 238, 0.46)) !important;
  color: var(--inline-completion-strong-color, rgba(34, 211, 238, 0.86)) !important;
  background: var(--inline-completion-keycap-bg, rgba(34, 211, 238, 0.16)) !important;
  box-shadow: none !important;
}
</style>
