<template>
  <div class="markdown-mode-toolbar">
    <span class="markdown-mode-toolbar-meta">MD</span>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      :class="{ active: viewMode === 'wysiwyg' }"
      title="所见即所得模式"
      aria-label="切换到所见即所得模式"
      @click="$emit('set-mode', 'wysiwyg')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
      </svg>
    </button>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      :class="{ active: viewMode === 'source' }"
      title="源码模式"
      aria-label="切换到源码模式"
      @click="$emit('set-mode', 'source')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    </button>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      :class="{ active: viewMode === 'split' }"
      title="分屏模式"
      aria-label="切换到分屏模式"
      @click="$emit('set-mode', 'split')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
    </button>
    <template v-if="viewMode === 'split'">
      <div class="markdown-mode-toolbar-separator"></div>
      <button
        class="markdown-mode-toolbar-button"
        type="button"
        :class="{ active: splitFocus === 'editor' }"
        title="聚焦源码区域"
        aria-label="聚焦源码区域"
        @click="$emit('set-split-focus', 'editor')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
          <path class="markdown-mode-toolbar-muted-stroke" d="M12 4h9v16h-9"/>
          <path d="M8.5 9.5 6 12l2.5 2.5"/>
        </svg>
      </button>
      <button
        class="markdown-mode-toolbar-button"
        type="button"
        :class="{ active: splitFocus === 'preview' }"
        title="聚焦预览区域"
        aria-label="聚焦预览区域"
        @click="$emit('set-split-focus', 'preview')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
          <path class="markdown-mode-toolbar-muted-stroke" d="M3 4h9v16H3"/>
          <path d="m15.5 9.5 2.5 2.5-2.5 2.5"/>
        </svg>
      </button>
      <button
        class="markdown-mode-toolbar-button"
        type="button"
        :disabled="splitFocus === 'both'"
        title="恢复双栏分屏"
        aria-label="恢复双栏分屏"
        @click="$emit('set-split-focus', 'both')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
          <path d="M8 12h8"/>
        </svg>
      </button>
    </template>
    <div class="markdown-mode-toolbar-separator"></div>
    <button
      class="markdown-mode-toolbar-button markdown-mode-toolbar-button--label"
      type="button"
      title="复制渲染后的纯文本"
      aria-label="复制渲染后的纯文本"
      @click="$emit('copy-plain')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="12" height="12" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>
      </svg>
      <span aria-hidden="true">TXT</span>
    </button>
    <button
      class="markdown-mode-toolbar-button markdown-mode-toolbar-button--label"
      type="button"
      title="复制为富文本，可直接粘贴到 Word、微信等"
      aria-label="复制为富文本，可直接粘贴到 Word、微信等"
      @click="$emit('copy-rich')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="12" height="12" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>
      </svg>
      <span aria-hidden="true">W</span>
    </button>
    <div class="markdown-mode-toolbar-separator"></div>
    <button
      class="markdown-mode-toolbar-button markdown-mode-toolbar-button--label"
      type="button"
      title="在浏览器中打开渲染后的 Markdown"
      aria-label="在浏览器中打开渲染后的 Markdown"
      @click="$emit('open-browser')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <path d="M8 9h8"/>
        <path d="M8 13h5"/>
        <path d="M15 13h3v3"/>
        <path d="m13 18 5-5"/>
      </svg>
      <span aria-hidden="true">HTML</span>
    </button>
    <button
      class="markdown-mode-toolbar-button markdown-mode-toolbar-button--label"
      type="button"
      title="导出 PDF"
      aria-label="导出 Markdown 为 PDF"
      @click="$emit('export-pdf')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 7v9"/>
        <path d="M8.5 12.5 12 16l3.5-3.5"/>
        <path d="M5 21h14"/>
        <path d="M19 9V4H5v5"/>
      </svg>
      <span aria-hidden="true">PDF</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  viewMode: {
    type: String,
    default: 'source'
  },
  splitFocus: {
    type: String,
    default: 'both'
  }
})

defineEmits(['set-mode', 'set-split-focus', 'copy-plain', 'copy-rich', 'open-browser', 'export-pdf'])
</script>

<style scoped>
.markdown-mode-toolbar {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-toolbar);
  gap: 4px;
  overflow-x: auto;
}

.markdown-mode-toolbar-meta {
  display: inline-flex;
  align-items: center;
  color: var(--text-shortcut, var(--text-muted));
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  padding-right: 4px;
}

.markdown-mode-toolbar-button {
  position: relative;
  background: transparent;
  border: none;
  color: var(--text-interactive, var(--text-muted));
  border-radius: var(--toolbar-button-radius);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-interactive);
  padding: 4px;
  min-width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.markdown-mode-toolbar-button:hover {
  background: var(--surface-hover);
  color: var(--text-interactive-hover, var(--text-main));
  box-shadow: var(--interactive-hover-ring);
}

.markdown-mode-toolbar-button:active {
  transform: translateY(1px);
}

.markdown-mode-toolbar-button.active {
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  color: var(--text-interactive-active, var(--accent-primary));
}

.markdown-mode-toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.markdown-mode-toolbar-button:disabled:hover {
  background: transparent;
  color: var(--text-muted);
}

.markdown-mode-toolbar-button svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.markdown-mode-toolbar-button--label span {
  position: absolute;
  right: 3px;
  bottom: 2px;
  padding: 0 1px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--surface-toolbar) 82%, transparent);
  color: currentColor;
  font-size: 7px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.markdown-mode-toolbar-button--label span[aria-hidden='true']:not(:empty) {
  pointer-events: none;
}

.markdown-mode-toolbar-muted-stroke {
  opacity: 0.35;
}

.markdown-mode-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--glass-border);
  margin: 0 6px;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .markdown-mode-toolbar-meta {
    display: none;
  }
}
</style>
