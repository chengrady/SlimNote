import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isSupportedFile } from '../utils/fileSupport'

function normalizeRecentFile(entry) {
  if (typeof entry === 'string') {
    return {
      path: entry,
      pinned: false,
      lastOpenedAt: Date.now(),
      pinnedOrder: null
    }
  }

  return {
    path: entry?.path || '',
    pinned: Boolean(entry?.pinned),
    lastOpenedAt: Number(entry?.lastOpenedAt) || Date.now(),
    pinnedOrder: Number.isFinite(Number(entry?.pinnedOrder)) ? Number(entry?.pinnedOrder) : null
  }
}

function sortRecentFiles(items) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1
    }

    if (a.pinned && b.pinned) {
      const orderA = a.pinnedOrder ?? Number.MAX_SAFE_INTEGER
      const orderB = b.pinnedOrder ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) {
        return orderA - orderB
      }
    }

    return b.lastOpenedAt - a.lastOpenedAt
  })
}

function normalizePinnedOrders(items) {
  const pinnedItems = items.filter(item => item.pinned)
  const unpinnedItems = items.filter(item => !item.pinned)

  const normalizedPinned = pinnedItems.map((item, index) => ({
    ...item,
    pinnedOrder: index
  }))

  const normalizedUnpinned = unpinnedItems.map(item => ({
    ...item,
    pinnedOrder: null
  }))

  return [...normalizedPinned, ...normalizedUnpinned]
}

const MAX_RECENT_FILES = 20
const MAX_RECENT_FOLDERS = 20

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
  async function buildFileTree(dirPath) {
    try {
      const items = await window.electronAPI.readDir(dirPath)
      const nodes = []

      // 先添加文件夹，再添加文件
      const dirs = items.filter(item => item.isDirectory).sort((a, b) => a.name.localeCompare(b.name))
      const files = items
        .filter(item => !item.isDirectory && isSupportedFile(item.name))
        .sort((a, b) => a.name.localeCompare(b.name))

      for (const dir of dirs) {
        nodes.push({
          name: dir.name,
          path: dir.path,
          isDirectory: true,
          children: [],
          expanded: false,
        })
      }

      for (const file of files) {
        nodes.push({
          name: file.name,
          path: file.path,
          isDirectory: false,
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
    }

    node.expanded = true
  }

  // 添加最近文件
  function addRecentFile(filePath) {
    const current = recentFiles.value.map(normalizeRecentFile).filter(item => item.path && item.path !== filePath)
    const existing = recentFiles.value.map(normalizeRecentFile).find(item => item.path === filePath)
    const nextEntry = {
      path: filePath,
      pinned: existing?.pinned || false,
      lastOpenedAt: Date.now(),
      pinnedOrder: existing?.pinned ? existing.pinnedOrder : null
    }

    recentFiles.value = sortRecentFiles(normalizePinnedOrders([nextEntry, ...current])).slice(0, MAX_RECENT_FILES)
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

  function removeRecentFolder(folderPath) {
    recentFolders.value = recentFolders.value.filter(item => item.path !== folderPath)
    saveRecentFolders()
  }

  function clearRecentFolders() {
    recentFolders.value = []
    saveRecentFolders()
  }

  function toggleRecentPin(filePath) {
    const normalized = recentFiles.value.map(normalizeRecentFile)
    const pinnedCount = normalized.filter(item => item.pinned).length

    recentFiles.value = sortRecentFiles(normalizePinnedOrders(
      normalized.map(item => {
        if (item.path !== filePath) return item

        const nextPinned = !item.pinned
        return {
          ...item,
          pinned: nextPinned,
          pinnedOrder: nextPinned ? pinnedCount : null
        }
      })
    )).slice(0, MAX_RECENT_FILES)
    saveRecentFiles()
  }

  function movePinnedRecentFile(filePath, targetPath) {
    if (!filePath || !targetPath || filePath === targetPath) return

    const normalized = recentFiles.value.map(normalizeRecentFile)
    const pinnedItems = normalized.filter(item => item.pinned)
    const unpinnedItems = normalized.filter(item => !item.pinned)
    const sourceIndex = pinnedItems.findIndex(item => item.path === filePath)
    const targetIndex = pinnedItems.findIndex(item => item.path === targetPath)

    if (sourceIndex === -1 || targetIndex === -1) return

    const [movedItem] = pinnedItems.splice(sourceIndex, 1)
    pinnedItems.splice(targetIndex, 0, movedItem)

    recentFiles.value = sortRecentFiles(normalizePinnedOrders([...pinnedItems, ...unpinnedItems])).slice(0, MAX_RECENT_FILES)
    saveRecentFiles()
  }

  function moveRecentFile(filePath, targetPath = null, targetPinned = null, position = 'before') {
    if (!filePath) return

    const normalized = recentFiles.value.map(normalizeRecentFile)
    const sourceItem = normalized.find(item => item.path === filePath)
    if (!sourceItem) return

    const nextPinned = typeof targetPinned === 'boolean' ? targetPinned : sourceItem.pinned
    const remainingItems = normalized.filter(item => item.path !== filePath)
    const pinnedItems = remainingItems.filter(item => item.pinned)
    const unpinnedItems = remainingItems.filter(item => !item.pinned)
    const destinationList = nextPinned ? pinnedItems : unpinnedItems

    let insertIndex = destinationList.length
    if (targetPath) {
      const targetIndex = destinationList.findIndex(item => item.path === targetPath)
      if (targetIndex !== -1) {
        insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
      }
    } else {
      insertIndex = 0
    }

    destinationList.splice(insertIndex, 0, {
      ...sourceItem,
      pinned: nextPinned,
      pinnedOrder: nextPinned ? insertIndex : null
    })

    recentFiles.value = sortRecentFiles(normalizePinnedOrders([
      ...pinnedItems,
      ...unpinnedItems
    ])).slice(0, MAX_RECENT_FILES)
    saveRecentFiles()
  }

  // 移除最近文件
  function removeRecentFile(filePath) {
    recentFiles.value = recentFiles.value
      .map(normalizeRecentFile)
      .filter(item => item.path !== filePath)
    saveRecentFiles()
  }

  // 清空最近文件
  function clearRecentFiles(options = { keepPinned: true }) {
    recentFiles.value = options.keepPinned
      ? normalizePinnedOrders(recentFiles.value.map(normalizeRecentFile).filter(item => item.pinned)).slice(0, MAX_RECENT_FILES)
      : []
    saveRecentFiles()
  }

  // 保存最近文件到本地存储
  function saveRecentFiles() {
    localStorage.setItem('recentFiles', JSON.stringify(recentFiles.value))
  }

  function saveRecentFolders() {
    localStorage.setItem('recentFolders', JSON.stringify(recentFolders.value))
  }

  // 加载最近文件
  function loadRecentFiles() {
    const saved = localStorage.getItem('recentFiles')
    if (saved) {
      try {
        recentFiles.value = sortRecentFiles(normalizePinnedOrders(JSON.parse(saved).map(normalizeRecentFile).filter(item => item.path))).slice(0, MAX_RECENT_FILES)
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

  // 初始化时加载最近文件
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
    addRecentFile,
    addRecentFolder,
    toggleRecentPin,
    movePinnedRecentFile,
    moveRecentFile,
    removeRecentFile,
    removeRecentFolder,
    clearRecentFiles,
    clearRecentFolders,
    loadRecentFiles,
    loadRecentFolders
  }
})
