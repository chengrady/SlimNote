<template>
  <div class="markdown-mode-toolbar">
    <span class="markdown-mode-toolbar-meta">模式</span>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      :class="{ active: viewMode === 'wysiwyg' }"
      title="所见即所得模式"
      aria-label="切换到所见即所得模式"
      @click="$emit('set-mode', 'wysiwyg')"
    >
      <span class="markdown-mode-toolbar-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
      </span>
      <span class="markdown-mode-toolbar-text">所见即所得</span>
    </button>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      :class="{ active: viewMode === 'source' }"
      title="源码模式"
      aria-label="切换到源码模式"
      @click="$emit('set-mode', 'source')"
    >
      <span class="markdown-mode-toolbar-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      </span>
      <span class="markdown-mode-toolbar-text">源码</span>
    </button>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      :class="{ active: viewMode === 'split' }"
      title="分屏模式"
      aria-label="切换到分屏模式"
      @click="$emit('set-mode', 'split')"
    >
      <span class="markdown-mode-toolbar-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      </span>
      <span class="markdown-mode-toolbar-text">分屏</span>
    </button>
    <template v-if="viewMode === 'split'">
      <button
        class="markdown-mode-toolbar-button"
        type="button"
        :class="{ active: splitFocus === 'editor' }"
        title="聚焦源码区域"
        aria-label="聚焦源码区域"
        @click="$emit('set-split-focus', 'editor')"
      >
        <span class="markdown-mode-toolbar-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="12" y1="4" x2="12" y2="20"/>
            <path d="M12 4h9v16h-9" opacity="0.35"/>
          </svg>
        </span>
        <span class="markdown-mode-toolbar-text">聚焦源码</span>
      </button>
      <button
        class="markdown-mode-toolbar-button"
        type="button"
        :class="{ active: splitFocus === 'preview' }"
        title="聚焦预览区域"
        aria-label="聚焦预览区域"
        @click="$emit('set-split-focus', 'preview')"
      >
        <span class="markdown-mode-toolbar-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="12" y1="4" x2="12" y2="20"/>
            <path d="M3 4h9v16H3" opacity="0.35"/>
          </svg>
        </span>
        <span class="markdown-mode-toolbar-text">聚焦预览</span>
      </button>
      <button
        class="markdown-mode-toolbar-button"
        type="button"
        :disabled="splitFocus === 'both'"
        title="恢复双栏分屏"
        aria-label="恢复双栏分屏"
        @click="$emit('set-split-focus', 'both')"
      >
        <span class="markdown-mode-toolbar-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="12" y1="4" x2="12" y2="20"/>
          </svg>
        </span>
        <span class="markdown-mode-toolbar-text">恢复分屏</span>
      </button>
    </template>
    <div class="markdown-mode-toolbar-separator"></div>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      title="复制渲染后的纯文本"
      aria-label="复制渲染后的纯文本"
      @click="$emit('copy-plain')"
    >
      <span class="markdown-mode-toolbar-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </span>
      <span class="markdown-mode-toolbar-text">复制纯文本</span>
    </button>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      title="复制为富文本，可直接粘贴到 Word、微信等"
      aria-label="复制为富文本，可直接粘贴到 Word、微信等"
      @click="$emit('copy-rich')"
    >
      <span class="markdown-mode-toolbar-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 4h6v6"/>
          <path d="M10 14 20 4"/>
          <rect x="4" y="8" width="12" height="12" rx="2"/>
        </svg>
      </span>
      <span class="markdown-mode-toolbar-text">复制到 Word/微信</span>
    </button>
    <button
      class="markdown-mode-toolbar-button"
      type="button"
      title="导出 PDF"
      aria-label="导出 Markdown 为 PDF"
      @click="$emit('export-pdf')"
    >
      <span class="markdown-mode-toolbar-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 17v-9"/>
          <path d="M8.5 11.5 12 15l3.5-3.5"/>
          <path d="M5 21h14"/>
          <path d="M19 9V4H5v5"/>
        </svg>
      </span>
      <span class="markdown-mode-toolbar-text">导出 PDF</span>
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

defineEmits(['set-mode', 'set-split-focus', 'copy-plain', 'copy-rich', 'export-pdf'])
</script>

<style scoped>
.markdown-mode-toolbar {
  min-height: var(--toolbar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--panel-header-padding-x);
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
  gap: 6px;
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
  background: var(--icon-button-bg);
  border: 1px solid transparent;
  color: var(--text-interactive, var(--text-muted));
  border-radius: var(--toolbar-button-radius);
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
  font-weight: 500;
  white-space: nowrap;
  min-width: 28px;
  height: var(--toolbar-button-height);
  padding: 4px 8px;
  gap: 6px;
}

.markdown-mode-toolbar-button:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-hover, var(--text-main));
  box-shadow: var(--interactive-hover-ring);
}

.markdown-mode-toolbar-button:active {
  transform: translateY(1px);
}

.markdown-mode-toolbar-button.active {
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.16));
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

.markdown-mode-toolbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.markdown-mode-toolbar-icon svg {
  width: 16px;
  height: 16px;
}

.markdown-mode-toolbar-text {
  font-size: 12px;
  line-height: 1;
}

.markdown-mode-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--glass-border);
  margin: 0 6px;
}

@media (max-width: 900px) {
  .markdown-mode-toolbar-meta {
    display: none;
  }

  .markdown-mode-toolbar-text {
    display: none;
  }
}
</style>
