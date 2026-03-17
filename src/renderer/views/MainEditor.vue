<template>
  <div class="window-container">
    <TitleBar @open-settings="showSettingsDialog = true" />
    <div class="main-editor" :class="{ resizing: isResizing, 'sidebar-collapsed': isSidebarCollapsed }">
      <div
        v-if="isResizing && !isSidebarCollapsed"
        class="sidebar-collapse-guide"
        :class="{ active: isNearAutoCollapseThreshold }"
        :style="autoCollapseGuideStyle"
        aria-hidden="true"
      >
        <span class="sidebar-collapse-guide-label">拖到这里会自动折叠</span>
      </div>
      <div class="sidebar" :class="{ collapsed: isSidebarCollapsed }" :style="sidebarStyle">
        <WorkspaceSidebar :collapsed="isSidebarCollapsed" @toggle-collapse="toggleSidebar" />
      </div>
      <div v-if="!isSidebarCollapsed" class="resizer" @mousedown="startResize"></div>
      <div class="editor-area" :class="{ 'no-tabs': !hasTabs }">
        <TabBar v-if="hasTabs" />
        <EditorPanel />
      </div>
    </div>
    <StatusBar />
    
    <ModalDialog 
      :show="showErrorDialog" 
      title="无法打开文件" 
      :message="errorMessage"
      @close="showErrorDialog = false"
      @confirm="showErrorDialog = false"
    />

    <SettingsDialog 
      :show="showSettingsDialog"
      @close="showSettingsDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import TitleBar from '../components/TitleBar.vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import TabBar from '../components/TabBar.vue'
import EditorPanel from '../components/EditorPanel.vue'
import StatusBar from '../components/StatusBar.vue'
import ModalDialog from '../components/ModalDialog.vue'
import SettingsDialog from '../components/SettingsDialog.vue'
import { useEditorStore } from '../stores/editor'
import { useFileStore } from '../stores/file'
import { useSettingsStore } from '../stores/settings'

const editorStore = useEditorStore()
const fileStore = useFileStore()
const settingsStore = useSettingsStore()

const SIDEBAR_MIN_WIDTH = 220
const SIDEBAR_MAX_WIDTH = 420
const SIDEBAR_AUTO_COLLAPSE_THRESHOLD = 176

const sidebarWidth = ref(settingsStore.settings.sidebarWidth || 250)
const lastExpandedSidebarWidth = ref(settingsStore.settings.sidebarWidth || 250)
const isResizing = ref(false)
const resizePointerX = ref(0)
const showErrorDialog = ref(false)
const showSettingsDialog = ref(false)
const errorMessage = ref('')
const cleanups = []

const isSidebarCollapsed = computed(() => settingsStore.settings.sidebarCollapsed)
const hasTabs = computed(() => editorStore.tabs.length > 0)
const sidebarStyle = computed(() => ({
  width: isSidebarCollapsed.value ? '56px' : `${sidebarWidth.value}px`
}))
const autoCollapseGuideStyle = computed(() => ({
  left: `${SIDEBAR_AUTO_COLLAPSE_THRESHOLD}px`
}))
const isNearAutoCollapseThreshold = computed(() => {
  if (!isResizing.value) return false
  return resizePointerX.value <= SIDEBAR_AUTO_COLLAPSE_THRESHOLD + 48
})

const handleOpenFileEvent = (e) => {
  const customEvent = e
  openFile(customEvent.detail)
}

const handleSaveTabsEvent = (e) => {
  const customEvent = e
  saveTabs(customEvent.detail?.tabIds || [])
}

// 窗口大小调整
function startResize(e) {
  if (isSidebarCollapsed.value) return
  isResizing.value = true
  resizePointerX.value = e.clientX
  e.preventDefault()
}

function handleMouseMove(e) {
  if (isResizing.value) {
    resizePointerX.value = e.clientX

    if (e.clientX <= SIDEBAR_AUTO_COLLAPSE_THRESHOLD) {
      collapseSidebar()
      isResizing.value = false
      resizePointerX.value = 0
      return
    }

    const maxWidth = Math.min(420, Math.floor(window.innerWidth * 0.42))
    const nextWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(maxWidth, e.clientX))
    sidebarWidth.value = nextWidth
  }
}

function stopResize() {
  isResizing.value = false
  resizePointerX.value = 0
}

function collapseSidebar() {
  if (!isSidebarCollapsed.value) {
    lastExpandedSidebarWidth.value = sidebarWidth.value
  }

  settingsStore.updateSettings({
    sidebarCollapsed: true,
    sidebarWidth: lastExpandedSidebarWidth.value
  })
}

function expandSidebar() {
  const maxWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.floor(window.innerWidth * 0.42))
  const restoredWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(maxWidth, lastExpandedSidebarWidth.value || sidebarWidth.value || SIDEBAR_MIN_WIDTH))

  sidebarWidth.value = restoredWidth
  settingsStore.updateSettings({
    sidebarCollapsed: false,
    sidebarWidth: restoredWidth
  })
}

function toggleSidebar() {
  if (isSidebarCollapsed.value) {
    expandSidebar()
    return
  }

  collapseSidebar()
}

watch(sidebarWidth, (newWidth) => {
  if (!isSidebarCollapsed.value) {
    lastExpandedSidebarWidth.value = newWidth
    settingsStore.updateSettings({ sidebarWidth: newWidth })
  }
})

watch(() => settingsStore.settings.sidebarWidth, (newWidth) => {
  if (newWidth && newWidth !== sidebarWidth.value) {
    sidebarWidth.value = newWidth
  }

  if (newWidth && !isSidebarCollapsed.value) {
    lastExpandedSidebarWidth.value = newWidth
  }
})

onMounted(() => {
  // 监听菜单事件
  cleanups.push(window.electronAPI.onMenuNewFile(() => {
    editorStore.createTab()
  }))

  cleanups.push(window.electronAPI.onMenuOpenFile(async () => {
    const result = await window.electronAPI.openFileDialog()
    if (!result.canceled && result.filePaths.length > 0) {
      openFile(result.filePaths[0])
    }
  }))

  cleanups.push(window.electronAPI.onMenuOpenFolder(async () => {
    const result = await window.electronAPI.openFolderDialog()
    if (!result.canceled && result.filePaths.length > 0) {
      await fileStore.loadFolder(result.filePaths[0])
    }
  }))

  cleanups.push(window.electronAPI.onMenuSave(() => {
    saveCurrentFile()
  }))

  cleanups.push(window.electronAPI.onMenuSaveAs(() => {
    saveCurrentFileAs()
  }))

  cleanups.push(window.electronAPI.onMenuUndo(() => {
    window.dispatchEvent(new CustomEvent('editor-undo'))
  }))

  cleanups.push(window.electronAPI.onMenuRedo(() => {
    window.dispatchEvent(new CustomEvent('editor-redo'))
  }))

  cleanups.push(window.electronAPI.onMenuOpenSettings(() => {
    showSettingsDialog.value = true
  }))

  cleanups.push(window.electronAPI.onMenuToggleTheme(() => {
    settingsStore.toggleTheme()
  }))

  cleanups.push(window.electronAPI.onAppOpenFile((filePath) => {
    openFile(filePath)
  }))

  window.addEventListener('open-file', handleOpenFileEvent)
  window.addEventListener('save-tabs', handleSaveTabsEvent)

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)

  // 恢复上次打开的目录
  fileStore.loadLastOpenedFolder().catch((error) => {
    console.warn('Failed to restore last folder:', error)
  })

  // 恢复上次打开的文件
  restoreLastSession().then((restored) => {
    if (restored) return
  })

})

onUnmounted(() => {
  cleanups.forEach(cleanup => {
    if (typeof cleanup === 'function') {
      cleanup()
    }
  })
  window.removeEventListener('open-file', handleOpenFileEvent)
  window.removeEventListener('save-tabs', handleSaveTabsEvent)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})

async function restoreLastSession() {
  const session = editorStore.loadSession()
  if (!session?.files?.length) {
    return false
  }

  await Promise.all(session.files.map(file => {
    if (typeof file === 'string') {
      return openFile(file)
    }
    return openFile(file.path, { fontSize: file.fontSize, sqlDialect: file.sqlDialect })
  }))

  if (session.activeFile) {
    const tab = editorStore.findTabByPath(session.activeFile)
    if (tab) {
      editorStore.setActiveTab(tab.id)
    }
  }

  return true
}

// 打开文件
async function openFile(filePath, options = {}) {
  try {
    const filename = filePath.split(/[\\/]/).pop() || 'Untitled'

    // 检查文件类型
    if (!editorStore.isSupportedFile(filename) || editorStore.isBinaryFile(filename)) {
      errorMessage.value = `文件 "${filename}" 似乎是二进制文件或不支持的格式，SlimNote 暂时无法打开。`
      showErrorDialog.value = true
      return
    }

    // 检查是否已打开
    const existingTab = editorStore.findTabByPath(filePath)
    if (existingTab) {
      editorStore.setActiveTab(existingTab.id)
      if (options.fontSize) {
        editorStore.updateTabFontSize(existingTab.id, options.fontSize)
      }
      if (options.sqlDialect) {
        editorStore.updateTabSqlDialect(existingTab.id, options.sqlDialect)
      }
      return
    }

    const result = await window.electronAPI.readFile(filePath)
    
    const tab = editorStore.createTab(filename, filePath, result.content, options.fontSize, { sqlDialect: options.sqlDialect })
    tab.encoding = result.encoding
    
    fileStore.addRecentFile(filePath)
        fileStore.addRecentFolder(filePath.replace(/[\\/][^\\/]+$/, ''))
    window.electronAPI.watchFile(filePath)
  } catch (error) {
    console.error('Failed to open file:', error)
    errorMessage.value = '打开文件失败: ' + error.message
    showErrorDialog.value = true
  }
}

// 保存当前文件
async function saveCurrentFile() {
  const tab = editorStore.getActiveTab()
  if (!tab) return

  await saveTabById(tab.id)
}

async function saveTabById(tabId) {
  const tab = editorStore.tabs.find(item => item.id === tabId)
  if (!tab) return false

  try {
    if (tab.filePath) {
      await window.electronAPI.writeFile(tab.filePath, tab.content, tab.encoding)
      editorStore.saveTab(tab.id)
    } else {
      const result = await window.electronAPI.saveFileDialog(tab.title)
      if (result.canceled || !result.filePath) {
        return false
      }

      await window.electronAPI.writeFile(result.filePath, tab.content, tab.encoding)
      tab.filePath = result.filePath
      tab.title = result.filePath.split(/[\\/]/).pop() || tab.title
      editorStore.saveTab(tab.id)
      fileStore.addRecentFile(result.filePath)
    }
    return true
  } catch (error) {
    console.error('Failed to save file:', error)
    errorMessage.value = '保存文件失败: ' + error.message
    showErrorDialog.value = true
    return false
  }
}

async function saveTabs(tabIds = []) {
  const uniqueIds = Array.from(new Set(tabIds)).filter(Boolean)
  if (uniqueIds.length === 0) return

  for (const tabId of uniqueIds) {
    const shouldContinue = await saveTabById(tabId)
    if (!shouldContinue) {
      break
    }
  }
}

// 另存为
async function saveCurrentFileAs() {
  const tab = editorStore.getActiveTab()
  if (!tab) return

  try {
    const result = await window.electronAPI.saveFileDialog(tab.title)
    if (!result.canceled && result.filePath) {
      await window.electronAPI.writeFile(result.filePath, tab.content, tab.encoding)
      tab.filePath = result.filePath
      tab.title = result.filePath.split(/[\\/]/).pop() || tab.title
      editorStore.saveTab(tab.id)
      fileStore.addRecentFile(result.filePath)
    }
  } catch (error) {
    console.error('Failed to save file:', error)
    errorMessage.value = '保存文件失败: ' + error.message
    showErrorDialog.value = true
  }
}
</script>

<style scoped>
.window-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: transparent;
}

.main-editor {
  display: flex;
  width: 100%;
  flex: 1;
  overflow: hidden;
  padding: var(--panel-gap) var(--panel-gap) 0;
  gap: 0;
  min-height: 0;
  position: relative;
}

.main-editor.resizing {
  cursor: col-resize;
}

.main-editor.sidebar-collapsed {
  gap: 8px;
}

.sidebar-collapse-guide {
  position: fixed;
  top: 44px;
  bottom: 24px;
  width: 0;
  pointer-events: none;
  z-index: 20;
}

.sidebar-collapse-guide::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent 0%, rgba(var(--accent-primary-rgb), 0.42) 10%, rgba(var(--accent-primary-rgb), 0.42) 90%, transparent 100%);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.08);
}

.sidebar-collapse-guide-label {
  position: absolute;
  top: 14px;
  left: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--glass-bg) 86%, rgba(var(--accent-primary-rgb), 0.22));
  border: 1px solid rgba(var(--accent-primary-rgb), 0.22);
  color: var(--text-main);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  box-shadow: var(--interactive-hover-ring);
  transform: translateX(0);
  transition: var(--transition-fast);
}

.sidebar-collapse-guide.active::before {
  background: linear-gradient(180deg, transparent 0%, rgba(var(--accent-primary-rgb), 0.9) 10%, rgba(var(--accent-primary-rgb), 0.9) 90%, transparent 100%);
  box-shadow: 0 0 0 4px rgba(var(--accent-primary-rgb), 0.14);
}

.sidebar-collapse-guide.active .sidebar-collapse-guide-label {
  background: color-mix(in srgb, var(--glass-bg) 78%, rgba(var(--accent-primary-rgb), 0.3));
  border-color: rgba(var(--accent-primary-rgb), 0.34);
  color: var(--accent-primary);
  transform: translateX(6px);
}

.sidebar {
  height: 100%;
  background: transparent;
  overflow: hidden;
  flex-shrink: 0;
  box-sizing: border-box;
  min-width: 220px;
  max-width: 420px;
  transition: width var(--transition-smooth);
}

.sidebar.collapsed {
  min-width: 56px;
  max-width: 56px;
  padding: 0;
}

.resizer {
  width: 12px;
  cursor: col-resize;
  background: transparent;
  transition: var(--transition-fast);
  flex-shrink: 0;
  position: relative;
}

.resizer::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  background: var(--glass-border);
  transition: var(--transition-fast);
}

.resizer::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 30px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: var(--resizer-handle-bg);
  box-shadow: var(--interactive-hover-ring);
  transition: var(--transition-fast);
}

.resizer:hover::before,
.resizer:hover::after,
.main-editor.resizing .resizer::before,
.main-editor.resizing .resizer::after {
  background: var(--resizer-active-bg);
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  gap: var(--panel-gap);
}

.editor-area.no-tabs {
  gap: 0;
}

@media (max-width: 960px) {
  .main-editor {
    padding: var(--space-2) var(--space-2) 0;
  }

  .sidebar-collapse-guide {
    top: 40px;
  }

  .sidebar-collapse-guide-label {
    left: 8px;
    padding: 5px 8px;
    font-size: 10px;
  }

  .resizer {
    width: 8px;
  }
}
</style>
