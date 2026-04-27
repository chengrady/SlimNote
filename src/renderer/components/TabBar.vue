<template>
  <div class="tab-bar-container ui-pane" :class="tabDensityClass">
    <!-- Pinned Tabs Row -->
    <div v-if="pinnedTabs.length > 0" class="pinned-tabs-row">
      <span class="pinned-tabs-label">已固定</span>
      <div class="pinned-tabs-list">
        <div
          v-for="tab in pinnedTabs"
          :key="tab.id"
          class="tab pinned"
          :class="{ active: tab.id === editorStore.activeTabId, dirty: tab.isDirty, selected: selectedTabIds.includes(tab.id), dragging: dragState.dragId === tab.id, 'drag-target': dragState.targetId === tab.id && dragState.dragId !== tab.id }"
          @click="handleTabClick($event, tab.id)"
          @contextmenu.prevent="showContextMenu($event, tab.id)"
          draggable="true"
          @dragstart="onTabDragStart(tab.id)"
          @dragover.prevent="onTabDragOver(tab.id)"
          @drop.prevent="onTabDrop(tab.id)"
          @dragend="onTabDragEnd"
        >
          <span class="tab-icon pin-icon" @click.stop="editorStore.togglePin(tab.id)" title="取消固定">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
            </svg>
          </span>
          <span class="tab-title" :title="tab.title">{{ tab.title }}</span>
          <span v-if="tab.isDirty" class="dirty-indicator">●</span>
          <button type="button" class="tab-close" @click.stop="closeTab(tab.id)" aria-label="关闭标签页">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M2 10l8-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Normal Tabs Row -->
    <div class="tab-bar">
      <div ref="tabsRef" class="tabs" :class="{ scrollable: hasTabOverflow }">
        <div
          v-for="tab in unpinnedTabs"
          :key="tab.id"
          class="tab"
          :class="{ active: tab.id === editorStore.activeTabId, dirty: tab.isDirty, selected: selectedTabIds.includes(tab.id), dragging: dragState.dragId === tab.id, 'drag-target': dragState.targetId === tab.id && dragState.dragId !== tab.id }"
          @click="handleTabClick($event, tab.id)"
          @contextmenu.prevent="showContextMenu($event, tab.id)"
          draggable="true"
          @dragstart="onTabDragStart(tab.id)"
          @dragover.prevent="onTabDragOver(tab.id)"
          @drop.prevent="onTabDrop(tab.id)"
          @dragend="onTabDragEnd"
        >
          <FileIcon :filename="tab.title" :size="19" class="tab-icon-component" />
          <span class="tab-title" :title="tab.title">{{ tab.title }}</span>
          <span v-if="tab.isDirty" class="dirty-indicator">●</span>
          <button type="button" class="tab-close" @click.stop="closeTab(tab.id)" aria-label="关闭标签页">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M2 10l8-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <div class="tab-actions">
        <div v-if="selectedTabIds.length > 1" class="batch-actions">
          <span class="batch-count">已选 {{ selectedTabIds.length }} 项</span>
          <button v-if="dirtySelectedCount > 0" type="button" class="ui-icon-btn" @click="saveSelectedTabs" :title="`保存选中的 ${dirtySelectedCount} 个标签页`" aria-label="保存选中标签页">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 3h11l3 3v15H5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 3v6h8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
          </button>
          <button v-if="hasUnpinnedSelection" type="button" class="ui-icon-btn" @click="pinSelectedTabs" title="固定选中标签页" aria-label="固定选中标签页">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
          </button>
          <button v-if="hasPinnedSelection" type="button" class="ui-icon-btn" @click="unpinSelectedTabs" title="取消固定选中标签页" aria-label="取消固定选中标签页">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 2h10v2h-1v8l2 2v2h-5.2v6h-1.6v-6H6v-2l2-2V4H7V2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          <button type="button" class="ui-icon-btn" @click="closeSelectedTabs" title="关闭选中标签页" aria-label="关闭选中标签页">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M8 10v7M12 10v7M16 10v7M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="ui-icon-btn" @click="clearSelectedTabs" title="取消选择" aria-label="取消选择">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <button type="button" class="ui-icon-btn" @click="newTab" title="新建标签页" aria-label="新建标签页">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="context-menu ui-context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <div class="menu-item ui-menu-item" @click="handleAction('closeCurrent')">关闭当前标签</div>
        <div class="menu-item ui-menu-item" @click="handleAction('closeOthers')">关闭其他</div>
        <div class="menu-item ui-menu-item" @click="handleAction('closeAll')">关闭所有</div>
        <div class="menu-item ui-menu-item" @click="handleAction('closeRight')">关闭右侧</div>
        <div class="menu-separator ui-menu-separator"></div>
        <div class="menu-item ui-menu-item" @click="handleAction('openPinWindow')">在悬浮窗口打开</div>
        <div class="menu-separator ui-menu-separator"></div>
        <div class="menu-item ui-menu-item" @click="handleAction('togglePin')">
          {{ pinMenuLabel }}
        </div>
        <div v-if="selectedTabIds.length > 1" class="menu-item ui-menu-item" @click="handleAction('togglePinSelected')">
          {{ selectedPinMenuLabel }}
        </div>
        <div v-if="dirtySelectedCount > 0" class="menu-item ui-menu-item" @click="handleAction('saveSelected')">
          保存选中项
        </div>
      </div>
    </Teleport>

    <ModalDialog
      :show="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      @close="handleConfirmClose"
      @confirm="handleConfirmAccept"
    >
      <template #footer>
        <button type="button" class="modal-btn" @click="handleConfirmClose">{{ t('common.cancel') }}</button>
        <button type="button" class="modal-btn primary" @click="handleConfirmAccept">{{ t('common.confirm') }}</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '../stores/editor'
import { useSettingsStore } from '../stores/settings'
import { RENDERER_EVENTS, emitRendererEvent } from '../utils/rendererEvents'
import FileIcon from './FileIcon.vue'
import ModalDialog from './ModalDialog.vue'

const { t } = useI18n()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetId: null
})
const contextMenuRef = ref(null)
const tabsRef = ref(null)
const hasTabOverflow = ref(false)
let tabsResizeObserver = null
const CONTEXT_MENU_MARGIN = 8
const tabDensityClass = computed(() => `density-${settingsStore.settings.tabDensity || 'comfortable'}`)
const dragState = ref({ dragId: null, targetId: null })
const selectedTabIds = ref([])
const lastSelectedTabId = ref(null)
const confirmDialog = ref({ visible: false, title: '', message: '' })
let confirmAction = null

const pinnedTabs = computed(() => editorStore.tabs.filter(t => t.pinned))
const unpinnedTabs = computed(() => editorStore.tabs.filter(t => !t.pinned))
const visibleTabIds = computed(() => [...pinnedTabs.value, ...unpinnedTabs.value].map(tab => tab.id))
const selectedTabs = computed(() => editorStore.tabs.filter(tab => selectedTabIds.value.includes(tab.id)))
const hasPinnedSelection = computed(() => selectedTabs.value.some(tab => tab.pinned))
const hasUnpinnedSelection = computed(() => selectedTabs.value.some(tab => !tab.pinned))
const dirtySelectedCount = computed(() => selectedTabs.value.filter(tab => tab.isDirty).length)

const isTargetPinned = computed(() => {
  const tab = editorStore.tabs.find(t => t.id === contextMenu.value.targetId)
  return tab ? tab.pinned : false
})

const pinMenuLabel = computed(() => {
  if (selectedTabIds.value.length > 1 && selectedTabIds.value.includes(contextMenu.value.targetId)) {
    if (hasPinnedSelection.value && hasUnpinnedSelection.value) {
      return '切换当前标签固定状态'
    }
  }

  return isTargetPinned.value ? '取消固定' : '固定'
})

const selectedPinMenuLabel = computed(() => {
  if (hasPinnedSelection.value && hasUnpinnedSelection.value) {
    return '固定未固定项'
  }

  return hasPinnedSelection.value ? '取消固定选中项' : '固定选中项'
})

function openConfirmDialog({ title, message, onConfirm }) {
  confirmDialog.value = { visible: true, title, message }
  confirmAction = onConfirm
}

function handleConfirmClose() {
  confirmDialog.value = { visible: false, title: '', message: '' }
  confirmAction = null
}

function handleConfirmAccept() {
  const action = confirmAction
  handleConfirmClose()
  action?.()
}

function showContextMenu(event, tabId) {
  if (!selectedTabIds.value.includes(tabId)) {
    selectedTabIds.value = [tabId]
    lastSelectedTabId.value = tabId
  }

  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    targetId: tabId
  }

  nextTick(() => adjustContextMenuPosition(event.clientX, event.clientY))
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
  contextMenu.value.visible = false
}

function handleAction(action) {
  const tabId = contextMenu.value.targetId
  if (!tabId) return

  switch (action) {
    case 'closeCurrent':
      closeTab(tabId)
      break
    case 'closeOthers':
      editorStore.closeOtherTabs(tabId)
      break
    case 'closeAll':
      editorStore.closeAllTabs()
      break
    case 'closeRight':
      editorStore.closeTabsToRight(tabId)
      break
    case 'openPinWindow': {
      const tab = editorStore.tabs.find(t => t.id === tabId)
      if (tab) {
        window.electronAPI.createPinWindow(tab.content, settingsStore.settings.theme, tab.language)
      }
      break
    }
    case 'togglePin':
      editorStore.togglePin(tabId)
      break
    case 'togglePinSelected':
      if (hasUnpinnedSelection.value) {
        editorStore.setTabsPinned(selectedTabIds.value, true)
      } else if (hasPinnedSelection.value) {
        editorStore.setTabsPinned(selectedTabIds.value, false)
      }
      break
    case 'saveSelected':
      saveSelectedTabs()
      break
  }

  closeContextMenu()
}

function newTab() {
  editorStore.createTab()
}

function closeTab(tabId) {
  const tab = editorStore.tabs.find(t => t.id === tabId)
  if (tab?.isDirty) {
    openConfirmDialog({
      title: t('tabBar.unsavedCloseTitle'),
      message: t('tabBar.unsavedCloseMessage', { title: tab.title }),
      onConfirm: () => {
        editorStore.closeTab(tabId)
        selectedTabIds.value = selectedTabIds.value.filter(id => id !== tabId)
      }
    })
    return
  }

  editorStore.closeTab(tabId)
  selectedTabIds.value = selectedTabIds.value.filter(id => id !== tabId)
}

function handleTabClick(event, tabId) {
  const isToggleSelection = event.ctrlKey || event.metaKey
  const isRangeSelection = event.shiftKey && lastSelectedTabId.value

  if (isRangeSelection) {
    const ids = visibleTabIds.value
    const start = ids.indexOf(lastSelectedTabId.value)
    const end = ids.indexOf(tabId)
    if (start !== -1 && end !== -1) {
      const [from, to] = start < end ? [start, end] : [end, start]
      const rangeIds = ids.slice(from, to + 1)
      selectedTabIds.value = Array.from(new Set([...selectedTabIds.value, ...rangeIds]))
    }
  } else if (isToggleSelection) {
    selectedTabIds.value = selectedTabIds.value.includes(tabId)
      ? selectedTabIds.value.filter(id => id !== tabId)
      : [...selectedTabIds.value, tabId]
  } else {
    selectedTabIds.value = [tabId]
  }

  lastSelectedTabId.value = tabId
  editorStore.setActiveTab(tabId)
}

function clearSelectedTabs() {
  selectedTabIds.value = []
  lastSelectedTabId.value = null
}

function closeSelectedTabs() {
  const ids = selectedTabIds.value.length > 0 ? selectedTabIds.value : []
  if (ids.length === 0) return

  const dirtyTabs = editorStore.tabs.filter(tab => ids.includes(tab.id) && tab.isDirty)
  if (dirtyTabs.length > 0) {
    openConfirmDialog({
      title: t('tabBar.unsavedBatchCloseTitle'),
      message: t('tabBar.unsavedBatchCloseMessage', { count: dirtyTabs.length }),
      onConfirm: () => {
        editorStore.closeTabs(ids)
        clearSelectedTabs()
      }
    })
    return
  }

  editorStore.closeTabs(ids)
  clearSelectedTabs()
}

function pinSelectedTabs() {
  if (!hasUnpinnedSelection.value) return
  editorStore.setTabsPinned(selectedTabIds.value, true)
}

function unpinSelectedTabs() {
  if (!hasPinnedSelection.value) return
  editorStore.setTabsPinned(selectedTabIds.value, false)
}

function saveSelectedTabs() {
  const dirtyIds = selectedTabs.value.filter(tab => tab.isDirty).map(tab => tab.id)
  if (dirtyIds.length === 0) return
  emitRendererEvent(RENDERER_EVENTS.SAVE_TABS, { tabIds: dirtyIds })
}

function onTabDragStart(tabId) {
  dragState.value = { dragId: tabId, targetId: null }
}

function onTabDragOver(tabId) {
  if (!dragState.value.dragId || dragState.value.dragId === tabId) return
  dragState.value = { ...dragState.value, targetId: tabId }
}

function onTabDrop(tabId) {
  if (!dragState.value.dragId || dragState.value.dragId === tabId) {
    onTabDragEnd()
    return
  }

  editorStore.moveTab(dragState.value.dragId, tabId)
  onTabDragEnd()
}

function onTabDragEnd() {
  dragState.value = { dragId: null, targetId: null }
}

function updateTabOverflow() {
  if (!tabsRef.value) {
    hasTabOverflow.value = false
    return
  }

  hasTabOverflow.value = tabsRef.value.scrollHeight > tabsRef.value.clientHeight + 1
}

watch([() => unpinnedTabs.value.length, () => pinnedTabs.value.length], () => {
  nextTick(updateTabOverflow)
})

watch(() => editorStore.tabs.map(tab => tab.id), (ids) => {
  selectedTabIds.value = selectedTabIds.value.filter(id => ids.includes(id))
  if (lastSelectedTabId.value && !ids.includes(lastSelectedTabId.value)) {
    lastSelectedTabId.value = selectedTabIds.value.at(-1) || null
  }
})

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  tabsResizeObserver = new ResizeObserver(() => {
    updateTabOverflow()
  })
  if (tabsRef.value) {
    tabsResizeObserver.observe(tabsRef.value)
  }
  window.addEventListener('resize', updateTabOverflow)
  nextTick(updateTabOverflow)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  if (tabsResizeObserver) {
    tabsResizeObserver.disconnect()
    tabsResizeObserver = null
  }
  window.removeEventListener('resize', updateTabOverflow)
})
</script>
<style scoped>
.tab-bar-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.pinned-tabs-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 8px;
  min-width: 0;
  background: color-mix(in srgb, var(--bg-secondary) 82%, rgba(var(--accent-primary-rgb), 0.03));
  border-bottom: 1px solid var(--glass-border);
}

.pinned-tabs-label {
  flex-shrink: 0;
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.pinned-tabs-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  min-width: 0;
}

.tab-bar {
  display: flex;
  align-items: center;
  padding: 4px 8px; /* Extremely minimal inner padding */
  margin-top: 0;
  margin-bottom: 0; /* Rely on MainEditor.vue's gap: 8px to space out from editor */
  gap: 8px;
  position: relative;
  background: transparent;
  border-bottom: none;
  z-index: 10;
}

.tabs {
  display: flex;
  flex-wrap: nowrap; /* Prevent wrap to match VS Code sliding tabs */
  align-items: center; /* Pill style */
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  gap: var(--space-1);
  padding-right: var(--space-4); /* Add some right padding so the last tab doesn't hit the wall */
  padding-bottom: 2px; /* Small breathing room for scrollbar */
  margin-bottom: 0; /* Remove negative shift */
  z-index: 2;
}

.tabs::-webkit-scrollbar {
  height: 4px;
}

.tabs::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

.tabs:hover::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
}

.tabs:hover::-webkit-scrollbar {
  height: 6px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 4px; /* Reduced gap between icon and text */
  padding: 0 8px 0 8px; /* Reduced side padding */
  height: 30px; /* Slight height tweak for pill */
  background: transparent; /* Clean invisible background */
  border: 1px solid transparent;
  border-radius: 6px; /* Fully rounded elegant pill */
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all var(--transition-fast) ease-out;
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  width: fit-content;
  max-width: 220px;
  min-width: 0;
  flex: 0 1 auto;
  position: relative;
}

.tab-bar-container.density-compact .tab {
  height: 26px;
  font-size: var(--ui-font-size-xs);
  gap: 3px;
  padding: 0 6px 0 6px;
  max-width: 180px;
}

.tab-bar-container.density-compact .tabs {
  /* Dynamic height container */
}

.tab.pinned {
  min-width: 0;
  background: rgba(var(--accent-primary-rgb), 0.05); /* Subtle pin hint */
}

.tab:hover {
  background: var(--btn-bg); /* Soft button hover */
  color: var(--text-interactive-hover, var(--text-main));
}

.tab.active {
  background: var(--bg-primary);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 30%, var(--glass-border));
  color: var(--accent-primary);
  font-weight: var(--ui-font-weight-semibold);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02); /* Very faint shadow */
  z-index: 2;
}

.tab.active .tab-title {
  color: var(--accent-primary);
}

.tab.selected:not(.active) {
  background: color-mix(in srgb, var(--interactive-selected-bg-strong, var(--interactive-selected-bg)) 88%, var(--btn-bg));
  border-color: var(--interactive-selected-border);
  color: var(--text-main);
  box-shadow: var(--interactive-hover-ring), inset 0 1px 0 rgba(var(--accent-primary-rgb), 0.08);
}

.tab:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring), inset 0 1px 0 rgba(var(--accent-primary-rgb), 0.12);
}

.tab.dragging {
  opacity: 0.55;
}

.tab.drag-target {
  border-color: var(--accent-primary);
  box-shadow: var(--interactive-drag-shadow);
}

.tab-icon {
  margin-right: 2px;
  font-size: 12px; /* Smaller icon */
  display: flex;
  align-items: center;
}

.tab-icon-component {
  margin-right: -2px; /* Pull the title closer to the icon since the icon box has its own transparent padding in SVG */
  opacity: 0.96;
  transform: translateY(0.2px);
  flex-shrink: 0;
}

.pin-icon {
  cursor: pointer;
  color: var(--text-muted);
  opacity: 0.76;
  width: var(--icon-button-size-sm);
  height: var(--icon-button-size-sm);
  border-radius: var(--icon-button-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}

.pin-icon:hover {
  color: var(--icon-button-hover-color);
  background: var(--icon-button-hover-bg);
  opacity: 1;
  box-shadow: var(--interactive-hover-ring);
}

.tab:hover .pin-icon,
.tab.selected .pin-icon,
.tab:focus-visible .pin-icon {
  opacity: 1;
  color: var(--text-main);
}

.tab.active .pin-icon {
  color: var(--text-interactive-active, var(--accent-primary));
  opacity: 1;
}

.tab-title {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dirty-indicator {
  color: var(--color-text-secondary);
  font-size: 16px; /* Smaller dot */
  line-height: 1;
  width: 8px;
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab.active .dirty-indicator {
  color: var(--color-text);
}

.tab.selected .dirty-indicator {
  color: var(--text-main);
}

.tab-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  border-radius: var(--icon-button-radius);
  width: 0;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  transition: var(--transition-fast);
}

.tab:hover .tab-close {
  width: 20px;
  margin-left: 2px;
  opacity: 1;
  pointer-events: auto;
}

.tab.active .tab-close {
  color: var(--text-main);
}

.tab-close:hover {
  background-color: var(--danger-soft-bg);
  color: var(--danger-soft-color);
  box-shadow: var(--interactive-hover-ring);
}

.tab-close:focus-visible,
.pin-icon:focus-visible,
.menu-item:focus-visible {
  outline: none;
  border-radius: var(--icon-button-radius);
  box-shadow: var(--field-focus-ring);
}

.tab-actions {
  padding: 0;
  display: flex;
  align-items: center;
  align-self: center;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  right: 0;
  z-index: 2;
  min-height: var(--toolbar-button-height);
  padding-left: 4px;
  background: transparent;
  border-radius: var(--toolbar-button-radius);
  border: none;
  gap: var(--space-2);
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--toolbar-button-height);
  padding: 0 8px 0 6px;
  border-radius: var(--toolbar-button-radius);
  background: color-mix(in srgb, var(--bg-secondary) 82%, rgba(var(--accent-primary-rgb), 0.05));
  border: 1px solid color-mix(in srgb, var(--glass-border) 84%, rgba(var(--accent-primary-rgb), 0.12));
  box-shadow: var(--panel-inner-shadow);
}

.batch-count {
  font-size: var(--ui-font-size-xs);
  color: var(--text-interactive-active, var(--accent-primary));
  font-weight: var(--ui-font-weight-semibold);
  white-space: nowrap;
}

.tab-actions button {
  font-size: 14px;
  border-radius: var(--toolbar-button-radius);
}

/* Context Menu */
.context-menu {
  min-width: 120px;
}

.menu-item {
  transition: background 0.1s;
}
</style>
