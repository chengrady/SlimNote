<template>
  <div class="file-node">
    <div 
      class="node-label"
      :class="{ active: !node.isDirectory && node.path === activePath, selected: node.path === selectedPath }"
      :style="{ paddingLeft: `calc(${depth} * 14px + 8px)` }"
      @click="handleClick"
      @keydown.enter="handleClick"
      @keydown.space.prevent="handleClick"
      @contextmenu.stop.prevent="showContextMenu"
      tabindex="0"
    >
      <span class="twisty" :class="{ expanded: node.isDirectory && node.expanded }" aria-hidden="true">
        <svg v-if="node.isDirectory" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </span>
      <span v-if="node.isDirectory" class="icon icon-folder" :class="{ expanded: node.expanded }" aria-hidden="true">
        <svg v-if="node.expanded" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 5.15c0-.83.67-1.5 1.5-1.5h2.9l1.08 1.22h6.98c.83 0 1.5.67 1.5 1.5v.48H2Z" fill="#d9a441" />
          <path d="M1.7 6.1h14.6l-1.12 5.62a1.5 1.5 0 0 1-1.47 1.2H3.64a1.5 1.5 0 0 1-1.47-1.2Z" fill="#e4b663" />
          <path d="M2.9 7.15h10.25" stroke="rgba(120,78,17,0.22)" stroke-width="0.8" stroke-linecap="round" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2.05 4.85c0-.83.67-1.5 1.5-1.5h2.82l1.1 1.25h6.98c.83 0 1.5.67 1.5 1.5v.72H2.05Z" fill="#d5a14b" />
          <path d="M2.05 6.1h13.9v5.85c0 .83-.67 1.5-1.5 1.5H3.55c-.83 0-1.5-.67-1.5-1.5Z" fill="#e0b35b" />
          <path d="M2.05 6.1h13.9" stroke="rgba(120,78,17,0.2)" stroke-width="0.8" />
        </svg>
      </span>
      <span v-else class="icon icon-file" aria-hidden="true">
        <FileIcon :filename="node.name" :size="18" />
      </span>
      <span class="name">{{ node.name }}</span>
    </div>
    <div v-if="node.expanded && node.children">
      <FileNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :active-path="activePath"
        :selected-path="selectedPath"
        @open-file="$emit('open-file', $event)"
        @context-menu="$emit('context-menu', $event)"
        @select-node="$emit('select-node', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { useFileStore } from '../stores/file'
import FileIcon from './FileIcon.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  },
  activePath: {
    type: String,
    default: ''
  },
  selectedPath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['open-file', 'context-menu', 'select-node'])

const fileStore = useFileStore()

async function handleClick() {
  emit('select-node', props.node)
  if (props.node.isDirectory) {
    await fileStore.expandFolder(props.node)
  } else {
    emit('open-file', props.node.path)
  }
}

function showContextMenu(event) {
  emit('select-node', props.node)
  emit('context-menu', { event, node: props.node })
}
</script>

<style scoped>
.file-node {
  user-select: none;
}

.node-label {
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 8px;
  cursor: pointer;
  margin: 1px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);
  color: var(--text-main);
  line-height: 1.2;
  gap: 6px;
}

.node-label.active {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.12) 72%, var(--glass-bg));
  color: var(--accent-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.14);
  box-shadow: inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.72);
}

.node-label.selected {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.08) 74%, var(--glass-bg));
  color: var(--text-main);
  border-color: rgba(var(--accent-primary-rgb), 0.12);
  box-shadow: inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.55);
}

.node-label.active.selected {
  box-shadow: inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.75);
}

.twisty {
  width: 12px;
  height: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.twisty.expanded {
  transform: rotate(90deg);
}

.node-label:hover {
  background: var(--interactive-hover-bg);
  color: var(--text-main);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.node-label:active {
  background: rgba(var(--accent-primary-rgb), 0.14);
  color: var(--accent-primary);
}

.icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-muted);
}

.icon-folder.expanded {
  transform: translateY(0.2px);
}

.icon-file :deep(svg) {
  width: 18px;
  height: 18px;
}

.name {
  font-size: 12.5px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-label:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring), inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.5);
}
</style>
