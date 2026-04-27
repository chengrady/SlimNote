const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme } = require('electron')
const { join } = require('path')
const fs = require('fs')
const iconv = require('iconv-lite')
const { watch } = require('chokidar')
const zhCN = require('../renderer/locales/zh-CN.json')
const enUS = require('../renderer/locales/en-US.json')

let mainWindow = null
let pinWindows = new Map()
let fileWatchers = new Map()
let currentLocale = 'zh-CN'

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
  const fullscreenAccelerator = process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11'
  const devSubmenu = isDev
    ? [
        { type: 'separator' },
        {
          label: t('menu.reload'),
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload()
        },
        {
          label: t('menu.forceReload'),
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow?.webContents.reloadIgnoringCache()
        },
        {
          label: t('menu.toggleDevTools'),
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
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
          accelerator: 'CmdOrCtrl+N',
          click: () => sendToRenderer('menu-new-file')
        },
        {
          label: t('menu.openFile'),
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToRenderer('menu-open-file')
        },
        {
          label: t('menu.openFolder'),
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => sendToRenderer('menu-open-folder')
        },
        { type: 'separator' },
        {
          label: t('menu.save'),
          accelerator: 'CmdOrCtrl+S',
          click: () => sendToRenderer('menu-save')
        },
        {
          label: t('menu.saveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendToRenderer('menu-save-as')
        },
        { type: 'separator' },
        {
          label: t('menu.settings'),
          accelerator: 'CmdOrCtrl+,',
          click: () => sendToRenderer('menu-open-settings')
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
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendToRenderer('menu-undo')
        },
        {
          label: t('menu.redo'),
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          click: () => sendToRenderer('menu-redo')
        },
        { type: 'separator' },
        {
          label: t('menu.find'),
          accelerator: 'CmdOrCtrl+F',
          click: () => sendToRenderer('menu-find')
        },
        {
          label: t('menu.replace'),
          accelerator: 'CmdOrCtrl+H',
          click: () => sendToRenderer('menu-replace')
        },
        {
          label: t('menu.globalSearch'),
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendToRenderer('menu-global-search')
        },
        { type: 'separator' },
        { label: t('menu.cut'), role: 'cut' },
        { label: t('menu.copy'), role: 'copy' },
        { label: t('menu.paste'), role: 'paste' },
        {
          label: t('menu.selectAll'),
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll'
        }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        {
          label: localizedLabel('menu.toggleSidebar', '切换工作台', 'Toggle Sidebar'),
          accelerator: 'CmdOrCtrl+B',
          click: () => sendToRenderer('menu-toggle-sidebar')
        },
        {
          label: t('menu.toggleTheme'),
          click: () => sendToRenderer('menu-toggle-theme')
        },
        {
          label: t('menu.toggleFullscreen'),
          accelerator: fullscreenAccelerator,
          click: toggleMainWindowFullscreen
        },
        {
          label: localizedLabel('menu.togglePresentationMode', '演示模式', 'Presentation Mode'),
          accelerator: isMac ? 'Cmd+Shift+P' : 'Shift+F5',
          click: () => sendToRenderer('menu-toggle-presentation-mode')
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
    if (typeof url !== 'string' || !url) return false
    await shell.openExternal(url)
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
    try {
      const buffer = iconv.encode(content, encoding || 'utf8')
      await fs.promises.writeFile(filePath, buffer)
      return true
    } catch (error) {
      console.error('Error writing file:', error)
      throw error
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
  createWindow()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
