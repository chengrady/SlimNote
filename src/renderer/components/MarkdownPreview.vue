<template>
  <div
    ref="previewContainer"
    class="markdown-preview"
    tabindex="0"
    @scroll="handleScroll"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @keydown="handleKeydown"
    @copy="handleCopy"
  >
    <div ref="previewContent" class="markdown-preview-content" v-html="htmlContent"></div>
  </div>

  <Teleport to="body">
    <div
      v-if="contextMenu.visible"
      ref="contextMenuRef"
      class="preview-context-menu"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
    >
      <button type="button" class="preview-context-menu-item" @click="copySelectionAsPlainText">
        {{ t('markdown.copySelectionPlain') }}
      </button>
      <button type="button" class="preview-context-menu-item" @click="copySelectionAsRichContent">
        {{ t('markdown.copySelectionRich') }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import 'highlight.js/styles/github-dark.css' // Or another style
import { useSettingsStore } from '../stores/settings'
import { buildStructuredPlainText, decorateListPrefixes, stripDecoratedListPrefixes } from '../utils/markdownListFormat'
import { buildMarkdownFragmentClipboardPayload } from '../utils/markdownPdf'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const emit = defineEmits(['active-heading-change', 'heading-click', 'scroll', 'copy-error'])

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  sourcePath: {
    type: String,
    default: ''
  }
})

const previewContainer = ref(null)
const previewContent = ref(null)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  payload: null
})
const contextMenuRef = ref(null)
let isSyncingScroll = false
let mermaidRenderVersion = 0
const CONTEXT_MENU_MARGIN = 8

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isPrimarySelectAll(event) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && String(event.key || '').toLowerCase() === 'a'
}

function isSelectionInsideContainer(container) {
  const selection = window.getSelection()
  if (!container || !selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  return container.contains(range.commonAncestorContainer)
}

function selectAllContent(container) {
  if (!container) return

  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  range.selectNodeContents(container)
  selection.removeAllRanges()
  selection.addRange(range)
}

function getSelectionFragment(selection) {
  if (!selection || selection.rangeCount === 0) return ''

  const fragment = selection.getRangeAt(0).cloneContents()
  const wrapper = document.createElement('div')
  wrapper.appendChild(fragment)
  return wrapper
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

function getHeadingElements() {
  if (!previewContainer.value) return []
  return Array.from(previewContainer.value.querySelectorAll('[data-heading-id]'))
}

function syncActiveHeading() {
  const headings = getHeadingElements()
  if (!headings.length || !previewContainer.value) {
    emit('active-heading-change', '')
    return
  }

  const containerTop = previewContainer.value.getBoundingClientRect().top
  let activeId = headings[0].getAttribute('data-heading-id') || ''

  for (const heading of headings) {
    const top = heading.getBoundingClientRect().top - containerTop
    if (top <= 72) {
      activeId = heading.getAttribute('data-heading-id') || activeId
    } else {
      break
    }
  }

  emit('active-heading-change', activeId)
}

function setScrollRatio(ratio) {
  if (previewContainer.value) {
    const maxScrollable = Math.max(previewContainer.value.scrollHeight - previewContainer.value.clientHeight, 0)
    const safeRatio = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0
    isSyncingScroll = true
    previewContainer.value.scrollTop = maxScrollable * safeRatio
    requestAnimationFrame(() => {
      syncActiveHeading()
      isSyncingScroll = false
    })
  }
}

function getScrollTopWithinContainer(container, target) {
  if (!container || !target) return 0

  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  return container.scrollTop + (targetRect.top - containerRect.top)
}

function scrollToHeading(id) {
  if (!previewContainer.value || !id) return

  const target = previewContainer.value.querySelector(`[data-heading-id="${id}"]`)
  if (!target) return

  const nextScrollTop = Math.max(getScrollTopWithinContainer(previewContainer.value, target) - 18, 0)
  isSyncingScroll = true
  previewContainer.value.scrollTo({
    top: nextScrollTop,
    behavior: 'smooth'
  })
  requestAnimationFrame(() => {
    syncActiveHeading()
    isSyncingScroll = false
  })
}

function handleScroll() {
  if (previewContainer.value && !isSyncingScroll) {
    const maxScrollable = Math.max(previewContainer.value.scrollHeight - previewContainer.value.clientHeight, 0)
    const ratio = maxScrollable > 0 ? Math.min(Math.max(previewContainer.value.scrollTop / maxScrollable, 0), 1) : 0
    emit('scroll', {
      scrollTop: previewContainer.value.scrollTop,
      scrollHeight: previewContainer.value.scrollHeight,
      clientHeight: previewContainer.value.clientHeight,
      ratio
    })
  }
  syncActiveHeading()
}

function handleClick(event) {
  if (contextMenu.value.visible) {
    closeContextMenu()
  }

  const heading = event.target instanceof HTMLElement ? event.target.closest('[data-heading-id]') : null
  const headingId = heading?.getAttribute('data-heading-id') || ''
  if (!headingId) return

  emit('heading-click', headingId)
}

function handleKeydown(event) {
  if (!previewContainer.value) return

  if (event.key === 'Escape' && contextMenu.value.visible) {
    closeContextMenu()
    return
  }

  if (isPrimarySelectAll(event)) {
    event.preventDefault()
    previewContainer.value.focus()
    selectAllContent(previewContainer.value)
  }
}

function getSelectionClipboardPayload() {
  if (!previewContainer.value || !isSelectionInsideContainer(previewContainer.value)) return null
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return null

  const fragment = getSelectionFragment(selection)
  if (!fragment) return null

  stripDecoratedListPrefixes(fragment)
  const standardHtml = fragment.innerHTML
  const text = buildStructuredPlainText(fragment)
  const richPayload = buildMarkdownFragmentClipboardPayload({
    html: standardHtml,
    sourcePath: props.sourcePath || ''
  })
  const richHtml = richPayload.html || standardHtml || text
  const plainText = text || richPayload.text || ''

  if (!standardHtml && !plainText && !richHtml) return null

  return {
    text: plainText,
    standardHtml,
    richHtml
  }
}

function handleCopy(event) {
  const payload = getSelectionClipboardPayload()
  if (!payload) return

  event.clipboardData?.setData('text/plain', payload.text)
  event.clipboardData?.setData('text/html', payload.standardHtml || payload.text)
  event.preventDefault()
}

function handleContextMenu(event) {
  const payload = getSelectionClipboardPayload()
  if (!payload) {
    closeContextMenu()
    return
  }

  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    payload
  }

  nextTick(() => adjustContextMenuPosition(event.clientX, event.clientY))
}

function adjustContextMenuPosition(pointerX, pointerY) {
  const menuEl = contextMenuRef.value
  if (!menuEl) return

  const rect = menuEl.getBoundingClientRect()
  const maxX = Math.max(CONTEXT_MENU_MARGIN, window.innerWidth - rect.width - CONTEXT_MENU_MARGIN)
  const maxY = Math.max(CONTEXT_MENU_MARGIN, window.innerHeight - rect.height - CONTEXT_MENU_MARGIN)

  contextMenu.value = {
    ...contextMenu.value,
    x: Math.min(pointerX, maxX),
    y: Math.min(pointerY, maxY)
  }
}

function closeContextMenu() {
  contextMenu.value = {
    visible: false,
    x: 0,
    y: 0,
    payload: null
  }
}

function reportCopyError(prefix, error) {
  const message = error instanceof Error ? error.message : String(error || '')
  emit('copy-error', `${prefix}: ${message || 'Unknown error'}`)
}

async function writeClipboardPayload({ text = '', html = '' } = {}) {
  if (window.electronAPI?.writeClipboard) {
    await window.electronAPI.writeClipboard({ text, html })
    return
  }

  if (text) {
    await navigator.clipboard.writeText(text)
    return
  }

  throw new Error('Clipboard API unavailable')
}

async function copySelectionAsPlainText() {
  const payload = contextMenu.value.payload || getSelectionClipboardPayload()
  closeContextMenu()
  if (!payload?.text) return

  try {
    await navigator.clipboard.writeText(payload.text)
  } catch (error) {
    reportCopyError('复制纯文本失败', error)
  }
}

async function copySelectionAsRichContent() {
  const payload = contextMenu.value.payload || getSelectionClipboardPayload()
  closeContextMenu()
  if (!payload) return

  try {
    await writeClipboardPayload({
      text: payload.text,
      html: payload.richHtml || payload.standardHtml || payload.text
    })
  } catch (error) {
    reportCopyError('复制到 Word/微信失败', error)
  }
}

function getMermaidTheme() {
  return settingsStore.settings.theme === 'dark' ? 'dark' : 'default'
}

async function renderMermaidDiagrams() {
  const container = previewContainer.value
  if (!container) return

  const currentVersion = ++mermaidRenderVersion
  const mermaidCodeBlocks = Array.from(container.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid'))
  if (!mermaidCodeBlocks.length) return

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: getMermaidTheme()
  })

  for (const [index, codeBlock] of mermaidCodeBlocks.entries()) {
    if (!(codeBlock instanceof HTMLElement)) continue

    const pre = codeBlock.closest('pre')
    if (!pre || currentVersion !== mermaidRenderVersion) return

    const source = codeBlock.textContent || ''
    const host = document.createElement('div')
    host.className = 'mermaid-block'

    try {
      const renderId = `slimnote-mermaid-${currentVersion}-${index}`
      const { svg, bindFunctions } = await mermaid.render(renderId, source)
      if (currentVersion !== mermaidRenderVersion) return

      host.innerHTML = svg
      bindFunctions?.(host)
    } catch (error) {
      console.error('Mermaid rendering error:', error)
      host.innerHTML = `
        <div class="mermaid-error">
          <p class="mermaid-error-message">${escapeHtml(t('markdown.mermaidError'))}</p>
          <pre><code>${escapeHtml(source)}</code></pre>
        </div>
      `
    }

    pre.replaceWith(host)
  }
}

defineExpose({
  setScrollRatio,
  scrollToHeading
})

// Configure marked with highlight.js
function createHeadingRenderer() {
  const renderer = new marked.Renderer()
  const slugCounts = new Map()

  renderer.heading = function(...args) {
    let depth = 1
    let text = ''
    let rawText = ''

    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      const token = args[0]
      depth = token.depth || 1
      const tokens = Array.isArray(token.tokens) ? token.tokens : []
      text = this.parser?.parseInline ? this.parser.parseInline(tokens) : (token.text || '')
      rawText = tokens.map((item) => item.raw || item.text || '').join(' ') || token.text || text
    } else {
      text = args[0] || ''
      depth = args[1] || 1
      rawText = args[2] || text
    }

    const baseId = slugifyHeading(rawText || text)
    const count = slugCounts.get(baseId) || 0
    slugCounts.set(baseId, count + 1)
    const id = count === 0 ? baseId : `${baseId}-${count}`

    return `<h${depth} id="${id}" data-heading-id="${id}">${text}</h${depth}>`
  }

  return renderer
}

const htmlContent = computed(() => {
  try {
    // 兼容不同版本的 marked
    const parser = typeof marked === 'function' ? marked : marked.parse
    return parser(props.content, {
      gfm: true,
      breaks: true,
      renderer: createHeadingRenderer(),
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext'
        return hljs.highlight(code, { language }).value
      },
      langPrefix: 'hljs language-'
    })
  } catch (e) {
    console.error('Markdown parsing error:', e)
    return `<p>${t('markdown.parseError')}</p>`
  }
})

watch(htmlContent, async () => {
  await nextTick()
  await renderMermaidDiagrams()
  decorateListPrefixes(previewContent.value, { includeTaskListPrefix: false })
  syncActiveHeading()
}, { immediate: true })

watch(() => settingsStore.settings.theme, async () => {
  if (previewContent.value) {
    previewContent.value.innerHTML = htmlContent.value
  }
  await nextTick()
  await renderMermaidDiagrams()
  decorateListPrefixes(previewContent.value, { includeTaskListPrefix: false })
  syncActiveHeading()
})

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  window.addEventListener('resize', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  window.removeEventListener('resize', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
})
</script>

<style scoped>
.markdown-preview {
  display: flex;
  padding: clamp(20px, 2.8vw, 36px);
  overflow-y: auto;
  height: 100%;
  width: 100%;
  min-width: 0;
  background-color: var(--bg-primary);
  color: var(--text-main);
  box-sizing: border-box;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei UI', sans-serif;
  line-height: 1.6;
  scrollbar-gutter: stable;
  user-select: text;
}

.markdown-preview-content {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.markdown-preview-content :deep(> :first-child) {
  margin-top: 0;
}

.markdown-preview-content :deep(> :last-child) {
  margin-bottom: 0;
}

.markdown-preview-content :deep(h1),
.markdown-preview-content :deep(h2),
.markdown-preview-content :deep(h3),
.markdown-preview-content :deep(h4),
.markdown-preview-content :deep(h5),
.markdown-preview-content :deep(h6) {
  margin-top: var(--space-6);
  margin-bottom: var(--space-4);
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-main);
  cursor: pointer;
  scroll-margin-top: 18px;
  transition: color var(--transition-fast);
}

.markdown-preview-content :deep(h1:hover),
.markdown-preview-content :deep(h2:hover),
.markdown-preview-content :deep(h3:hover),
.markdown-preview-content :deep(h4:hover),
.markdown-preview-content :deep(h5:hover),
.markdown-preview-content :deep(h6:hover) {
  color: var(--accent-primary);
}

.markdown-preview-content :deep(h1) { font-size: 2em; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.3em; }
.markdown-preview-content :deep(h2) { font-size: 1.5em; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.3em; }
.markdown-preview-content :deep(h3) { font-size: 1.25em; }
.markdown-preview-content :deep(h4) { font-size: 1em; }
.markdown-preview-content :deep(h5) { font-size: 0.875em; }
.markdown-preview-content :deep(h6) { font-size: 0.85em; color: var(--text-muted); }

.markdown-preview-content :deep(p) {
  margin-top: 0;
  margin-bottom: var(--space-4);
}

.markdown-preview-content :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(128, 128, 128, 0.15);
  border-radius: 6px;
  font-family: var(--font-family-mono);
}

.markdown-preview-content :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 14px;
  line-height: 1.45;
  background-color: var(--btn-bg);
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-preview-content :deep(pre code) {
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border: 0;
}

.markdown-preview-content :deep(.mermaid-block) {
  margin-bottom: 16px;
  padding: 12px;
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-secondary) 78%, transparent);
}

.markdown-preview-content :deep(.mermaid-block svg) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

.markdown-preview-content :deep(.mermaid-error) {
  color: var(--text-main);
}

.markdown-preview-content :deep(.mermaid-error-message) {
  margin: 0 0 10px;
  color: #d14343;
  font-weight: 600;
}

.markdown-preview-content :deep(blockquote) {
  padding: 0 1em;
  color: var(--text-muted);
  border-left: 0.25em solid rgba(var(--accent-primary-rgb), 0.28);
  margin: 0 0 16px 0;
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: 0 8px 8px 0;
}

.markdown-preview-content :deep(ul),
.markdown-preview-content :deep(ol) {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-preview-content :deep(ol) {
  list-style: none;
  padding-left: 2.2em;
}

.markdown-preview-content :deep(ul) {
  list-style: none;
}

.markdown-preview-content :deep(ol li) {
  padding-left: 0.35em;
}

.markdown-preview-content :deep(ol ol) {
  margin-top: 6px;
  margin-bottom: 10px;
  padding-left: 2.4em;
}

.markdown-preview-content :deep(ul ol),
.markdown-preview-content :deep(ol ul) {
  margin-top: 6px;
  margin-bottom: 10px;
}

.markdown-preview-content :deep(ol li::marker) {
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.markdown-preview-content :deep(.slimnote-list-prefix) {
  display: inline;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
  white-space: pre-wrap;
}

.markdown-preview-content :deep(img) {
  max-width: 100%;
  box-sizing: border-box;
}

.markdown-preview-content :deep(a) {
  color: var(--accent-primary);
  text-decoration: none;
}

.markdown-preview-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview-content :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

.markdown-preview-content :deep(table th),
.markdown-preview-content :deep(table td) {
  padding: 6px 13px;
  border: 1px solid var(--glass-border);
}

.markdown-preview-content :deep(table tr:nth-child(2n)) {
  background-color: color-mix(in srgb, var(--bg-secondary) 88%, rgba(var(--accent-primary-rgb), 0.03));
}

.markdown-preview-content :deep(hr) {
  border: 0;
  height: 1px;
  margin: 24px 0;
  background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
}

.preview-context-menu {
  position: fixed;
  z-index: 5200;
  display: flex;
  flex-direction: column;
  min-width: 172px;
  padding: 4px 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--glass-bg) 92%, var(--bg-deep));
  box-shadow: var(--menu-card-shadow);
  backdrop-filter: blur(10px);
}

.preview-context-menu-item {
  min-height: var(--menu-item-min-height);
  padding: var(--menu-item-padding-y) var(--menu-item-padding-x);
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.preview-context-menu-item:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-active, var(--accent-primary));
}

.preview-context-menu-item:focus-visible {
  outline: none;
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-active, var(--accent-primary));
}
</style>
