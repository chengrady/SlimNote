import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isSupportedFile } from '../utils/fileSupport.js'

const MAX_RECENT_FILES = 20
const MAX_RECENT_FOLDERS = 20

function normalizeRecentFile(entry) {
  if (typeof entry === 'string') {
    return {
      path: entry,
      lastOpenedAt: Date.now()
    }
  }

  return {
    path: entry?.path || '',
    lastOpenedAt: Number(entry?.lastOpenedAt) || Date.now()
  }
}

function sortRecentFiles(items) {
  return [...items].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
}

export const useFileStore = defineStore('file', () => {
  const rootPath = ref(null)
  const fileTree = ref([])
  const recentFiles = ref([])
  const recentFolders = ref([])

  // 加载文件夹
  async function loadFolder(folderPath) {
    rootPath.value = folderPath
    fileTree.value = await buildFileTree(folderPath)
    localStorage.setItem('lastOpenedFolder', folderPath)
    addRecentFolder(folderPath)
  }

  // 加载上次打开的文件夹
  async function loadLastOpenedFolder() {
    const folderPath = localStorage.getItem('lastOpenedFolder')
    if (folderPath) {
      await loadFolder(folderPath)
    }
  }

  function closeFolder() {
    rootPath.value = null
    fileTree.value = []
  }

  // 构建文件树
  async function buildFileTree(folderPath) {
    try {
      const items = await window.electronAPI.readDir(folderPath)
      const nodes = []

      // 先添加文件夹，再添加文件
      const folders = items.filter(item => item.isDirectory).sort((a, b) => a.name.localeCompare(b.name))
      const files = items
        .filter(item => !item.isDirectory && isSupportedFile(item.name))
        .sort((a, b) => a.name.localeCompare(b.name))

      for (const folder of folders) {
        nodes.push({
          name: folder.name,
          path: folder.path,
          isDirectory: true,
          children: [],
          childrenLoaded: false,
          expanded: false
        })
      }

      for (const file of files) {
        nodes.push({
          name: file.name,
          path: file.path,
          isDirectory: false
        })
      }

      return nodes
    } catch (error) {
      console.error('Failed to build file tree:', error)
      return []
    }
  }

  // 展开文件夹
  async function expandFolder(node, options = {}) {
    if (!node.isDirectory) return

    if (options.expand === false) {
      node.expanded = false
      return
    }

    if (node.expanded && options.expand !== true) {
      node.expanded = false
      return
    }

    if (!node.expanded || !Array.isArray(node.children) || node.children.length === 0) {
      node.children = await buildFileTree(node.path)
      node.childrenLoaded = true
    }

    node.expanded = true
  }

  async function loadWorkspaceTreeForSearch(nodes = fileTree.value) {
    for (const node of nodes || []) {
      if (!node?.isDirectory) continue

      if (!node.childrenLoaded || !Array.isArray(node.children)) {
        node.children = await buildFileTree(node.path)
        node.childrenLoaded = true
      }

      await loadWorkspaceTreeForSearch(node.children)
    }
  }

  // 添加最近文档
  function addRecentFile(filePath) {
    const current = recentFiles.value.map(normalizeRecentFile).filter(item => item.path && item.path !== filePath)
    const nextEntry = {
      path: filePath,
      lastOpenedAt: Date.now()
    }

    recentFiles.value = sortRecentFiles([nextEntry, ...current]).slice(0, MAX_RECENT_FILES)
    saveRecentFiles()
  }

  function addRecentFolder(folderPath) {
    if (!folderPath) return

    const current = recentFolders.value.filter(item => item.path && item.path !== folderPath)
    recentFolders.value = [{
      path: folderPath,
      lastOpenedAt: Date.now()
    }, ...current]
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, MAX_RECENT_FOLDERS)

    saveRecentFolders()
  }

  function removeRecentFile(filePath) {
    recentFiles.value = recentFiles.value
      .map(normalizeRecentFile)
      .filter(item => item.path !== filePath)
    saveRecentFiles()
  }

  function removeRecentFolder(folderPath) {
    recentFolders.value = recentFolders.value.filter(item => item.path !== folderPath)
    saveRecentFolders()
  }

  function clearRecentFiles() {
    recentFiles.value = []
    saveRecentFiles()
  }

  function moveRecentFile(filePath, targetPath = null, position = 'before') {
    if (!filePath) return

    const normalized = recentFiles.value.map(normalizeRecentFile)
    const sourceIndex = normalized.findIndex(item => item.path === filePath)
    if (sourceIndex === -1) return

    const [movedItem] = normalized.splice(sourceIndex, 1)
    let insertIndex = 0

    if (targetPath) {
      const targetIndex = normalized.findIndex(item => item.path === targetPath)
      insertIndex = targetIndex === -1 ? normalized.length : targetIndex + (position === 'after' ? 1 : 0)
    }

    normalized.splice(insertIndex, 0, movedItem)
    recentFiles.value = normalized.slice(0, MAX_RECENT_FILES)
    saveRecentFiles()
  }

  function clearRecentFolders() {
    recentFolders.value = []
    saveRecentFolders()
  }

  function saveRecentFiles() {
    localStorage.setItem('recentFiles', JSON.stringify(recentFiles.value))
  }

  function saveRecentFolders() {
    localStorage.setItem('recentFolders', JSON.stringify(recentFolders.value))
  }

  function loadRecentFiles() {
    const saved = localStorage.getItem('recentFiles')
    if (saved) {
      try {
        recentFiles.value = sortRecentFiles(JSON.parse(saved).map(normalizeRecentFile).filter(item => item.path)).slice(0, MAX_RECENT_FILES)
      } catch (error) {
        console.error('Failed to load recent files:', error)
      }
    }
  }

  function loadRecentFolders() {
    const saved = localStorage.getItem('recentFolders')
    if (saved) {
      try {
        recentFolders.value = JSON.parse(saved)
          .filter(item => item?.path)
          .map(item => ({
            path: item.path,
            lastOpenedAt: Number(item.lastOpenedAt) || Date.now()
          }))
          .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
          .slice(0, MAX_RECENT_FOLDERS)
      } catch (error) {
        console.error('Failed to load recent folders:', error)
      }
    }
  }

  loadRecentFiles()
  loadRecentFolders()

  return {
    rootPath,
    fileTree,
    recentFiles,
    recentFolders,
    loadFolder,
    loadLastOpenedFolder,
    closeFolder,
    expandFolder,
    loadWorkspaceTreeForSearch,
    addRecentFile,
    addRecentFolder,
    moveRecentFile,
    removeRecentFile,
    removeRecentFolder,
    clearRecentFiles,
    clearRecentFolders,
    loadRecentFiles,
    loadRecentFolders
  }
})
