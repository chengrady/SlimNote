<template>
  <div class="json-stats-bar" v-if="stats">
    <div class="stat-item" :class="{ 'is-valid': stats.isValid, 'is-invalid': !stats.isValid }">
      <span class="stat-icon">
        <svg v-if="stats.isValid" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </span>
      <span class="stat-label">JSON</span>
    </div>
    <template v-if="stats.isValid">
      <div class="stat-item">
        <span class="stat-label">键:</span>
        <span class="stat-value">{{ stats.keys }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">深度:</span>
        <span class="stat-value">{{ stats.depth }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">大小:</span>
        <span class="stat-value">{{ formatSize(stats.size) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">行数:</span>
        <span class="stat-value">{{ stats.lines }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item stat-detail" title="对象数量">
        <span class="stat-icon object-icon">{}</span>
        <span class="stat-value">{{ stats.objects }}</span>
      </div>
      <div class="stat-item stat-detail" title="数组数量">
        <span class="stat-icon array-icon">[]</span>
        <span class="stat-value">{{ stats.arrays }}</span>
      </div>
      <div class="stat-item stat-detail" title="字符串数量">
        <span class="stat-icon string-icon">""</span>
        <span class="stat-value">{{ stats.strings }}</span>
      </div>
      <div class="stat-item stat-detail" title="数字数量">
        <span class="stat-icon number-icon">#</span>
        <span class="stat-value">{{ stats.numbers }}</span>
      </div>
      <div class="stat-item stat-detail" title="布尔值数量">
        <span class="stat-icon bool-icon">?</span>
        <span class="stat-value">{{ stats.booleans }}</span>
      </div>
      <div class="stat-item stat-detail" title="null 数量">
        <span class="stat-icon null-icon">∅</span>
        <span class="stat-value">{{ stats.nulls }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getJsonStats } from '../utils/jsonStats'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const stats = computed(() => {
  if (!props.content) return null
  return getJsonStats(props.content)
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
</script>

<style scoped>
.json-stats-bar {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  background: var(--json-stats-bg, var(--glass-bg, rgba(255, 255, 255, 0.05)));
  border-top: 1px solid var(--json-stats-border, var(--glass-border, rgba(255, 255, 255, 0.1)));
  font-size: 13px;
  font-family: var(--font-family-mono, 'Consolas', 'Monaco', monospace);
  gap: 12px;
  height: 28px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted, #888);
}

.stat-item.is-valid {
  color: var(--json-valid-color, #4caf50);
}

.stat-item.is-invalid {
  color: var(--json-invalid-color, #f44336);
}

.stat-label {
  font-weight: 500;
}

.stat-value {
  color: var(--text-main, #d4d4d4);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-divider {
  width: 1px;
  height: 14px;
  background: var(--json-stats-border, var(--glass-border, rgba(255, 255, 255, 0.1)));
  margin: 0 4px;
}

.stat-detail {
  font-size: 12px;
}

.stat-detail .stat-icon {
  font-size: 11px;
  font-weight: bold;
  width: 14px;
}

.object-icon {
  color: var(--json-key-color, #9876aa);
}

.array-icon {
  color: var(--json-key-color, #9876aa);
}

.string-icon {
  color: var(--json-string-color, #6a8759);
}

.number-icon {
  color: var(--json-number-color, #6897bb);
}

.bool-icon {
  color: var(--json-boolean-color, #cc7832);
}

.null-icon {
  color: var(--json-null-color, #808080);
}
</style>
