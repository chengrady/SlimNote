<template>
  <div class="json-tree-panel" :style="treeStyle">
    <!-- 搜索栏 -->
    <div class="tree-toolbar">
      <div class="search-box">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索键或值..."
          class="search-input"
        />
      </div>
      <div class="toolbar-actions">
        <button @click="expandAll" title="全部展开">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m7 20 5-5 5 5M7 4l5 5 5-5"/>
          </svg>
        </button>
        <button @click="collapseAll" title="全部折叠">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m17 14-5-5-5 5M17 20l-5-5-5 5"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 树形内容 -->
    <div class="tree-content" v-if="parsedData">
      <TreeNode
        :data="parsedData"
        :path="[]"
        :selected-path="selectedPath"
        :search-query="searchQuery"
        :expanded-keys="expandedKeys"
        ref="rootNode"
        @node-click="handleNodeClick"
        @toggle-expand="toggleExpand"
      />
    </div>
    <div class="tree-empty" v-else-if="!isValid">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>无效的 JSON</span>
    </div>
    <div class="tree-empty" v-else>
      <span>空内容</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import TreeNode from './TreeNode.vue'
import { useSettingsStore } from '../stores/settings'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  selectedPath: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['node-click'])
const settingsStore = useSettingsStore()

const searchQuery = ref('')
const expandedKeys = ref(new Set())
const rootNode = ref(null)

const treeStyle = computed(() => ({
  fontFamily: settingsStore.settings.fontFamily || 'Microsoft YaHei',
  fontSize: `${settingsStore.settings.fontSize || 14}px`
}))

// 解析 JSON
const parsedData = computed(() => {
  if (!props.content || !props.content.trim()) return null
  try {
    return JSON.parse(props.content)
  } catch {
    return null
  }
})

const isValid = computed(() => {
  if (!props.content || !props.content.trim()) return true
  try {
    JSON.parse(props.content)
    return true
  } catch {
    return false
  }
})

// 处理节点点击
function handleNodeClick(path, line) {
  emit('node-click', path, line)
}

// 切换展开/折叠
function toggleExpand(key) {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key)
  } else {
    expandedKeys.value.add(key)
  }
  // 触发响应式更新
  expandedKeys.value = new Set(expandedKeys.value)
}

// 全部展开
function expandAll() {
  if (parsedData.value) {
    const keys = collectExpandableKeys(parsedData.value, [])
    expandedKeys.value = new Set(keys)
  }
}

// 全部折叠
function collapseAll() {
  expandedKeys.value = new Set()
}

// 收集所有可展开的键
function collectExpandableKeys(data, parentPath) {
  const keys = []
  if (Array.isArray(data)) {
    const key = parentPath.join('.')
    if (key) keys.push(key)
    data.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        keys.push(...collectExpandableKeys(item, [...parentPath, index]))
      }
    })
  } else if (typeof data === 'object' && data !== null) {
    const key = parentPath.join('.')
    if (key) keys.push(key)
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'object' && v !== null) {
        keys.push(...collectExpandableKeys(v, [...parentPath, k]))
      }
    }
  }
  return keys
}

// 暴露方法给父组件
defineExpose({
  expandAll,
  collapseAll
})

watch(parsedData, (value) => {
  if (value) {
    expandAll()
    return
  }

  expandedKeys.value = new Set()
}, { immediate: true })
</script>

<style scoped>
.json-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--json-surface-bg, var(--glass-bg, rgba(255, 255, 255, 0.05)));
  border-left: 1px solid var(--json-toolbar-border, var(--glass-border, rgba(255, 255, 255, 0.1)));
}

.tree-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  border-bottom: 1px solid var(--json-toolbar-border, var(--glass-border, rgba(255, 255, 255, 0.1)));
  background: var(--json-toolbar-bg, var(--glass-bg, rgba(255, 255, 255, 0.05)));
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted, #888);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: var(--field-height-md, 34px);
  padding: 0 var(--field-padding-x, 12px) 0 var(--field-icon-offset, 30px);
  border: 1px solid var(--json-input-border, var(--glass-border, rgba(255, 255, 255, 0.1)));
  border-radius: var(--field-radius, 6px);
  background: var(--json-input-bg, var(--bg-primary, #1e1e1e));
  color: var(--text-main, #d4d4d4);
  font-size: var(--field-font-size, 13px);
  outline: none;
  transition: var(--transition-fast, 0.16s ease);
}

.search-input:focus {
  border-color: var(--json-key-color, var(--accent-primary, #007acc));
  box-shadow: 0 0 0 1px var(--json-input-focus, rgba(0, 122, 204, 0.14));
}

.search-input::placeholder {
  color: var(--text-muted, #888);
}

.toolbar-actions {
  display: flex;
  gap: 4px;
}

.toolbar-actions button {
  padding: 4px 6px;
  border: none;
  background: transparent;
  color: var(--text-muted, #888);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toolbar-actions button:hover {
  background: var(--json-tree-hover-bg, var(--btn-hover-bg, rgba(255, 255, 255, 0.1)));
  color: var(--text-main, #d4d4d4);
}

.tree-content {
  flex: 1;
  overflow: auto;
  padding: 10px 10px 14px 8px;
  background: transparent;
}

.tree-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #888);
  font-size: var(--empty-state-text-size, 12px);
  line-height: var(--panel-subtitle-line-height, 1.4);
  gap: var(--empty-state-gap, 12px);
  padding: var(--empty-state-padding, 32px);
  text-align: center;
}
</style>
