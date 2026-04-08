const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme, clipboard } = require('electron')
const { join, resolve } = require('path')
const fs = require('fs')
const https = require('https')
const iconv = require('iconv-lite')
const { watch } = require('chokidar')

let mainWindow = null
let pinWindows = new Map()
let fileWatchers = new Map()
let pendingOpenFiles = []
let rendererReady = false

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
      openFolder: '打开目录',
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
      toggleTheme: '切换主题',
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
      toggleTheme: 'Toggle Theme',
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

function requestJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `SlimNote/${app.getVersion()}`,
        ...headers
      }
    }, (response) => {
      const chunks = []

      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        const statusCode = response.statusCode || 0

        if (statusCode < 200 || statusCode >= 300) {
          let message = `GitHub API responded with status ${statusCode}`

          try {
            const payload = JSON.parse(body)
            if (payload?.message) {
              message = payload.message
            }
          } catch (error) {
            // Ignore parse errors for non-JSON responses.
          }

          reject(new Error(message))
          return
        }

        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(new Error('Invalid response from release service'))
        }
      })
    })

    request.on('error', reject)
    request.setTimeout(8000, () => {
      request.destroy(new Error('Request timed out'))
    })
  })
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const iconPath = isDev
  ? join(__dirname, '../public/logo.ico')
  : join(__dirname, '../dist/logo.ico')
const rendererIndexPath = join(__dirname, '../dist/index.html')
const preloadPath = join(__dirname, 'preload.js')
const RELEASES_PAGE_URL = 'https://github.com/chengrady/SlimNote/releases'
const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/chengrady/SlimNote/releases/latest'

const appDataRoot = app.getPath('appData')
const userDataDir = join(appDataRoot, isDev ? 'SlimNote-dev' : 'SlimNote')
const sessionDataDir = join(userDataDir, 'session')

fs.mkdirSync(userDataDir, { recursive: true })
fs.mkdirSync(sessionDataDir, { recursive: true })

app.setPath('userData', userDataDir)
app.setPath('sessionData', sessionDataDir)

function normalizeCandidatePath(candidate) {
  if (!candidate || typeof candidate !== 'string') return null

  const trimmed = candidate.trim().replace(/^"+|"+$/g, '')
  if (!trimmed || trimmed.startsWith('--')) return null

  const resolvedPath = resolve(trimmed)
  if (!fs.existsSync(resolvedPath)) return null

  try {
    const stat = fs.statSync(resolvedPath)
    return stat.isFile() ? resolvedPath : null
  } catch (error) {
    return null
  }
}

function extractOpenableFilesFromArgv(argv = []) {
  const startIndex = app.isPackaged ? 1 : 2
  const candidates = argv.slice(startIndex)
  return Array.from(new Set(candidates.map(normalizeCandidatePath).filter(Boolean)))
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

function queueOpenFiles(filePaths = []) {
  if (!Array.isArray(filePaths) || !filePaths.length) return

  pendingOpenFiles = Array.from(new Set([...pendingOpenFiles, ...filePaths]))
  flushPendingOpenFiles()
}

function flushPendingOpenFiles() {
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed() || !pendingOpenFiles.length) {
    return
  }

  const nextFiles = pendingOpenFiles
  pendingOpenFiles = []

  nextFiles.forEach((filePath) => {
    mainWindow.webContents.send('app-open-file', filePath)
  })
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

async function checkForUpdates() {
  const currentVersion = normalizeVersionTag(app.getVersion())

  try {
    const release = await requestJson(LATEST_RELEASE_API_URL)
    const latestVersion = normalizeVersionTag(release?.tag_name || release?.name || '')

    if (!latestVersion) {
      throw new Error('Latest release version is missing')
    }

    return {
      ok: true,
      currentVersion,
      latestVersion,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      releaseName: release?.name || release?.tag_name || latestVersion,
      releaseUrl: release?.html_url || RELEASES_PAGE_URL,
      publishedAt: release?.published_at || ''
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
    return {
      ok: false,
      currentVersion,
      releaseUrl: RELEASES_PAGE_URL,
      message: error?.message || 'Unable to check for updates right now.'
    }
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', (event, argv) => {
  const filePaths = extractOpenableFilesFromArgv(argv)
  focusMainWindow()
  queueOpenFiles(filePaths)
})

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  focusMainWindow()
  const normalizedPath = normalizeCandidatePath(filePath)
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(rendererIndexPath)
  }

  mainWindow.on('closed', () => {
    rendererReady = false
    mainWindow = null
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
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-file')
        },
        {
          label: t('menu.openFile'),
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open-file')
        },
        {
          label: t('menu.openFolder'),
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow?.webContents.send('menu-open-folder')
        },
        { type: 'separator' },
        {
          label: t('menu.save'),
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save')
        },
        {
          label: t('menu.saveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-save-as')
        },
        { type: 'separator' },
        {
          label: t('menu.settings'),
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu-open-settings')
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
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu-undo')
        },
        {
          label: t('menu.redo'),
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          click: () => mainWindow?.webContents.send('menu-redo')
        },
        { type: 'separator' },
        { label: t('menu.cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' },
        { label: t('menu.copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' },
        { label: t('menu.paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' },
        { label: t('menu.selectAll'), role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
        { type: 'separator' },
        {
          label: t('menu.find'),
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu-find')
        },
        {
          label: t('menu.replace'),
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow?.webContents.send('menu-replace')
        },
        {
          label: t('menu.globalSearch'),
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow?.webContents.send('menu-global-search')
        }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.reload'), role: 'reload' },
        { label: t('menu.forceReload'), role: 'forceReload' },
        { label: t('menu.toggleDevTools'), role: 'toggleDevTools' },
        { type: 'separator' },
        { label: t('menu.resetZoom'), role: 'resetZoom' },
        { label: t('menu.zoomIn'), role: 'zoomIn' },
        { label: t('menu.zoomOut'), role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          click: () => mainWindow?.webContents.send('menu-toggle-sidebar')
        },
        {
          label: t('menu.toggleTheme'),
          click: () => mainWindow?.webContents.send('menu-toggle-theme')
        },
        { type: 'separator' },
        { label: t('menu.toggleFullscreen'), role: 'togglefullscreen' }
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
    await shell.openExternal(url)
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
    try {
      const buffer = iconv.encode(content, encoding || 'utf8')
      await fs.promises.writeFile(filePath, buffer)
      return true
    } catch (error) {
      console.error('Error writing file:', error)
      throw error
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

  ipcMain.handle('open-file-association-settings', async () => {
    return await openFileAssociationSettings()
  })

  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates()
  })

  ipcMain.on('renderer-ready', () => {
    rendererReady = true
    flushPendingOpenFiles()
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

    if (isDev) {
      win.loadURL(`http://localhost:5173/#/pin?id=${winId}`)
    } else {
      win.loadFile(rendererIndexPath, { hash: `/pin?id=${winId}` })
    }

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
    createWindow()
    registerIpcHandlers()
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
