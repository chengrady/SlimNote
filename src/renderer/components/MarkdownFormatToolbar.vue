<template>
  <div class="markdown-format-toolbar">
    <span class="markdown-format-toolbar-meta">格式</span>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('bold')" title="加粗">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('italic')" title="斜体">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('heading', 1)" title="一级标题">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8M4 18V6M12 18V6M17 12l3-2v8"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('heading', 2)" title="二级标题">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8M4 18V6M12 18V6M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('heading', 3)" title="三级标题">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8M4 18V6M12 18V6M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 14a2 2 0 0 1 2 2c0 1.5-1.8 2.5-3.5 1.5"/></svg>
    </button>
    <div class="markdown-format-toolbar-separator"></div>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('unordered-list')" title="无序列表">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('ordered-list')" title="有序列表">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('check-list')" title="任务列表">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    </button>
    <div class="markdown-format-toolbar-separator"></div>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('code-block')" title="代码块">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('quote')" title="引用">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('link')" title="链接">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('image')" title="图片">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('table')" title="表格">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
    </button>
    <button class="markdown-format-toolbar-button" type="button" @click="$emit('horizontal-rule')" title="分割线">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </div>
</template>

<script setup>
defineEmits(['bold', 'italic', 'heading', 'unordered-list', 'ordered-list', 'check-list', 'code-block', 'quote', 'link', 'image', 'table', 'horizontal-rule'])
</script>

<style scoped>
.markdown-format-toolbar {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
  gap: 6px;
  overflow-x: auto;
}

.markdown-format-toolbar-meta {
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

.markdown-format-toolbar-button {
  background: transparent;
  border: none;
  color: var(--text-interactive, var(--text-muted));
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
  font-weight: 500;
  white-space: nowrap;
  padding: 4px;
  min-width: 28px;
  height: 28px;
}

.markdown-format-toolbar-button:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-hover, var(--text-main));
  box-shadow: var(--interactive-hover-ring);
}

.markdown-format-toolbar-button:active {
  transform: translateY(1px);
}

.markdown-format-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--glass-border);
  margin: 0 6px;
}

@media (max-width: 900px) {
  .markdown-format-toolbar-meta {
    display: none;
  }
}
</style>
