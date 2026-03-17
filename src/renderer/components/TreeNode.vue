<template>
  <div class="tree-node" :class="{ nested: depth > 0 }">
    <template v-if="isObject || isArray">
      <!-- 对象或数组的渲染 -->
      <div
        class="node-header"
        :class="{ 'is-expanded': isExpanded, 'is-match': isMatch, 'is-active': isActive }"
        :style="nodeRowStyle"
        @click="toggleExpand"
      >
        <span class="expand-icon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="node-kind-icon" :class="isArray ? 'node-kind-icon-array' : 'node-kind-icon-object'" aria-hidden="true">
          {{ isArray ? '[]' : '{}' }}
        </span>
        <span class="key-name" v-if="displayKey">{{ displayKey }}</span>
        <span class="type-pill" :class="isArray ? 'type-pill-array' : 'type-pill-object'">
          {{ isArray ? 'Array' : 'Object' }}
        </span>
        <span class="node-summary">{{ containerSummary }}</span>
        <button class="copy-btn" @click.stop="copyPath" title="复制路径">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
      <div class="node-children" v-show="isExpanded">
        <template v-if="isArray">
          <TreeNode
            v-for="(item, index) in data"
            :key="index"
            :data="item"
            :key-name="String(index)"
            :path="[...path, index]"
            :depth="depth + 1"
            :selected-path="selectedPath"
            :search-query="searchQuery"
            :expanded-keys="expandedKeys"
            @node-click="handleChildClick"
            @toggle-expand="$emit('toggle-expand', $event)"
          />
        </template>
        <template v-else>
          <TreeNode
            v-for="[k, v] in objectEntries"
            :key="k"
            :data="v"
            :key-name="k"
            :path="[...path, k]"
            :depth="depth + 1"
            :selected-path="selectedPath"
            :search-query="searchQuery"
            :expanded-keys="expandedKeys"
            @node-click="handleChildClick"
            @toggle-expand="$emit('toggle-expand', $event)"
          />
        </template>
      </div>
    </template>

    <!-- 基本类型的渲染 -->
    <div
      v-else
      class="node-leaf"
      :class="{ 'is-match': isMatch, 'is-active': isActive }"
      :style="nodeRowStyle"
      @click="handleClick"
    >
      <span class="node-kind-icon" :class="valueIconClass" aria-hidden="true">
        {{ valueIconText }}
      </span>
      <span class="key-name" v-if="displayKey">{{ displayKey }}:</span>
      <span class="value" :class="typeClass">{{ displayValue }}</span>
      <button class="copy-btn" @click.stop="copyValue" title="复制值">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <button class="copy-btn" @click.stop="copyPath" title="复制路径">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: [Object, Array, String, Number, Boolean, null],
    default: null
  },
  keyName: {
    type: String,
    default: ''
  },
  path: {
    type: Array,
    default: () => []
  },
  depth: {
    type: Number,
    default: 0
  },
  selectedPath: {
    type: Array,
    default: () => []
  },
  searchQuery: {
    type: String,
    default: ''
  },
  expandedKeys: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['node-click', 'toggle-expand'])

// 类型判断
const isObject = computed(() => {
  return typeof props.data === 'object' && props.data !== null && !Array.isArray(props.data)
})

const isArray = computed(() => {
  return Array.isArray(props.data)
})

// 获取对象的键和条目
const objectKeys = computed(() => {
  if (isObject.value) {
    return Object.keys(props.data)
  }
  return []
})

const objectEntries = computed(() => {
  if (isObject.value) {
    return Object.entries(props.data)
  }
  return []
})

// 当前节点是否展开
const pathKey = computed(() => props.path.join('.'))
const isExpanded = computed(() => {
  return props.expandedKeys.has(pathKey.value) || props.path.length === 0
})

// 显示的键名
const displayKey = computed(() => props.keyName)

const nodeRowStyle = computed(() => ({
  '--tree-depth': props.depth,
  '--tree-guide-offset': props.depth > 0 ? '-14px' : '0px'
}))

const isActive = computed(() => {
  if (!Array.isArray(props.selectedPath)) return false
  if (props.selectedPath.length !== props.path.length) return false
  return props.selectedPath.every((segment, index) => segment === props.path[index])
})

const containerSummary = computed(() => {
  if (isArray.value) {
    const count = props.data.length
    return `${count} item${count === 1 ? '' : 's'}`
  }

  if (isObject.value) {
    const count = objectKeys.value.length
    return `${count} key${count === 1 ? '' : 's'}`
  }

  return ''
})

// 类型图标和类名
const typeClass = computed(() => {
  if (props.data === null) return 'type-null'
  if (isArray.value) return 'type-array'
  if (isObject.value) return 'type-object'
  if (typeof props.data === 'string') return 'type-string'
  if (typeof props.data === 'number') return 'type-number'
  if (typeof props.data === 'boolean') return 'type-boolean'
  return 'type-unknown'
})

const valueIconText = computed(() => {
  if (props.data === null) return '∅'
  if (typeof props.data === 'string') return '""'
  if (typeof props.data === 'number') return '#'
  if (typeof props.data === 'boolean') return '◐'
  return '•'
})

const valueIconClass = computed(() => {
  if (props.data === null) return 'node-kind-icon-null'
  if (typeof props.data === 'string') return 'node-kind-icon-string'
  if (typeof props.data === 'number') return 'node-kind-icon-number'
  if (typeof props.data === 'boolean') return 'node-kind-icon-boolean'
  return 'node-kind-icon-unknown'
})

// 显示的值
const displayValue = computed(() => {
  if (props.data === null) return 'null'
  if (typeof props.data === 'string') {
    const truncated = props.data.length > 50 ? props.data.slice(0, 50) + '...' : props.data
    return `"${truncated}"`
  }
  if (typeof props.data === 'boolean') return props.data ? 'true' : 'false'
  return String(props.data)
})

// 搜索匹配
const isMatch = computed(() => {
  if (!props.searchQuery) return false
  const query = props.searchQuery.toLowerCase()
  // 匹配键名
  if (props.keyName && props.keyName.toLowerCase().includes(query)) return true
  // 匹配值
  if (typeof props.data === 'string' && props.data.toLowerCase().includes(query)) return true
  if (typeof props.data === 'number' && String(props.data).includes(query)) return true
  return false
})

// 切换展开/折叠
function toggleExpand() {
  emit('toggle-expand', pathKey.value)
}

// 点击节点
function handleClick() {
  // 估算行号（简化版本，实际可能需要更精确的计算）
  const line = estimateLine()
  emit('node-click', props.path, line)
}

// 处理子节点点击
function handleChildClick(path, line) {
  emit('node-click', path, line)
}

// 估算行号（简化版本）
function estimateLine() {
  // 这里返回一个估计的行号，实际实现可能需要遍历 JSON 来精确计算
  return props.path.length + 1
}

// 复制路径
async function copyPath() {
  const pathStr = props.path.map(p => typeof p === 'number' ? `[${p}]` : `.${p}`).join('').replace(/^\./, '')
  try {
    await navigator.clipboard.writeText(pathStr)
  } catch (e) {
    console.error('Failed to copy path:', e)
  }
}

// 复制值
async function copyValue() {
  try {
    const valueStr = typeof props.data === 'object' ? JSON.stringify(props.data, null, 2) : String(props.data)
    await navigator.clipboard.writeText(valueStr)
  } catch (e) {
    console.error('Failed to copy value:', e)
  }
}
</script>

<style scoped>
.tree-node {
  position: relative;
  font-size: inherit;
  user-select: none;
}

.node-header,
.node-leaf {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s, box-shadow 0.15s;
}

.tree-node.nested > .node-header::before,
.tree-node.nested > .node-leaf::before {
  content: '';
  position: absolute;
  left: var(--tree-guide-offset, -14px);
  top: 50%;
  width: 12px;
  border-top: 1px solid var(--json-tree-guide-color, rgba(127, 138, 163, 0.28));
  transform: translateY(-50%);
}

.node-header:hover,
.node-leaf:hover {
  background: var(--json-tree-hover-bg, var(--btn-hover-bg, rgba(255, 255, 255, 0.08)));
}

.node-header.is-match,
.node-leaf.is-match {
  background: var(--json-tree-match-bg, rgba(255, 215, 0, 0.15));
  box-shadow: inset 2px 0 0 var(--json-tree-match-border, rgba(255, 215, 0, 0.22));
}

.node-header.is-active,
.node-leaf.is-active {
  background: var(--json-tree-active-bg, rgba(15, 106, 216, 0.14));
  box-shadow: inset 0 0 0 1px var(--json-tree-active-border, rgba(15, 106, 216, 0.2)), 0 0 0 1px rgba(255, 255, 255, 0.02), var(--json-tree-active-glow, 0 10px 24px rgba(15, 106, 216, 0.08));
}

.node-header.is-active::after,
.node-leaf.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  bottom: 5px;
  width: 3px;
  border-radius: 999px;
  background: var(--json-key-color, var(--text-main, #d4d4d4));
}

.expand-icon {
  width: 16px;
  font-size: 10px;
  color: var(--text-muted, #888);
  margin-right: 6px;
  flex-shrink: 0;
  text-align: center;
}

.node-header.is-active .expand-icon,
.node-header:hover .expand-icon {
  color: var(--json-key-color, var(--text-main, #d4d4d4));
}

.key-name {
  color: var(--json-key-color, var(--text-main, #d4d4d4));
  margin-right: 6px;
  font-weight: 500;
}

.node-kind-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.node-kind-icon-object {
  color: var(--json-key-color, var(--text-main, #d4d4d4));
  background: color-mix(in srgb, var(--json-chip-bg, rgba(15, 106, 216, 0.08)) 88%, transparent);
  border-color: var(--json-chip-border, rgba(15, 106, 216, 0.12));
}

.node-kind-icon-array {
  color: var(--json-number-color, #6897bb);
  background: color-mix(in srgb, rgba(255, 158, 100, 0.12) 88%, transparent);
  border-color: color-mix(in srgb, var(--json-number-color, #6897bb) 28%, transparent);
}

.node-kind-icon-string {
  color: var(--json-string-color, #6a8759);
  background: color-mix(in srgb, var(--json-string-color, #6a8759) 14%, transparent);
  border-color: color-mix(in srgb, var(--json-string-color, #6a8759) 24%, transparent);
}

.node-kind-icon-number {
  color: var(--json-number-color, #6897bb);
  background: color-mix(in srgb, var(--json-number-color, #6897bb) 14%, transparent);
  border-color: color-mix(in srgb, var(--json-number-color, #6897bb) 24%, transparent);
}

.node-kind-icon-boolean {
  color: var(--json-boolean-color, #cc7832);
  background: color-mix(in srgb, var(--json-boolean-color, #cc7832) 14%, transparent);
  border-color: color-mix(in srgb, var(--json-boolean-color, #cc7832) 24%, transparent);
}

.node-kind-icon-null {
  color: var(--json-null-color, #808080);
  background: color-mix(in srgb, var(--json-null-color, #808080) 14%, transparent);
  border-color: color-mix(in srgb, var(--json-null-color, #808080) 24%, transparent);
}

.node-kind-icon-unknown {
  color: var(--text-muted, #888);
  background: rgba(127, 138, 163, 0.08);
  border-color: rgba(127, 138, 163, 0.16);
}

.type-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 18px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--json-chip-border, rgba(15, 106, 216, 0.12));
  background: var(--json-chip-bg, rgba(15, 106, 216, 0.08));
  color: var(--json-key-color, var(--text-main, #d4d4d4));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  margin-right: 8px;
}

.type-pill-array {
  color: var(--json-number-color, #6897bb);
}

.type-pill-object {
  color: var(--json-key-color, var(--text-main, #d4d4d4));
}

.node-summary {
  color: var(--text-muted, #888);
  font-size: 11px;
  white-space: nowrap;
}

.value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value.type-string {
  color: var(--json-string-color, #6a8759);
}

.value.type-number {
  color: var(--json-number-color, #6897bb);
}

.value.type-boolean {
  color: var(--json-boolean-color, #cc7832);
}

.value.type-null {
  color: var(--json-null-color, #808080);
  font-style: italic;
}

.copy-btn {
  opacity: 0;
  padding: 3px 5px;
  border: none;
  background: transparent;
  color: var(--text-muted, #888);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  margin-left: 6px;
}

.node-summary + .copy-btn,
.value + .copy-btn {
  margin-left: auto;
}

.node-header:hover .copy-btn,
.node-leaf:hover .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  background: var(--json-tree-hover-bg, var(--btn-hover-bg, rgba(255, 255, 255, 0.15)));
  color: var(--text-main, #d4d4d4);
}

.node-children {
  position: relative;
  margin-left: 10px;
  padding-left: 22px;
}

.node-children::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, var(--json-tree-guide-color, rgba(127, 138, 163, 0.3)) 0%, var(--json-tree-guide-color, rgba(127, 138, 163, 0.18)) 100%);
}
</style>
