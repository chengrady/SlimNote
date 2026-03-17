<template>
  <div class="recent-files-panel" :class="{ collapsed }">
    <div class="panel-header">
      <div class="panel-title-group">
        <span class="panel-title">最近打开</span>
        <span v-if="!collapsed" class="panel-subtitle">{{ totalRecentCount > 0 ? `${totalRecentCount} 个文件` : '快速访问文件' }}</span>
      </div>
      <div class="header-actions">
        <button @click="$emit('toggle-collapse')" :title="collapsed ? '展开侧栏' : '收起侧栏'" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline v-if="collapsed" points="9 18 15 12 9 6"/>
            <polyline v-else points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button @click="openFileDialog" title="打开文件" aria-label="打开文件">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button @click="clearRecent" title="清空最近记录" aria-label="清空最近记录" v-if="unpinnedRecentFiles.length > 0 && !collapsed">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
    <div class="panel-content">
      <div v-if="!collapsed" class="search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input v-model="searchTerm" type="search" placeholder="搜索最近文件" aria-label="搜索最近文件">
      </div>
      <div v-if="collapsed" class="collapsed-list">
        <button class="collapsed-open-btn" @click="openFileDialog" aria-label="打开文件">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
        </button>
        <div
          v-for="file in collapsedRecentFiles"
          :key="file.path"
          class="collapsed-file"
          @click="handleOpenFile(file.path)"
          :title="getFileName(file.path)"
        >
          <FileIcon :filename="file.path" :size="30" class="collapsed-file-icon" />
        </div>
      </div>
      <div v-else-if="totalRecentCount === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
        </div>
        <p>暂无最近打开的文件</p>
        <button class="btn empty-action" @click="openFileDialog">打开文件</button>
      </div>
      <div v-else-if="filteredEntries.length === 0" class="empty-state search-empty">
        <div class="empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <p>没有匹配的最近文件</p>
      </div>
      <div v-else class="grouped-files">
        <div v-if="showPinnedGroup" class="file-group">
          <div class="group-title">已固定</div>
          <div
            class="file-list"
            :class="{ 'group-drop-active': recentDrag.dragPath && recentDrag.targetPinned === true && !recentDrag.targetPath }"
            @dragover.prevent="onGroupDragOver(true)"
            @drop.prevent="onGroupDrop(true)"
          >
            <div 
              v-for="file in filteredPinnedFiles" 
              :key="file.path"
              class="recent-file pinned"
              :class="{ dragging: recentDrag.dragPath === file.path, 'drag-target': recentDrag.targetPath === file.path && recentDrag.dragPath !== file.path, 'drag-before': recentDrag.targetPath === file.path && recentDrag.position === 'before', 'drag-after': recentDrag.targetPath === file.path && recentDrag.position === 'after' }"
              @click="handleOpenFile(file.path)"
              @contextmenu.prevent="showContextMenu($event, file)"
              tabindex="0"
              @keydown.enter="handleOpenFile(file.path)"
              @keydown.space.prevent="handleOpenFile(file.path)"
              draggable="true"
              @dragstart="onRecentDragStart(file.path)"
              @dragover.prevent="onRecentDragOver($event, file.path, true)"
              @drop.prevent="onRecentDrop(file.path, true)"
              @dragend="onRecentDragEnd"
            >
              <FileIcon :filename="file.path" :size="30" class="recent-file-icon" />
              <div class="file-info">
                <span class="file-name" :title="file.path">{{ getFileName(file.path) }}</span>
                <span class="file-path" :title="file.path">{{ file.path }}</span>
              </div>
              <button class="pin-btn active" @click.stop="togglePin(file.path)" :title="'取消固定'" aria-label="取消固定">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
              </button>
              <button class="remove-btn" @click.stop="removeRecent(file.path)" title="从列表中移除">×</button>
            </div>
            <div v-if="filteredPinnedFiles.length === 0" class="drop-placeholder">
              拖到这里即可固定到顶部
            </div>
          </div>
        </div>
        <div v-if="showUnpinnedGroup" class="file-group">
          <div class="group-title">最近</div>
          <div
            class="file-list"
            :class="{ 'group-drop-active': recentDrag.dragPath && recentDrag.targetPinned === false && !recentDrag.targetPath }"
            @dragover.prevent="onGroupDragOver(false)"
            @drop.prevent="onGroupDrop(false)"
          >
            <div 
              v-for="file in filteredUnpinnedFiles" 
              :key="file.path"
              class="recent-file"
              :class="{ dragging: recentDrag.dragPath === file.path, 'drag-target': recentDrag.targetPath === file.path && recentDrag.dragPath !== file.path, 'drag-before': recentDrag.targetPath === file.path && recentDrag.position === 'before', 'drag-after': recentDrag.targetPath === file.path && recentDrag.position === 'after' }"
              @click="handleOpenFile(file.path)"
              @contextmenu.prevent="showContextMenu($event, file)"
              tabindex="0"
              @keydown.enter="handleOpenFile(file.path)"
              @keydown.space.prevent="handleOpenFile(file.path)"
              draggable="true"
              @dragstart="onRecentDragStart(file.path)"
              @dragover.prevent="onRecentDragOver($event, file.path, false)"
              @drop.prevent="onRecentDrop(file.path, false)"
              @dragend="onRecentDragEnd"
            >
              <FileIcon :filename="file.path" :size="30" class="recent-file-icon" />
              <div class="file-info">
                <span class="file-name" :title="file.path">{{ getFileName(file.path) }}</span>
                <span class="file-path" :title="file.path">{{ file.path }}</span>
              </div>
              <button class="pin-btn" @click.stop="togglePin(file.path)" title="固定到顶部" aria-label="固定到顶部">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
              </button>
              <button class="remove-btn" @click.stop="removeRecent(file.path)" title="从列表中移除">×</button>
            </div>
            <div v-if="filteredUnpinnedFiles.length === 0" class="drop-placeholder">
              拖到这里即可移回最近列表
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <div class="menu-item" @click="handleContextAction('open')">打开</div>
        <div class="menu-item" @click="handleContextAction('togglePin')">
          {{ contextMenu.file?.pinned ? '取消固定' : '固定到顶部' }}
        </div>
        <div class="menu-item" @click="handleContextAction('remove')">从列表中移除</div>
        <div class="menu-separator"></div>
        <div class="menu-item" @click="handleContextAction('clearUnpinned')">清理未固定记录</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '../stores/file'
import FileIcon from './FileIcon.vue'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-collapse'])

const fileStore = useFileStore()
const searchTerm = ref('')
const recentDrag = ref({ dragPath: null, targetPath: null, targetPinned: null, position: 'before' })
const contextMenu = ref({ visible: false, x: 0, y: 0, file: null })
const contextMenuRef = ref(null)
const CONTEXT_MENU_MARGIN = 8
const totalRecentCount = computed(() => fileStore.recentFiles.length)
const filteredEntries = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return fileStore.recentFiles
  return fileStore.recentFiles.filter(file => file.path.toLowerCase().includes(keyword))
})
const filteredPinnedFiles = computed(() => filteredEntries.value.filter(file => file.pinned))
const filteredUnpinnedFiles = computed(() => filteredEntries.value.filter(file => !file.pinned))
const unpinnedRecentFiles = computed(() => fileStore.recentFiles.filter(file => !file.pinned))
const collapsedRecentFiles = computed(() => fileStore.recentFiles.slice(0, 8))
const showPinnedGroup = computed(() => totalRecentCount.value > 0)
const showUnpinnedGroup = computed(() => totalRecentCount.value > 0)

async function openFileDialog() {
  const result = await window.electronAPI.openFileDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    handleOpenFile(result.filePaths[0])
  }
}

function showContextMenu(event, file) {
  const pointerX = event.clientX
  const pointerY = event.clientY

  contextMenu.value = {
    visible: true,
    x: pointerX,
    y: pointerY,
    file
  }

  nextTick(() => adjustContextMenuPosition(pointerX, pointerY))
}

function adjustContextMenuPosition(pointerX, pointerY) {
  const menuEl = contextMenuRef.value
  if (!menuEl) return

  const rect = menuEl.getBoundingClientRect()
  const maxX = Math.max(CONTEXT_MENU_MARGIN, window.innerWidth - rect.width - CONTEXT_MENU_MARGIN)
  const maxY = Math.max(CONTEXT_MENU_MARGIN, window.innerHeight - rect.height - CONTEXT_MENU_MARGIN)

  contextMenu.value = {
    ...contextMenu.value,
    x: Math.min(pointerX, maxX),
    y: Math.min(pointerY, maxY)
  }
}

function closeContextMenu() {
  contextMenu.value = { visible: false, x: 0, y: 0, file: null }
}

function handleContextAction(action) {
  const file = contextMenu.value.file
  if (!file) return

  switch (action) {
    case 'open':
      handleOpenFile(file.path)
      break
    case 'togglePin':
      togglePin(file.path)
      break
    case 'remove':
      removeRecent(file.path)
      break
    case 'clearUnpinned':
      clearRecent()
      break
  }

  closeContextMenu()
}

function removeRecent(file) {
  fileStore.removeRecentFile(file)
}

function togglePin(filePath) {
  fileStore.toggleRecentPin(filePath)
}

function onRecentDragStart(filePath) {
  recentDrag.value = { dragPath: filePath, targetPath: null, targetPinned: null, position: 'before' }
}

function onRecentDragOver(event, filePath, targetPinned) {
  if (!recentDrag.value.dragPath || recentDrag.value.dragPath === filePath) return
  const rect = event.currentTarget.getBoundingClientRect()
  const offset = event.clientY - rect.top
  const position = offset > rect.height / 2 ? 'after' : 'before'
  recentDrag.value = { ...recentDrag.value, targetPath: filePath, targetPinned, position }
}

function onRecentDrop(filePath, targetPinned) {
  if (!recentDrag.value.dragPath || recentDrag.value.dragPath === filePath) {
    onRecentDragEnd()
    return
  }

  fileStore.moveRecentFile(recentDrag.value.dragPath, filePath, targetPinned, recentDrag.value.position)
  onRecentDragEnd()
}

function onGroupDragOver(targetPinned) {
  if (!recentDrag.value.dragPath) return
  recentDrag.value = { ...recentDrag.value, targetPath: null, targetPinned, position: 'before' }
}

function onGroupDrop(targetPinned) {
  if (!recentDrag.value.dragPath) return
  fileStore.moveRecentFile(recentDrag.value.dragPath, null, targetPinned)
  onRecentDragEnd()
}

function onRecentDragEnd() {
  recentDrag.value = { dragPath: null, targetPath: null, targetPinned: null, position: 'before' }
}

function clearRecent() {
  if (confirm('确定要清空未固定的最近文件记录吗？')) {
    fileStore.clearRecentFiles()
  }
}

function handleOpenFile(filePath) {
  window.dispatchEvent(new CustomEvent('open-file', { detail: filePath }))
}

function getFileName(path) {
  return path.split(/[\\/]/).pop() || path
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  window.addEventListener('resize', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  window.removeEventListener('resize', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
})
</script>

<style scoped>
.recent-files-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--glass-border);
  font-size: 13px;
  margin: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--panel-card-shadow);
}

.recent-files-panel.collapsed {
  margin: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: var(--panel-header-height);
  padding: var(--panel-header-padding-y) calc(var(--panel-header-padding-x) + 4px);
  gap: var(--space-3);
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 90%, rgba(var(--accent-primary-rgb), 0.06));
}

.recent-files-panel.collapsed .panel-header {
  padding: var(--panel-header-padding-y) 8px;
  flex-direction: column;
  justify-content: flex-start;
}

.panel-title-group {
  display: flex;
  flex-direction: column;
  gap: var(--panel-title-gap);
  align-items: flex-start;
  min-width: 0;
}

.recent-files-panel.collapsed .panel-title-group {
  display: none;
}

.panel-title {
  font-weight: var(--ui-font-weight-bold);
  font-size: var(--ui-font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: var(--panel-title-line-height);
  color: var(--accent-primary);
}

.panel-subtitle {
  font-size: var(--ui-font-size-xs);
  color: var(--text-muted);
  line-height: var(--panel-subtitle-line-height);
}

.header-actions {
  display: flex;
  gap: 6px;
}

.recent-files-panel.collapsed .header-actions {
  flex-direction: column;
  width: 100%;
}

.header-actions button {
  width: var(--icon-button-size-md);
  height: var(--icon-button-size-md);
  background: var(--icon-button-bg);
  border: 1px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-fast);
  padding: 0;
  border-radius: var(--icon-button-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header-actions button:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.header-actions button:focus-visible,
.collapsed-open-btn:focus-visible,
.collapsed-file:focus-visible,
.menu-item:focus-visible,
.pin-btn:focus-visible,
.remove-btn:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.grouped-files {
  display: flex;
  flex-direction: column;
}

.file-group {
  display: flex;
  flex-direction: column;
}

.file-list.group-drop-active {
  background: rgba(var(--accent-primary-rgb), 0.05);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.2);
}

.drop-placeholder {
  padding: 12px 16px 14px;
  color: var(--text-muted);
  font-size: 12px;
  border-bottom: 1px dashed var(--glass-border);
}

.context-menu {
  position: fixed;
  background: color-mix(in srgb, var(--glass-bg) 92%, var(--bg-deep));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--menu-card-shadow);
  padding: 4px 0;
  min-width: 144px;
  z-index: 5000;
  backdrop-filter: blur(10px);
}

.menu-item {
  min-height: var(--menu-item-min-height);
  padding: var(--menu-item-padding-y) var(--menu-item-padding-x);
  display: flex;
  align-items: center;
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  color: var(--text-main);
  cursor: pointer;
  transition: background 0.1s;
}

.menu-item:hover {
  background: var(--interactive-hover-bg);
  color: var(--accent-primary);
}

.menu-separator {
  height: 1px;
  background: var(--glass-border);
  margin: 4px 0;
}

.group-title {
  padding: 10px 16px 8px;
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-bold);
  line-height: var(--panel-title-line-height);
  color: var(--accent-primary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 8px;
  color: var(--text-muted);
}

.search-box input {
  flex: 1;
  min-width: 0;
  height: var(--field-height-md);
  padding: 0 var(--field-padding-x);
  border: 1px solid var(--glass-border);
  border-radius: var(--field-radius);
  background: var(--input-bg);
  color: var(--text-main);
  font-size: var(--field-font-size);
  transition: var(--transition-fast);
}

.search-box input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.collapsed-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 8px;
}

.collapsed-open-btn,
.collapsed-file {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: rgba(var(--accent-primary-rgb), 0.05);
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-fast);
}

.collapsed-open-btn:hover,
.collapsed-file:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.empty-state {
  padding: var(--empty-state-padding) 20px;
  text-align: center;
  color: var(--text-muted);
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--empty-state-gap);
}

.search-empty {
  min-height: 180px;
}

.empty-icon {
  width: var(--empty-state-icon-size);
  height: var(--empty-state-icon-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--accent-primary);
}

.empty-state p {
  font-size: var(--empty-state-title-size);
  line-height: var(--panel-title-line-height);
  color: var(--text-main);
}

.empty-action {
  margin-top: var(--space-1);
}

.recent-file {
  padding: 10px 12px 10px 14px;
  min-height: 52px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-main);
  transition: var(--transition-fast);
  border-bottom: 1px solid var(--glass-border);
  position: relative;
}

.recent-file.pinned {
  background: rgba(var(--accent-primary-rgb), 0.04);
}

.recent-file.active {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.12) 76%, var(--glass-bg));
  box-shadow: inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.72);
}

.recent-file.dragging {
  opacity: 0.58;
}

.recent-file.drag-target {
  border-color: var(--accent-primary);
  box-shadow: var(--interactive-drag-shadow);
}

.recent-file.drag-before::before,
.recent-file.drag-after::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 12px;
  height: 2px;
  border-radius: 999px;
  background: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.12);
}

.recent-file.drag-before::before {
  top: -1px;
}

.recent-file.drag-after::after {
  bottom: -1px;
}

.recent-file:hover {
  background: var(--interactive-hover-bg);
  box-shadow: var(--interactive-hover-ring);
}

.recent-file.active:hover {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.14) 76%, var(--glass-bg));
}

.recent-file:focus-visible {
  outline: none;
  background: var(--interactive-selected-bg);
  box-shadow: var(--field-focus-ring), inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.52);
}

.recent-file-icon,
.collapsed-file-icon {
  opacity: 0.92;
}

.recent-file-icon {
  margin-left: -1px;
  margin-right: 2px;
}

.collapsed-file-icon {
  justify-content: center;
}

.file-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pin-btn {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: var(--icon-button-size-sm);
  height: var(--icon-button-size-sm);
  border-radius: var(--icon-button-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}

.pin-btn.active,
.recent-file:hover .pin-btn,
.recent-file:focus-visible .pin-btn {
  opacity: 1;
}

.pin-btn:hover {
  color: var(--icon-button-hover-color);
  background: var(--icon-button-hover-bg);
  box-shadow: var(--interactive-hover-ring);
}

.file-name {
  font-weight: var(--ui-font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-file.active .file-name {
  color: var(--accent-primary);
}

.file-path {
  font-size: var(--ui-font-size-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
}

.remove-btn {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 18px;
  width: var(--icon-button-size-sm);
  height: var(--icon-button-size-sm);
  padding: 0;
  line-height: 1;
  border-radius: var(--icon-button-radius);
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.recent-file:hover .remove-btn,
.recent-file:focus-visible .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: var(--danger-soft-color);
  background: var(--danger-soft-bg);
  box-shadow: var(--interactive-hover-ring);
}
</style>
