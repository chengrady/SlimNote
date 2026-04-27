import { contextBridge, ipcRenderer } from 'electron'

function bindIpcListener(channel, callback) {
  const wrapped = (_event, ...args) => callback(...args)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  onWindowMaximized: (callback) => bindIpcListener('window-maximized', callback),
  onWindowUnmaximized: (callback) => bindIpcListener('window-unmaximized', callback),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  toggleFullScreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  reloadWindow: () => ipcRenderer.send('window-reload'),
  forceReloadWindow: () => ipcRenderer.send('window-force-reload'),
  toggleDevTools: () => ipcRenderer.send('window-toggle-devtools'),

  // System Info
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  onLocaleChanged: (callback) => bindIpcListener('locale-changed', callback),
  updateLocale: (locale) => ipcRenderer.send('update-locale', locale),

  // File System
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content, encoding) => ipcRenderer.invoke('write-file', { filePath, content, encoding }),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  createFile: (filePath) => ipcRenderer.invoke('create-file', filePath),
  createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
  deletePath: (path) => ipcRenderer.invoke('delete-path', path),
  renamePath: (oldPath, newPath) => ipcRenderer.invoke('rename-path', { oldPath, newPath }),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  watchFile: (filePath) => ipcRenderer.invoke('watch-file', filePath),
  unwatchFile: (filePath) => ipcRenderer.invoke('unwatch-file', filePath),
  onFileChanged: (callback) => bindIpcListener('file-changed', callback),

  // Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // Helper Dialogs
  openFileDialog: () => ipcRenderer.invoke('show-open-dialog', {
    properties: ['openFile']
  }),
  openFolderDialog: () => ipcRenderer.invoke('show-open-dialog', {
    properties: ['openDirectory']
  }),
  saveFileDialog: (defaultPath) => ipcRenderer.invoke('show-save-dialog', {
    defaultPath
  }),

  // Pin Window
  createPinWindow: (content, theme, language) => ipcRenderer.invoke('create-pin-window', { content, theme, language }),
  closePinWindow: (id) => ipcRenderer.invoke('close-pin-window', id),
  onInitPinContent: (callback) => bindIpcListener('init-pin-content', callback),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Menu Events
  showContextMenu: (menuName, position) => ipcRenderer.send('show-context-menu', menuName, position),
  showEditorContextMenu: () => ipcRenderer.send('show-editor-context-menu'),
  onMenuNewFile: (callback) => bindIpcListener('menu-new-file', callback),
  onMenuOpenFile: (callback) => bindIpcListener('menu-open-file', callback),
  onMenuOpenFolder: (callback) => bindIpcListener('menu-open-folder', callback),
  onMenuSave: (callback) => bindIpcListener('menu-save', callback),
  onMenuSaveAs: (callback) => bindIpcListener('menu-save-as', callback),
  onMenuOpenSettings: (callback) => bindIpcListener('menu-open-settings', callback),
  onMenuOpenAbout: (callback) => bindIpcListener('menu-open-about', callback),
  onMenuUndo: (callback) => bindIpcListener('menu-undo', callback),
  onMenuRedo: (callback) => bindIpcListener('menu-redo', callback),
  onMenuFind: (callback) => bindIpcListener('menu-find', callback),
  onMenuReplace: (callback) => bindIpcListener('menu-replace', callback),
  onMenuGlobalSearch: (callback) => bindIpcListener('menu-global-search', callback),
  onMenuToggleTheme: (callback) => bindIpcListener('menu-toggle-theme', callback),
  onMenuToggleSidebar: (callback) => bindIpcListener('menu-toggle-sidebar', callback),
  onMenuTogglePresentationMode: (callback) => bindIpcListener('menu-toggle-presentation-mode', callback),

  // App lifecycle helpers
  onAppOpenFile: (callback) => bindIpcListener('app-open-file', callback),
  notifyRendererReady: () => ipcRenderer.send('renderer-ready')
})
