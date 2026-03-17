<template>
  <div class="log-toolbar">
    <span class="log-toolbar-meta">Log</span>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'all' }" @click="$emit('set-filter', 'all')" title="显示全部日志">
      <span class="log-toolbar-text">全部</span>
    </button>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'error' }" @click="$emit('set-filter', 'error')" title="仅看 ERROR">
      <span class="log-toolbar-text">仅 ERROR</span>
    </button>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'warn' }" @click="$emit('set-filter', 'warn')" title="仅看 WARN">
      <span class="log-toolbar-text">仅 WARN</span>
    </button>
    <button class="log-toolbar-button" type="button" :class="{ active: filterMode === 'issues' }" @click="$emit('set-filter', 'issues')" title="仅看 ERROR/WARN">
      <span class="log-toolbar-text">ERROR/WARN</span>
    </button>
    <div class="log-toolbar-separator"></div>
    <button class="log-toolbar-button" type="button" :class="{ active: wrapEnabled }" @click="$emit('toggle-wrap')" title="切换自动换行 (Ctrl+Shift+W)">
      <span class="log-toolbar-text">自动换行</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('jump-level', 'ERROR')" title="定位下一条 ERROR">
      <span class="log-toolbar-text">下一个 ERROR</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('jump-level', 'WARN')" title="定位下一条 WARN">
      <span class="log-toolbar-text">下一个 WARN</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('jump-level', 'INFO')" title="定位下一条 INFO">
      <span class="log-toolbar-text">下一个 INFO</span>
    </button>
    <div class="log-toolbar-separator"></div>
    <button class="log-toolbar-button" type="button" @click="$emit('scroll-bottom')" title="滚动到底部">
      <span class="log-toolbar-text">滚动到底部</span>
    </button>
    <button class="log-toolbar-button" type="button" @click="$emit('copy')" title="复制日志内容">
      <span class="log-toolbar-text">复制内容</span>
    </button>
  </div>
</template>

<script setup>
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
  color: var(--text-muted);
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
  color: var(--text-muted);
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
  background: var(--interactive-hover-bg);
  color: var(--text-main);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.log-toolbar-button:active {
  transform: translateY(1px);
}

.log-toolbar-button.active {
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
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
