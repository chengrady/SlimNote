<template>
  <div
    ref="editorRef"
    class="milkdown-editor-container"
    :class="{ 'dark-theme': isDarkTheme }"
    tabindex="0"
    @keydown.capture="handleKeydown"
    @copy.capture="handleCopy"
  ></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import { insert, replaceAll } from '@milkdown/kit/utils'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { useSettingsStore } from '../stores/settings'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'light'
  },
  fontSize: {
    type: Number,
    default: 14
  }
})

const emit = defineEmits(['update:modelValue'])

const settingsStore = useSettingsStore()
const editorRef = ref()
let crepeEditor = null
let isEditorReady = false // Track if editor is fully initialized
let isApplyingExternalUpdate = false

const isDarkTheme = computed(() => settingsStore.settings.theme === 'dark')

function isPrimarySelectAll(event) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && String(event.key || '').toLowerCase() === 'a'
}

function getEditableRoot() {
  return editorRef.value?.querySelector('.ProseMirror') || null
}

function applyEditableRootPreferences() {
  const editableRoot = getEditableRoot()
  if (!editableRoot) return

  editableRoot.setAttribute('spellcheck', 'false')
  editableRoot.setAttribute('autocapitalize', 'off')
  editableRoot.setAttribute('autocorrect', 'off')
  editableRoot.setAttribute('autocomplete', 'off')
  editableRoot.setAttribute('data-gramm', 'false')
  editableRoot.setAttribute('data-gramm_editor', 'false')
  editableRoot.setAttribute('data-enable-grammarly', 'false')
}

function isSelectionInsideEditor() {
  const editableRoot = getEditableRoot()
  const selection = window.getSelection()
  if (!editableRoot || !selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  return editableRoot.contains(range.commonAncestorContainer)
}

function selectAllEditableContent() {
  const editableRoot = getEditableRoot()
  const selection = window.getSelection()
  if (!editableRoot || !selection) return

  const range = document.createRange()
  range.selectNodeContents(editableRoot)
  selection.removeAllRanges()
  selection.addRange(range)
}

function getSelectionHtml(selection) {
  if (!selection || selection.rangeCount === 0) return ''

  const fragment = selection.getRangeAt(0).cloneContents()
  const wrapper = document.createElement('div')
  wrapper.appendChild(fragment)
  return wrapper.innerHTML
}

function handleKeydown(event) {
  if (!isPrimarySelectAll(event)) return

  const editableRoot = getEditableRoot()
  if (!editableRoot) return

  event.preventDefault()
  editableRoot.focus()
  selectAllEditableContent()
}

function handleCopy(event) {
  if (!isSelectionInsideEditor()) return

  const selection = window.getSelection()
  const html = getSelectionHtml(selection)
  const text = selection?.toString() || ''

  if (!html && !text) return

  event.clipboardData?.setData('text/plain', text)
  event.clipboardData?.setData('text/html', html || text)
  event.preventDefault()
}

function getCurrentMarkdown() {
  if (!crepeEditor || !isEditorReady) return props.modelValue || ''

  try {
    return crepeEditor.getMarkdown() || ''
  } catch (err) {
    console.warn('Failed to get markdown:', err)
    return props.modelValue || ''
  }
}

function replaceMarkdownContent(markdown) {
  if (!crepeEditor || !isEditorReady) return

  crepeEditor.editor.action(replaceAll(typeof markdown === 'string' ? markdown : '', true))
  applyEditableRootPreferences()
}

onMounted(async () => {
  if (!editorRef.value) return

  try {
    // Create Crepe editor with initial markdown content
    crepeEditor = new Crepe({
      root: editorRef.value,
      defaultValue: typeof props.modelValue === 'string' ? props.modelValue : '',
    })

    // Set up listener for markdown changes
    crepeEditor.on((manager) => {
      // Listen for markdown changes
      manager.markdownUpdated((ctx, markdown, prevMarkdown) => {
        if (isApplyingExternalUpdate) return
        if (markdown !== prevMarkdown) {
          emit('update:modelValue', markdown)
        }
      })

      // Set up image handlers after editor is mounted
      manager.mounted(() => {
        isEditorReady = true
        applyEditableRootPreferences()
      })
    })

    // Create the editor
    await crepeEditor.create()
    applyEditableRootPreferences()
  } catch (error) {
    console.error('Failed to create Milkdown editor:', error)
  }
})

onUnmounted(() => {
  if (crepeEditor) {
    crepeEditor.destroy()
    crepeEditor = null
  }
})

// Watch for external value changes
watch(() => props.modelValue, (value) => {
  if (!crepeEditor || !isEditorReady || isApplyingExternalUpdate) return

  const nextMarkdown = typeof value === 'string' ? value : ''
  if (nextMarkdown === getCurrentMarkdown()) return

  isApplyingExternalUpdate = true
  try {
    replaceMarkdownContent(nextMarkdown)
  } finally {
    queueMicrotask(() => {
      isApplyingExternalUpdate = false
    })
  }
})

// Watch for theme changes
watch(() => settingsStore.settings.theme, () => {
  // Re-apply theme class
  if (editorRef.value) {
    const container = editorRef.value
    if (isDarkTheme.value) {
      container.classList.add('dark-theme')
    } else {
      container.classList.remove('dark-theme')
    }
  }
})

// Expose methods
defineExpose({
  getMarkdown: () => {
    return getCurrentMarkdown()
  },
  setMarkdown: (markdown) => {
    if (!crepeEditor || !isEditorReady) return
    replaceMarkdownContent(markdown)
  },
  focus: () => {
    if (!crepeEditor || !isEditorReady) return
    crepeEditor.editor.action((ctx) => {
      ctx.get(editorViewCtx).focus()
    })
  },
  insertText: (text) => {
    if (!crepeEditor || !isEditorReady || !text) return

    crepeEditor.editor.action(insert(text, !/[\r\n]/.test(text)))
    applyEditableRootPreferences()
    crepeEditor.editor.action((ctx) => {
      ctx.get(editorViewCtx).focus()
    })
  }
})
</script>

<style scoped>
.milkdown-editor-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-size: v-bind('props.fontSize + "px"');
  line-height: 1.6;
  padding: 0;
  color: var(--text-main);
  background: var(--bg-primary);
  user-select: text;
  scrollbar-gutter: stable;
}

.milkdown-editor-container.dark-theme {
  color: var(--text-main);
  background: var(--bg-primary);
}

.milkdown-editor-container.dark-theme :deep(.milkdown) {
  --crepe-color-background: #1a1a1a;
  --crepe-color-on-background: #e6e6e6;
  --crepe-color-surface: #121212;
  --crepe-color-surface-low: #1c1c1c;
  --crepe-color-on-surface: #d1d1d1;
  --crepe-color-on-surface-variant: #a9a9a9;
  --crepe-color-outline: #757575;
  --crepe-color-primary: #b5b5b5;
  --crepe-color-secondary: #4d4d4d;
  --crepe-color-on-secondary: #d6d6d6;
  --crepe-color-inverse: #e5e5e5;
  --crepe-color-on-inverse: #2a2a2a;
  --crepe-color-inline-code: #ff6666;
  --crepe-color-error: #ff6666;
  --crepe-color-hover: #232323;
  --crepe-color-selected: #2f2f2f;
  --crepe-color-inline-area: #2b2b2b;
}

/* Milkdown editor styles */
.milkdown-editor-container :deep(.milkdown),
.milkdown-editor-container :deep(.editor),
.milkdown-editor-container :deep(.ProseMirror),
.milkdown-editor-container :deep(.crepe),
.milkdown-editor-container :deep(.cm-editor) {
  background: transparent;
  color: inherit;
}

.milkdown-editor-container :deep(.milkdown) {
  outline: none;
  min-height: 100%;
  font-family: inherit;
}

.milkdown-editor-container :deep(.milkdown .editor) {
  outline: none;
}

.milkdown-editor-container :deep(.ProseMirror) {
  min-height: 100%;
  padding: clamp(20px, 2.8vw, 36px);
  font-family: inherit;
  line-height: 1.6;
  color: var(--text-main);
}

.milkdown-editor-container :deep(.ProseMirror > :first-child) {
  margin-top: 0;
}

.milkdown-editor-container :deep(.ProseMirror > :last-child) {
  margin-bottom: 0;
}

.milkdown-editor-container.dark-theme :deep(.milkdown),
.milkdown-editor-container.dark-theme :deep(.editor),
.milkdown-editor-container.dark-theme :deep(.ProseMirror),
.milkdown-editor-container.dark-theme :deep(.crepe),
.milkdown-editor-container.dark-theme :deep(.cm-editor),
.milkdown-editor-container.dark-theme :deep(.cm-scroller),
.milkdown-editor-container.dark-theme :deep(.cm-content),
.milkdown-editor-container.dark-theme :deep(.cm-focused),
.milkdown-editor-container.dark-theme :deep(.cm-line),
.milkdown-editor-container.dark-theme :deep(.cm-gutters),
.milkdown-editor-container.dark-theme :deep(.cm-activeLine),
.milkdown-editor-container.dark-theme :deep(.cm-activeLineGutter) {
  background: transparent !important;
  color: var(--text-main) !important;
}

.milkdown-editor-container.dark-theme :deep(pre),
.milkdown-editor-container.dark-theme :deep(pre code),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper pre),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper code),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-editor),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-scroller),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-content),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-line),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-editor),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-scroller),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-content),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-line),
.milkdown-editor-container.dark-theme :deep(.code-fence),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-editor),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-scroller),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-content),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-line) {
  background: color-mix(in srgb, var(--bg-secondary) 92%, rgba(255, 255, 255, 0.03)) !important;
  color: var(--text-main) !important;
}

.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-gutters),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-gutters),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-gutters) {
  background: color-mix(in srgb, var(--bg-secondary) 88%, rgba(255, 255, 255, 0.04)) !important;
  color: var(--text-muted) !important;
  border-right: 1px solid var(--glass-border) !important;
}

.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-activeLine),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-activeLine),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-activeLine) {
  background: color-mix(in srgb, var(--bg-secondary) 92%, rgba(255, 255, 255, 0.03)) !important;
}

.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-activeLineGutter),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-activeLineGutter),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-activeLineGutter),
.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-gutterElement),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-gutterElement),
.milkdown-editor-container.dark-theme :deep(.milkdown .milkdown-code-block .cm-lineNumbers .cm-gutterElement),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-gutterElement) {
  background: color-mix(in srgb, var(--bg-secondary) 88%, rgba(255, 255, 255, 0.04)) !important;
}

.milkdown-editor-container.dark-theme :deep(.code-block-wrapper .cm-cursor),
.milkdown-editor-container.dark-theme :deep(.code-fence .cm-cursor) {
  border-left-color: var(--text-main) !important;
}

.milkdown-editor-container.dark-theme :deep(.ProseMirror),
.milkdown-editor-container.dark-theme :deep(.milkdown .editor) {
  caret-color: var(--text-main);
}

.milkdown-editor-container.dark-theme :deep(button),
.milkdown-editor-container.dark-theme :deep([role='button']),
.milkdown-editor-container.dark-theme :deep(input),
.milkdown-editor-container.dark-theme :deep(textarea),
.milkdown-editor-container.dark-theme :deep(select) {
  background: var(--bg-secondary);
  color: var(--text-main);
  border-color: var(--glass-border);
}

/* Headings */
.milkdown-editor-container :deep(.milkdown .ProseMirror h1),
.milkdown-editor-container :deep(.milkdown .ProseMirror h2),
.milkdown-editor-container :deep(.milkdown .ProseMirror h3),
.milkdown-editor-container :deep(.milkdown .ProseMirror h4),
.milkdown-editor-container :deep(.milkdown .ProseMirror h5),
.milkdown-editor-container :deep(.milkdown .ProseMirror h6) {
  margin-top: var(--space-6);
  margin-bottom: var(--space-4);
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-main);
  padding: 0;
  font-family: inherit;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror h1) {
  font-size: 2em;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.3em;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror h2) {
  font-size: 1.5em;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.3em;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror h3) {
  font-size: 1.25em;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror h4) { font-size: 1em; }

.milkdown-editor-container :deep(.milkdown .ProseMirror h5) { font-size: 0.875em; }

.milkdown-editor-container :deep(.milkdown .ProseMirror h6) {
  font-size: 0.85em;
  color: var(--text-muted);
}

/* Paragraphs */
.milkdown-editor-container :deep(.milkdown .ProseMirror p) {
  margin: 0 0 var(--space-4) 0;
  padding: 0;
  font-size: 1em;
  line-height: inherit;
}

/* Links */
.milkdown-editor-container :deep(a) {
  color: var(--accent-primary);
  text-decoration: none;
}

.milkdown-editor-container :deep(a:hover) {
  text-decoration: underline;
}

/* Lists */
.milkdown-editor-container :deep(.milkdown .ProseMirror ul),
.milkdown-editor-container :deep(.milkdown .ProseMirror ol) {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: var(--space-4);
}

.milkdown-editor-container :deep(.milkdown .ProseMirror ol) {
  list-style-position: inside;
  padding-left: 0;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror ol li) {
  padding-left: 0.25em;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror ol li::marker) {
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror li) {
  margin-bottom: 0;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror li > p) {
  margin-bottom: 0;
}

/* Blockquotes */
.milkdown-editor-container :deep(.milkdown .ProseMirror blockquote) {
  margin: 0 0 var(--space-4) 0;
  padding: 0 1em;
  border-left: 0.25em solid rgba(var(--accent-primary-rgb), 0.28);
  color: var(--text-muted);
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: 0 8px 8px 0;
  box-sizing: border-box;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror blockquote p) {
  margin-bottom: 0;
}

/* Code */
.milkdown-editor-container :deep(code) {
  font-family: var(--font-family-mono, 'Consolas', 'Monaco', 'Courier New', monospace);
  font-size: 85%;
  background-color: rgba(128, 128, 128, 0.15);
  padding: 0.2em 0.4em;
  margin: 0;
  border-radius: 6px;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror pre) {
  font-family: var(--font-family-mono, 'Consolas', 'Monaco', 'Courier New', monospace);
  font-size: 14px;
  line-height: 1.45;
  background-color: var(--btn-bg);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0 0 16px 0;
}

.milkdown-editor-container :deep(pre code) {
  background: none;
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  border: 0;
}

/* Horizontal rules */
.milkdown-editor-container :deep(.milkdown .ProseMirror hr) {
  border: none;
  border-top: 1px solid var(--glass-border);
  margin: var(--space-5) 0;
  padding: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
}

/* Tables */
.milkdown-editor-container :deep(.milkdown .ProseMirror table) {
  border-spacing: 0;
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror th),
.milkdown-editor-container :deep(.milkdown .ProseMirror td) {
  border: 1px solid var(--glass-border);
  padding: 6px 13px;
  text-align: left;
}

.milkdown-editor-container :deep(.milkdown .ProseMirror th) {
  font-weight: bold;
  background: color-mix(in srgb, var(--bg-secondary) 90%, rgba(var(--accent-primary-rgb), 0.05));
}

.milkdown-editor-container :deep(.milkdown .ProseMirror table tr:nth-child(2n)) {
  background-color: color-mix(in srgb, var(--bg-secondary) 88%, rgba(var(--accent-primary-rgb), 0.03));
}

/* Images */
.milkdown-editor-container :deep(.milkdown .ProseMirror img) {
  max-width: 100%;
  box-sizing: border-box;
}

/* Task lists */
.milkdown-editor-container :deep(input[type="checkbox"]) {
  margin-right: 0.5em;
}

/* Selection */
.milkdown-editor-container :deep(::selection) {
  background: rgba(0, 242, 255, 0.3);
}

/* Placeholder */
.milkdown-editor-container :deep(.milkdown p.is-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--text-muted, #888);
  pointer-events: none;
  position: absolute;
  height: 0;
}

/* Dark theme specific styles */
.milkdown-editor-container.dark-theme :deep(code),
.milkdown-editor-container.dark-theme :deep(pre) {
  background: color-mix(in srgb, var(--bg-secondary) 92%, rgba(255, 255, 255, 0.03));
}

.milkdown-editor-container.dark-theme :deep(th) {
  background: color-mix(in srgb, var(--bg-secondary) 88%, rgba(255, 255, 255, 0.05));
}

.milkdown-editor-container.dark-theme :deep(th),
.milkdown-editor-container.dark-theme :deep(td) {
  border-color: var(--glass-border);
}

/* Math formulas with KaTeX */
.milkdown-editor-container :deep(.katex) {
  font-size: 1.1em;
}

.milkdown-editor-container :deep(.katex-display) {
  margin: var(--space-3) 0;
  overflow-x: auto;
  overflow-y: hidden;
}

/* Dark theme KaTeX adjustments */
.milkdown-editor-container.dark-theme :deep(.katex) {
  color: #e0e0e0;
}

/* Focus state */
.milkdown-editor-container :deep(.ProseMirror-focused) {
  outline: none;
}

/* Code block with language indicator */
.milkdown-editor-container :deep(.code-block-wrapper) {
  position: relative;
  margin-bottom: var(--space-3);
}

.milkdown-editor-container :deep(.code-block-language) {
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  font-size: 0.75em;
  color: var(--text-muted, #888);
  background: color-mix(in srgb, var(--bg-secondary) 90%, rgba(var(--accent-primary-rgb), 0.05));
  padding: 0.2em 0.5em;
  border-radius: 3px;
  pointer-events: none;
}
</style>
