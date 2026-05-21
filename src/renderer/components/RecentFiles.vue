<template>
  <div class="recent-files-panel" :class="{ collapsed }">
    <div class="panel-header">
      <div class="panel-title-group">
        <span class="panel-title">{{ t('recentFilesPanel.title') }}</span>
        <span v-if="!collapsed" class="panel-subtitle">{{ totalRecentCount > 0 ? t('recentFilesPanel.countSubtitle', { count: totalRecentCount }) : t('recentFilesPanel.quickAccess') }}</span>
      </div>
      <div class="header-actions">
        <button type="button" @click="$emit('toggle-collapse')" :title="collapsed ? t('recentFilesPanel.expandSidebar') : t('recentFilesPanel.collapseSidebar')" :aria-label="collapsed ? t('recentFilesPanel.expandSidebar') : t('recentFilesPanel.collapseSidebar')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline v-if="collapsed" points="9 18 15 12 9 6"/>
            <polyline v-else points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button type="button" @click="openFileDialog" :title="t('recentFilesPanel.openFile')" :aria-label="t('recentFilesPanel.openFile')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button v-if="totalRecentCount > 0 && !collapsed" type="button" @click="clearRecent" :title="t('recentFilesPanel.clearRecent')" :aria-label="t('recentFilesPanel.clearRecent')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="!collapsed" class="search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input v-model="searchTerm" class="ui-field" type="search" :placeholder="t('recentFilesPanel.searchPlaceholder')" :aria-label="t('recentFilesPanel.searchPlaceholder')">
      </div>

      <div v-if="collapsed" class="collapsed-list">
        <button type="button" class="collapsed-open-btn" @click="openFileDialog" :aria-label="t('recentFilesPanel.openFile')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
        </button>
        <div v-for="file in collapsedRecentFiles" :key="file.path" class="collapsed-file" @click="handleOpenFile(file.path)" :title="getFileName(file.path)">
          <FileIcon :filename="file.path" :size="30" class="collapsed-file-icon" />
        </div>
      </div>

      <div v-else-if="totalRecentCount === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
        </div>
        <p>{{ t('recentFilesPanel.empty') }}</p>
        <button type="button" class="btn empty-action" @click="openFileDialog">{{ t('recentFilesPanel.emptyAction') }}</button>
      </div>

      <div v-else-if="filteredEntries.length === 0" class="empty-state search-empty">
        <div class="empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <p>{{ t('recentFilesPanel.noMatch') }}</p>
      </div>

      <div v-else class="grouped-files">
        <div class="file-group">
          <div class="group-title">{{ t('recentFilesPanel.documents') }}</div>
          <div class="file-list">
            <div
              v-for="file in filteredEntries"
              :key="file.path"
              class="recent-file"
              @click="handleOpenFile(file.path)"
              @contextmenu.prevent="showContextMenu($event, file)"
              tabindex="0"
              @keydown.enter="handleOpenFile(file.path)"
              @keydown.space.prevent="handleOpenFile(file.path)"
            >
              <FileIcon :filename="file.path" :size="30" class="recent-file-icon" />
              <div class="file-info">
                <span class="file-name" :title="file.path">{{ getFileName(file.path) }}</span>
                <span class="file-path" :title="file.path">{{ file.path }}</span>
              </div>
              <button type="button" class="remove-btn" @click.stop="removeRecent(file.path)" :title="t('recentFilesPanel.remove')">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="contextMenu.visible" ref="contextMenuRef" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <div class="menu-item" @click="handleContextAction('open')">{{ t('recentFilesPanel.menuOpen') }}</div>
        <div class="menu-item" @click="handleContextAction('remove')">{{ t('recentFilesPanel.remove') }}</div>
        <div class="menu-separator"></div>
        <div class="menu-item" @click="handleContextAction('clearRecent')">{{ t('recentFilesPanel.clearRecent') }}</div>
      </div>
    </Teleport>

    <ModalDialog :show="confirmDialog.visible" :title="confirmDialog.title" :message="confirmDialog.message" @close="closeConfirmDialog" @confirm="confirmDialogAccept">
      <template #footer>
        <button type="button" class="modal-btn" @click="closeConfirmDialog">{{ t('common.cancel') }}</button>
        <button type="button" class="modal-btn primary" @click="confirmDialogAccept">{{ t('common.confirm') }}</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFileStore } from '../stores/file'
import { getPathFileName as getFileName } from '../utils/pathUtils'
import { RENDERER_EVENTS, emitRendererEvent } from '../utils/rendererEvents'
import FileIcon from './FileIcon.vue'
import ModalDialog from './ModalDialog.vue'

const { t } = useI18n()

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-collapse'])

const fileStore = useFileStore()
const searchTerm = ref('')
const contextMenu = ref({ visible: false, x: 0, y: 0, file: null })
const contextMenuRef = ref(null)
const confirmDialog = ref({ visible: false, title: '', message: '' })
let confirmAction = null
const CONTEXT_MENU_MARGIN = 8
const totalRecentCount = computed(() => fileStore.recentFiles.length)
const filteredEntries = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return fileStore.recentFiles
  return fileStore.recentFiles.filter(file => file.path.toLowerCase().includes(keyword))
})
const collapsedRecentFiles = computed(() => fileStore.recentFiles.slice(0, 8))

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
    case 'remove':
      removeRecent(file.path)
      break
    case 'clearRecent':
      clearRecent()
      break
  }

  closeContextMenu()
}

function removeRecent(filePath) {
  fileStore.removeRecentFile(filePath)
}

function openConfirmDialog({ title, message, onConfirm }) {
  confirmDialog.value = { visible: true, title, message }
  confirmAction = onConfirm
}

function closeConfirmDialog() {
  confirmDialog.value = { visible: false, title: '', message: '' }
  confirmAction = null
}

function confirmDialogAccept() {
  const action = confirmAction
  closeConfirmDialog()
  action?.()
}

function clearRecent() {
  openConfirmDialog({
    title: t('recentFilesPanel.clearRecentTitle'),
    message: t('recentFilesPanel.clearRecentMessage'),
    onConfirm: () => fileStore.clearRecentFiles()
  })
}

function handleOpenFile(filePath) {
  emitRendererEvent(RENDERER_EVENTS.OPEN_FILE, filePath)
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
  width: 100%;
  height: 100%;
  background: var(--surface-panel-strong);
  border-right: 1px solid var(--glass-border);
  box-shadow: var(--shadow-subtle);
}

.recent-files-panel.collapsed {
  width: 56px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-toolbar);
}

.panel-title-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-title {
  font-weight: 600;
  color: var(--text-main);
}

.panel-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions button,
.collapsed-open-btn,
.remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--icon-button-radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.header-actions button {
  width: 28px;
  height: 28px;
}

.header-actions button:hover,
.collapsed-open-btn:hover,
.remove-btn:hover {
  color: var(--text-main);
  background: var(--surface-hover);
  box-shadow: var(--interactive-hover-ring);
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.search-box .ui-field {
  flex: 1;
}

.collapsed-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.collapsed-open-btn,
.collapsed-file {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
}

.collapsed-file {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.collapsed-file:hover {
  background: var(--surface-hover);
}

.empty-state {
  padding: 32px 12px;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 10px;
}

.grouped-files,
.file-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-title {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.file-list {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-panel);
  box-shadow: var(--shadow-subtle);
}

.recent-file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--glass-border);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.recent-file:last-child {
  border-bottom: none;
}

.recent-file:hover,
.recent-file:focus-visible {
  background: var(--surface-hover);
  box-shadow: inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.52);
  outline: none;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name,
.file-path {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.file-path {
  color: var(--text-muted);
  font-size: 12px;
}

.remove-btn {
  width: 24px;
  height: 24px;
  opacity: 0;
  transition: var(--transition-interactive);
}

.recent-file:hover .remove-btn,
.recent-file:focus-visible .remove-btn {
  opacity: 1;
}

.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 160px;
  padding: 6px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-popover);
  box-shadow: var(--menu-card-shadow);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: popoverIn var(--transition-popover);
}

.menu-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-main);
  font-size: 13px;
  transition: var(--transition-interactive);
}

.menu-item:hover {
  background: var(--surface-hover);
}

.menu-separator {
  height: 1px;
  margin: 4px 0;
  background: var(--glass-border);
}
</style>
