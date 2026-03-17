<template>
  <div class="outline-panel">
    <div v-if="headings.length === 0" class="outline-empty">当前文档还没有 Markdown 标题。</div>
    <div v-else class="outline-list">
      <button
        v-for="heading in visibleHeadings"
        :key="heading.id"
        class="outline-item"
        :class="[
          `level-${heading.level}`,
          {
            active: activeHeadingId === heading.id,
            collapsed: heading.hasChildren && collapsedHeadingIds.includes(heading.id)
          }
        ]"
        type="button"
        :title="heading.text"
        @click="$emit('jump', heading)"
      >
        <span
          v-if="heading.hasChildren"
          class="outline-toggle"
          :class="{ collapsed: collapsedHeadingIds.includes(heading.id) }"
          @click.stop="$emit('toggle-heading', heading)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
        <span v-else class="outline-toggle placeholder" aria-hidden="true"></span>
        <span class="outline-bullet" aria-hidden="true"></span>
        <span class="outline-text">{{ heading.text }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  headings: {
    type: Array,
    default: () => []
  },
  visibleHeadings: {
    type: Array,
    default: () => []
  },
  activeHeadingId: {
    type: String,
    default: ''
  },
  collapsedHeadingIds: {
    type: Array,
    default: () => []
  }
})

defineEmits(['jump', 'toggle-heading'])
</script>

<style scoped>
.outline-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.outline-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 8px;
}

.outline-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-fast);
  margin-bottom: 2px;
}

.outline-item:hover {
  background: var(--btn-hover-bg);
  color: var(--text-main);
}

.outline-item.active {
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.outline-item.collapsed {
  color: var(--text-main);
}

.outline-toggle {
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
  border-radius: 4px;
  transition: var(--transition-fast);
}

.outline-toggle svg {
  transition: transform var(--transition-fast);
}

.outline-toggle.collapsed svg {
  transform: rotate(0deg);
}

.outline-toggle:not(.collapsed) svg {
  transform: rotate(90deg);
}

.outline-item:hover .outline-toggle {
  color: var(--text-main);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.outline-toggle.placeholder {
  opacity: 0;
  pointer-events: none;
}

.outline-item.level-2 {
  padding-left: 18px;
}

.outline-item.level-3 {
  padding-left: 26px;
}

.outline-item.level-4,
.outline-item.level-5,
.outline-item.level-6 {
  padding-left: 34px;
}

.outline-bullet {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.35;
  flex-shrink: 0;
}

.outline-item.active .outline-bullet {
  opacity: 1;
}

.outline-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}
</style>
