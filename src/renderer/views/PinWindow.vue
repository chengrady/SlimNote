<template>
  <div class="pin-window" :style="windowStyle">
    <div class="pin-header">
      <span>SlimNote Pin</span>
      <button @click="closeWindow" class="close-btn">✕</button>
    </div>
    <div class="pin-content">
      <div v-if="language === 'markdown'" v-html="htmlContent" class="markdown-body"></div>
      <pre v-else>{{ content }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const route = useRoute()
const content = ref('')
const language = ref('plaintext')
const windowId = ref(0)
const currentTheme = ref('light')

const windowStyle = computed(() => {
  const isDark = currentTheme.value === 'dark'
  return {
    backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
    color: isDark ? '#ffffff' : '#333333'
  }
})

// Configure marked
marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
})

const htmlContent = computed(() => {
  if (language.value !== 'markdown') return ''
  try {
    const parser = typeof marked === 'function' ? marked : marked.parse
    return parser(content.value)
  } catch (e) {
    console.error('Markdown parsing error:', e)
    return '<p>Error parsing markdown</p>'
  }
})

onMounted(() => {
  const queryId = route.query.id
  windowId.value = parseInt(queryId || '0')

  // Listen for content from main process
  if (window.electronAPI) {
    window.electronAPI.onInitPinContent((data) => {
      if (typeof data === 'string') {
        content.value = data
      } else {
        content.value = data.content
        language.value = data.language || 'plaintext'
        if (data.theme) {
          currentTheme.value = data.theme
          document.documentElement.setAttribute('data-theme', data.theme)
        }
      }
    })
  }
})

function closeWindow() {
  if (windowId.value) {
    window.electronAPI.closePinWindow(windowId.value)
  }
}
</script>

<style scoped>
.pin-window {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  position: relative;
  z-index: 9999;
}

.pin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  -webkit-app-region: drag;
  opacity: 0;
  transition: opacity 0.2s ease;
  font-size: 12px;
}

.pin-window:hover .pin-header {
  opacity: 1;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  -webkit-app-region: no-drag;
}

.close-btn:hover {
  background: var(--color-danger);
  color: white;
}

.pin-content {
  flex: 1;
  padding: 4px 8px;
  overflow: auto;
  font-family: 'Fira Code', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

/* Markdown Styles */
:deep(.markdown-body) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text);
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4),
:deep(.markdown-body h5),
:deep(.markdown-body h6) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  line-height: 1.25;
}

:deep(.markdown-body p) {
  margin-bottom: 10px;
}

:deep(.markdown-body code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  font-family: 'Fira Code', Consolas, monospace;
}

:deep(.markdown-body pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--color-bg-secondary);
  border-radius: 6px;
  margin-bottom: 16px;
}

:deep(.markdown-body pre code) {
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border: 0;
}

:deep(.markdown-body blockquote) {
  padding: 0 1em;
  color: var(--text-muted);
  border-left: 0.25em solid var(--color-border);
  margin: 0 0 16px 0;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 2em;
  margin-bottom: 16px;
}

:deep(.markdown-body img) {
  max-width: 100%;
  box-sizing: content-box;
  background-color: var(--color-bg);
}

:deep(.markdown-body table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

:deep(.markdown-body table th),
:deep(.markdown-body table td) {
  padding: 6px 13px;
  border: 1px solid var(--color-border);
}

:deep(.markdown-body table tr) {
  background-color: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

:deep(.markdown-body table tr:nth-child(2n)) {
  background-color: var(--color-bg-secondary);
}
</style>
