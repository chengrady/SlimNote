import { contextBridge, ipcRenderer } from 'electron'

function onIpc(channel, callback) {
  const listener = (event, ...args) => callback(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullScreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  reloadWindow: () => ipcRenderer.send('window-reload'),
  forceReloadWindow: () => ipcRenderer.send('window-force-reload'),
  toggleDevTools: () => ipcRenderer.send('window-toggle-devtools'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  onWindowMaximized: (callback) => onIpc('window-maximized', callback),
  onWindowUnmaximized: (callback) => onIpc('window-unmaximized', callback),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),

  // File System
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content, encoding) => ipcRenderer.invoke('write-file', { filePath, content, encoding }),
  writeClipboard: (payload) => ipcRenderer.invoke('write-clipboard', payload),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  createFile: (filePath) => ipcRenderer.invoke('create-file', filePath),
  createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
  deletePath: (path) => ipcRenderer.invoke('delete-path', path),
  renamePath: (oldPath, newPath) => ipcRenderer.invoke('rename-path', { oldPath, newPath }),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  watchFile: (filePath) => ipcRenderer.invoke('watch-file', filePath),
  unwatchFile: (filePath) => ipcRenderer.invoke('unwatch-file', filePath),
  onFileChanged: (callback) => onIpc('file-changed', callback),
  
  // Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  searchInWorkspace: (payload) => ipcRenderer.invoke('search-in-workspace', payload),
  
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
  exportMarkdownPdf: (payload) => ipcRenderer.invoke('export-markdown-pdf', payload),
  openFileAssociationSettings: () => ipcRenderer.invoke('open-file-association-settings'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Pin Window
  createPinWindow: (content, theme, language) => ipcRenderer.invoke('create-pin-window', { content, theme, language }),
  closePinWindow: (id) => ipcRenderer.invoke('close-pin-window', id),
  onInitPinContent: (callback) => onIpc('init-pin-content', callback),

  // Menu Events
  showContextMenu: (menuName, position) => ipcRenderer.send('show-context-menu', menuName, position),
  showEditorContextMenu: () => ipcRenderer.send('show-editor-context-menu'),
  onMenuNewFile: (callback) => onIpc('menu-new-file', callback),
  onMenuOpenFile: (callback) => onIpc('menu-open-file', callback),
  onMenuOpenFolder: (callback) => onIpc('menu-open-folder', callback),
  onMenuSave: (callback) => onIpc('menu-save', callback),
  onMenuSaveAs: (callback) => onIpc('menu-save-as', callback),
  onMenuOpenSettings: (callback) => onIpc('menu-open-settings', callback),
  onMenuOpenAbout: (callback) => onIpc('menu-open-about', callback),
  onMenuUndo: (callback) => onIpc('menu-undo', callback),
  onMenuRedo: (callback) => onIpc('menu-redo', callback),
  onMenuToggleTheme: (callback) => onIpc('menu-toggle-theme', callback),
  onMenuFind: (callback) => onIpc('menu-find', callback),
  onMenuReplace: (callback) => onIpc('menu-replace', callback),
  onMenuGlobalSearch: (callback) => onIpc('menu-global-search', callback),
  onMenuToggleSidebar: (callback) => onIpc('menu-toggle-sidebar', callback),
  onAppOpenFile: (callback) => onIpc('app-open-file', callback),
  notifyRendererReady: () => ipcRenderer.send('renderer-ready'),

  // System Locale
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  updateLocale: (locale) => ipcRenderer.send('update-locale', locale),
})
