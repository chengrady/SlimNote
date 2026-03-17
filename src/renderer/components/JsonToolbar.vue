<template>
  <div class="json-toolbar">
    <span class="json-toolbar-meta">{{ t('jsonToolbar.meta') }}</span>
    <button class="json-toolbar-button" type="button" @click="$emit('format')" :title="`${t('jsonToolbar.format')} (Ctrl+Shift+F)`">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10H3M21 6H3M21 14H3M21 18H3"/></svg>
    </button>
    <button class="json-toolbar-button" type="button" @click="$emit('minify')" :title="`${t('jsonToolbar.minify')} (Ctrl+Shift+M)`">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14L3 21"/></svg>
    </button>
    <button class="json-toolbar-button" type="button" @click="$emit('repair')" :title="`${t('jsonToolbar.repair')} (Ctrl+Shift+R)`">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </button>
    <button class="json-toolbar-button" type="button" @click="$emit('unescape')" :title="t('jsonToolbar.unescape')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14l-4-4 4-4"/><path d="M14 10l4 4-4 4"/></svg>
    </button>
    <div class="json-toolbar-separator"></div>
    <button class="json-toolbar-button" type="button" @click="$emit('expand-all')" :title="t('jsonToolbar.expandAll')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
    </button>
    <button class="json-toolbar-button" type="button" @click="$emit('collapse-all')" :title="t('jsonToolbar.collapseAll')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14L3 21"/></svg>
    </button>
    <div class="json-toolbar-separator"></div>
    <button class="json-toolbar-button" type="button" @click="$emit('open-converter')" :title="t('jsonToolbar.convert')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/></svg>
    </button>
    <button class="json-toolbar-button" type="button" @click="$emit('open-codegen')" :title="t('jsonToolbar.codegen')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
    </button>
    <button class="json-toolbar-button" type="button" @click="$emit('open-diff')" :title="t('jsonToolbar.diff')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    </button>
    <button class="json-toolbar-button" type="button" @click="$emit('export-image')" :title="t('jsonToolbar.exportImage')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    </button>
    <div class="json-toolbar-separator"></div>
    <button class="json-toolbar-button" type="button" :class="{ active: showTree }" @click="$emit('toggle-tree')" :title="`${t('jsonToolbar.toggleTree')} (Ctrl+Shift+T)`">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  showTree: {
    type: Boolean,
    default: true
  }
})

defineEmits(['format', 'minify', 'repair', 'unescape', 'expand-all', 'collapse-all', 'open-converter', 'open-codegen', 'open-diff', 'export-image', 'toggle-tree'])
</script>

<style scoped>
.json-toolbar {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom: 1px solid var(--json-toolbar-border, var(--glass-border));
  background: var(--json-toolbar-bg, color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03)));
  gap: 4px;
  overflow-x: auto;
}

.json-toolbar-meta {
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  padding-right: 4px;
}

.json-toolbar-button {
  background: transparent;
  border: none;
  color: var(--text-muted);
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

.json-toolbar-button:hover {
  background: var(--interactive-hover-bg);
  color: var(--text-main);
  box-shadow: var(--interactive-hover-ring);
}

.json-toolbar-button:active {
  transform: translateY(1px);
}

.json-toolbar-button.active {
  background: var(--json-chip-bg, rgba(var(--accent-primary-rgb), 0.12));
  color: var(--json-key-color, var(--accent-primary));
}

.json-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--json-toolbar-border, var(--glass-border));
  margin: 0 6px;
}

@media (max-width: 900px) {
  .json-toolbar-meta {
    display: none;
  }
}
</style>
