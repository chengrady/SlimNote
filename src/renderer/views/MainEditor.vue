<template>
  <div class="window-container">
    <TitleBar
      @open-settings="showSettingsDialog = true"
      @menu-action="handleTitleBarMenuAction"
    />
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

    <ModalDialog
      :show="showUpdateDialog"
      :title="updateDialogTitle"
      :subtitle="updateDialogSubtitle"
      :show-footer="!isCheckingUpdates"
      @close="closeUpdateDialog"
    >
      <template #body>
        <div class="update-dialog-message">{{ updateDialogMessage }}</div>
      </template>
      <template #footer>
        <button v-if="updateDialogActionUrl" type="button" class="modal-btn" @click="closeUpdateDialog">
          {{ updateDialogCloseText }}
        </button>
        <button
          type="button"
          class="modal-btn primary"
          @click="updateDialogActionUrl ? openUpdateActionUrl() : closeUpdateDialog()"
        >
          {{ updateDialogActionUrl ? updateDialogActionText : updateDialogCloseText }}
        </button>
      </template>
    </ModalDialog>

    <SettingsDialog 
      :show="showSettingsDialog"
      @close="showSettingsDialog = false"
    />

    <AboutDialog
      :show="showAboutDialog"
      @close="showAboutDialog = false"
    />

    <GlobalSearchDialog
      :show="showGlobalSearchDialog"
      :root-path="fileStore.rootPath"
      @close="showGlobalSearchDialog = false"
      @open-result="handleOpenSearchResult"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TitleBar from '../components/TitleBar.vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import TabBar from '../components/TabBar.vue'
import EditorPanel from '../components/EditorPanel.vue'
import StatusBar from '../components/StatusBar.vue'
import ModalDialog from '../components/ModalDialog.vue'
import SettingsDialog from '../components/SettingsDialog.vue'
import AboutDialog from '../components/AboutDialog.vue'
import GlobalSearchDialog from '../components/GlobalSearchDialog.vue'
import { useEditorStore } from '../stores/editor'
import { useFileStore } from '../stores/file'
import { useSettingsStore } from '../stores/settings'
import { getFileExtension } from '../utils/fileSupport'
import packageJson from '../../../package.json'

const editorStore = useEditorStore()
const fileStore = useFileStore()
const settingsStore = useSettingsStore()
const { locale } = useI18n()

const SIDEBAR_MIN_WIDTH = 220
const SIDEBAR_MAX_WIDTH = 420
const SIDEBAR_AUTO_COLLAPSE_THRESHOLD = 176
const DEFAULT_SIDEBAR_WIDTH = 280
const RELEASES_PAGE_URL = 'https://github.com/chengrady/SlimNote/releases'
const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/chengrady/SlimNote/releases/latest'
const APP_VERSION = String(packageJson.version || '1.0.0')

const sidebarWidth = ref(settingsStore.settings.sidebarWidth || DEFAULT_SIDEBAR_WIDTH)
const lastExpandedSidebarWidth = ref(settingsStore.settings.sidebarWidth || DEFAULT_SIDEBAR_WIDTH)
const isResizing = ref(false)
const resizePointerX = ref(0)
const showErrorDialog = ref(false)
const showUpdateDialog = ref(false)
const showSettingsDialog = ref(false)
const showAboutDialog = ref(false)
const showGlobalSearchDialog = ref(false)
const errorMessage = ref('')
const isCheckingUpdates = ref(false)
const updateDialogTitle = ref('')
const updateDialogSubtitle = ref('')
const updateDialogMessage = ref('')
const updateDialogActionUrl = ref('')
const updateDialogActionText = ref('')
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
const updateDialogCloseText = computed(() => (
  updateDialogActionUrl.value
    ? localizeText('稍后', 'Later')
    : localizeText('知道了', 'OK')
))

const LANGUAGE_DEFAULT_EXTENSIONS = {
  plaintext: ['txt'],
  markdown: ['md', 'markdown', 'mdx'],
  json: ['json', 'jsonc'],
  javascript: ['js'],
  typescript: ['ts'],
  html: ['html', 'htm'],
  css: ['css'],
  scss: ['scss', 'sass'],
  xml: ['xml'],
  yaml: ['yaml', 'yml'],
  toml: ['toml'],
  ini: ['ini', 'conf', 'config', 'properties'],
  python: ['py'],
  java: ['java'],
  c: ['c'],
  cpp: ['cpp', 'cc', 'cxx', 'h', 'hpp'],
  csharp: ['cs'],
  sql: ['sql'],
  log: ['log'],
  vue: ['vue']
}

function getPreferredExtensionsForTab(tab) {
  const languageExtensions = [...(LANGUAGE_DEFAULT_EXTENSIONS[tab?.language] || [])]
  const titleExtension = getFileExtension(tab?.title || '')

  if (titleExtension) {
    return [titleExtension, ...languageExtensions.filter((ext) => ext !== titleExtension)]
  }

  return languageExtensions.length > 0 ? languageExtensions : ['txt']
}

function buildSaveDialogOptions(tab) {
  const title = String(tab?.title || '').trim() || 'Untitled'
  const preferredExtensions = getPreferredExtensionsForTab(tab)
  const primaryExtension = preferredExtensions[0]
  const hasExtension = Boolean(getFileExtension(title))
  const suggestedFileName = hasExtension || !primaryExtension ? title : `${title}.${primaryExtension}`
  const defaultPath = tab?.filePath || suggestedFileName

  return {
    defaultPath,
    filters: [
      {
        name: `${(tab?.language || 'text').toUpperCase()} Files`,
        extensions: preferredExtensions
      },
      {
        name: 'All Files',
        extensions: ['*']
      }
    ]
  }
}

async function showSaveDialogForTab(tab) {
  return await window.electronAPI.showSaveDialog(buildSaveDialogOptions(tab))
}

const handleOpenFileEvent = (e) => {
  const customEvent = e
  openFile(customEvent.detail)
}

const handleSaveTabsEvent = (e) => {
  const customEvent = e
  saveTabs(customEvent.detail?.tabIds || [])
}

const handleOpenGlobalSearchEvent = () => {
  showGlobalSearchDialog.value = true
}

function dispatchEditorEvent(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined))
}

function localizeText(zhText, enText) {
  return locale.value === 'zh-CN' ? zhText : enText
}

function normalizeVersionTag(version = '') {
  return String(version || '').trim().replace(/^v/i, '')
}

function compareVersions(leftVersion = '', rightVersion = '') {
  const leftParts = normalizeVersionTag(leftVersion).split('.')
  const rightParts = normalizeVersionTag(rightVersion).split('.')
  const maxLength = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = Number.parseInt(leftParts[index] || '0', 10)
    const rightValue = Number.parseInt(rightParts[index] || '0', 10)

    if (leftValue > rightValue) return 1
    if (leftValue < rightValue) return -1
  }

  return 0
}

function formatReleaseDate(value) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  try {
    return new Intl.DateTimeFormat(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(parsed)
  } catch (error) {
    return ''
  }
}

function closeUpdateDialog() {
  showUpdateDialog.value = false
}

function openUpdateActionUrl() {
  if (!updateDialogActionUrl.value) {
    closeUpdateDialog()
    return
  }

  window.electronAPI.openExternal(updateDialogActionUrl.value)
  closeUpdateDialog()
}

async function requestLatestReleaseFromWeb() {
  const response = await fetch(LATEST_RELEASE_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json'
    }
  })

  if (!response.ok) {
    let message = `GitHub API responded with status ${response.status}`

    try {
      const payload = await response.json()
      if (payload?.message) {
        message = payload.message
      }
    } catch (error) {
      // Ignore non-JSON error payloads.
    }

    throw new Error(message)
  }

  return await response.json()
}

async function resolveUpdateInfo() {
  const fallbackCurrentVersion = normalizeVersionTag(APP_VERSION)
  const checkUpdates = window.electronAPI?.checkForUpdates

  if (typeof checkUpdates === 'function') {
    try {
      const result = await checkUpdates()
      if (result?.ok) {
        return result
      }
    } catch (error) {
      console.warn('IPC update check failed, falling back to renderer fetch:', error)
    }
  }

  const release = await requestLatestReleaseFromWeb()
  const latestVersion = normalizeVersionTag(release?.tag_name || release?.name || '')

  if (!latestVersion) {
    throw new Error('Latest release version is missing')
  }

  return {
    ok: true,
    currentVersion: fallbackCurrentVersion,
    latestVersion,
    hasUpdate: compareVersions(latestVersion, fallbackCurrentVersion) > 0,
    releaseName: release?.name || release?.tag_name || latestVersion,
    releaseUrl: release?.html_url || RELEASES_PAGE_URL,
    publishedAt: release?.published_at || ''
  }
}

async function handleCheckForUpdates() {
  if (isCheckingUpdates.value) return

  showUpdateDialog.value = true
  isCheckingUpdates.value = true
  updateDialogTitle.value = localizeText('检查更新', 'Check for Updates')
  updateDialogSubtitle.value = localizeText('正在连接 GitHub Releases...', 'Connecting to GitHub Releases...')
  updateDialogMessage.value = localizeText('正在检查最新版本，请稍候。', 'Checking the latest release. Please wait.')
  updateDialogActionUrl.value = ''
  updateDialogActionText.value = ''

  try {
    const result = await resolveUpdateInfo()
    const currentVersion = result?.currentVersion || '1.0.0'

    if (!result?.ok) {
      updateDialogTitle.value = localizeText('检查更新失败', 'Update Check Failed')
      updateDialogSubtitle.value = localizeText(`当前版本 ${currentVersion}`, `Current version ${currentVersion}`)
      updateDialogMessage.value = localizeText(
        `暂时无法连接 GitHub Releases。\n\n原因：${result?.message || '未知错误'}\n\n你可以稍后重试，或直接打开发布页手动查看。`,
        `SlimNote could not reach GitHub Releases.\n\nReason: ${result?.message || 'Unknown error'}\n\nTry again later, or open the releases page manually.`
      )
      updateDialogActionUrl.value = result?.releaseUrl || RELEASES_PAGE_URL
      updateDialogActionText.value = localizeText('打开 Releases', 'Open Releases')
      return
    }

    if (result.hasUpdate) {
      const publishedAt = formatReleaseDate(result.publishedAt)
      updateDialogTitle.value = localizeText('发现新版本', 'Update Available')
      updateDialogSubtitle.value = localizeText(
        `当前 ${currentVersion} -> 最新 ${result.latestVersion}`,
        `Current ${currentVersion} -> Latest ${result.latestVersion}`
      )
      updateDialogMessage.value = publishedAt
        ? localizeText(
            `已发现新版本 ${result.latestVersion}，发布时间 ${publishedAt}。你可以前往发布页下载最新安装包。`,
            `Version ${result.latestVersion} is available, published on ${publishedAt}. Open the release page to download the latest installer.`
          )
        : localizeText(
            `已发现新版本 ${result.latestVersion}。你可以前往发布页下载最新安装包。`,
            `Version ${result.latestVersion} is available. Open the release page to download the latest installer.`
          )
      updateDialogActionUrl.value = result.releaseUrl || RELEASES_PAGE_URL
      updateDialogActionText.value = localizeText('前往下载', 'Open Download Page')
      return
    }

    updateDialogTitle.value = localizeText('已是最新版本', 'Up to Date')
    updateDialogSubtitle.value = localizeText(`当前版本 ${currentVersion}`, `Current version ${currentVersion}`)
    updateDialogMessage.value = localizeText(
      `当前已安装最新版本 ${result.latestVersion}。`,
      `You're already on the latest version ${result.latestVersion}.`
    )
    updateDialogActionUrl.value = ''
    updateDialogActionText.value = ''
  } catch (error) {
    console.error('Failed to check for updates:', error)
    updateDialogTitle.value = localizeText('检查更新失败', 'Update Check Failed')
    updateDialogSubtitle.value = ''
    updateDialogMessage.value = localizeText(
      `检查更新时出现异常。\n\n原因：${error?.message || '未知错误'}\n\n请稍后重试，或直接打开发布页手动查看。`,
      `An unexpected error occurred while checking for updates.\n\nReason: ${error?.message || 'Unknown error'}\n\nPlease try again later, or open the releases page manually.`
    )
    updateDialogActionUrl.value = RELEASES_PAGE_URL
    updateDialogActionText.value = localizeText('打开 Releases', 'Open Releases')
  } finally {
    isCheckingUpdates.value = false
  }
}

async function openFileFromDialog() {
  const result = await window.electronAPI.openFileDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    await openFile(result.filePaths[0])
  }
}

async function openFolderFromDialog() {
  const result = await window.electronAPI.openFolderDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    await fileStore.loadFolder(result.filePaths[0])
  }
}

async function handleTitleBarMenuAction(action) {
  switch (action) {
    case 'new-file':
      editorStore.createTab()
      break
    case 'open-file':
      await openFileFromDialog()
      break
    case 'open-folder':
      await openFolderFromDialog()
      break
    case 'save':
      await saveCurrentFile()
      break
    case 'save-as':
      await saveCurrentFileAs()
      break
    case 'check-for-updates':
      await handleCheckForUpdates()
      break
    case 'open-about':
      showAboutDialog.value = true
      break
    case 'exit':
      window.electronAPI.close()
      break
    case 'undo':
      dispatchEditorEvent('editor-undo')
      break
    case 'redo':
      dispatchEditorEvent('editor-redo')
      break
    case 'find':
      dispatchEditorEvent('editor-find')
      break
    case 'replace':
      dispatchEditorEvent('editor-replace')
      break
    case 'global-search':
      showGlobalSearchDialog.value = true
      break
    case 'select-all':
      dispatchEditorEvent('editor-select-all')
      break
    case 'toggle-sidebar':
      toggleSidebar()
      break
    case 'toggle-theme':
      settingsStore.toggleTheme()
      break
    case 'toggle-fullscreen':
      window.electronAPI.toggleFullScreen?.()
      break
    case 'reload':
      window.electronAPI.reloadWindow?.()
      break
    case 'force-reload':
      window.electronAPI.forceReloadWindow?.()
      break
    case 'toggle-devtools':
      window.electronAPI.toggleDevTools?.()
      break
  }
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
    await openFileFromDialog()
  }))

  cleanups.push(window.electronAPI.onMenuOpenFolder(async () => {
    await openFolderFromDialog()
  }))

  cleanups.push(window.electronAPI.onMenuSave(() => {
    saveCurrentFile()
  }))

  cleanups.push(window.electronAPI.onMenuSaveAs(() => {
    saveCurrentFileAs()
  }))

  cleanups.push(window.electronAPI.onMenuUndo(() => {
    dispatchEditorEvent('editor-undo')
  }))

  cleanups.push(window.electronAPI.onMenuRedo(() => {
    dispatchEditorEvent('editor-redo')
  }))

  cleanups.push(window.electronAPI.onMenuOpenSettings(() => {
    showSettingsDialog.value = true
  }))

  cleanups.push(window.electronAPI.onMenuCheckForUpdates(async () => {
    await handleCheckForUpdates()
  }))

  cleanups.push(window.electronAPI.onMenuOpenAbout(() => {
    showAboutDialog.value = true
  }))

  cleanups.push(window.electronAPI.onMenuToggleTheme(() => {
    settingsStore.toggleTheme()
  }))

  cleanups.push(window.electronAPI.onMenuFind(() => {
    dispatchEditorEvent('editor-find')
  }))

  cleanups.push(window.electronAPI.onMenuReplace(() => {
    dispatchEditorEvent('editor-replace')
  }))

  cleanups.push(window.electronAPI.onMenuGlobalSearch(() => {
    showGlobalSearchDialog.value = true
  }))

  cleanups.push(window.electronAPI.onMenuToggleSidebar(() => {
    toggleSidebar()
  }))

  cleanups.push(window.electronAPI.onAppOpenFile((filePath) => {
    openFile(filePath)
  }))

  window.electronAPI.notifyRendererReady()

  window.addEventListener('open-global-search', handleOpenGlobalSearchEvent)
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
  window.removeEventListener('open-global-search', handleOpenGlobalSearchEvent)
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
      if (options.lineNumber) {
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('editor-jump-to-location', {
            detail: {
              lineNumber: options.lineNumber,
              column: options.column || 1
            }
          }))
        })
      }
      return
    }

    const result = await window.electronAPI.readFile(filePath)
    
    const tab = editorStore.createTab(filename, filePath, result.content, options.fontSize, { sqlDialect: options.sqlDialect })
    tab.encoding = result.encoding
    
    fileStore.addRecentFile(filePath)
        fileStore.addRecentFolder(filePath.replace(/[\\/][^\\/]+$/, ''))
    window.electronAPI.watchFile(filePath)

    if (options.lineNumber) {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('editor-jump-to-location', {
          detail: {
            lineNumber: options.lineNumber,
            column: options.column || 1
          }
        }))
      })
    }
  } catch (error) {
    console.error('Failed to open file:', error)
    errorMessage.value = '打开文件失败: ' + error.message
    showErrorDialog.value = true
  }
}

function handleOpenSearchResult(result) {
  if (!result?.filePath) return
  showGlobalSearchDialog.value = false
  openFile(result.filePath, {
    lineNumber: result.lineNumber,
    column: result.column
  })
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
      const result = await showSaveDialogForTab(tab)
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
    const result = await showSaveDialogForTab(tab)
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

.update-dialog-message {
  white-space: pre-line;
  line-height: 1.7;
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

@media (max-width: 640px) {
  .main-editor {
    padding: var(--space-1) var(--space-1) 0;
  }

  .main-editor:not(.sidebar-collapsed) .sidebar {
    min-width: min(176px, 44vw);
    max-width: min(196px, 48vw);
  }

  .main-editor.sidebar-collapsed .sidebar {
    min-width: 56px;
    max-width: 56px;
  }

  .resizer {
    width: 6px;
  }
}
</style>
