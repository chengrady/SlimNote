<template>
  <div class="window-container">
    <TitleBar
      v-show="!isPresentationMode"
      :left-sidebar-collapsed="isSidebarCollapsed"
      :right-sidebar-collapsed="isRightSidebarCollapsed"
      @open-settings="openSettingsDialog"
      @menu-action="handleTitleBarMenuAction"
    />
    <div class="main-editor" :class="{ resizing: isResizing || isRightResizing, 'right-resizing': isRightResizing, 'sidebar-collapsed': isSidebarCollapsed, 'right-sidebar-collapsed': isRightSidebarCollapsed, 'presentation-mode': isPresentationMode }">
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
        <ActivityBar :active-view="activeSidebarView" :collapsed="isSidebarCollapsed" @select-view="handleSidebarViewSelect" @toggle-collapse="toggleSidebar" @open-settings="openSettingsDialog" />
        <div class="sidebar-pane" :aria-hidden="isSidebarCollapsed ? 'true' : 'false'">
          <WorkspaceSidebar :mode="activeSidebarView" :collapsed="isSidebarCollapsed" @change-mode="handleSidebarViewSelect" />
        </div>
      </div>
      <div v-if="!isSidebarCollapsed && !isPresentationMode" class="resizer" @mousedown="startResize"></div>
      <div class="editor-area" :class="{ 'no-tabs': !hasTabs }">
        <TabBar v-if="hasTabs && !isPresentationMode" />
        <EditorPanel ref="editorPanelRef" :is-presentation-mode="isPresentationMode" />
      </div>
      <div
        v-if="!isPresentationMode && !isRightSidebarCollapsed"
        class="right-resizer"
        role="separator"
        aria-label="调整 AI 助手宽度"
        aria-orientation="vertical"
        @mousedown="startRightResize"
      ></div>
      <div v-if="!isPresentationMode && !isRightSidebarCollapsed" class="workbench-right-sidebar" :style="rightSidebarStyle">
        <AiAssistantPanel
          :active-tab="activeTab"
          :get-selection="getCurrentEditorSelection"
          :get-cursor-offset="getCurrentCursorOffset"
          @open-settings="openAiSettingsDialog"
          @apply-result="handleAiApplyResult"
        />
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
      :show-footer="!isUpdateDialogBusy"
      @close="closeUpdateDialog"
    >
      <template #body>
        <div class="update-dialog-message">{{ updateDialogMessage }}</div>
      </template>
      <template #footer>
        <button v-if="updateDialogSecondaryText" type="button" class="modal-btn" @click="handleUpdateDialogSecondaryAction">
          {{ updateDialogSecondaryText }}
        </button>
        <button
          type="button"
          class="modal-btn primary"
          :disabled="isUpdateDialogPrimaryDisabled"
          @click="handleUpdateDialogPrimaryAction"
        >
          {{ updateDialogActionText || updateDialogCloseText }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog
      :show="showAppCloseConfirmDialog"
      :title="appCloseConfirmTitle"
      @close="cancelAppClose"
      @confirm="confirmAppClose"
    >
      <template #body>
        <div class="update-dialog-message">{{ appCloseConfirmMessage }}</div>
      </template>
      <template #footer>
        <button type="button" class="modal-btn" @click="cancelAppClose">{{ localizeText('取消', 'Cancel') }}</button>
        <button type="button" class="modal-btn primary" @click="confirmAppClose">{{ localizeText('退出', 'Exit') }}</button>
      </template>
    </ModalDialog>

    <SettingsDialog
      v-if="showSettingsDialog"
      :key="settingsDialogKey"
      :show="showSettingsDialog"
      :initial-section="settingsInitialSection"
      :left-sidebar-collapsed="isSidebarCollapsed"
      :right-sidebar-collapsed="isRightSidebarCollapsed"
      @close="closeSettingsDialog"
      @menu-action="handleTitleBarMenuAction"
    />

    <AboutDialog
      v-if="showAboutDialog"
      :show="showAboutDialog"
      @close="showAboutDialog = false"
    />

    <GlobalSearchDialog
      v-if="showGlobalSearchDialog"
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
import { ref, onMounted, onUnmounted, computed, defineAsyncComponent, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import TitleBar from '../components/TitleBar.vue'
import ActivityBar from '../components/ActivityBar.vue'
import WorkspaceSidebar from '../components/WorkspaceSidebar.vue'
import TabBar from '../components/TabBar.vue'
import StatusBar from '../components/StatusBar.vue'
import ModalDialog from '../components/ModalDialog.vue'
import { useEditorStore } from '../stores/editor'
import { useFileStore } from '../stores/file'
import { useSettingsStore } from '../stores/settings'
import { useShortcutsStore } from '../stores/shortcuts'
import { getFileExtension } from '../utils/fileSupport'
import { getDirectoryPath, getPathFileName } from '../utils/pathUtils'
import { RENDERER_EVENTS, emitRendererEvent, onRendererEvent } from '../utils/rendererEvents'
import { isShortcutEvent } from '../utils/shortcuts'
import packageJson from '../../../package.json'

const EditorPanel = defineAsyncComponent(() => import('../components/EditorPanel.vue'))
const AiAssistantPanel = defineAsyncComponent(() => import('../components/AiAssistantPanel.vue'))
const SettingsDialog = defineAsyncComponent(() => import('../components/SettingsDialog.vue'))
const AboutDialog = defineAsyncComponent(() => import('../components/AboutDialog.vue'))
const GlobalSearchDialog = defineAsyncComponent(() => import('../components/GlobalSearchDialog.vue'))

const editorStore = useEditorStore()
const fileStore = useFileStore()
const settingsStore = useSettingsStore()
const shortcutsStore = useShortcutsStore()
shortcutsStore.loadShortcuts()
const { locale } = useI18n()

const SIDEBAR_MIN_WIDTH = 220
const SIDEBAR_MAX_VIEWPORT_RATIO = 0.45
const SIDEBAR_AUTO_COLLAPSE_THRESHOLD = 176
const SIDEBAR_COLLAPSED_WIDTH = 48
const DEFAULT_SIDEBAR_WIDTH = 280
const RIGHT_SIDEBAR_MIN_WIDTH = 320
const RIGHT_SIDEBAR_MAX_VIEWPORT_RATIO = 0.5
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 380
const WORKBENCH_MIN_EDITOR_WIDTH = 420
const WORKBENCH_EDITOR_HORIZONTAL_SPACE = 16
const RELEASES_PAGE_URL = 'https://github.com/chengrady/SlimNote/releases'
const APP_VERSION = String(packageJson.version || '1.0.0')

const sidebarWidth = ref(settingsStore.settings.sidebarWidth || DEFAULT_SIDEBAR_WIDTH)
const lastExpandedSidebarWidth = ref(settingsStore.settings.sidebarWidth || DEFAULT_SIDEBAR_WIDTH)
const rightSidebarWidth = ref(settingsStore.settings.rightSidebarWidth || DEFAULT_RIGHT_SIDEBAR_WIDTH)
const lastExpandedRightSidebarWidth = ref(settingsStore.settings.rightSidebarWidth || DEFAULT_RIGHT_SIDEBAR_WIDTH)
const activeSidebarView = ref('explorer')
const isResizing = ref(false)
const isRightResizing = ref(false)
const resizePointerX = ref(0)
const showErrorDialog = ref(false)
const showUpdateDialog = ref(false)
const showAppCloseConfirmDialog = ref(false)
const showSettingsDialog = ref(false)
const settingsInitialSection = ref('appearance')
const settingsDialogKey = ref(0)
const showAboutDialog = ref(false)
const showGlobalSearchDialog = ref(false)
const editorPanelRef = ref(null)
const errorMessage = ref('')
const externalChangeQueue = ref([])
const currentExternalChange = computed(() => externalChangeQueue.value[0] || null)
const isCheckingUpdates = ref(false)
const isDownloadingUpdate = ref(false)
const updateDialogTitle = ref('')
const updateDialogSubtitle = ref('')
const updateDialogMessage = ref('')
const updateDialogAction = ref('')
const updateDialogActionUrl = ref('')
const updateDialogActionText = ref('')
const updateDialogSecondaryAction = ref('')
const updateDialogSecondaryText = ref('')
const latestUpdateState = ref(null)
const isPresentationMode = ref(false)
const cleanups = []
const watchedFilePaths = new Set()
let watchedFilesSyncQueue = Promise.resolve()
let watchedFilesSyncRequestId = 0
let isMainEditorDisposed = false
let isApplyingWorkbenchConstraints = false
let clearWorkbenchConstraintPending = false

const isSidebarCollapsed = computed(() => settingsStore.settings.sidebarCollapsed)
const isRightSidebarCollapsed = computed(() => settingsStore.settings.rightSidebarCollapsed)
const hasTabs = computed(() => editorStore.tabs.length > 0)
const activeTab = computed(() => editorStore.getActiveTab())
const sidebarStyle = computed(() => ({
  width: isSidebarCollapsed.value ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${sidebarWidth.value}px`,
  '--sidebar-pane-width': isSidebarCollapsed.value ? '0px' : `${Math.max(0, sidebarWidth.value - SIDEBAR_COLLAPSED_WIDTH)}px`
}))
const rightSidebarStyle = computed(() => ({
  width: `${rightSidebarWidth.value}px`
}))
const autoCollapseGuideStyle = computed(() => ({
  left: `${SIDEBAR_AUTO_COLLAPSE_THRESHOLD}px`
}))
const isNearAutoCollapseThreshold = computed(() => {
  if (!isResizing.value) return false
  return resizePointerX.value <= SIDEBAR_AUTO_COLLAPSE_THRESHOLD + 48
})
const updateDialogCloseText = computed(() => localizeText('知道了', 'OK'))
const isUpdateDialogBusy = computed(() => isCheckingUpdates.value || isDownloadingUpdate.value)
const isUpdateDialogPrimaryDisabled = computed(() => isUpdateDialogBusy.value || !updateDialogActionText.value)
const unsavedTabCount = computed(() => editorStore.tabs.filter(tab => tab.isDirty).length)
const appCloseConfirmTitle = computed(() => localizeText('退出 SlimNote', 'Exit SlimNote'))
const appCloseConfirmMessage = computed(() => {
  if (unsavedTabCount.value > 0) {
    return localizeText(
      `还有 ${unsavedTabCount.value} 个标签页包含未保存内容。SlimNote 会在下次启动时尝试恢复这些内容，确定要退出吗？`,
      `${unsavedTabCount.value} tab(s) contain unsaved changes. SlimNote will try to restore them on next launch. Exit anyway?`
    )
  }

  return localizeText('确定要退出 SlimNote 吗？', 'Are you sure you want to exit SlimNote?')
})

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

function handleAppBeforeClose() {
  showAppCloseConfirmDialog.value = true
}

function cancelAppClose() {
  showAppCloseConfirmDialog.value = false
  window.electronAPI?.cancelAppClose?.()
}

function confirmAppClose() {
  showAppCloseConfirmDialog.value = false
  window.electronAPI?.confirmAppClose?.()
}

function dispatchEditorEvent(eventName, detail) {
  emitRendererEvent(eventName, detail)
}

function addElectronListener(eventName, handler) {
  if (typeof window === 'undefined') return
  const listener = window.electronAPI?.[eventName]
  if (typeof listener !== 'function') return
  const cleanup = listener(handler)
  if (typeof cleanup === 'function') cleanups.push(cleanup)
}

function getCurrentEditorSelection() {
  return editorPanelRef.value?.getCurrentEditorSelection?.() || ''
}

function getCurrentCursorOffset() {
  const offset = editorPanelRef.value?.getCurrentCursorOffset?.()
  return Number.isFinite(offset) ? offset : 0
}

function handleAiApplyResult(payload) {
  editorPanelRef.value?.handleAiApplyResult?.(payload)
}

function localizeText(zhText, enText) {
  return locale.value === 'zh-CN' ? zhText : enText
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

function resetUpdateDialogActions() {
  updateDialogAction.value = ''
  updateDialogActionUrl.value = ''
  updateDialogActionText.value = ''
  updateDialogSecondaryAction.value = ''
  updateDialogSecondaryText.value = ''
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`
}

function formatUpdateSubtitle(state = {}) {
  const currentVersion = state.currentVersion || APP_VERSION
  const latestVersion = state.latestVersion || currentVersion

  if (latestVersion && latestVersion !== currentVersion) {
    return localizeText(`当前 ${currentVersion} -> 最新 ${latestVersion}`, `Current ${currentVersion} -> Latest ${latestVersion}`)
  }

  return localizeText(`当前版本 ${currentVersion}`, `Current version ${currentVersion}`)
}

function formatDownloadProgress(progress = {}) {
  const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0))
  if (!progress.total) {
    return localizeText(`正在下载更新：${percent.toFixed(0)}%`, `Downloading update: ${percent.toFixed(0)}%`)
  }

  return localizeText(
    `正在下载更新：${percent.toFixed(0)}%（${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}）`,
    `Downloading update: ${percent.toFixed(0)}% (${formatBytes(progress.transferred)} / ${formatBytes(progress.total)})`
  )
}

function normalizeUpdateStatus(state = {}) {
  if (state.status) return state.status
  if (state.hasUpdate) return 'available'
  if (state.ok) return 'not-available'
  return 'error'
}

function applyUpdateState(state = {}, options = {}) {
  const status = normalizeUpdateStatus(state)
  const shouldStaySilent = options.silent && !showUpdateDialog.value && !['available', 'downloaded'].includes(status)
  latestUpdateState.value = { ...state, status }

  if (shouldStaySilent) return

  if (['available', 'downloaded', 'downloading', 'checking', 'not-available', 'not-supported', 'error'].includes(status)) {
    showUpdateDialog.value = true
  }

  resetUpdateDialogActions()
  isCheckingUpdates.value = status === 'checking'
  isDownloadingUpdate.value = status === 'downloading'

  const latestVersion = state.latestVersion || state.currentVersion || APP_VERSION
  const releaseDate = formatReleaseDate(state.releaseDate || state.publishedAt)

  if (status === 'checking') {
    updateDialogTitle.value = localizeText('检查更新', 'Check for Updates')
    updateDialogSubtitle.value = localizeText('正在连接更新服务...', 'Connecting to update service...')
    updateDialogMessage.value = localizeText('正在检查最新版本，请稍候。', 'Checking the latest release. Please wait.')
    return
  }

  if (status === 'available') {
    updateDialogTitle.value = localizeText('发现新版本', 'Update Available')
    updateDialogSubtitle.value = formatUpdateSubtitle(state)
    updateDialogMessage.value = releaseDate
      ? localizeText(
          `已发现新版本 ${latestVersion}，发布时间 ${releaseDate}。\n\n可以直接在应用内下载更新，下载完成后重启 SlimNote 即可安装。`,
          `Version ${latestVersion} is available, published on ${releaseDate}.\n\nYou can download it in SlimNote and restart to install it.`
        )
      : localizeText(
          `已发现新版本 ${latestVersion}。\n\n可以直接在应用内下载更新，下载完成后重启 SlimNote 即可安装。`,
          `Version ${latestVersion} is available.\n\nYou can download it in SlimNote and restart to install it.`
        )
    updateDialogAction.value = 'download'
    updateDialogActionText.value = localizeText('下载更新', 'Download Update')
    updateDialogSecondaryAction.value = 'close'
    updateDialogSecondaryText.value = localizeText('稍后', 'Later')
    return
  }

  if (status === 'downloading') {
    updateDialogTitle.value = localizeText('正在下载更新', 'Downloading Update')
    updateDialogSubtitle.value = formatUpdateSubtitle(state)
    updateDialogMessage.value = formatDownloadProgress(state.progress)
    return
  }

  if (status === 'downloaded') {
    updateDialogTitle.value = localizeText('更新已下载', 'Update Downloaded')
    updateDialogSubtitle.value = formatUpdateSubtitle(state)
    updateDialogMessage.value = localizeText(
      '更新已经下载完成。现在重启 SlimNote 后会自动安装新版本。',
      'The update has been downloaded. Restart SlimNote now to install it.'
    )
    updateDialogAction.value = 'install'
    updateDialogActionText.value = localizeText('重启并安装', 'Restart and Install')
    updateDialogSecondaryAction.value = 'close'
    updateDialogSecondaryText.value = localizeText('稍后', 'Later')
    return
  }

  if (status === 'not-available') {
    updateDialogTitle.value = localizeText('已是最新版本', 'Up to Date')
    updateDialogSubtitle.value = formatUpdateSubtitle(state)
    updateDialogMessage.value = localizeText(
      `当前已安装最新版本 ${latestVersion}。`,
      `You're already on the latest version ${latestVersion}.`
    )
    updateDialogAction.value = 'close'
    updateDialogActionText.value = updateDialogCloseText.value
    return
  }

  if (status === 'not-supported') {
    updateDialogTitle.value = localizeText('当前环境无法应用内更新', 'In-App Updates Unavailable')
    updateDialogSubtitle.value = formatUpdateSubtitle(state)
    updateDialogMessage.value = localizeText(
      '应用内更新只在正式打包安装后的应用中可用。当前如果是开发环境或便携版，可以先到 Releases 页面确认发布包。',
      'In-app updates are only available in packaged installed builds. In development or portable builds, check the Releases page instead.'
    )
    updateDialogAction.value = 'open-releases'
    updateDialogActionUrl.value = state.releaseUrl || RELEASES_PAGE_URL
    updateDialogActionText.value = localizeText('打开 Releases', 'Open Releases')
    updateDialogSecondaryAction.value = 'close'
    updateDialogSecondaryText.value = localizeText('关闭', 'Close')
    return
  }

  updateDialogTitle.value = localizeText('更新失败', 'Update Failed')
  updateDialogSubtitle.value = formatUpdateSubtitle(state)
  updateDialogMessage.value = localizeText(
    `更新请求没有完成。\n\n原因：${state.message || '未知错误'}\n\n可以稍后重试，或打开 Releases 页面手动查看。`,
    `The update request did not complete.\n\nReason: ${state.message || 'Unknown error'}\n\nTry again later, or open the Releases page manually.`
  )
  updateDialogAction.value = 'open-releases'
  updateDialogActionUrl.value = state.releaseUrl || RELEASES_PAGE_URL
  updateDialogActionText.value = localizeText('打开 Releases', 'Open Releases')
  updateDialogSecondaryAction.value = 'close'
  updateDialogSecondaryText.value = localizeText('关闭', 'Close')
}

function openUpdateActionUrl() {
  if (!updateDialogActionUrl.value) {
    closeUpdateDialog()
    return
  }

  const electronAPI = typeof window === 'undefined' ? null : window.electronAPI
  electronAPI?.openExternal?.(updateDialogActionUrl.value)
  closeUpdateDialog()
}

async function downloadUpdateInApp() {
  const electronAPI = typeof window === 'undefined' ? null : window.electronAPI
  if (typeof electronAPI?.downloadUpdate !== 'function') {
    openUpdateActionUrl()
    return
  }

  try {
    applyUpdateState({ ...(latestUpdateState.value || {}), status: 'downloading', progress: { percent: 0 } })
    const state = await electronAPI.downloadUpdate()
    applyUpdateState(state)
  } catch (error) {
    console.error('Failed to download update:', error)
    applyUpdateState({
      ok: false,
      status: 'error',
      currentVersion: latestUpdateState.value?.currentVersion || APP_VERSION,
      latestVersion: latestUpdateState.value?.latestVersion || APP_VERSION,
      releaseUrl: latestUpdateState.value?.releaseUrl || RELEASES_PAGE_URL,
      message: error?.message || 'Unable to download update.'
    })
  }
}

async function installDownloadedUpdate() {
  const electronAPI = typeof window === 'undefined' ? null : window.electronAPI

  try {
    const result = await electronAPI?.installUpdate?.()
    if (result?.ok === false) {
      applyUpdateState({
        ...(latestUpdateState.value || {}),
        ok: false,
        status: 'error',
        message: result.message || 'Unable to install update.'
      })
    }
  } catch (error) {
    console.error('Failed to install update:', error)
    applyUpdateState({
      ...(latestUpdateState.value || {}),
      ok: false,
      status: 'error',
      message: error?.message || 'Unable to install update.'
    })
  }
}

async function handleUpdateDialogPrimaryAction() {
  if (updateDialogAction.value === 'download') {
    await downloadUpdateInApp()
    return
  }

  if (updateDialogAction.value === 'install') {
    await installDownloadedUpdate()
    return
  }

  if (updateDialogAction.value === 'open-releases') {
    openUpdateActionUrl()
    return
  }

  closeUpdateDialog()
}

function handleUpdateDialogSecondaryAction() {
  closeUpdateDialog()
}

function handleUpdateStateChanged(state) {
  const status = normalizeUpdateStatus(state || {})
  const shouldShowAutomatically = ['available', 'downloaded'].includes(status)
  applyUpdateState(state, { silent: !showUpdateDialog.value && !shouldShowAutomatically })
}

async function hydrateUpdateState() {
  const electronAPI = typeof window === 'undefined' ? null : window.electronAPI
  if (typeof electronAPI?.getUpdateState !== 'function') return

  try {
    handleUpdateStateChanged(await electronAPI.getUpdateState())
  } catch (error) {
    console.warn('Failed to read update state:', error)
  }
}

async function handleCheckForUpdates() {
  if (isUpdateDialogBusy.value) return

  const electronAPI = typeof window === 'undefined' ? null : window.electronAPI
  showUpdateDialog.value = true
  applyUpdateState({
    ok: true,
    status: 'checking',
    source: 'manual',
    currentVersion: latestUpdateState.value?.currentVersion || APP_VERSION,
    latestVersion: latestUpdateState.value?.latestVersion || APP_VERSION,
    releaseUrl: latestUpdateState.value?.releaseUrl || RELEASES_PAGE_URL
  })

  try {
    if (typeof electronAPI?.checkForUpdates !== 'function') {
      throw new Error('Electron update API is unavailable.')
    }

    applyUpdateState(await electronAPI.checkForUpdates())
  } catch (error) {
    console.error('Failed to check for updates:', error)
    applyUpdateState({
      ok: false,
      status: 'error',
      currentVersion: latestUpdateState.value?.currentVersion || APP_VERSION,
      latestVersion: latestUpdateState.value?.latestVersion || APP_VERSION,
      releaseUrl: latestUpdateState.value?.releaseUrl || RELEASES_PAGE_URL,
      message: error?.message || 'Unable to check for updates.'
    })
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

function filePathKey(filePath) {
  return String(filePath || '').replace(/\//g, '\\').toLowerCase()
}

function createFilePathKeySet(filePaths = []) {
  return new Set(filePaths.map(filePathKey).filter(Boolean))
}

async function takePendingOpenFiles() {
  const electronAPI = typeof window === 'undefined' ? null : window.electronAPI
  if (typeof electronAPI?.consumePendingOpenFiles !== 'function') {
    electronAPI?.notifyRendererReady?.()
    return []
  }

  const filePaths = await electronAPI.consumePendingOpenFiles()
  return Array.isArray(filePaths) ? filePaths.filter(Boolean) : []
}

async function openFilePaths(filePaths = []) {
  for (const filePath of filePaths) {
    if (isMainEditorDisposed) return
    await openFile(filePath)
  }
}

async function openLaunchFilesThenRestoreSession() {
  let launchFilePaths = []

  try {
    launchFilePaths = await takePendingOpenFiles()
    await openFilePaths(launchFilePaths)
  } catch (error) {
    console.warn('Failed to consume launch files:', error)
  }

  if (isMainEditorDisposed) return

  try {
    await restoreLastSession({ skipFilePathKeys: createFilePathKeySet(launchFilePaths) })
  } catch (error) {
    console.warn('Failed to restore last session:', error)
  }

  if (isMainEditorDisposed) return

  const activeLaunchFilePath = launchFilePaths[launchFilePaths.length - 1]
  const activeLaunchTab = activeLaunchFilePath ? editorStore.findTabByPath(activeLaunchFilePath) : null
  if (activeLaunchTab) {
    editorStore.setActiveTab(activeLaunchTab.id)
  }

  try {
    await openFilePaths(await takePendingOpenFiles())
  } catch (error) {
    console.warn('Failed to consume pending open files:', error)
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
    case 'toggle-right-sidebar':
      toggleRightSidebar()
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
function normalizeSettingsInitialSection(sectionId) {
  return ['appearance', 'editor', 'shortcuts', 'ai', 'files'].includes(sectionId) ? sectionId : 'appearance'
}

function openSettingsDialog(sectionId = 'appearance') {
  settingsInitialSection.value = normalizeSettingsInitialSection(sectionId)
  settingsDialogKey.value += 1
  showSettingsDialog.value = true
}

function openAiSettingsDialog() {
  openSettingsDialog('ai')
}

function closeSettingsDialog() {
  showSettingsDialog.value = false
}

function clampNumber(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value))
}

function getViewportWidth() {
  return Math.max(0, window.innerWidth || 0)
}

function getSidebarMaxWidth(rightWidth = isRightSidebarCollapsed.value ? 0 : rightSidebarWidth.value) {
  const viewportWidth = getViewportWidth()
  const viewportMaxWidth = Math.floor(viewportWidth * SIDEBAR_MAX_VIEWPORT_RATIO)
  const editorReservedWidth = WORKBENCH_MIN_EDITOR_WIDTH + WORKBENCH_EDITOR_HORIZONTAL_SPACE
  const availableWidth = viewportWidth - rightWidth - editorReservedWidth
  return Math.max(SIDEBAR_MIN_WIDTH, Math.floor(Math.min(viewportMaxWidth, availableWidth)))
}

function getRightSidebarMaxWidth(leftWidth = isSidebarCollapsed.value ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth.value) {
  const viewportWidth = getViewportWidth()
  const viewportMaxWidth = Math.floor(viewportWidth * RIGHT_SIDEBAR_MAX_VIEWPORT_RATIO)
  const editorReservedWidth = WORKBENCH_MIN_EDITOR_WIDTH + WORKBENCH_EDITOR_HORIZONTAL_SPACE
  const availableWidth = viewportWidth - leftWidth - editorReservedWidth
  return Math.max(RIGHT_SIDEBAR_MIN_WIDTH, Math.floor(Math.min(viewportMaxWidth, availableWidth)))
}

function clampSidebarWidth(value, rightWidth = isRightSidebarCollapsed.value ? 0 : rightSidebarWidth.value) {
  return clampNumber(Math.round(value), SIDEBAR_MIN_WIDTH, getSidebarMaxWidth(rightWidth))
}

function clampRightSidebarWidth(value, leftWidth = isSidebarCollapsed.value ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth.value) {
  return clampNumber(Math.round(value), RIGHT_SIDEBAR_MIN_WIDTH, getRightSidebarMaxWidth(leftWidth))
}

function getPreferredSidebarWidth() {
  return lastExpandedSidebarWidth.value || settingsStore.settings.sidebarWidth || DEFAULT_SIDEBAR_WIDTH
}

function getPreferredRightSidebarWidth() {
  return lastExpandedRightSidebarWidth.value || settingsStore.settings.rightSidebarWidth || DEFAULT_RIGHT_SIDEBAR_WIDTH
}

function beginWorkbenchConstraintUpdate() {
  isApplyingWorkbenchConstraints = true
  if (clearWorkbenchConstraintPending) return

  clearWorkbenchConstraintPending = true
  nextTick(() => {
    isApplyingWorkbenchConstraints = false
    clearWorkbenchConstraintPending = false
  })
}

function clampWorkbenchWidths() {
  beginWorkbenchConstraintUpdate()

  if (!isSidebarCollapsed.value) {
    sidebarWidth.value = clampSidebarWidth(getPreferredSidebarWidth())
  }

  if (!isRightSidebarCollapsed.value) {
    rightSidebarWidth.value = clampRightSidebarWidth(getPreferredRightSidebarWidth())
  }

  if (!isSidebarCollapsed.value) {
    sidebarWidth.value = clampSidebarWidth(getPreferredSidebarWidth())
  }
}

function handleWindowResize() {
  clampWorkbenchWidths()
}

function startResize(e) {
  if (isSidebarCollapsed.value) return
  clampWorkbenchWidths()
  isResizing.value = true
  isRightResizing.value = false
  resizePointerX.value = e.clientX
  e.preventDefault()
}

function startRightResize(e) {
  if (isRightSidebarCollapsed.value) return
  clampWorkbenchWidths()
  isRightResizing.value = true
  isResizing.value = false
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

    sidebarWidth.value = clampSidebarWidth(e.clientX)
  }

  if (isRightResizing.value) {
    resizePointerX.value = e.clientX
    rightSidebarWidth.value = clampRightSidebarWidth(window.innerWidth - e.clientX)
  }
}

function stopResize() {
  isResizing.value = false
  isRightResizing.value = false
  resizePointerX.value = 0
}

function collapseSidebar() {
  if (!isSidebarCollapsed.value) {
    lastExpandedSidebarWidth.value = getPreferredSidebarWidth()
  }

  settingsStore.updateSettings({
    sidebarCollapsed: true,
    sidebarWidth: lastExpandedSidebarWidth.value
  })
}

function expandSidebar() {
  const preferredWidth = getPreferredSidebarWidth()
  const restoredWidth = clampSidebarWidth(preferredWidth)

  beginWorkbenchConstraintUpdate()
  sidebarWidth.value = restoredWidth
  settingsStore.updateSettings({
    sidebarCollapsed: false,
    sidebarWidth: preferredWidth
  })
}

function toggleSidebar() {
  if (isSidebarCollapsed.value) {
    expandSidebar()
    return
  }

  collapseSidebar()
}

function collapseRightSidebar() {
  if (!isRightSidebarCollapsed.value) {
    lastExpandedRightSidebarWidth.value = getPreferredRightSidebarWidth()
  }

  settingsStore.updateSettings({
    rightSidebarCollapsed: true,
    rightSidebarWidth: lastExpandedRightSidebarWidth.value
  })
}

function expandRightSidebar() {
  const preferredWidth = getPreferredRightSidebarWidth()
  const restoredWidth = clampRightSidebarWidth(preferredWidth)

  beginWorkbenchConstraintUpdate()
  rightSidebarWidth.value = restoredWidth
  settingsStore.updateSettings({
    rightSidebarCollapsed: false,
    rightSidebarWidth: preferredWidth
  })
}

function toggleRightSidebar() {
  if (isRightSidebarCollapsed.value) {
    expandRightSidebar()
    return
  }

  collapseRightSidebar()
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
  if (isApplyingWorkbenchConstraints) return

  if (!isSidebarCollapsed.value) {
    lastExpandedSidebarWidth.value = newWidth
    settingsStore.updateSettings({ sidebarWidth: newWidth })
  }
})

watch(() => settingsStore.settings.sidebarWidth, (newWidth) => {
  if (newWidth) {
    lastExpandedSidebarWidth.value = newWidth
  }

  if (newWidth && !isSidebarCollapsed.value) {
    clampWorkbenchWidths()
  }
})

watch(rightSidebarWidth, (newWidth) => {
  if (isApplyingWorkbenchConstraints) return

  if (!isRightSidebarCollapsed.value) {
    lastExpandedRightSidebarWidth.value = newWidth
    settingsStore.updateSettings({ rightSidebarWidth: newWidth })
  }
})

watch(() => settingsStore.settings.rightSidebarWidth, (newWidth) => {
  if (newWidth) {
    lastExpandedRightSidebarWidth.value = newWidth
  }

  if (newWidth && !isRightSidebarCollapsed.value) {
    clampWorkbenchWidths()
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
  addElectronListener('onFileChanged', (filePath) => {
    handleExternalFileChange(filePath)
  })

  addElectronListener('onUpdateStateChanged', handleUpdateStateChanged)
  hydrateUpdateState()

  // 监听菜单事件
  addElectronListener('onMenuNewFile', () => {
    editorStore.createTab()
  })

  addElectronListener('onMenuOpenFile', async () => {
    await openFileFromDialog()
  })

  addElectronListener('onMenuOpenFolder', async () => {
    await openFolderFromDialog()
  })

  addElectronListener('onMenuSave', () => {
    saveCurrentFile()
  })

  addElectronListener('onMenuSaveAs', () => {
    saveCurrentFileAs()
  })

  addElectronListener('onMenuUndo', () => {
    dispatchEditorEvent(RENDERER_EVENTS.UNDO)
  })

  addElectronListener('onMenuRedo', () => {
    dispatchEditorEvent(RENDERER_EVENTS.REDO)
  })

  addElectronListener('onMenuOpenSettings', () => {
    openSettingsDialog()
  })

  addElectronListener('onMenuCheckForUpdates', async () => {
    await handleCheckForUpdates()
  })

  addElectronListener('onMenuOpenAbout', () => {
    showAboutDialog.value = true
  })

  addElectronListener('onMenuToggleTheme', () => {
    settingsStore.toggleTheme()
  })

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isPresentationMode.value) {
      togglePresentationMode()
    }
    if (isShortcutEvent(e, 'view.togglePresentationMode', undefined, shortcutsStore.shortcutOverrides)) {
      e.preventDefault()
      togglePresentationMode()
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  cleanups.push(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  addElectronListener('onMenuFind', () => {
    dispatchEditorEvent(RENDERER_EVENTS.FIND)
  })

  addElectronListener('onMenuReplace', () => {
    dispatchEditorEvent(RENDERER_EVENTS.REPLACE)
  })

  addElectronListener('onMenuGlobalSearch', () => {
    showGlobalSearchDialog.value = true
  })

  addElectronListener('onMenuTogglePresentationMode', () => {
    togglePresentationMode()
  })

  addElectronListener('onMenuToggleSidebar', () => {
    toggleSidebar()
  })

  addElectronListener('onMenuToggleRightSidebar', () => {
    toggleRightSidebar()
  })

  addElectronListener('onAppBeforeClose', handleAppBeforeClose)

  addElectronListener('onAppOpenFile', (filePath) => {
    openFile(filePath)
  })

  cleanups.push(onRendererEvent(RENDERER_EVENTS.OPEN_GLOBAL_SEARCH, handleOpenGlobalSearchEvent))
  cleanups.push(onRendererEvent(RENDERER_EVENTS.OPEN_FILE, handleOpenFileEvent))
  cleanups.push(onRendererEvent(RENDERER_EVENTS.SAVE_TABS, handleSaveTabsEvent))

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  window.addEventListener('resize', handleWindowResize)
  clampWorkbenchWidths()

  // 恢复上次打开的文件夹
  fileStore.loadLastOpenedFolder().catch((error) => {
    console.warn('Failed to restore last folder:', error)
  })

  // 先处理启动文件，再恢复会话，避免双击打开被慢会话恢复挡住。
  openLaunchFilesThenRestoreSession()
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
  window.removeEventListener('resize', handleWindowResize)
})

async function restoreLastSession(options = {}) {
  const session = editorStore.loadSession()
  const sessionTabs = Array.isArray(session?.tabs) ? session.tabs : []
  const skipFilePathKeys = options.skipFilePathKeys || new Set()

  if (sessionTabs.length > 0) {
    const restoredTabs = []

    for (const snapshot of sessionTabs) {
      if (!snapshot) continue

      if (snapshot.filePath && skipFilePathKeys.has(filePathKey(snapshot.filePath))) {
        const tab = editorStore.findTabByPath(snapshot.filePath)
        if (tab) {
          restoredTabs.push({ previousId: snapshot.id, tab })
        }
        continue
      }

      const title = snapshot.title || (snapshot.filePath ? getPathFileName(snapshot.filePath) : 'Untitled')
      const shouldRestoreSnapshot = !snapshot.filePath || snapshot.isDirty

      if (shouldRestoreSnapshot) {
        const tab = editorStore.createTab(title, snapshot.filePath || null, snapshot.content || '', snapshot.fontSize, {
          sqlDialect: snapshot.sqlDialect,
          pinned: snapshot.pinned,
          language: snapshot.language,
          encoding: snapshot.encoding,
          originalContent: Object.prototype.hasOwnProperty.call(snapshot, 'originalContent') ? snapshot.originalContent : snapshot.content || '',
          isDirty: snapshot.isDirty
        })
        if (snapshot.filePath) {
          rememberFilePath(snapshot.filePath)
        }
        restoredTabs.push({ previousId: snapshot.id, tab })
        continue
      }

      await openFile(snapshot.filePath, { fontSize: snapshot.fontSize, sqlDialect: snapshot.sqlDialect, pinned: snapshot.pinned })
      const tab = editorStore.findTabByPath(snapshot.filePath)
      if (tab) {
        restoredTabs.push({ previousId: snapshot.id, tab })
      }
    }

    editorStore.reorderTabsByPinnedState()

    const activeById = restoredTabs.find(item => item.previousId && item.previousId === session.activeTabId)?.tab
    const activeByIndex = restoredTabs[session.activeTabIndex]?.tab
    const activeByFile = session.activeFile ? editorStore.findTabByPath(session.activeFile) : null
    const activeTab = activeById || activeByFile || activeByIndex
    if (activeTab) {
      editorStore.setActiveTab(activeTab.id)
    }

    return restoredTabs.length > 0
  }

  if (!session?.files?.length) {
    return false
  }

  for (const file of session.files) {
    if (typeof file === 'string') {
      if (skipFilePathKeys.has(filePathKey(file))) continue
      await openFile(file)
      continue
    }
    if (skipFilePathKeys.has(filePathKey(file.path))) continue
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
  background: color-mix(in srgb, var(--bg-secondary) 94%, var(--bg-deep));
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
  box-shadow: var(--shadow-popover);
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
  max-width: none;
  border-right: none;
  background: var(--surface-panel-strong);
  box-shadow: none;
}

.main-editor:not(.resizing) .sidebar {
  transition: width var(--transition-smooth), min-width var(--transition-smooth), max-width var(--transition-smooth);
}

.sidebar.collapsed {
  min-width: 48px;
  padding: 0;
}

.sidebar-pane {
  flex: 0 0 var(--sidebar-pane-width);
  width: var(--sidebar-pane-width);
  min-width: var(--sidebar-pane-width);
  overflow: hidden;
}

.sidebar.collapsed .sidebar-pane {
  flex: 0 0 0;
  width: 0;
  min-width: 0;
  pointer-events: none;
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

.right-resizer {
  position: relative;
  width: 6px;
  margin-left: -3px;
  margin-right: -3px;
  cursor: col-resize;
  background: transparent;
  z-index: 120;
  flex-shrink: 0;
}

.right-resizer::before {
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

.right-resizer:hover::before,
.main-editor.right-resizing .right-resizer::before {
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

.workbench-right-sidebar {
  min-width: 320px;
  max-width: none;
  height: 100%;
  flex: 0 0 auto;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--glass-border);
  background: var(--surface-panel-strong);
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

  .right-resizer {
    width: 6px;
    margin-left: -3px;
    margin-right: -3px;
  }

  .workbench-right-sidebar {
    min-width: 320px;
    max-width: 50vw;
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

  .right-resizer {
    display: none;
  }

  .workbench-right-sidebar {
    display: none;
  }
}

.main-editor.sidebar-collapsed .right-resizer {
  margin-right: -11px;
}

.main-editor.presentation-mode :deep(.markdown-mode-toolbar),
.main-editor.presentation-mode :deep(.markdown-format-toolbar),
.main-editor.presentation-mode :deep(.json-toolbar),
.main-editor.presentation-mode :deep(.sql-toolbar),
.main-editor.presentation-mode :deep(.log-toolbar) {
  display: none !important;
}
</style>
