<template>
  <div class="sql-toolbar">
    <span class="sql-toolbar-meta">SQL</span>
    <span class="sql-toolbar-note">方言：{{ dialectLabel }}</span>
    <button class="sql-toolbar-button" type="button" @click="$emit('snippet', 'select')" title="插入 SELECT 片段">
      <span class="sql-toolbar-text">SELECT 片段</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('snippet', 'insert')" title="插入 INSERT 片段">
      <span class="sql-toolbar-text">INSERT 片段</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('snippet', 'update')" title="插入 UPDATE 片段">
      <span class="sql-toolbar-text">UPDATE 片段</span>
    </button>
    <div class="sql-toolbar-separator"></div>
    <button class="sql-toolbar-button" type="button" @click="$emit('format')" title="格式化 SQL (Ctrl+Shift+F)">
      <span class="sql-toolbar-text">格式化</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('minify')" title="压缩 SQL (Ctrl+Shift+M)">
      <span class="sql-toolbar-text">压缩</span>
    </button>
    <div class="sql-toolbar-separator"></div>
    <button class="sql-toolbar-button" type="button" @click="$emit('upper-keywords')" title="关键字转大写 (Ctrl+Shift+U)">
      <span class="sql-toolbar-text">关键字大写</span>
    </button>
    <button class="sql-toolbar-button" type="button" @click="$emit('lower-keywords')" title="关键字转小写 (Ctrl+Shift+L)">
      <span class="sql-toolbar-text">关键字小写</span>
    </button>
    <div class="sql-toolbar-separator"></div>
    <button class="sql-toolbar-button" type="button" @click="$emit('copy')" title="复制 SQL 内容">
      <span class="sql-toolbar-text">复制内容</span>
    </button>
  </div>
</template>

<script setup>
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
  color: var(--text-muted);
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
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
}

.sql-toolbar-button {
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

.sql-toolbar-button:hover {
  background: var(--interactive-hover-bg);
  color: var(--text-main);
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
