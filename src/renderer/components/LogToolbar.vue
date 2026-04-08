<template>
  <div class="log-toolbar">
    <span class="log-toolbar-meta">{{ t('logToolbar.meta') }}</span>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'all' }" @click="$emit('set-filter', 'all')" :title="t('logToolbar.showAll')">
      <span class="log-toolbar-text">{{ t('logToolbar.all') }}</span>
    </button>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'error' }" @click="$emit('set-filter', 'error')" :title="t('logToolbar.errorsOnly')">
      <span class="log-toolbar-text">{{ t('logToolbar.errorsOnly') }}</span>
    </button>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'warn' }" @click="$emit('set-filter', 'warn')" :title="t('logToolbar.warningsOnly')">
      <span class="log-toolbar-text">{{ t('logToolbar.warningsOnly') }}</span>
    </button>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'issues' }" @click="$emit('set-filter', 'issues')" :title="t('logToolbar.issuesOnly')">
      <span class="log-toolbar-text">{{ t('logToolbar.issues') }}</span>
    </button>
    <div class="log-toolbar-separator"></div>
    <button class="log-toolbar-button" type="button" :class="{ active: wrapEnabled }" @click="$emit('toggle-wrap')" :title="`${t('logToolbar.toggleWrap')} (Ctrl+Shift+W)`">
      <span class="log-toolbar-text">{{ t('logToolbar.wrap') }}</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('jump-level', 'ERROR')" :title="t('logToolbar.nextError')">
      <span class="log-toolbar-text">{{ t('logToolbar.nextError') }}</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('jump-level', 'WARN')" :title="t('logToolbar.nextWarn')">
      <span class="log-toolbar-text">{{ t('logToolbar.nextWarn') }}</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('jump-level', 'INFO')" :title="t('logToolbar.nextInfo')">
      <span class="log-toolbar-text">{{ t('logToolbar.nextInfo') }}</span>
    </button>
    <div class="log-toolbar-separator"></div>
    <button class="log-toolbar-button" type="button" @click="$emit('scroll-bottom')" :title="t('logToolbar.scrollBottom')">
      <span class="log-toolbar-text">{{ t('logToolbar.scrollBottom') }}</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('copy')" :title="t('logToolbar.copy')">
      <span class="log-toolbar-text">{{ t('logToolbar.copy') }}</span>
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  filterMode: {
    type: String,
    default: 'all'
  },
  wrapEnabled: {
    type: Boolean,
    default: true
  }
})

defineEmits(['set-filter', 'toggle-wrap', 'jump-level', 'scroll-bottom', 'copy'])
</script>

<style scoped>
.log-toolbar {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
  gap: 6px;
  overflow-x: auto;
}

.log-toolbar-meta {
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

.log-toolbar-button {
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

.log-toolbar-button:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-hover, var(--text-main));
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.log-toolbar-button:active {
  transform: translateY(1px);
}

.log-toolbar-button.active {
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.16));
  color: var(--text-interactive-active, var(--accent-primary));
}

.log-toolbar-text {
  font-size: 12px;
  line-height: 1;
}

.log-toolbar-separator {
  width: 1px;
  height: 18px;
  background: var(--glass-border);
  margin: 0 6px;
}

@media (max-width: 900px) {
  .log-toolbar-meta {
    display: none;
  }

  .log-toolbar-button {
    padding: 4px 8px;
  }
}
</style>
