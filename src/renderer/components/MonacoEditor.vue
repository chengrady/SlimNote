<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { useSettingsStore } from '../stores/settings'
import { RENDERER_EVENTS, onRendererEvent } from '../utils/rendererEvents'
import { defineCustomThemes, applyTheme, getDefaultEditorTheme } from '../utils/monacoThemes'
import { isMonospaceFontFamily } from '../utils/fontFamilies'

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
  }
})

const emit = defineEmits(['update:modelValue', 'scroll', 'cursor-change', 'change-font-size', 'paste-content'])

const settingsStore = useSettingsStore()
const editorContainer = ref()
let editor = null
let isSyncingScroll = false
const rendererEventCleanups = []

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
  if (language === 'log') {
    return appTheme === 'dark' ? 'logThemeDark' : 'logTheme'
  }

  if (requestedTheme) {
    return requestedTheme
  }

  return getDefaultEditorTheme(appTheme, language)
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
    renderWhitespace: 'selection',
    formatOnPaste: true,
    formatOnType: true,
    mouseWheelZoom: false,
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: 'off',
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

  editor.addCommand(monaco.KeyCode.Enter, () => {
    if (handleMarkdownEnter()) {
      return
    }

    editor.trigger('keyboard', 'type', { text: '\n' })
  })

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
    const value = editor.getValue()
    emit('update:modelValue', value)
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
  if (editorContainer.value) {
    editorContainer.value.removeEventListener('wheel', handleWheel)
  }
  if (editor) {
    editor.dispose()
  }
})

// 监听属性变化
watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getValue()) {
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
  }
})

watch(() => props.theme, (newTheme) => {
  if (editor) {
    monaco.editor.setTheme(resolveMonacoTheme(newTheme, props.language, props.editorTheme))
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
  }
})

// 监听设置变化
watch(() => settingsStore.settings, (newSettings) => {
  if (!editor) return
  
  monaco.editor.setTheme(resolveMonacoTheme(newSettings.theme, props.language, props.editorTheme))

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
  if (editorContainer.value) {
    editorContainer.value.removeEventListener('wheel', handleWheel, { capture: true })
  }
  if (editor) {
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
</style>
