<template>
  <div class="sql-toolbar">
    <span class="sql-toolbar-meta">{{ t('sqlToolbar.meta') }}</span>
    <span class="sql-toolbar-note">{{ t('sqlToolbar.dialect', { dialect: dialectLabel }) }}</span>
    <button class="sql-toolbar-button" type="button" @click="$emit('snippet', 'select')" :title="t('sqlToolbar.selectSnippet')">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.selectSnippet') }}</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('snippet', 'insert')" :title="t('sqlToolbar.insertSnippet')">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.insertSnippet') }}</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('snippet', 'update')" :title="t('sqlToolbar.updateSnippet')">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.updateSnippet') }}</span>
    </button>
    <div class="sql-toolbar-separator"></div>
    <button class="sql-toolbar-button" type="button" @click="$emit('format')" :title="`${t('sqlToolbar.format')} SQL (Ctrl+Shift+F)`">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.format') }}</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('minify')" :title="`${t('sqlToolbar.minify')} SQL (Ctrl+Shift+M)`">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.minify') }}</span>
    </button>
    <div class="sql-toolbar-separator"></div>
    <button class="sql-toolbar-button" type="button" @click="$emit('upper-keywords')" :title="`${t('sqlToolbar.upperKeywords')} (Ctrl+Shift+U)`">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.upperKeywords') }}</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('lower-keywords')" :title="`${t('sqlToolbar.lowerKeywords')} (Ctrl+Shift+L)`">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.lowerKeywords') }}</span>
    </button>
    <div class="sql-toolbar-separator"></div>
    <button class="sql-toolbar-button" type="button" @click="$emit('copy')" :title="t('sqlToolbar.copy')">
      <span class="sql-toolbar-text">{{ t('sqlToolbar.copy') }}</span>
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  dialectLabel: {
    type: String,
    default: 'MySQL'
  }
})

defineEmits(['snippet', 'format', 'minify', 'upper-keywords', 'lower-keywords', 'copy'])
</script>

<style scoped>
.sql-toolbar {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
  gap: 6px;
  overflow-x: auto;
}

.sql-toolbar-meta {
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

.sql-toolbar-note {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.06);
  color: var(--text-shortcut, var(--text-muted));
  font-size: 11px;
  white-space: nowrap;
}

.sql-toolbar-button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-interactive, var(--text-muted));
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 10px;
  min-width: auto;
  height: 28px;
  transition: var(--transition-fast);
  font-weight: 500;
  white-space: nowrap;
}

.sql-toolbar-button:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-hover, var(--text-main));
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.sql-toolbar-button:active {
  transform: translateY(1px);
}

.sql-toolbar-text {
  font-size: 12px;
  line-height: 1;
}

.sql-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--glass-border);
  margin: 0 6px;
}

@media (max-width: 900px) {
  .sql-toolbar-meta,
  .sql-toolbar-note {
    display: none;
  }

  .sql-toolbar-button {
    padding: 4px 8px;
  }
}
</style>
