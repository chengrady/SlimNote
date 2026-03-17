<template>
  <div class="log-filter-panel" :class="{ embedded }">
    <div class="log-filter-panel-header">
      <div class="log-filter-heading">
        <div class="log-filter-title">过滤视图</div>
        <div class="log-filter-subtitle">{{ summary }}</div>
      </div>
      <div class="log-filter-actions">
        <button class="log-filter-action" type="button" :disabled="!hasEntries" @click="$emit('copy')">复制结果</button>
        <button class="log-filter-action" type="button" :disabled="!hasEntries" @click="$emit('export')">导出结果</button>
        <button class="log-filter-action" type="button" @click="$emit('reset')">返回全部</button>
      </div>
    </div>
    <div v-if="hasEntries" class="log-filter-list">
      <button
        v-for="entry in entries"
        :key="`${entry.lineNumber}-${entry.text}`"
        class="log-filter-item"
        type="button"
        @click="$emit('jump', entry.lineNumber)"
      >
        <span class="log-filter-line">{{ entry.lineNumber }}</span>
        <span class="log-filter-level" :class="entry.levelClass">{{ entry.level }}</span>
        <span class="log-filter-text">{{ entry.text }}</span>
      </button>
    </div>
    <div v-else class="log-filter-empty">当前过滤条件下没有匹配的日志行。</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entries: {
    type: Array,
    default: () => []
  },
  summary: {
    type: String,
    default: ''
  },
  embedded: {
    type: Boolean,
    default: false
  }
})

defineEmits(['reset', 'jump', 'copy', 'export'])

const hasEntries = computed(() => props.entries.length > 0)
</script>

<style scoped>
.log-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 95%, rgba(var(--accent-primary-rgb), 0.03));
}

.log-filter-panel.embedded {
  flex: 1;
  min-height: 0;
  padding: 0;
  border-bottom: none;
  background: transparent;
}

.log-filter-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.log-filter-heading {
  min-width: 0;
}

.log-filter-title {
  color: var(--text-main);
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-semibold, 600);
}

.log-filter-subtitle {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: var(--ui-font-size-xs);
}

.log-filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.log-filter-action {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
  font-weight: 500;
  white-space: nowrap;
}

.log-filter-action:hover:not(:disabled) {
  background: var(--interactive-hover-bg);
  color: var(--text-main);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.log-filter-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.log-filter-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.log-filter-panel.embedded .log-filter-list {
  flex: 1;
  max-height: none;
  padding-right: 2px;
}

.log-filter-item {
  width: 100%;
  display: grid;
  grid-template-columns: 48px 84px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: rgba(var(--accent-primary-rgb), 0.03);
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: var(--transition-fast);
}

.log-filter-item:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.log-filter-line {
  color: var(--text-muted);
  font-size: var(--ui-font-size-xs);
}

.log-filter-level {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.log-filter-level.error {
  background: rgba(244, 71, 71, 0.14);
  color: #f44747;
}

.log-filter-level.warn {
  background: rgba(220, 202, 122, 0.16);
  color: #b88a00;
}

.log-filter-level.info,
.log-filter-level.log {
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--accent-primary);
}

.log-filter-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-main);
}

.log-filter-empty {
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
  padding: 4px 2px;
}

@media (max-width: 900px) {
  .log-filter-panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .log-filter-actions {
    justify-content: flex-start;
  }

  .log-filter-item {
    grid-template-columns: 40px 72px minmax(0, 1fr);
    gap: 8px;
  }
}
</style>
