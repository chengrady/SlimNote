const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme, clipboard } = require('electron')
const { dirname, join, resolve } = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const http = require('http')
const { randomUUID } = require('crypto')
const fs = require('fs')
const iconv = require('iconv-lite')
const { watch } = require('chokidar')
const { createUpdateManager } = require('./updateManager')
const { getPublicAISettings, getPrivateAISettings, updateAISettings, clearAISettings } = require('./aiSettings')
const { streamChatCompletion, resolveChatEndpoint } = require('./aiClient')
const { listAISessions, saveAISession, deleteAISession, clearAISessions } = require('./aiSessions')
const shortcutRegistry = require('../src/shared/shortcutRegistry.json')

let mainWindow = null
let pinWindows = new Map()
let fileWatchers = new Map()
let localFileWriteSuppressions = new Map()
let aiActiveRequests = new Map()
let aiInlineCompletionRequests = new Map()
let pendingOpenFiles = []
let rendererReady = false
let appCloseConfirmed = false
let appClosePromptOpen = false
let appCloseFallbackTimer = null
let pendingOpenFilesFlushTimer = null
let shortcutOverrides = {}
let markdownBrowserPreviewServer = null
let markdownBrowserPreviewOrigin = ''
let markdownBrowserPreviewPages = new Map()
const execFileAsync = promisify(execFile)

const SELF_WRITE_CHANGE_SUPPRESSION_MS = 1000
const SHORTCUTS_CONFIG_FILE = 'shortcuts.json'
const PENDING_OPEN_FILES_FILE = 'pending-open-files.json'
const OPEN_FILES_DEBUG_LOG_FILE = 'open-files-debug.log'
const APP_CLOSE_FALLBACK_TIMEOUT_MS = 8000
const PENDING_OPEN_FILES_LOAD_FLUSH_DELAY_MS = 120
const MARKDOWN_BROWSER_PREVIEW_MAX_AGE_MS = 24 * 60 * 60 * 1000
const MARKDOWN_BROWSER_PREVIEW_MAX_COUNT = 24
const EXTERNAL_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SHORTCUT_MODIFIERS = new Set(['alt', 'cmd', 'cmdorctrl', 'command', 'commandorcontrol', 'control', 'ctrl', 'meta', 'option', 'shift'])
const SHORTCUT_KEYS = new Set(['+', ',', '-', '.', '/', '\\', '`', "'", '=', ';', '[', ']', 'backspace', 'delete', 'del', 'down', 'end', 'enter', 'esc', 'escape', 'home', 'insert', 'left', 'pagedown', 'pageup', 'plus', 'return', 'right', 'space', 'tab', 'up'])
const SEARCH_EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-electron', 'release', 'release-debug'])
const SEARCHABLE_FILE_EXTENSIONS = new Set([
  'txt', 'text', 'md', 'markdown', 'mdx',
  'json', 'jsonc', 'yaml', 'yml', 'xml', 'toml', 'ini', 'conf', 'config', 'properties',
  'log', 'sql', 'csv', 'tsv',
  'js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'jsx', 'tsx', 'vue',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'py', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'
])

// i18n support
let currentLocale = 'zh-CN'
const locales = {
  'zh-CN': {
    menu: {
      file: '文件',
      newFile: '新建文件',
      openFile: '打开文件',
      openFolder: '打开文件夹',
      save: '保存',
      saveAs: '另存为',
      settings: '设置',
      exit: '退出',
      edit: '编辑',
      undo: '撤销',
      redo: '重做',
      cut: '剪切',
      copy: '复制',
      paste: '粘贴',
      view: '视图',
      reload: '重新加载',
      forceReload: '强制重新加载',
      toggleDevTools: '切换开发者工具',
      resetZoom: '重置缩放',
      zoomIn: '放大',
      zoomOut: '缩小',
      toggleTheme: '主题',
      toggleFullscreen: '切换全屏',
      selectAll: '全选',
      find: '查找',
      replace: '替换',
      globalSearch: '全局搜索'
    }
  },
  'en-US': {
    menu: {
      file: 'File',
      newFile: 'New File',
      openFile: 'Open File',
      openFolder: 'Open Folder',
      save: 'Save',
      saveAs: 'Save As',
      settings: 'Settings',
      exit: 'Exit',
      edit: 'Edit',
      undo: 'Undo',
      redo: 'Redo',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      view: 'View',
      reload: 'Reload',
      forceReload: 'Force Reload',
      toggleDevTools: 'Toggle Developer Tools',
      resetZoom: 'Reset Zoom',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      toggleTheme: 'Theme',
      toggleFullscreen: 'Toggle Fullscreen',
      selectAll: 'Select All',
      find: 'Find',
      replace: 'Replace',
      globalSearch: 'Global Search'
    }
  }
}

function t(key) {
  const keys = key.split('.')
  let value = locales[currentLocale]
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      return key
    }
  }
  return value || key
}

function menuLabel(key, zhFallback, enFallback) {
  const value = t(key)
  if (value !== key) return value
  return currentLocale === 'zh-CN' ? zhFallback : enFallback
}

function getShortcutById(id) {
  return shortcutRegistry.find(shortcut => shortcut.id === id) || null
}

function shortcutAccelerator(id) {
  const shortcut = getShortcutById(id)
  if (!shortcut) return undefined
  if (Object.prototype.hasOwnProperty.call(shortcutOverrides, id)) {
    return shortcutOverrides[id] || undefined
  }
  const accelerator = shortcut.accelerator
  if (!accelerator) return undefined
  if (typeof accelerator === 'string') return accelerator
  return accelerator[process.platform] || accelerator.default
}

function sendShortcutCommand(id) {
  const channel = getShortcutById(id)?.channel
  if (channel) mainWindow?.webContents.send(channel)
}

function getShortcutsConfigPath() {
  return join(app.getPath('userData'), SHORTCUTS_CONFIG_FILE)
}

function getPendingOpenFilesPath() {
  return join(app.getPath('userData'), PENDING_OPEN_FILES_FILE)
}

function getOpenFilesDebugLogPath() {
  return join(app.getPath('userData'), OPEN_FILES_DEBUG_LOG_FILE)
}

function writeOpenFilesDebugLog(eventName, payload = {}) {
  try {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      event: eventName,
      payload
    })
    fs.appendFileSync(getOpenFilesDebugLogPath(), `${line}\n`, 'utf8')
  } catch {
    // Best-effort diagnostics only.
  }
}

function loadShortcutOverrides() {
  try {
    const configPath = getShortcutsConfigPath()
    if (!fs.existsSync(configPath)) {
      shortcutOverrides = {}
      return
    }

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    shortcutOverrides = sanitizeShortcutOverrides(parsed?.overrides || {})
  } catch (error) {
    console.error('Failed to load shortcuts:', error)
    shortcutOverrides = {}
  }
}

function saveShortcutOverrides() {
  const configPath = getShortcutsConfigPath()
  fs.mkdirSync(dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify({ overrides: shortcutOverrides }, null, 2), 'utf8')
}

function sanitizeShortcutOverrides(overrides) {
  const validIds = new Set(shortcutRegistry.map(shortcut => shortcut.id))
  return Object.entries(overrides || {}).reduce((result, [id, accelerator]) => {
    if (validIds.has(id) && typeof accelerator === 'string') {
      if (isDeprecatedShortcutOverride(id, accelerator)) return result
      result[id] = accelerator.trim()
    }
    return result
  }, {})
}

function isDeprecatedShortcutOverride(id, accelerator) {
  return id === 'dev.forceReload' && normalizeShortcutAccelerator(accelerator) === normalizeShortcutAccelerator('CmdOrCtrl+Shift+R')
}

function buildShortcutPayload() {
  return {
    ok: true,
    overrides: { ...shortcutOverrides }
  }
}

function notifyShortcutsChanged() {
  createMenu()
  mainWindow?.webContents.send('shortcuts-changed', buildShortcutPayload())
}

function safeSend(sender, channel, payload) {
  try {
    if (!sender || sender.isDestroyed?.()) return
    sender.send(channel, payload)
  } catch {
    // Ignore sends to closed or reloading renderer processes.
  }
}

function clampNumber(value, fallback, minValue, maxValue) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maxValue, Math.max(minValue, number))
}

function cleanInlineCompletionPayloadText(value, maxLength) {
  return String(value || '').slice(0, maxLength)
}

function buildInlineCompletionMessages(payload = {}) {
  const language = String(payload.language || 'plaintext').trim() || 'plaintext'
  const fileName = String(payload.fileName || 'Untitled').trim() || 'Untitled'
  const editorMode = String(payload.editorMode || 'source').trim() || 'source'
  const prefix = cleanInlineCompletionPayloadText(payload.prefix, 20000)
  const suffix = cleanInlineCompletionPayloadText(payload.suffix, 8000)
  const currentLine = cleanInlineCompletionPayloadText(payload.currentLine, 2000)
  const languageRules = [
    language === 'sql' ? 'For SQL, use uppercase keywords.' : '',
    ['json', 'yaml', 'toml'].includes(language) ? 'For structured data, return only syntactically plausible continuation text.' : '',
    language === 'markdown' ? 'For Markdown, preserve lists, tables, code fences, headings, and the document language.' : '',
    ['markdown', 'plaintext'].includes(language) ? 'For Markdown or plain text, when an obvious continuation can be completed coherently, return the full useful continuation across multiple lines; this includes known text, poem, quote, list, table, heading sequence, or log pattern.' : ''
  ].filter(Boolean).join('\n')

  const system = [
    'You are an inline completion engine.',
    'Return only the text that should be inserted at the cursor.',
    'Do not explain.',
    'Do not repeat text that already appears before the cursor.',
    'Do not wrap the answer in Markdown fences.',
    'Prefer concise completions, but include multiple lines when the cursor is clearly inside a coherent continuation.',
    'Respect the document language, syntax, indentation, and formatting.',
    languageRules
  ].filter(Boolean).join('\n')

  const user = [
    `File: ${fileName}`,
    `Language: ${language}`,
    `Editor mode: ${editorMode}`,
    `Current line: ${currentLine}`,
    '<before_cursor>',
    prefix,
    '</before_cursor>',
    '<after_cursor>',
    suffix,
    '</after_cursor>',
    'Return the best inline continuation for the cursor position.'
  ].join('\n')

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]
}

function shouldDisableThinkingForInlineCompletion(settings = {}) {
  if (settings.protocol === 'anthropic') return false
  const model = String(settings.model || '').trim().toLowerCase()
  return model.startsWith('glm-5') || model.startsWith('glm-4.7') || model.startsWith('glm-4.6') || model.startsWith('glm-4.5')
}

function buildInlineCompletionRequestSettings(settings, payload = {}) {
  const maxChars = clampNumber(payload.maxChars, 600, 20, 1200)
  const inlineCompletionURL = String(settings.inlineCompletionURL || '').trim()
  const requestSettings = {
    ...settings,
    baseURL: inlineCompletionURL || settings.baseURL,
    chatEndpointURL: inlineCompletionURL ? '' : settings.chatEndpointURL,
    temperature: 0.2,
    maxTokens: Math.round(clampNumber(Math.ceil(maxChars / 2), 160, 64, 512)),
    timeoutMs: Math.round(clampNumber(settings.timeoutMs, 12000, 5000, 15000))
  }
  if (shouldDisableThinkingForInlineCompletion(requestSettings)) {
    requestSettings.thinking = { type: 'disabled' }
  }
  return requestSettings
}

function resolveDefaultShortcutAccelerator(shortcut) {
  const accelerator = shortcut?.accelerator
  if (!accelerator) return ''
  if (typeof accelerator === 'string') return accelerator
  return accelerator[process.platform] || accelerator.default || ''
}

function resolveEffectiveShortcutAccelerator(shortcut, overrides = shortcutOverrides) {
  if (shortcut?.id && Object.prototype.hasOwnProperty.call(overrides, shortcut.id)) {
    return String(overrides[shortcut.id] || '').trim()
  }
  return resolveDefaultShortcutAccelerator(shortcut)
}

function normalizeShortcutAccelerator(accelerator) {
  if (!accelerator) return ''
  const parts = String(accelerator).split('+').map(part => normalizeShortcutPart(part)).filter(Boolean)
  const modifierOrder = ['ctrl', 'cmd', 'alt', 'shift']
  const modifiers = modifierOrder.filter(modifier => parts.includes(modifier))
  const keys = parts.filter(part => !modifierOrder.includes(part))
  return [...modifiers, ...keys].join('+')
}

function normalizeShortcutPart(part) {
  const value = String(part || '').trim()
  const normalized = value.toLowerCase()
  if (['cmdorctrl', 'commandorcontrol'].includes(normalized)) return process.platform === 'darwin' ? 'cmd' : 'ctrl'
  if (['command', 'cmd', 'meta'].includes(normalized)) return 'cmd'
  if (['control', 'ctrl'].includes(normalized)) return 'ctrl'
  if (['option', 'alt'].includes(normalized)) return 'alt'
  if (normalized === 'shift') return 'shift'
  return normalized
}

function shortcutScopesOverlap(left, right) {
  const globalScopes = new Set(['global', 'native', 'developer'])
  if (left.scope === right.scope) return true
  return globalScopes.has(left.scope) || globalScopes.has(right.scope)
}

function findShortcutConflicts(targetId, accelerator, overrides = shortcutOverrides) {
  const shortcut = getShortcutById(targetId)
  const normalized = normalizeShortcutAccelerator(accelerator)
  if (!shortcut || !normalized) return []

  return shortcutRegistry.filter(candidate => {
    if (candidate.id === targetId) return false
    if (!shortcutScopesOverlap(shortcut, candidate)) return false
    return normalizeShortcutAccelerator(resolveEffectiveShortcutAccelerator(candidate, overrides)) === normalized
  })
}

function isValidShortcutAccelerator(accelerator) {
  if (accelerator === '') return true
  const parts = String(accelerator).split('+').map(part => part.trim()).filter(Boolean)
  if (!parts.length) return false

  const modifiers = new Set()
  let keyCount = 0

  for (const part of parts) {
    const normalized = part.toLowerCase()
    if (SHORTCUT_MODIFIERS.has(normalized)) {
      if (modifiers.has(normalized)) return false
      modifiers.add(normalized)
      continue
    }

    if (!isValidShortcutKey(part)) return false
    keyCount += 1
    if (keyCount > 1) return false
  }

  return keyCount === 1
}

function isValidShortcutKey(key) {
  const value = String(key || '').trim()
  if (/^[A-Za-z0-9]$/.test(value)) return true
  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(value)) return true
  return SHORTCUT_KEYS.has(value.toLowerCase())
}

function normalizeExternalUrl(url) {
  try {
    const parsedUrl = new URL(String(url || '').trim())
    return EXTERNAL_URL_PROTOCOLS.has(parsedUrl.protocol) ? parsedUrl.toString() : ''
  } catch {
    return ''
  }
}

function sanitizeMarkdownPreviewFileName(title) {
  const safeName = String(title || 'markdown-preview')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

  return safeName || 'markdown-preview'
}

function pruneMarkdownBrowserPreviewPages() {
  const now = Date.now()
  for (const [token, preview] of markdownBrowserPreviewPages.entries()) {
    if (now - preview.createdAt > MARKDOWN_BROWSER_PREVIEW_MAX_AGE_MS) {
      markdownBrowserPreviewPages.delete(token)
    }
  }

  if (markdownBrowserPreviewPages.size <= MARKDOWN_BROWSER_PREVIEW_MAX_COUNT) return

  const entries = Array.from(markdownBrowserPreviewPages.entries())
    .sort(([, left], [, right]) => left.createdAt - right.createdAt)

  for (const [token] of entries.slice(0, markdownBrowserPreviewPages.size - MARKDOWN_BROWSER_PREVIEW_MAX_COUNT)) {
    markdownBrowserPreviewPages.delete(token)
  }
}

function sendMarkdownPreviewResponse(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  response.end(body)
}

function handleMarkdownBrowserPreviewRequest(request, response) {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    sendMarkdownPreviewResponse(response, 405, 'Method Not Allowed')
    return
  }

  pruneMarkdownBrowserPreviewPages()

  let requestUrl = null
  try {
    requestUrl = new URL(request.url || '/', markdownBrowserPreviewOrigin || 'http://127.0.0.1')
  } catch {
    sendMarkdownPreviewResponse(response, 400, 'Bad Request')
    return
  }

  const routePrefix = '/markdown-preview/'
  if (!requestUrl.pathname.startsWith(routePrefix)) {
    sendMarkdownPreviewResponse(response, 404, 'Not Found')
    return
  }

  const token = requestUrl.pathname.slice(routePrefix.length)
  const preview = markdownBrowserPreviewPages.get(token)
  if (!preview) {
    sendMarkdownPreviewResponse(response, 404, 'Preview Not Found')
    return
  }

  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  response.end(request.method === 'HEAD' ? '' : preview.html)
}

async function getMarkdownBrowserPreviewOrigin() {
  if (markdownBrowserPreviewServer?.listening && markdownBrowserPreviewOrigin) {
    return markdownBrowserPreviewOrigin
  }

  markdownBrowserPreviewServer = http.createServer(handleMarkdownBrowserPreviewRequest)

  await new Promise((resolvePromise, rejectPromise) => {
    const cleanupListeners = () => {
      markdownBrowserPreviewServer.off('error', handleError)
      markdownBrowserPreviewServer.off('listening', handleListening)
    }
    const handleError = (error) => {
      cleanupListeners()
      rejectPromise(error)
    }
    const handleListening = () => {
      cleanupListeners()
      resolvePromise()
    }

    markdownBrowserPreviewServer.once('error', handleError)
    markdownBrowserPreviewServer.once('listening', handleListening)
    markdownBrowserPreviewServer.listen(0, '127.0.0.1')
  })

  const address = markdownBrowserPreviewServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('Markdown preview server did not return a TCP address')
  }

  markdownBrowserPreviewServer.unref?.()
  markdownBrowserPreviewOrigin = `http://127.0.0.1:${address.port}`
  return markdownBrowserPreviewOrigin
}

async function openBrowserPreviewUrl(previewUrl) {
  try {
    await shell.openExternal(previewUrl)
    return
  } catch (primaryError) {
    if (process.platform !== 'win32') {
      throw new Error(`Failed to open browser URL: ${primaryError.message || primaryError}`)
    }

    try {
      await execFileAsync('cmd.exe', ['/d', '/s', '/c', 'start', '', previewUrl], {
        windowsHide: true,
        timeout: 3000
      })
      return
    } catch (fallbackError) {
      throw new Error(`Failed to open browser URL: ${primaryError.message || primaryError}; Windows Shell fallback failed: ${fallbackError.message}`)
    }
  }
}

async function openMarkdownHtmlInBrowser({ html, title } = {}) {
  pruneMarkdownBrowserPreviewPages()

  const origin = await getMarkdownBrowserPreviewOrigin()
  const safeTitle = sanitizeMarkdownPreviewFileName(title)
  const token = randomUUID().replace(/-/g, '')
  const previewUrl = `${origin}/markdown-preview/${token}`
  markdownBrowserPreviewPages.set(token, {
    html: String(html || ''),
    title: safeTitle,
    createdAt: Date.now()
  })

  try {
    await openBrowserPreviewUrl(previewUrl)
  } catch (error) {
    markdownBrowserPreviewPages.delete(token)
    throw error
  }

  return {
    previewUrl,
    title: safeTitle
  }
}

function clearAppCloseFallbackTimer() {
  if (!appCloseFallbackTimer) return
  clearTimeout(appCloseFallbackTimer)
  appCloseFallbackTimer = null
}

function resetAppClosePromptState() {
  appClosePromptOpen = false
  clearAppCloseFallbackTimer()
}

function clearPendingOpenFilesFlushTimer() {
  if (!pendingOpenFilesFlushTimer) return
  clearTimeout(pendingOpenFilesFlushTimer)
  pendingOpenFilesFlushTimer = null
}

function confirmMainWindowClose() {
  appCloseConfirmed = true
  resetAppClosePromptState()
  mainWindow?.close()
}

async function showAppCloseFallbackDialog(targetWindow) {
  appCloseFallbackTimer = null
  if (appCloseConfirmed || !targetWindow || targetWindow.isDestroyed()) return

  const result = await dialog.showMessageBox(targetWindow, {
    type: 'warning',
    buttons: [
      menuLabel('common.cancel', '取消', 'Cancel'),
      menuLabel('menu.exit', '退出', 'Exit')
    ],
    defaultId: 0,
    cancelId: 0,
    title: menuLabel('app.closeFallbackTitle', '关闭 SlimNote', 'Close SlimNote'),
    message: menuLabel('app.closeFallbackMessage', '关闭确认暂时没有响应。是否直接退出 SlimNote？', 'The close confirmation did not respond. Exit SlimNote anyway?'),
    detail: menuLabel(
      'app.closeFallbackDetail',
      '如果当前窗口仍有未保存内容，请先取消并尝试保存。',
      'If this window still has unsaved changes, cancel and try to save first.'
    )
  })

  if (appCloseConfirmed || !targetWindow || targetWindow.isDestroyed()) return
  if (result.response === 1) {
    confirmMainWindowClose()
    return
  }

  appClosePromptOpen = false
}

function armAppCloseFallback(targetWindow) {
  clearAppCloseFallbackTimer()
  appCloseFallbackTimer = setTimeout(() => {
    showAppCloseFallbackDialog(targetWindow)
  }, APP_CLOSE_FALLBACK_TIMEOUT_MS)
  appCloseFallbackTimer.unref?.()
}

function markLocalFileWriteStarted(filePath) {
  localFileWriteSuppressions.set(filePath, Number.POSITIVE_INFINITY)
}

function markLocalFileWriteFinished(filePath) {
  const expiresAt = Date.now() + SELF_WRITE_CHANGE_SUPPRESSION_MS
  localFileWriteSuppressions.set(filePath, expiresAt)
  const timer = setTimeout(() => {
    if (localFileWriteSuppressions.get(filePath) === expiresAt) {
      localFileWriteSuppressions.delete(filePath)
    }
  }, SELF_WRITE_CHANGE_SUPPRESSION_MS + 50)
  timer.unref?.()
}

function shouldSuppressLocalFileChange(filePath) {
  const expiresAt = localFileWriteSuppressions.get(filePath)
  if (expiresAt === undefined) return false
  if (expiresAt === Number.POSITIVE_INFINITY || expiresAt > Date.now()) return true
  localFileWriteSuppressions.delete(filePath)
  return false
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const iconPath = isDev
  ? join(__dirname, '../public/logo.ico')
  : join(__dirname, '../dist/logo.ico')
const rendererIndexPath = join(__dirname, '../dist/index.html')
const preloadPath = join(__dirname, 'preload.js')
const FALLBACK_DEV_SERVER_URL = 'http://localhost:5173'
const RELEASES_PAGE_URL = 'https://github.com/chengrady/SlimNote/releases'
const UPDATE_FEED = {
  provider: 'github',
  owner: 'chengrady',
  repo: 'SlimNote'
}

function normalizeRendererHash(hash = '') {
  const value = String(hash || '').replace(/^#/, '')
  if (!value) return ''
  return value.startsWith('/') ? value : `/${value}`
}

function resolveDevRendererUrl(hash = '') {
  const devServerUrl = String(process.env.VITE_DEV_SERVER_URL || FALLBACK_DEV_SERVER_URL).trim() || FALLBACK_DEV_SERVER_URL
  const normalizedHash = normalizeRendererHash(hash)
  if (!normalizedHash) return devServerUrl

  const url = new URL(devServerUrl)
  url.hash = normalizedHash
  return url.toString()
}

function loadRendererWindow(targetWindow, hash = '') {
  const normalizedHash = normalizeRendererHash(hash)
  if (isDev) {
    targetWindow.loadURL(resolveDevRendererUrl(normalizedHash))
    return
  }
  if (normalizedHash) {
    targetWindow.loadFile(rendererIndexPath, { hash: normalizedHash })
  } else {
    targetWindow.loadFile(rendererIndexPath)
  }
}

const appDataRoot = app.getPath('appData')
const userDataDir = join(appDataRoot, isDev ? 'SlimNote-dev' : 'SlimNote')
const sessionDataDir = join(userDataDir, 'session')

fs.mkdirSync(userDataDir, { recursive: true })
fs.mkdirSync(sessionDataDir, { recursive: true })

app.setPath('userData', userDataDir)
app.setPath('sessionData', sessionDataDir)

const updateManager = createUpdateManager({
  app,
  getMainWindow: () => mainWindow,
  releaseUrl: RELEASES_PAGE_URL,
  feed: UPDATE_FEED,
  onBeforeInstall: () => {
    appCloseConfirmed = true
    resetAppClosePromptState()
  }
})

function normalizeCandidatePath(candidate, baseDirectory = process.cwd()) {
  if (!candidate || typeof candidate !== 'string') return null

  const trimmed = candidate.trim().replace(/^"+|"+$/g, '')
  if (!trimmed || trimmed.startsWith('--')) return null

  const resolvedPath = resolve(baseDirectory || process.cwd(), trimmed)
  if (!fs.existsSync(resolvedPath)) return null

  try {
    const stat = fs.statSync(resolvedPath)
    return stat.isFile() ? resolvedPath : null
  } catch (error) {
    return null
  }
}

function extractOpenableFilesFromArgv(argv = [], baseDirectory = process.cwd()) {
  const startIndex = app.isPackaged ? 1 : 2
  const candidates = argv.slice(startIndex)
  const filePaths = Array.from(new Set(candidates.map(candidate => normalizeCandidatePath(candidate, baseDirectory)).filter(Boolean)))
  writeOpenFilesDebugLog('extract-openable-files', {
    argv,
    baseDirectory,
    isPackaged: app.isPackaged,
    candidates,
    filePaths
  })
  return filePaths
}

function collectOpenableFiles(...filePathGroups) {
  return Array.from(new Set(filePathGroups.flat().filter(Boolean)))
}

function buildSingleInstanceData() {
  return {
    openFilePaths: extractOpenableFilesFromArgv(process.argv, process.cwd())
  }
}

function getFileExtension(filePath = '') {
  const normalized = String(filePath).split(/[\\/]/).pop() || ''
  const lastDotIndex = normalized.lastIndexOf('.')
  if (lastDotIndex <= 0 || lastDotIndex === normalized.length - 1) {
    return ''
  }

  return normalized.slice(lastDotIndex + 1).toLowerCase()
}

function isSearchableFile(filePath = '') {
  const fileName = String(filePath).split(/[\\/]/).pop()?.toLowerCase() || ''
  if (!fileName) return false

  if (['.gitignore', '.gitattributes', '.editorconfig', 'dockerfile', 'makefile', 'readme', 'license', 'changelog'].includes(fileName)) {
    return true
  }

  if (fileName === '.env' || fileName.startsWith('.env.')) {
    return true
  }

  const extension = getFileExtension(filePath)
  return extension ? SEARCHABLE_FILE_EXTENSIONS.has(extension) : true
}

async function searchInWorkspace({ rootPath, query, matchCase = false, maxResults = 200 } = {}) {
  const normalizedRoot = rootPath && fs.existsSync(rootPath) ? rootPath : null
  const searchQuery = String(query || '').trim()
  const collected = []
  let totalMatches = 0

  if (!normalizedRoot || !searchQuery) {
    return { results: [], totalMatches: 0 }
  }

  const expected = matchCase ? searchQuery : searchQuery.toLowerCase()
  const safeMaxResults = Math.max(1, Number(maxResults) || 200)

  async function walkDirectory(dirPath) {
    if (totalMatches >= safeMaxResults) return

    let entries = []
    try {
      entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    } catch (error) {
      return
    }

    for (const entry of entries) {
      if (totalMatches >= safeMaxResults) break

      const entryPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        if (!SEARCH_EXCLUDED_DIRS.has(entry.name.toLowerCase())) {
          await walkDirectory(entryPath)
        }
        continue
      }

      if (!entry.isFile() || !isSearchableFile(entryPath)) {
        continue
      }

      let stat = null
      try {
        stat = await fs.promises.stat(entryPath)
      } catch (error) {
        continue
      }

      if (!stat || stat.size > 1024 * 1024 * 2) {
        continue
      }

      let content = ''
      try {
        const buffer = await fs.promises.readFile(entryPath)
        content = iconv.decode(buffer, 'utf8')
      } catch (error) {
        continue
      }

      const lines = content.split(/\r?\n/)
      const matches = []

      for (let index = 0; index < lines.length; index += 1) {
        if (totalMatches >= safeMaxResults) break

        const line = lines[index]
        const haystack = matchCase ? line : line.toLowerCase()
        let cursor = 0

        while (cursor <= haystack.length) {
          const foundIndex = haystack.indexOf(expected, cursor)
          if (foundIndex === -1) break

          matches.push({
            lineNumber: index + 1,
            column: foundIndex + 1,
            text: line.trim() || line
          })
          totalMatches += 1

          if (totalMatches >= safeMaxResults) break
          cursor = foundIndex + Math.max(expected.length, 1)
        }
      }

      if (matches.length) {
        collected.push({
          filePath: entryPath,
          matches
        })
      }
    }
  }

  const rootStat = await fs.promises.stat(normalizedRoot).catch(() => null)
  if (!rootStat) {
    return { results: [], totalMatches: 0 }
  }

  if (rootStat.isDirectory()) {
    await walkDirectory(normalizedRoot)
  } else if (rootStat.isFile()) {
    const parentDir = normalizedRoot.replace(/[\\/][^\\/]+$/, '') || normalizedRoot
    await walkDirectory(parentDir)
  }

  return {
    results: collected,
    totalMatches
  }
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
}

function readPersistedPendingOpenFiles() {
  try {
    const pendingPath = getPendingOpenFilesPath()
    if (!fs.existsSync(pendingPath)) return []
    const parsed = JSON.parse(fs.readFileSync(pendingPath, 'utf8'))
    return Array.isArray(parsed?.filePaths) ? parsed.filePaths.map(filePath => normalizeCandidatePath(filePath)).filter(Boolean) : []
  } catch (error) {
    writeOpenFilesDebugLog('read-persisted-pending-open-files-failed', {
      message: error?.message
    })
    return []
  }
}

function writePersistedPendingOpenFiles() {
  try {
    const pendingPath = getPendingOpenFilesPath()
    fs.mkdirSync(dirname(pendingPath), { recursive: true })
    fs.writeFileSync(pendingPath, JSON.stringify({ filePaths: pendingOpenFiles }, null, 2), 'utf8')
  } catch (error) {
    writeOpenFilesDebugLog('write-persisted-pending-open-files-failed', {
      message: error?.message,
      pendingOpenFiles
    })
  }
}

function clearPersistedPendingOpenFiles() {
  try {
    const pendingPath = getPendingOpenFilesPath()
    if (fs.existsSync(pendingPath)) {
      fs.unlinkSync(pendingPath)
    }
  } catch (error) {
    writeOpenFilesDebugLog('clear-persisted-pending-open-files-failed', {
      message: error?.message
    })
  }
}

function queueOpenFiles(filePaths = []) {
  if (!Array.isArray(filePaths) || !filePaths.length) return

  pendingOpenFiles = Array.from(new Set([...pendingOpenFiles, ...filePaths]))
  writePersistedPendingOpenFiles()
  writeOpenFilesDebugLog('queue-open-files', {
    filePaths,
    pendingOpenFiles,
    rendererReady,
    hasMainWindow: Boolean(mainWindow && !mainWindow.isDestroyed())
  })
  flushPendingOpenFiles()

  if (pendingOpenFiles.length && mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
    schedulePendingOpenFilesFlushAfterLoad()
  }
}

function takePendingOpenFiles() {
  const persistedOpenFiles = readPersistedPendingOpenFiles()
  const nextFiles = Array.from(new Set([...pendingOpenFiles, ...persistedOpenFiles]))
  pendingOpenFiles = []
  clearPersistedPendingOpenFiles()
  writeOpenFilesDebugLog('take-pending-open-files', {
    nextFiles
  })
  return nextFiles
}

function flushPendingOpenFiles() {
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed() || !pendingOpenFiles.length) {
    return
  }

  clearPendingOpenFilesFlushTimer()
  const nextFiles = takePendingOpenFiles()

  nextFiles.forEach((filePath) => {
    mainWindow.webContents.send('app-open-file', filePath)
  })
  writeOpenFilesDebugLog('flush-pending-open-files', {
    nextFiles
  })
}

function schedulePendingOpenFilesFlushAfterLoad() {
  clearPendingOpenFilesFlushTimer()
  if (!mainWindow || mainWindow.isDestroyed() || !pendingOpenFiles.length) return

  pendingOpenFilesFlushTimer = setTimeout(() => {
    pendingOpenFilesFlushTimer = null
    if (!mainWindow || mainWindow.isDestroyed() || !pendingOpenFiles.length) return

    // 文件关联路径可能在渲染端挂载前到达，load 完成后补发一次，避免只能靠手动刷新消费 pending。
    rendererReady = true
    writeOpenFilesDebugLog('flush-pending-open-files-after-load', {
      pendingOpenFiles
    })
    flushPendingOpenFiles()
  }, PENDING_OPEN_FILES_LOAD_FLUSH_DELAY_MS)
  pendingOpenFilesFlushTimer.unref?.()
}

async function openFileAssociationSettings() {
  try {
    if (process.platform === 'win32') {
      await shell.openExternal('ms-settings:defaultapps')
      return { ok: true }
    }

    if (process.platform === 'darwin') {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.general')
      return { ok: true }
    }

    return {
      ok: false,
      message: '当前平台暂未提供系统文件关联设置入口。'
    }
  } catch (error) {
    console.error('Failed to open file association settings:', error)
    return {
      ok: false,
      message: error.message || '无法打开系统文件关联设置。'
    }
  }
}

async function checkForUpdates(options = {}) {
  return await updateManager.checkForUpdates(options)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock(buildSingleInstanceData())

if (!gotSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', (event, argv, workingDirectory, additionalData = {}) => {
  const filePaths = collectOpenableFiles(
    additionalData?.openFilePaths,
    extractOpenableFilesFromArgv(argv, workingDirectory || process.cwd())
  )
  writeOpenFilesDebugLog('second-instance', {
    argv,
    workingDirectory,
    additionalData,
    filePaths
  })
  focusMainWindow()
  queueOpenFiles(filePaths)
})

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  focusMainWindow()
  const normalizedPath = normalizeCandidatePath(filePath)
  writeOpenFilesDebugLog('open-file-event', {
    filePath,
    normalizedPath
  })
  if (normalizedPath) {
    queueOpenFiles([normalizedPath])
  }
})

// Window State Management
function getStorePath() {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadPinWindowBounds() {
  try {
    const storePath = getStorePath()
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
      return data.pinWindow || { width: 400, height: 300 }
    }
  } catch (e) {
    console.error('Failed to load window state', e)
  }
  return { width: 400, height: 300 }
}

function savePinWindowBounds(bounds) {
  try {
    const storePath = getStorePath()
    let data = {}
    if (fs.existsSync(storePath)) {
      data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
    }
    data.pinWindow = bounds
    fs.writeFileSync(storePath, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save window state', e)
  }
}

async function exportMarkdownPdf({ html, defaultPath } = {}) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出 PDF',
    defaultPath,
    filters: [
      { name: 'PDF 文档', extensions: ['pdf'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  let pdfWindow = null

  try {
    pdfWindow = new BrowserWindow({
      show: false,
      width: 960,
      height: 1280,
      backgroundColor: '#ffffff',
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        javascript: true
      }
    })

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html || '')}`)
    await pdfWindow.webContents.executeJavaScript('document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : Promise.resolve(true)', true)
    await pdfWindow.webContents.executeJavaScript('window.__slimnotePdfReady || Promise.resolve(true)', true)
    await new Promise((resolve) => setTimeout(resolve, 80))

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    })

    await fs.promises.writeFile(result.filePath, pdfBuffer)

    return {
      canceled: false,
      filePath: result.filePath
    }
  } finally {
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      pdfWindow.close()
    }
  }
}

function createWindow() {
  rendererReady = false
  appCloseConfirmed = false
  appClosePromptOpen = false
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false, // Custom TitleBar
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: iconPath,
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level < 2) return
    console.error(`[renderer:${level}] ${sourceId || 'unknown'}:${line || 0} ${message}`)
  })

  mainWindow.webContents.on('did-start-loading', () => {
    rendererReady = false
    resetAppClosePromptState()
    clearPendingOpenFilesFlushTimer()
    writeOpenFilesDebugLog('did-start-loading')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    writeOpenFilesDebugLog('did-finish-load', {
      pendingOpenFiles
    })
    schedulePendingOpenFilesFlushAfterLoad()
  })

  mainWindow.webContents.on('render-process-gone', () => {
    rendererReady = false
    resetAppClosePromptState()
    clearPendingOpenFilesFlushTimer()
    writeOpenFilesDebugLog('render-process-gone')
  })

  loadRendererWindow(mainWindow)

  mainWindow.on('closed', () => {
    rendererReady = false
    resetAppClosePromptState()
    clearPendingOpenFilesFlushTimer()
    mainWindow = null
  })

  mainWindow.on('close', (event) => {
    if (appCloseConfirmed || !mainWindow || mainWindow.isDestroyed()) return
    if (!rendererReady || mainWindow.webContents.isDestroyed()) {
      appCloseConfirmed = true
      resetAppClosePromptState()
      return
    }

    event.preventDefault()
    if (appClosePromptOpen || mainWindow.webContents.isDestroyed()) return

    appClosePromptOpen = true
    mainWindow.webContents.send('app-before-close')
    armAppCloseFallback(mainWindow)
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-unmaximized')
  })

  // Context Menu
  ipcMain.on('show-editor-context-menu', (event) => {
    const menu = Menu.buildFromTemplate([
      { label: t('menu.cut'), role: 'cut' },
      { label: t('menu.copy'), role: 'copy' },
      { label: t('menu.paste'), role: 'paste' },
      { type: 'separator' },
      { label: t('menu.selectAll'), role: 'selectAll' }
    ])
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
  })

  createMenu()
}

function createMenu() {
  const template = [
    {
      label: t('menu.file'),
      submenu: [
        {
          label: t('menu.newFile'),
          accelerator: shortcutAccelerator('file.newFile'),
          click: () => sendShortcutCommand('file.newFile')
        },
        {
          label: t('menu.openFile'),
          accelerator: shortcutAccelerator('file.openFile'),
          click: () => sendShortcutCommand('file.openFile')
        },
        {
          label: t('menu.openFolder'),
          accelerator: shortcutAccelerator('file.openFolder'),
          click: () => sendShortcutCommand('file.openFolder')
        },
        { type: 'separator' },
        {
          label: t('menu.save'),
          accelerator: shortcutAccelerator('file.save'),
          click: () => sendShortcutCommand('file.save')
        },
        {
          label: t('menu.saveAs'),
          accelerator: shortcutAccelerator('file.saveAs'),
          click: () => sendShortcutCommand('file.saveAs')
        },
        { type: 'separator' },
        {
          label: t('menu.settings'),
          accelerator: shortcutAccelerator('file.settings'),
          click: () => sendShortcutCommand('file.settings')
        },
        { type: 'separator' },
        { label: t('menu.exit'), role: 'quit' }
      ]
    },
    {
      label: t('menu.edit'),
      submenu: [
        {
          label: t('menu.undo'),
          accelerator: shortcutAccelerator('edit.undo'),
          click: () => sendShortcutCommand('edit.undo')
        },
        {
          label: t('menu.redo'),
          accelerator: shortcutAccelerator('edit.redo'),
          click: () => sendShortcutCommand('edit.redo')
        },
        { type: 'separator' },
        { label: t('menu.cut'), role: 'cut', accelerator: shortcutAccelerator('edit.cut') },
        { label: t('menu.copy'), role: 'copy', accelerator: shortcutAccelerator('edit.copy') },
        { label: t('menu.paste'), role: 'paste', accelerator: shortcutAccelerator('edit.paste') },
        { label: t('menu.selectAll'), role: 'selectAll', accelerator: shortcutAccelerator('edit.selectAll') },
        { type: 'separator' },
        {
          label: t('menu.find'),
          accelerator: shortcutAccelerator('edit.find'),
          click: () => sendShortcutCommand('edit.find')
        },
        {
          label: t('menu.replace'),
          accelerator: shortcutAccelerator('edit.replace'),
          click: () => sendShortcutCommand('edit.replace')
        },
        {
          label: t('menu.globalSearch'),
          accelerator: shortcutAccelerator('edit.globalSearch'),
          click: () => sendShortcutCommand('edit.globalSearch')
        }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.reload'), role: 'reload' },
        { label: t('menu.forceReload'), click: () => mainWindow?.webContents.reloadIgnoringCache() },
        { label: t('menu.toggleDevTools'), role: 'toggleDevTools' },
        { type: 'separator' },
        { label: t('menu.resetZoom'), role: 'resetZoom' },
        { label: t('menu.zoomIn'), role: 'zoomIn' },
        { label: t('menu.zoomOut'), role: 'zoomOut' },
        { type: 'separator' },
        {
          label: t('menu.toggleFullscreen'),
          accelerator: shortcutAccelerator('view.toggleFullscreen'),
          click: () => {
            if (!mainWindow) return
            mainWindow.setFullScreen(!mainWindow.isFullScreen())
          }
        },
        {
          label: menuLabel('menu.togglePresentationMode', '演示模式', 'Presentation Mode'),
          accelerator: shortcutAccelerator('view.togglePresentationMode'),
          click: () => sendShortcutCommand('view.togglePresentationMode')
        }
      ]
    },
    {
      label: menuLabel('menu.help', '帮助', 'Help'),
      submenu: [
        {
          label: menuLabel('menu.checkUpdates', '检查更新', 'Check for Updates'),
          click: () => mainWindow?.webContents.send('menu-check-for-updates')
        },
        {
          label: menuLabel('menu.about', '关于 SlimNote', 'About SlimNote'),
          click: () => mainWindow?.webContents.send('menu-open-about')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Register all IPC handlers
function registerIpcHandlers() {
  // i18n
  ipcMain.handle('get-system-locale', () => {
    const locale = app.getLocale()
    // 将类似 zh-CN, zh_CN, en-US, en_US 等格式统一
    if (locale.startsWith('zh')) return 'zh-CN'
    return 'en-US'
  })

  ipcMain.on('update-locale', (event, locale) => {
    if (locales[locale]) {
      currentLocale = locale
      createMenu()
    }
  })

  ipcMain.handle('get-shortcuts', () => buildShortcutPayload())

  ipcMain.handle('update-shortcut', (_event, payload = {}) => {
    const id = String(payload.id || '')
    const shortcut = getShortcutById(id)
    if (!shortcut) {
      return { ok: false, message: 'Shortcut not found' }
    }

    const accelerator = String(payload.accelerator ?? '').trim()
    if (!isValidShortcutAccelerator(accelerator)) {
      return { ok: false, message: 'Invalid shortcut accelerator' }
    }

    const nextOverrides = { ...shortcutOverrides }
    const defaultAccelerator = resolveDefaultShortcutAccelerator(shortcut)
    if (accelerator && normalizeShortcutAccelerator(accelerator) === normalizeShortcutAccelerator(defaultAccelerator)) {
      delete nextOverrides[id]
    } else {
      nextOverrides[id] = accelerator
    }

    const conflicts = findShortcutConflicts(id, accelerator, nextOverrides)
    if (conflicts.length) {
      return {
        ok: false,
        message: 'Shortcut conflict',
        conflictIds: conflicts.map(conflict => conflict.id)
      }
    }

    shortcutOverrides = nextOverrides
    saveShortcutOverrides()
    notifyShortcutsChanged()
    return buildShortcutPayload()
  })

  ipcMain.handle('reset-shortcut', (_event, id) => {
    const shortcutId = String(id || '')
    if (!getShortcutById(shortcutId)) {
      return { ok: false, message: 'Shortcut not found' }
    }

    const nextOverrides = { ...shortcutOverrides }
    delete nextOverrides[shortcutId]
    shortcutOverrides = nextOverrides
    saveShortcutOverrides()
    notifyShortcutsChanged()
    return buildShortcutPayload()
  })

  ipcMain.handle('reset-shortcuts', () => {
    shortcutOverrides = {}
    saveShortcutOverrides()
    notifyShortcutsChanged()
    return buildShortcutPayload()
  })

  ipcMain.handle('ai:get-settings', () => getPublicAISettings())

  ipcMain.handle('ai:update-settings', (_event, payload = {}) => {
    return updateAISettings(payload)
  })

  ipcMain.handle('ai:clear-settings', () => clearAISettings())

  ipcMain.handle('ai:test-connection', async (_event, payload = {}) => {
    const settings = getPrivateAISettings(payload || '')
    let request = null

    try {
      await new Promise((resolve, reject) => {
        let settled = false
        let timer = null
        const settle = (handler, value) => {
          if (settled) return
          settled = true
          if (timer) clearTimeout(timer)
          handler(value)
        }
        timer = setTimeout(() => {
          request?.stop()
          settle(reject, new Error('AI test timed out'))
        }, Math.min(Math.max(Number(settings.timeoutMs) || 10000, 1000), 15000))
        timer.unref?.()

        try {
          request = streamChatCompletion(settings, [{ role: 'user', content: 'Say OK.' }], {
            onChunk: () => {
              request?.stop()
              settle(resolve)
            },
            onComplete: () => settle(resolve)
          })
          request.done.then(() => settle(resolve)).catch(error => settle(reject, error))
        } catch (error) {
          settle(reject, error)
        }
      })

      return { ok: true }
    } catch (error) {
      request?.stop()
      return { ok: false, message: error.message || 'AI test failed' }
    }
  })

  ipcMain.handle('ai:list-sessions', () => listAISessions())

  ipcMain.handle('ai:save-session', (_event, session) => saveAISession(session || {}))

  ipcMain.handle('ai:delete-session', (_event, id) => deleteAISession(String(id || '')))

  ipcMain.handle('ai:clear-sessions', () => clearAISessions())

  ipcMain.handle('ai:chat-start', async (event, payload = {}) => {
    const requestId = String(payload.requestId || '')
    const messages = Array.isArray(payload.messages) ? payload.messages : []
    if (!requestId || messages.length === 0) return { ok: false, message: 'Invalid AI chat request' }
    if (aiActiveRequests.has(requestId)) return { ok: false, message: 'AI request already running' }

    try {
      const settings = getPrivateAISettings({ providerId: payload.providerId, modelId: payload.modelId })
      const request = streamChatCompletion(settings, messages, {
        onStatus: (phase) => safeSend(event.sender, 'ai:chat-status', { requestId, phase }),
        onReasoning: (text) => safeSend(event.sender, 'ai:chat-reasoning', { requestId, text }),
        onChunk: (text) => safeSend(event.sender, 'ai:chat-chunk', { requestId, text }),
        onComplete: () => safeSend(event.sender, 'ai:chat-complete', { requestId })
      })

      aiActiveRequests.set(requestId, request)
      request.done.catch((error) => {
        safeSend(event.sender, 'ai:chat-error', { requestId, message: error.message || 'AI request failed' })
      }).finally(() => {
        if (aiActiveRequests.get(requestId) === request) aiActiveRequests.delete(requestId)
      })

      return { ok: true, requestId }
    } catch (error) {
      return { ok: false, message: error.message || 'AI request failed' }
    }
  })

  ipcMain.handle('ai:chat-stop', (_event, requestId) => {
    const key = String(requestId || '')
    const request = aiActiveRequests.get(key)
    if (!request) return { ok: false, message: 'AI request not found' }

    request.stop()
    aiActiveRequests.delete(key)
    return { ok: true }
  })

  ipcMain.handle('ai:inline-completion-start', async (event, payload = {}) => {
    const requestId = String(payload.requestId || '')
    if (!requestId) {
      console.info('[inline-completion][main] start-rejected', { reason: 'request-id-missing' })
      return { ok: false, message: 'Invalid inline completion request' }
    }
    if (aiInlineCompletionRequests.has(requestId)) {
      console.info('[inline-completion][main] start-rejected', { requestId, reason: 'already-running' })
      return { ok: false, message: 'Inline completion request already running' }
    }

    try {
      console.info('[inline-completion][main] start', {
        requestId,
        providerId: payload.providerId || '',
        modelId: payload.modelId || '',
        language: payload.language || '',
        editorMode: payload.editorMode || '',
        prefixLength: String(payload.prefix || '').length,
        suffixLength: String(payload.suffix || '').length,
        currentLineLength: String(payload.currentLine || '').length
      })
      const settings = buildInlineCompletionRequestSettings(
        getPrivateAISettings({ providerId: payload.providerId, modelId: payload.modelId }),
        payload
      )
      console.info('[inline-completion][main] settings', {
        requestId,
        providerId: settings.providerId || '',
        modelId: settings.modelId || '',
        model: settings.model || '',
        protocol: settings.protocol || '',
        baseURL: settings.baseURL || '',
        inlineCompletionURL: settings.inlineCompletionURL || '',
        chatEndpointPath: settings.chatEndpointPath || '',
        chatEndpointURL: settings.chatEndpointURL || '',
        endpoint: resolveChatEndpoint(settings),
        timeoutMs: settings.timeoutMs,
        maxTokens: settings.maxTokens,
        thinking: settings.thinking || null,
        hasApiKey: Boolean(settings.apiKey)
      })
      const messages = buildInlineCompletionMessages(payload)
      console.info('[inline-completion][main] messages', { requestId, count: messages.length, systemLength: messages[0]?.content?.length || 0, userLength: messages[1]?.content?.length || 0 })
      const request = streamChatCompletion(settings, messages, {
        onStatus: (phase) => {
          console.info('[inline-completion][main] status', { requestId, phase })
          safeSend(event.sender, 'ai:inline-completion-status', { requestId, phase })
        },
        onChunk: (text) => {
          console.info('[inline-completion][main] chunk', { requestId, length: String(text || '').length })
          safeSend(event.sender, 'ai:inline-completion-chunk', { requestId, text })
        },
        onComplete: () => {
          console.info('[inline-completion][main] complete', { requestId })
          safeSend(event.sender, 'ai:inline-completion-complete', { requestId })
        }
      })

      aiInlineCompletionRequests.set(requestId, request)
      request.done.catch((error) => {
        console.info('[inline-completion][main] error', { requestId, message: error.message || 'AI inline completion failed' })
        safeSend(event.sender, 'ai:inline-completion-error', { requestId, message: error.message || 'AI inline completion failed' })
      }).finally(() => {
        console.info('[inline-completion][main] finished', { requestId })
        if (aiInlineCompletionRequests.get(requestId) === request) aiInlineCompletionRequests.delete(requestId)
      })

      return { ok: true, requestId }
    } catch (error) {
      console.info('[inline-completion][main] start-error', { requestId, message: error.message || 'AI inline completion failed' })
      return { ok: false, message: error.message || 'AI inline completion failed' }
    }
  })

  ipcMain.handle('ai:inline-completion-stop', (_event, requestId) => {
    const key = String(requestId || '')
    const request = aiInlineCompletionRequests.get(key)
    if (!request) {
      console.info('[inline-completion][main] stop-missing', { requestId: key })
      return { ok: false, message: 'AI inline completion request not found' }
    }

    console.info('[inline-completion][main] stop', { requestId: key })
    request.stop()
    aiInlineCompletionRequests.delete(key)
    return { ok: true }
  })

  // Window Controls
  ipcMain.handle('is-maximized', () => mainWindow?.isMaximized())
  ipcMain.on('window-min', () => mainWindow?.minimize())
  ipcMain.on('window-max', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window-close', () => mainWindow?.close())
  ipcMain.on('confirm-app-close', () => {
    confirmMainWindowClose()
  })
  ipcMain.on('cancel-app-close', () => {
    resetAppClosePromptState()
  })
  ipcMain.on('window-toggle-fullscreen', () => {
    if (!mainWindow) return
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })
  ipcMain.on('window-reload', () => mainWindow?.webContents.reload())
  ipcMain.on('window-force-reload', () => mainWindow?.webContents.reloadIgnoringCache())
  ipcMain.on('window-toggle-devtools', () => mainWindow?.webContents.toggleDevTools())

  ipcMain.on('set-theme', (event, theme) => {
    nativeTheme.themeSource = theme
  })

  ipcMain.handle('open-external', async (_event, url) => {
    const externalUrl = normalizeExternalUrl(url)
    if (!externalUrl) return false
    await shell.openExternal(externalUrl)
    return true
  })

  // File System Operations
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const buffer = await fs.promises.readFile(filePath)
      const str = iconv.decode(buffer, 'utf8')
      return {
        content: str,
        encoding: 'utf8',
        path: filePath
      }
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  })

  ipcMain.handle('write-file', async (event, { filePath, content, encoding }) => {
    markLocalFileWriteStarted(filePath)
    try {
      const buffer = iconv.encode(content, encoding || 'utf8')
      await fs.promises.writeFile(filePath, buffer)
      return true
    } catch (error) {
      console.error('Error writing file:', error)
      throw error
    } finally {
      markLocalFileWriteFinished(filePath)
    }
  })

  ipcMain.handle('write-clipboard', async (event, payload = {}) => {
    try {
      clipboard.write(payload || {})
      return true
    } catch (error) {
      console.error('Error writing clipboard:', error)
      throw error
    }
  })

  ipcMain.handle('read-dir', async (event, dirPath) => {
    try {
      const files = await fs.promises.readdir(dirPath, { withFileTypes: true })
      return files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        path: join(dirPath, file.name)
      }))
    } catch (error) {
      console.error('Error reading directory:', error)
      throw error
    }
  })

  ipcMain.handle('create-file', async (event, filePath) => {
    try {
      await fs.promises.writeFile(filePath, '')
      return true
    } catch (error) {
      throw error
    }
  })

  ipcMain.handle('create-folder', async (event, folderPath) => {
    try {
      await fs.promises.mkdir(folderPath)
      return true
    } catch (error) {
      throw error
    }
  })

  ipcMain.handle('delete-path', async (event, path) => {
    try {
      await fs.promises.rm(path, { recursive: true, force: true })
      return true
    } catch (error) {
      throw error
    }
  })

  ipcMain.handle('rename-path', async (event, { oldPath, newPath }) => {
    try {
      await fs.promises.rename(oldPath, newPath)
      return true
    } catch (error) {
      throw error
    }
  })

  ipcMain.handle('show-item-in-folder', async (event, filePath) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('watch-file', (event, filePath) => {
    if (fileWatchers.has(filePath)) return

    const watcher = watch(filePath)
    watcher.on('change', () => {
      if (shouldSuppressLocalFileChange(filePath)) return
      mainWindow?.webContents.send('file-changed', filePath)
    })

    fileWatchers.set(filePath, watcher)
  })

  ipcMain.handle('unwatch-file', (event, filePath) => {
    const watcher = fileWatchers.get(filePath)
    if (watcher) {
      watcher.close()
      fileWatchers.delete(filePath)
    }
  })

  ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options)
    return result
  })

  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options)
    return result
  })

  ipcMain.handle('search-in-workspace', async (event, payload = {}) => {
    return await searchInWorkspace(payload)
  })

  ipcMain.handle('export-markdown-pdf', async (event, payload) => {
    try {
      return await exportMarkdownPdf(payload || {})
    } catch (error) {
      console.error('Error exporting markdown PDF:', error)
      throw error
    }
  })

  ipcMain.handle('open-markdown-html-in-browser', async (_event, payload) => {
    try {
      return await openMarkdownHtmlInBrowser(payload || {})
    } catch (error) {
      console.error('Error opening markdown HTML in browser:', error)
      throw error
    }
  })

  ipcMain.handle('open-file-association-settings', async () => {
    return await openFileAssociationSettings()
  })

  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates({ manual: true })
  })

  ipcMain.handle('download-update', async () => {
    return await updateManager.downloadUpdate()
  })

  ipcMain.handle('install-update', () => {
    return updateManager.installUpdate()
  })

  ipcMain.handle('get-update-state', () => {
    return updateManager.getState()
  })

  ipcMain.handle('consume-pending-open-files', () => {
    rendererReady = true
    const filePaths = takePendingOpenFiles()
    writeOpenFilesDebugLog('consume-pending-open-files', {
      filePaths
    })
    updateManager.scheduleAutoCheck()
    return filePaths
  })

  ipcMain.on('renderer-ready', () => {
    rendererReady = true
    writeOpenFilesDebugLog('renderer-ready')
    flushPendingOpenFiles()
    updateManager.scheduleAutoCheck()
  })

  // Pin Window
  ipcMain.handle('create-pin-window', (event, { content, theme, language }) => {
    const bounds = loadPinWindowBounds()
    const win = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      title: 'SlimNote Pin',
      icon: iconPath,
      alwaysOnTop: true,
      frame: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      }
    })

    const winId = win.id
    pinWindows.set(winId, win)

    loadRendererWindow(win, `/pin?id=${winId}`)

    win.webContents.once('did-finish-load', () => {
      win.webContents.send('init-pin-content', { content, theme, language })
    })

    let resizeTimeout
    win.on('resize', () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const { width, height } = win.getBounds()
        savePinWindowBounds({ width, height })
      }, 500)
    })

    win.on('closed', () => {
      pinWindows.delete(winId)
    })

    return winId
  })

  ipcMain.handle('close-pin-window', (event, id) => {
    const win = pinWindows.get(id)
    if (win) {
      win.close()
    }
  })

  // Context menu
  ipcMain.on('show-context-menu', (event, menuName, position) => {
    const template = Menu.getApplicationMenu()?.items.find(item => item.label === menuName)?.submenu
    if (template) {
      const opts = { window: BrowserWindow.fromWebContents(event.sender) }
      if (position) {
        opts.x = position.x
        opts.y = position.y
      }
      template.popup(opts)
    }
  })
}

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    writeOpenFilesDebugLog('app-ready', {
      argv: process.argv,
      cwd: process.cwd(),
      isPackaged: app.isPackaged
    })
    loadShortcutOverrides()
    registerIpcHandlers()
    createWindow()
    queueOpenFiles(extractOpenableFilesFromArgv(process.argv))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        flushPendingOpenFiles()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
