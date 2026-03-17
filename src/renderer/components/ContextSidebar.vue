<template>
  <aside class="context-sidebar" :class="{ collapsed }" :style="sidebarStyle">
    <div class="context-sidebar-header">
      <div v-if="!collapsed" class="context-sidebar-title-group">
        <div class="context-sidebar-title">{{ title }}</div>
        <div v-if="subtitle" class="context-sidebar-subtitle">{{ subtitle }}</div>
      </div>
      <div class="context-sidebar-actions">
        <slot v-if="!collapsed" name="actions" />
        <button
          class="context-sidebar-toggle"
          type="button"
          :title="collapsed ? '展开上下文栏' : '收起上下文栏'"
          :aria-label="collapsed ? '展开上下文栏' : '收起上下文栏'"
          @click="$emit('toggle-collapse')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline v-if="collapsed" points="9 18 15 12 9 6"/>
            <polyline v-else points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>
    </div>
    <div v-if="!collapsed" class="context-sidebar-body">
      <slot />
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '上下文'
  },
  subtitle: {
    type: String,
    default: ''
  },
  collapsed: {
    type: Boolean,
    default: false
  },
  width: {
    type: Number,
    default: 320
  }
})

const sidebarStyle = computed(() => {
  if (props.collapsed) {
    return undefined
  }

  return {
    width: `${props.width}px`,
    flexBasis: `${props.width}px`
  }
})

defineEmits(['toggle-collapse'])
</script>

<style scoped>
.context-sidebar {
  width: 320px;
  flex: 0 0 320px;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 96%, rgba(var(--accent-primary-rgb), 0.03));
  transition: width var(--transition-smooth), flex-basis var(--transition-smooth);
}

.context-sidebar.collapsed {
  width: 52px;
  flex-basis: 52px;
}

.context-sidebar-header {
  min-height: var(--panel-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: var(--panel-header-padding-y) var(--panel-header-padding-x);
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 92%, rgba(var(--accent-primary-rgb), 0.05));
}

.context-sidebar.collapsed .context-sidebar-header {
  justify-content: center;
  padding: var(--panel-header-padding-y) 8px;
}

.context-sidebar-title-group {
  min-width: 0;
}

.context-sidebar-title {
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.context-sidebar-subtitle {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.context-sidebar-toggle {
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--icon-button-bg);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-fast);
}

.context-sidebar-toggle:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.context-sidebar-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1180px) {
  .context-sidebar {
    width: 280px;
    flex-basis: 280px;
  }
}
</style>
