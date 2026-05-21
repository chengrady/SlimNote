<template>
  <div
    ref="previewContainer"
    class="markdown-preview"
    :style="previewStyle"
    tabindex="0"
    @scroll="handleScroll"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @keydown="handleKeydown"
    @copy="handleCopy"
    @wheel="handleWheel"
    @auxclick="handleAuxClick"
  >
    <div v-if="searchVisible" class="preview-floating-tools" @click.stop>
      <div class="preview-search-panel" @keydown.stop>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          class="preview-search-input"
          type="search"
          :placeholder="t('markdown.searchPlaceholder')"
          spellcheck="false"
          @input="runSearch"
          @keydown="handleSearchKeydown"
        >
        <span class="preview-search-count">{{ searchSummary }}</span>
        <button type="button" class="preview-tool-btn" :disabled="searchMatches.length === 0" :title="t('markdown.previousMatch')" @click="jumpToPreviousMatch">↑</button>
        <button type="button" class="preview-tool-btn" :disabled="searchMatches.length === 0" :title="t('markdown.nextMatch')" @click="jumpToNextMatch">↓</button>
        <button type="button" class="preview-tool-btn" :title="t('markdown.closeSearch')" @click="closeSearch">×</button>
      </div>
    </div>
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
import { resolveRelativeFilePath } from '../utils/fileUrlUtils'
import { sanitizeHtml } from '../utils/htmlSanitizer'
import { buildStructuredPlainText, decorateListPrefixes, stripDecoratedListPrefixes } from '../utils/markdownListFormat'
import { buildMarkdownFragmentClipboardPayload } from '../utils/markdownPdf'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const emit = defineEmits(['active-heading-change', 'heading-click', 'scroll', 'copy-error', 'open-file', 'change-font-size'])

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  sourcePath: {
    type: String,
    default: ''
  },
  fontSize: {
    type: Number,
    default: 14
  }
})

const previewContainer = ref(null)
const previewContent = ref(null)
const searchInputRef = ref(null)
const searchVisible = ref(false)
const searchQuery = ref('')
const searchMatches = ref([])
const activeSearchIndex = ref(-1)
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
const MIN_FONT_SIZE = 8
const MAX_FONT_SIZE = 72
const FONT_SIZE_STEP = 1
const normalizedFontSize = computed(() => clampFontSize(props.fontSize || settingsStore.settings.fontSize || 14))
const previewStyle = computed(() => ({
  '--markdown-preview-font-size': `${normalizedFontSize.value}px`
}))
const searchSummary = computed(() => {
  if (!searchQuery.value.trim()) return t('markdown.searchReady')
  if (searchMatches.value.length === 0) return t('markdown.noMatches')
  return `${activeSearchIndex.value + 1}/${searchMatches.value.length}`
})

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

function isPrimaryFind(event) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && String(event.key || '').toLowerCase() === 'f'
}

function clampFontSize(value) {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number(value) || settingsStore.settings.fontSize || 14))
}

function changeFontSize(delta) {
  const nextSize = clampFontSize(normalizedFontSize.value + delta)
  if (nextSize !== normalizedFontSize.value) {
    emit('change-font-size', nextSize)
  }
}

function resetFontSize() {
  emit('change-font-size', clampFontSize(settingsStore.settings.fontSize || 14))
}

function handleWheel(event) {
  if (!(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  changeFontSize(event.deltaY < 0 ? FONT_SIZE_STEP : -FONT_SIZE_STEP)
}

function handleAuxClick(event) {
  if (event.button !== 1 || !(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  resetFontSize()
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
  const normalized = String(text)
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'section'
}

function normalizeHashFragment(fragment = '') {
  const raw = String(fragment || '').replace(/^#/, '').trim()
  if (!raw) return ''

  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function findHeadingIdByFragment(fragment = '') {
  const normalizedFragment = normalizeHashFragment(fragment)
  if (!normalizedFragment || !previewContainer.value) return ''

  const exactMatch = previewContainer.value.querySelector(`[data-heading-id="${CSS.escape(normalizedFragment)}"]`)
  if (exactMatch) {
    return exactMatch.getAttribute('data-heading-id') || ''
  }

  const slugMatch = slugifyHeading(normalizedFragment)
  if (!slugMatch) return ''

  const slugElement = previewContainer.value.querySelector(`[data-heading-id="${CSS.escape(slugMatch)}"]`)
  return slugElement?.getAttribute('data-heading-id') || ''
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

  const link = event.target instanceof HTMLElement ? event.target.closest('a[href]') : null
  const href = link?.getAttribute('href') || ''
  if (link && href) {
    if (href.startsWith('#')) {
      event.preventDefault()
      const headingId = findHeadingIdByFragment(href)
      if (headingId) {
        scrollToHeading(headingId)
        emit('heading-click', headingId)
      }
      return
    }

    const localFilePath = resolveRelativeFilePath(href, props.sourcePath)
    if (localFilePath) {
      event.preventDefault()
      emit('open-file', localFilePath)
      return
    }

    if (/^(https?:|mailto:)/i.test(href)) {
      event.preventDefault()
      window.electronAPI?.openExternal?.(href)
      return
    }
  }

  const heading = event.target instanceof HTMLElement ? event.target.closest('[data-heading-id]') : null
  const headingId = heading?.getAttribute('data-heading-id') || ''
  if (!headingId) return

  emit('heading-click', headingId)
}

function handleKeydown(event) {
  if (!previewContainer.value) return

  if (isPrimaryFind(event)) {
    event.preventDefault()
    openSearch()
    return
  }

  if (event.key === 'Escape' && contextMenu.value.visible) {
    closeContextMenu()
    return
  }

  if (event.key === 'Escape' && searchVisible.value) {
    closeSearch()
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

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clearSearchHighlights() {
  const container = previewContent.value
  if (!container) return

  const marks = Array.from(container.querySelectorAll('mark.preview-search-match'))
  marks.forEach((mark) => {
    const textNode = document.createTextNode(mark.textContent || '')
    mark.replaceWith(textNode)
    textNode.parentNode?.normalize()
  })
  searchMatches.value = []
  activeSearchIndex.value = -1
}

function shouldSkipSearchNode(node) {
  const parent = node?.parentElement
  return Boolean(parent?.closest('script, style, svg'))
}

function applySearchHighlights() {
  clearSearchHighlights()

  const container = previewContent.value
  const keyword = searchQuery.value.trim()
  if (!container || !keyword) return

  const pattern = new RegExp(escapeRegExp(keyword), 'gi')
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || shouldSkipSearchNode(node)) return NodeFilter.FILTER_REJECT
      pattern.lastIndex = 0
      return pattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  })
  const textNodes = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }

  const matches = []
  textNodes.forEach((node) => {
    const text = node.nodeValue || ''
    const fragment = document.createDocumentFragment()
    let cursor = 0
    pattern.lastIndex = 0

    text.replace(pattern, (match, offset) => {
      if (offset > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, offset)))
      }

      const mark = document.createElement('mark')
      mark.className = 'preview-search-match'
      mark.textContent = match
      fragment.appendChild(mark)
      matches.push(mark)
      cursor = offset + match.length
      return match
    })

    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)))
    }

    node.parentNode?.replaceChild(fragment, node)
  })

  searchMatches.value = matches
  if (matches.length > 0) {
    setActiveSearchIndex(0)
  }
}

function setActiveSearchIndex(index) {
  const matches = searchMatches.value
  matches.forEach(mark => mark.classList.remove('active'))
  if (!matches.length) {
    activeSearchIndex.value = -1
    return
  }

  const nextIndex = (index + matches.length) % matches.length
  activeSearchIndex.value = nextIndex
  const activeMark = matches[nextIndex]
  activeMark.classList.add('active')
  activeMark.scrollIntoView({ block: 'center', inline: 'nearest' })
}

function runSearch() {
  applySearchHighlights()
}

function jumpToNextMatch() {
  setActiveSearchIndex(activeSearchIndex.value + 1)
}

function jumpToPreviousMatch() {
  setActiveSearchIndex(activeSearchIndex.value - 1)
}

function openSearch() {
  searchVisible.value = true
  nextTick(() => {
    searchInputRef.value?.focus()
    searchInputRef.value?.select?.()
    if (searchQuery.value.trim()) {
      runSearch()
    }
  })
}

function closeSearch() {
  searchVisible.value = false
  clearSearchHighlights()
  previewContainer.value?.focus()
}

function handleSearchKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeSearch()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) {
      jumpToPreviousMatch()
      return
    }
    jumpToNextMatch()
  }
}

function focusPreview() {
  previewContainer.value?.focus()
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
  scrollToHeading,
  openSearch,
  focusPreview
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
    return sanitizeHtml(parser(props.content, {
      gfm: true,
      breaks: true,
      renderer: createHeadingRenderer(),
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext'
        return hljs.highlight(code, { language }).value
      },
      langPrefix: 'hljs language-'
    }))
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
  if (searchVisible.value && searchQuery.value.trim()) {
    applySearchHighlights()
  }
}, { immediate: true })

watch(() => settingsStore.settings.theme, async () => {
  if (previewContent.value) {
    previewContent.value.innerHTML = htmlContent.value
  }
  await nextTick()
  await renderMermaidDiagrams()
  decorateListPrefixes(previewContent.value, { includeTaskListPrefix: false })
  syncActiveHeading()
  if (searchVisible.value && searchQuery.value.trim()) {
    applySearchHighlights()
  }
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
  flex-direction: column;
  position: relative;
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
  font-size: var(--markdown-preview-font-size, 14px);
}

.preview-floating-tools {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: calc(clamp(20px, 2.8vw, 36px) * -0.5) 0 12px auto;
  max-width: 100%;
  pointer-events: auto;
}

.preview-search-panel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 84%, rgba(var(--accent-primary-rgb), 0.16));
  border-radius: 999px;
  background: var(--surface-popover);
  box-shadow: var(--menu-card-shadow);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: popoverIn var(--transition-popover);
}

.preview-search-panel {
  border-radius: 12px;
}

.preview-search-input {
  width: min(240px, 34vw);
  min-width: 120px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: var(--field-radius);
  background: color-mix(in srgb, var(--surface-panel-strong) 86%, transparent);
  color: var(--text-main);
  font-size: 12px;
}

.preview-search-input:focus {
  outline: none;
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  box-shadow: var(--field-focus-ring);
}

.preview-search-count {
  min-width: 44px;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
  white-space: nowrap;
}

.preview-tool-btn {
  min-width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--text-interactive, var(--text-muted));
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: var(--transition-interactive);
}

.preview-tool-btn:hover:not(:disabled) {
  color: var(--text-interactive-active, var(--accent-primary));
  background: var(--surface-hover);
  box-shadow: var(--interactive-hover-ring);
}

.preview-tool-btn:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.markdown-preview-content :deep(mark.preview-search-match) {
  padding: 0 2px;
  border-radius: 3px;
  background: rgba(255, 204, 0, 0.34);
  color: inherit;
}

.markdown-preview-content :deep(mark.preview-search-match.active) {
  background: rgba(var(--accent-primary-rgb), 0.28);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.36);
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
  font-size: 0.875em;
  line-height: 1.45;
  background-color: var(--surface-toolbar);
  border: 1px solid color-mix(in srgb, var(--glass-border) 84%, rgba(var(--accent-primary-rgb), 0.08));
  border-radius: var(--radius-md);
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
  background: var(--surface-panel);
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
  background: var(--surface-popover);
  box-shadow: var(--menu-card-shadow);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: popoverIn var(--transition-popover);
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
  border-radius: var(--radius-sm);
  transition: var(--transition-interactive);
}

.preview-context-menu-item:hover {
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
}

.preview-context-menu-item:focus-visible {
  outline: none;
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
}
</style>
