const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme } = require('electron')
const { dirname, join } = require('path')
const fs = require('fs')
const iconv = require('iconv-lite')
const { watch } = require('chokidar')
const zhCN = require('../renderer/locales/zh-CN.json')
const enUS = require('../renderer/locales/en-US.json')
const shortcutRegistry = require('../shared/shortcutRegistry.json')

let mainWindow = null
let pinWindows = new Map()
let fileWatchers = new Map()
let localFileWriteSuppressions = new Map()
let currentLocale = 'zh-CN'
let shortcutOverrides = {}

const SELF_WRITE_CHANGE_SUPPRESSION_MS = 1000
const SHORTCUTS_CONFIG_FILE = 'shortcuts.json'
const EXTERNAL_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SHORTCUT_MODIFIERS = new Set(['alt', 'cmd', 'cmdorctrl', 'command', 'commandorcontrol', 'control', 'ctrl', 'meta', 'option', 'shift'])
const SHORTCUT_KEYS = new Set(['+', ',', '-', '.', '/', '\\', '`', "'", '=', ';', '[', ']', 'backspace', 'delete', 'del', 'down', 'end', 'enter', 'esc', 'escape', 'home', 'insert', 'left', 'pagedown', 'pageup', 'plus', 'return', 'right', 'space', 'tab', 'up'])

const locales = {
  'zh-CN': {
    ...zhCN,
    context: {
      cut: '\u526a\u5207',
      copy: '\u590d\u5236',
      paste: '\u7c98\u8d34',
      selectAll: '\u5168\u9009'
    }
  },
  'en-US': {
    ...enUS,
    context: {
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select All'
    }
  }
}

function t(key) {
  const keys = key.split('.')
  let value = locales[currentLocale]
  for (const k of keys) {
    value = value?.[k]
  }
  return value || key
}

function localizedLabel(key, zhFallback, enFallback) {
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
  if (channel) sendToRenderer(channel)
}

function getShortcutsConfigPath() {
  return join(app.getPath('userData'), SHORTCUTS_CONFIG_FILE)
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
  sendToRenderer('shortcuts-changed', buildShortcutPayload())
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
  const normalized = String(part || '').trim().toLowerCase()
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

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(channel, payload)
}

function toggleMainWindowFullscreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setFullScreen(!mainWindow.isFullScreen())
}

const MAIN_WINDOW_MIN_WIDTH = 980
const MAIN_WINDOW_MIN_HEIGHT = 680
const PIN_WINDOW_MIN_WIDTH = 320
const PIN_WINDOW_MIN_HEIGHT = 220

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const iconPath = isDev
  ? join(__dirname, '../../public/logo.ico')
  : join(__dirname, '../dist/logo.ico')
const rendererIndexPath = join(__dirname, '../dist/index.html')
const preloadPath = join(__dirname, 'preload.js')

const appDataRoot = app.getPath('appData')
const userDataDir = join(appDataRoot, isDev ? 'SlimNote-dev' : 'SlimNote')
const sessionDataDir = join(userDataDir, 'session')

fs.mkdirSync(userDataDir, { recursive: true })
fs.mkdirSync(sessionDataDir, { recursive: true })

app.setPath('userData', userDataDir)
app.setPath('sessionData', sessionDataDir)

if (!isDev && process.platform === 'win32') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
}

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: MAIN_WINDOW_MIN_WIDTH,
    minHeight: MAIN_WINDOW_MIN_HEIGHT,
    frame: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    icon: iconPath,
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(rendererIndexPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('maximize', () => {
    sendToRenderer('window-maximized')
  })

  mainWindow.on('unmaximize', () => {
    sendToRenderer('window-unmaximized')
  })

  ipcMain.on('show-editor-context-menu', (event) => {
    const menu = Menu.buildFromTemplate([
      { label: t('context.cut'), role: 'cut' },
      { label: t('context.copy'), role: 'copy' },
      { label: t('context.paste'), role: 'paste' },
      { type: 'separator' },
      { label: t('context.selectAll'), role: 'selectAll' }
    ])
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
  })

  ipcMain.handle('get-system-locale', () => app.getLocale())

  ipcMain.on('update-locale', (_event, locale) => {
    if (locales[locale]) {
      currentLocale = locale
      createMenu()
    }
  })

  createMenu()
}

function createMenu() {
  const devSubmenu = isDev
    ? [
        { type: 'separator' },
        {
          label: t('menu.reload'),
          accelerator: shortcutAccelerator('dev.reload'),
          click: () => mainWindow?.webContents.reload()
        },
        {
          label: t('menu.forceReload'),
          accelerator: shortcutAccelerator('dev.forceReload'),
          click: () => mainWindow?.webContents.reloadIgnoringCache()
        },
        {
          label: t('menu.toggleDevTools'),
          accelerator: shortcutAccelerator('dev.toggleDevTools'),
          click: () => mainWindow?.webContents.toggleDevTools()
        }
      ]
    : []

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
        {
          label: localizedLabel('menu.about', '关于 SlimNote', 'About SlimNote'),
          click: () => sendToRenderer('menu-open-about')
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
        },
        { type: 'separator' },
        { label: t('menu.cut'), role: 'cut', accelerator: shortcutAccelerator('edit.cut') },
        { label: t('menu.copy'), role: 'copy', accelerator: shortcutAccelerator('edit.copy') },
        { label: t('menu.paste'), role: 'paste', accelerator: shortcutAccelerator('edit.paste') },
        {
          label: t('menu.selectAll'),
          accelerator: shortcutAccelerator('edit.selectAll'),
          role: 'selectAll'
        }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        {
          label: localizedLabel('menu.toggleSidebar', '切换工作台', 'Toggle Sidebar'),
          accelerator: shortcutAccelerator('view.toggleSidebar'),
          click: () => sendShortcutCommand('view.toggleSidebar')
        },
        {
          label: t('menu.toggleTheme'),
          click: () => sendToRenderer('menu-toggle-theme')
        },
        {
          label: t('menu.toggleFullscreen'),
          accelerator: shortcutAccelerator('view.toggleFullscreen'),
          click: toggleMainWindowFullscreen
        },
        {
          label: localizedLabel('menu.togglePresentationMode', '演示模式', 'Presentation Mode'),
          accelerator: shortcutAccelerator('view.togglePresentationMode'),
          click: () => sendShortcutCommand('view.togglePresentationMode')
        },
        ...devSubmenu
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function registerIpcHandlers() {
  ipcMain.handle('is-maximized', () => mainWindow?.isMaximized())
  ipcMain.handle('get-shortcuts', () => buildShortcutPayload())
  ipcMain.handle('update-shortcut', (_event, payload = {}) => {
    const id = String(payload.id || '')
    const shortcut = getShortcutById(id)
    if (!shortcut) return { ok: false, message: 'Shortcut not found' }

    const accelerator = String(payload.accelerator ?? '').trim()
    if (!isValidShortcutAccelerator(accelerator)) return { ok: false, message: 'Invalid shortcut accelerator' }

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
    if (!getShortcutById(shortcutId)) return { ok: false, message: 'Shortcut not found' }

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
  ipcMain.on('window-min', () => mainWindow?.minimize())
  ipcMain.on('window-max', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window-close', () => mainWindow?.close())
  ipcMain.on('window-toggle-fullscreen', () => toggleMainWindowFullscreen())
  ipcMain.on('window-reload', () => mainWindow?.webContents.reload())
  ipcMain.on('window-force-reload', () => mainWindow?.webContents.reloadIgnoringCache())
  ipcMain.on('window-toggle-devtools', () => mainWindow?.webContents.toggleDevTools())

  ipcMain.on('set-theme', (_event, theme) => {
    nativeTheme.themeSource = theme
  })

  ipcMain.handle('open-external', async (_event, url) => {
    const externalUrl = normalizeExternalUrl(url)
    if (!externalUrl) return false
    await shell.openExternal(externalUrl)
    return true
  })

  ipcMain.handle('read-file', async (_event, filePath) => {
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

  ipcMain.handle('write-file', async (_event, { filePath, content, encoding }) => {
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

  ipcMain.handle('read-dir', async (_event, dirPath) => {
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

  ipcMain.handle('create-file', async (_event, filePath) => {
    await fs.promises.writeFile(filePath, '')
    return true
  })

  ipcMain.handle('create-folder', async (_event, folderPath) => {
    await fs.promises.mkdir(folderPath)
    return true
  })

  ipcMain.handle('delete-path', async (_event, path) => {
    await fs.promises.rm(path, { recursive: true, force: true })
    return true
  })

  ipcMain.handle('rename-path', async (_event, { oldPath, newPath }) => {
    await fs.promises.rename(oldPath, newPath)
    return true
  })

  ipcMain.handle('show-item-in-folder', async (_event, filePath) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('watch-file', (_event, filePath) => {
    if (fileWatchers.has(filePath)) return

    const watcher = watch(filePath)
    watcher.on('change', () => {
      if (shouldSuppressLocalFileChange(filePath)) return
      sendToRenderer('file-changed', filePath)
    })

    fileWatchers.set(filePath, watcher)
  })

  ipcMain.handle('unwatch-file', (_event, filePath) => {
    const watcher = fileWatchers.get(filePath)
    if (watcher) {
      watcher.close()
      fileWatchers.delete(filePath)
    }
  })

  ipcMain.handle('show-save-dialog', async (_event, options) => {
    return dialog.showSaveDialog(mainWindow, options)
  })

  ipcMain.handle('show-open-dialog', async (_event, options) => {
    return dialog.showOpenDialog(mainWindow, options)
  })

  ipcMain.handle('create-pin-window', (_event, { content, theme, language }) => {
    const bounds = loadPinWindowBounds()
    const win = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      minWidth: PIN_WINDOW_MIN_WIDTH,
      minHeight: PIN_WINDOW_MIN_HEIGHT,
      title: 'SlimNote Pin',
      icon: iconPath,
      alwaysOnTop: true,
      frame: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false
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

  ipcMain.handle('close-pin-window', (_event, id) => {
    const win = pinWindows.get(id)
    if (win) {
      win.close()
    }
  })

  ipcMain.on('show-context-menu', (event, menuName, position) => {
    const template = Menu.getApplicationMenu()?.items.find(item => item.label === menuName)?.submenu
    if (!template) return

    const options = { window: BrowserWindow.fromWebContents(event.sender) }
    if (position) {
      options.x = position.x
      options.y = position.y
    }

    template.popup(options)
  })
}

app.whenReady().then(() => {
  loadShortcutOverrides()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
