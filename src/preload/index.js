import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', callback),
  onWindowUnmaximized: (callback) => ipcRenderer.on('window-unmaximized', callback),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),

  // System Info
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  onLocaleChanged: (callback) => ipcRenderer.on('locale-changed', (event, locale) => callback(locale)),
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
  onFileChanged: (callback) => ipcRenderer.on('file-changed', (event, filePath) => callback(filePath)),

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
  onInitPinContent: (callback) => ipcRenderer.on('init-pin-content', (event, data) => callback(data)),

  // Menu Events
  showContextMenu: (menuName, position) => ipcRenderer.send('show-context-menu', menuName, position),
  showEditorContextMenu: () => ipcRenderer.send('show-editor-context-menu'),
  onMenuNewFile: (callback) => ipcRenderer.on('menu-new-file', callback),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuOpenFolder: (callback) => ipcRenderer.on('menu-open-folder', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
  onMenuOpenSettings: (callback) => ipcRenderer.on('menu-open-settings', callback),
  onMenuUndo: (callback) => ipcRenderer.on('menu-undo', callback),
  onMenuRedo: (callback) => ipcRenderer.on('menu-redo', callback),
  onMenuToggleTheme: (callback) => ipcRenderer.on('menu-toggle-theme', callback),
})
