const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme, clipboard } = require('electron')
const { join } = require('path')
const fs = require('fs')
const iconv = require('iconv-lite')
const { watch } = require('chokidar')

let mainWindow = null
let pinWindows = new Map()
let fileWatchers = new Map()

// i18n support
let currentLocale = 'zh-CN'
const locales = {
  'zh-CN': {
    menu: {
      file: '文件',
      newFile: '新建文件',
      openFile: '打开文件',
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
      selectAll: '全选'
    }
  },
  'en-US': {
    menu: {
      file: 'File',
      newFile: 'New File',
      openFile: 'Open File',
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
      selectAll: 'Select All'
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

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const iconPath = isDev
  ? join(__dirname, '../public/logo.ico')
  : join(__dirname, '../dist/logo.ico')

const appDataRoot = app.getPath('appData')
const userDataDir = join(appDataRoot, isDev ? 'SlimNote-dev' : 'SlimNote')
const sessionDataDir = join(userDataDir, 'session')

fs.mkdirSync(userDataDir, { recursive: true })
fs.mkdirSync(sessionDataDir, { recursive: true })

app.setPath('userData', userDataDir)
app.setPath('sessionData', sessionDataDir)

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
    await new Promise((resolve) => setTimeout(resolve, 180))

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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false, // Custom TitleBar
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
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
        { label: t('menu.cut'), role: 'cut' },
        { label: t('menu.copy'), role: 'copy' },
        { label: t('menu.paste'), role: 'paste' }
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
          label: t('menu.toggleTheme'),
          click: () => mainWindow?.webContents.send('menu-toggle-theme')
        },
        { type: 'separator' },
        { label: t('menu.toggleFullscreen'), role: 'togglefullscreen' }
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

  ipcMain.on('set-theme', (event, theme) => {
    nativeTheme.themeSource = theme
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

  ipcMain.handle('export-markdown-pdf', async (event, payload) => {
    try {
      return await exportMarkdownPdf(payload || {})
    } catch (error) {
      console.error('Error exporting markdown PDF:', error)
      throw error
    }
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
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      }
    })

    const winId = win.id
    pinWindows.set(winId, win)

    if (isDev) {
      win.loadURL(`http://localhost:5173/#/pin?id=${winId}`)
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), { hash: `/pin?id=${winId}` })
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
