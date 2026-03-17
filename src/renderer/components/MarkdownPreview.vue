<template>
  <div
    ref="previewContainer"
    class="markdown-preview"
    tabindex="0"
    v-html="htmlContent"
    @scroll="handleScroll"
    @click="handleClick"
    @keydown="handleKeydown"
    @copy="handleCopy"
  ></div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css' // Or another style

const emit = defineEmits(['active-heading-change', 'heading-click', 'scroll'])

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const previewContainer = ref(null)
let isSyncingScroll = false

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

function getSelectionHtml(selection) {
  if (!selection || selection.rangeCount === 0) return ''

  const fragment = selection.getRangeAt(0).cloneContents()
  const wrapper = document.createElement('div')
  wrapper.appendChild(fragment)
  return wrapper.innerHTML
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
  const heading = event.target instanceof HTMLElement ? event.target.closest('[data-heading-id]') : null
  const headingId = heading?.getAttribute('data-heading-id') || ''
  if (!headingId) return

  emit('heading-click', headingId)
}

function handleKeydown(event) {
  if (!previewContainer.value) return

  if (isPrimarySelectAll(event)) {
    event.preventDefault()
    previewContainer.value.focus()
    selectAllContent(previewContainer.value)
  }
}

function handleCopy(event) {
  if (!previewContainer.value || !isSelectionInsideContainer(previewContainer.value)) return

  const selection = window.getSelection()
  const html = getSelectionHtml(selection)
  const text = selection?.toString() || ''

  if (!html && !text) return

  event.clipboardData?.setData('text/plain', text)
  event.clipboardData?.setData('text/html', html || text)
  event.preventDefault()
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
      renderer: createHeadingRenderer(),
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext'
        return hljs.highlight(code, { language }).value
      },
      langPrefix: 'hljs language-'
    })
  } catch (e) {
    console.error('Markdown parsing error:', e)
    return '<p>Error parsing markdown</p>'
  }
})

watch(htmlContent, async () => {
  await nextTick()
  syncActiveHeading()
}, { immediate: true })
</script>

<style scoped>
.markdown-preview {
  padding: clamp(20px, 2.8vw, 36px);
  overflow-y: auto;
  height: 100%;
  background-color: var(--bg-primary);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  scrollbar-gutter: stable;
  user-select: text;
}

.markdown-preview :deep(> :first-child) {
  margin-top: 0;
}

.markdown-preview :deep(> :last-child) {
  margin-bottom: 0;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin-top: var(--space-6);
  margin-bottom: var(--space-4);
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-main);
  cursor: pointer;
  scroll-margin-top: 18px;
  transition: color var(--transition-fast);
}

.markdown-preview :deep(h1:hover),
.markdown-preview :deep(h2:hover),
.markdown-preview :deep(h3:hover),
.markdown-preview :deep(h4:hover),
.markdown-preview :deep(h5:hover),
.markdown-preview :deep(h6:hover) {
  color: var(--accent-primary);
}

.markdown-preview :deep(h1) { font-size: 2em; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.3em; }
.markdown-preview :deep(h2) { font-size: 1.5em; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.3em; }
.markdown-preview :deep(h3) { font-size: 1.25em; }
.markdown-preview :deep(h4) { font-size: 1em; }
.markdown-preview :deep(h5) { font-size: 0.875em; }
.markdown-preview :deep(h6) { font-size: 0.85em; color: var(--text-muted); }

.markdown-preview :deep(p) {
  margin-top: 0;
  margin-bottom: var(--space-4);
}

.markdown-preview :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(128, 128, 128, 0.15);
  border-radius: 6px;
  font-family: var(--font-family-mono);
}

.markdown-preview :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 14px;
  line-height: 1.45;
  background-color: var(--btn-bg);
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-preview :deep(pre code) {
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border: 0;
}

.markdown-preview :deep(blockquote) {
  padding: 0 1em;
  color: var(--text-muted);
  border-left: 0.25em solid rgba(var(--accent-primary-rgb), 0.28);
  margin: 0 0 16px 0;
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: 0 8px 8px 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-preview :deep(ol) {
  list-style-position: inside;
  padding-left: 0;
}

.markdown-preview :deep(ol li) {
  padding-left: 0.25em;
}

.markdown-preview :deep(ol li::marker) {
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  box-sizing: border-box;
}

.markdown-preview :deep(a) {
  color: var(--accent-primary);
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

.markdown-preview :deep(table th),
.markdown-preview :deep(table td) {
  padding: 6px 13px;
  border: 1px solid var(--glass-border);
}

.markdown-preview :deep(table tr:nth-child(2n)) {
  background-color: color-mix(in srgb, var(--bg-secondary) 88%, rgba(var(--accent-primary-rgb), 0.03));
}

.markdown-preview :deep(hr) {
  border: 0;
  height: 1px;
  margin: 24px 0;
  background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
}
</style>
