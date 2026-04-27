<template>
  <div class="window-container">
    <TitleBar
      v-show="!isPresentationMode"
      @open-settings="showSettingsDialog = true"
      @menu-action="handleTitleBarMenuAction"
    />
    <div class="main-editor" :class="{ resizing: isResizing, 'sidebar-collapsed': isSidebarCollapsed, 'presentation-mode': isPresentationMode }">
      <div
        v-if="isResizing && !isSidebarCollapsed && !isPresentationMode"
        class="sidebar-collapse-guide"
        :class="{ active: isNearAutoCollapseThreshold }"
        :style="autoCollapseGuideStyle"
        aria-hidden="true"
      >
        <span class="sidebar-collapse-guide-label">拖到这里会自动折叠</span>
      </div>
      <div v-show="!isPresentationMode" class="sidebar" :class="{ collapsed: isSidebarCollapsed }" :style="sidebarStyle">
        <ActivityBar :active-view="activeSidebarView" :collapsed="isSidebarCollapsed" @select-view="handleSidebarViewSelect" @toggle-collapse="toggleSidebar" @open-settings="showSettingsDialog = true" />
        <div v-if="!isSidebarCollapsed" class="sidebar-pane">
          <WorkspaceSidebar :mode="activeSidebarView" :collapsed="isSidebarCollapsed" @toggle-collapse="toggleSidebar" @change-mode="handleSidebarViewSelect" />
        </div>
      </div>
      <div v-if="!isSidebarCollapsed && !isPresentationMode" class="resizer" @mousedown="startResize"></div>
      <div class="editor-area" :class="{ 'no-tabs': !hasTabs }">
        <TabBar v-if="hasTabs && !isPresentationMode" />
        <EditorPanel :is-presentation-mode="isPresentationMode" />
      </div>
    </div>
    <StatusBar v-show="!isPresentationMode" />
    
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

    <ModalDialog
      :show="!!currentExternalChange"
      title="文件在外部被修改"
      @close="dismissExternalChange"
    >
      <template #body>
        <div class="update-dialog-message">
          文件 <strong>{{ currentExternalChange?.filename }}</strong> 已在外部被修改。是否要重新加载？<br>
          <small v-if="editorStore.tabs.find(t => t.id === currentExternalChange?.tabId)?.isDirty" style="color: var(--error-color, #ef4444); margin-top: 8px; display: block;">
            注意：重新加载将丢失此文件中未保存的更改。
          </small>
        </div>
      </template>
      <template #footer>
        <button type="button" class="modal-btn" @click="dismissExternalChange">取消</button>
        <button type="button" class="modal-btn primary" @click="reloadExternalFile">重新加载</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TitleBar from '../components/TitleBar.vue'
import ActivityBar from '../components/ActivityBar.vue'
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
import { getDirectoryPath, getPathFileName } from '../utils/pathUtils'
import { RENDERER_EVENTS, emitRendererEvent, onRendererEvent } from '../utils/rendererEvents'
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
const activeSidebarView = ref('explorer')
const isResizing = ref(false)
const resizePointerX = ref(0)
const showErrorDialog = ref(false)
const showUpdateDialog = ref(false)
const showSettingsDialog = ref(false)
const showAboutDialog = ref(false)
const showGlobalSearchDialog = ref(false)
const errorMessage = ref('')
const externalChangeQueue = ref([])
const currentExternalChange = computed(() => externalChangeQueue.value[0] || null)
const isCheckingUpdates = ref(false)
const updateDialogTitle = ref('')
const updateDialogSubtitle = ref('')
const updateDialogMessage = ref('')
const updateDialogActionUrl = ref('')
const updateDialogActionText = ref('')
const isPresentationMode = ref(false)
const cleanups = []
const watchedFilePaths = new Set()
let watchedFilesSyncQueue = Promise.resolve()
let watchedFilesSyncRequestId = 0
let isMainEditorDisposed = false

const isSidebarCollapsed = computed(() => settingsStore.settings.sidebarCollapsed)
const hasTabs = computed(() => editorStore.tabs.length > 0)
const sidebarStyle = computed(() => ({
  width: isSidebarCollapsed.value ? '48px' : `${sidebarWidth.value}px`
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
  emitRendererEvent(eventName, detail)
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

function jumpToEditorLocation(lineNumber, column = 1) {
  if (!lineNumber) return

  requestAnimationFrame(() => {
    emitRendererEvent(RENDERER_EVENTS.JUMP_TO_LOCATION, {
      lineNumber,
      column
    })
  })
}

function rememberFilePath(filePath) {
  if (!filePath) return

  fileStore.addRecentFile(filePath)
  const directoryPath = getDirectoryPath(filePath)
  if (directoryPath) {
    fileStore.addRecentFolder(directoryPath)
  }
}

function applySavedFilePath(tab, filePath) {
  tab.filePath = filePath
  tab.title = getPathFileName(filePath) || tab.title
  editorStore.saveTab(tab.id)
  rememberFilePath(filePath)
}

const handleExternalFileChange = async (filePath) => {
  const tab = editorStore.findTabByPath(filePath)
  if (!tab) return
  if (externalChangeQueue.value.some(q => q.filePath === filePath)) return

  try {
    const result = await window.electronAPI.readFile(filePath)
    const latestTab = editorStore.findTabByPath(filePath)
    if (!latestTab) return
    if (result.content === latestTab.content && result.encoding === latestTab.encoding) return

    externalChangeQueue.value.push({
      filePath,
      filename: getPathFileName(filePath),
      tabId: latestTab.id,
      content: result.content,
      encoding: result.encoding
    })
  } catch (err) {
    console.error('Failed to read changed file:', err)
  }
}

const reloadExternalFile = () => {
  const change = currentExternalChange.value
  if (!change) return
  const tab = editorStore.tabs.find(item => item.id === change.tabId)
  if (!tab) {
    dismissExternalChange()
    return
  }

  tab.encoding = change.encoding || tab.encoding
  editorStore.updateTabContent(change.tabId, change.content)
  editorStore.saveTab(change.tabId)

  dismissExternalChange()
}

const dismissExternalChange = () => {
  externalChangeQueue.value.shift()
}

async function syncWatchedFiles(filePaths = [], requestId) {
  if (!window.electronAPI?.watchFile || !window.electronAPI?.unwatchFile) return
  if (isMainEditorDisposed || requestId !== watchedFilesSyncRequestId) return

  const desiredPaths = new Set(filePaths.filter(Boolean))
  const stalePaths = [...watchedFilePaths].filter((filePath) => !desiredPaths.has(filePath))

  for (const filePath of stalePaths) {
    if (isMainEditorDisposed || requestId !== watchedFilesSyncRequestId) return
    try {
      await window.electronAPI.unwatchFile(filePath)
    } catch (error) {
      console.error('Failed to unwatch file:', filePath, error)
    } finally {
      watchedFilePaths.delete(filePath)
      externalChangeQueue.value = externalChangeQueue.value.filter((change) => change.filePath !== filePath)
    }
  }

  const nextPaths = [...desiredPaths].filter((filePath) => !watchedFilePaths.has(filePath))

  for (const filePath of nextPaths) {
    if (isMainEditorDisposed || requestId !== watchedFilesSyncRequestId) return
    try {
      await window.electronAPI.watchFile(filePath)
      if (isMainEditorDisposed || requestId !== watchedFilesSyncRequestId) {
        await window.electronAPI.unwatchFile(filePath)
        return
      }
      watchedFilePaths.add(filePath)
    } catch (error) {
      console.error('Failed to watch file:', filePath, error)
    }
  }
}

function enqueueWatchedFilesSync(filePaths = []) {
  const requestId = ++watchedFilesSyncRequestId
  const nextFilePaths = [...new Set(filePaths.filter(Boolean))]

  watchedFilesSyncQueue = watchedFilesSyncQueue
    .catch(() => {})
    .then(() => syncWatchedFiles(nextFilePaths, requestId))
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
      dispatchEditorEvent(RENDERER_EVENTS.UNDO)
      break
    case 'redo':
      dispatchEditorEvent(RENDERER_EVENTS.REDO)
      break
    case 'find':
      dispatchEditorEvent(RENDERER_EVENTS.FIND)
      break
    case 'replace':
      dispatchEditorEvent(RENDERER_EVENTS.REPLACE)
      break
    case 'global-search':
      showGlobalSearchDialog.value = true
      break
    case 'select-all':
      dispatchEditorEvent(RENDERER_EVENTS.SELECT_ALL)
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
    case 'toggle-presentation-mode':
      togglePresentationMode()
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

function handleSidebarViewSelect(view) {
  activeSidebarView.value = view || 'explorer'

  if (isSidebarCollapsed.value) {
    expandSidebar()
  }
}

function togglePresentationMode() {
  isPresentationMode.value = !isPresentationMode.value
  if (isPresentationMode.value) {
    if (!isSidebarCollapsed.value) {
      collapseSidebar()
    }
  }
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

watch(
  () => editorStore.tabs.map((tab) => tab.filePath).filter(Boolean),
  (filePaths) => {
    enqueueWatchedFilesSync(filePaths)
  },
  { immediate: true }
)

onMounted(() => {
  isMainEditorDisposed = false
  // 监听文件更改事件
  if (window.electronAPI.onFileChanged) {
    cleanups.push(window.electronAPI.onFileChanged((filePath) => {
      handleExternalFileChange(filePath)
    }))
  }

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
    dispatchEditorEvent(RENDERER_EVENTS.UNDO)
  }))

  cleanups.push(window.electronAPI.onMenuRedo(() => {
    dispatchEditorEvent(RENDERER_EVENTS.REDO)
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isPresentationMode.value) {
      togglePresentationMode()
    }
    // Also bind Shift+F5 (Windows) / Cmd+Shift+P (Mac) to toggle presentation mode
    if ((e.key === 'F5' && e.shiftKey) || (e.key === 'P' && e.shiftKey && (e.metaKey || e.ctrlKey))) {
      e.preventDefault()
      togglePresentationMode()
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  cleanups.push(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  cleanups.push(window.electronAPI.onMenuFind(() => {
    dispatchEditorEvent(RENDERER_EVENTS.FIND)
  }))

  cleanups.push(window.electronAPI.onMenuReplace(() => {
    dispatchEditorEvent(RENDERER_EVENTS.REPLACE)
  }))

  cleanups.push(window.electronAPI.onMenuGlobalSearch(() => {
    showGlobalSearchDialog.value = true
  }))

  cleanups.push(window.electronAPI.onMenuTogglePresentationMode?.(() => {
    togglePresentationMode()
  }))

  cleanups.push(window.electronAPI.onMenuToggleSidebar(() => {
    toggleSidebar()
  }))

  cleanups.push(window.electronAPI.onAppOpenFile((filePath) => {
    openFile(filePath)
  }))

  window.electronAPI.notifyRendererReady()

  cleanups.push(onRendererEvent(RENDERER_EVENTS.OPEN_GLOBAL_SEARCH, handleOpenGlobalSearchEvent))
  cleanups.push(onRendererEvent(RENDERER_EVENTS.OPEN_FILE, handleOpenFileEvent))
  cleanups.push(onRendererEvent(RENDERER_EVENTS.SAVE_TABS, handleSaveTabsEvent))

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
  isMainEditorDisposed = true
  watchedFilesSyncRequestId += 1
  cleanups.forEach(cleanup => {
    if (typeof cleanup === 'function') {
      cleanup()
    }
  })
  watchedFilePaths.forEach((filePath) => {
    window.electronAPI?.unwatchFile?.(filePath)
  })
  watchedFilePaths.clear()
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})

async function restoreLastSession() {
  const session = editorStore.loadSession()
  if (!session?.files?.length) {
    return false
  }

  for (const file of session.files) {
    if (typeof file === 'string') {
      await openFile(file)
      continue
    }
    await openFile(file.path, { fontSize: file.fontSize, sqlDialect: file.sqlDialect, pinned: file.pinned })
  }

  editorStore.reorderTabsByPinnedState()

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
    const filename = getPathFileName(filePath) || 'Untitled'

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
      if (typeof options.pinned === 'boolean' && existingTab.pinned !== options.pinned) {
        editorStore.setTabsPinned([existingTab.id], options.pinned)
      }
      jumpToEditorLocation(options.lineNumber, options.column || 1)
      return
    }

    const result = await window.electronAPI.readFile(filePath)
    
    const tab = editorStore.createTab(filename, filePath, result.content, options.fontSize, { sqlDialect: options.sqlDialect, pinned: options.pinned })
    tab.encoding = result.encoding
    
    rememberFilePath(filePath)

    jumpToEditorLocation(options.lineNumber, options.column || 1)
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
      applySavedFilePath(tab, result.filePath)
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
      applySavedFilePath(tab, result.filePath)
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
  padding: 0; /* Remove padding here so sidebar touches top and bottom */
  gap: 0;
  min-height: 0;
  background: var(--bg-secondary); /* Ensure background acts as the canvas for the separated panes */
  position: relative;
  /* Removed border-top since TitleBar already has border-bottom, avoiding double thick lines */
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
  display: flex;
  height: 100%;
  background: transparent;
  overflow: hidden;
  flex-shrink: 0;
  box-sizing: border-box;
  min-width: 48px;
  max-width: 420px;
  border-right: none;
  background: color-mix(in srgb, var(--bg-primary) 96%, rgba(0, 0, 0, 0.02));
  box-shadow: none;
}

.main-editor:not(.resizing) .sidebar {
  transition: width var(--transition-smooth), min-width var(--transition-smooth), max-width var(--transition-smooth);
}

.sidebar.collapsed {
  min-width: 48px;
  max-width: 48px;
  padding: 0;
}

.sidebar-pane {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.resizer {
  position: relative;
  width: 6px;
  margin-left: -3px;
  margin-right: -3px;
  cursor: col-resize;
  background: transparent;
  z-index: 100;
  flex-shrink: 0;
}

.resizer::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  background: transparent;
  transition: background var(--transition-fast) 0.2s;
}

.resizer:hover::before,
.main-editor.resizing .resizer::before {
  background: var(--accent-primary);
  transition-delay: 0.1s;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  gap: 8px; /* Restoring exactly 8px gap between TabBar and Editor body */
  margin: 8px; /* Restoring margin around the editor area */
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
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
    width: 6px;
    margin-left: -3px;
    margin-right: -3px;
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
    min-width: 48px;
    max-width: 48px;
  }

  .resizer {
    width: 6px;
  }
}
.main-editor.presentation-mode :deep(.markdown-mode-toolbar),
.main-editor.presentation-mode :deep(.markdown-format-toolbar),
.main-editor.presentation-mode :deep(.json-toolbar),
.main-editor.presentation-mode :deep(.sql-toolbar),
.main-editor.presentation-mode :deep(.log-toolbar) {
  display: none !important;
}
</style>
