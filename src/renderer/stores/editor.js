import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useSettingsStore } from './settings'
import { getFileExtension, isBinaryFile as isBinaryFileName, isSupportedFile as isSupportedFileName } from '../utils/fileSupport'

export const useEditorStore = defineStore('editor', () => {
  const tabs = ref([])
  const activeTabId = ref(null)
  const nextTabId = ref(1)
  const cursorPosition = ref({ line: 1, column: 1 })

  // 监听 tabs 和 activeTabId 变化，保存会话
  watch([tabs, activeTabId], () => {
    saveSession()
  }, { deep: true })

  function saveSession() {
    const session = {
      files: tabs.value.filter(t => t.filePath).map(t => ({
        path: t.filePath,
        fontSize: t.fontSize,
        sqlDialect: t.sqlDialect || 'mysql',
        pinned: Boolean(t.pinned)
      })),
      activeFile: getActiveTab()?.filePath || null
    }
    localStorage.setItem('editorSession', JSON.stringify(session))
  }

  function loadSession() {
    try {
      const saved = localStorage.getItem('editorSession')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load session', e)
    }
    return null
  }

  // 创建新标签页
  function createTab(title = 'Untitled', filePath = null, content = '', fontSize = null, options = {}) {
    const id = `tab-${nextTabId.value++}`
    const language = detectLanguage(filePath || title)
    const settingsStore = useSettingsStore()
    
    const tab = {
      id,
      title,
      filePath,
      content,
      originalContent: content,
      isDirty: false,
      encoding: 'utf-8',
      language,
      fontSize: fontSize || settingsStore.settings.fontSize,
      pinned: Boolean(options.pinned),
      sqlDialect: options.sqlDialect || 'mysql'
    }
    
    tabs.value.push(tab)
    activeTabId.value = id
    return tab
  }

  // 关闭标签页
  function closeTab(tabId) {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return

    tabs.value.splice(index, 1)

    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        const newIndex = Math.min(index, tabs.value.length - 1)
        activeTabId.value = tabs.value[newIndex].id
      } else {
        activeTabId.value = null
      }
    }
  }

  function closeTabs(tabIds) {
    const targetIds = new Set(tabIds)
    if (targetIds.size === 0) return

    const remainingTabs = tabs.value.filter(tab => !targetIds.has(tab.id))
    const activeStillExists = activeTabId.value && remainingTabs.some(tab => tab.id === activeTabId.value)

    tabs.value = remainingTabs

    if (!activeStillExists) {
      activeTabId.value = remainingTabs.length > 0 ? remainingTabs[Math.max(0, remainingTabs.length - 1)].id : null
    }
  }

  // 关闭其他标签页
  function closeOtherTabs(tabId) {
    tabs.value = tabs.value.filter(t => t.id === tabId || t.pinned)
    activeTabId.value = tabId
  }

  // 关闭所有标签页
  function closeAllTabs() {
    tabs.value = tabs.value.filter(t => t.pinned)
    if (tabs.value.length > 0) {
      activeTabId.value = tabs.value[tabs.value.length - 1].id
    } else {
      activeTabId.value = null
    }
  }

  // 关闭右侧标签页
  function closeTabsToRight(tabId) {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return

    // Keep pinned tabs and tabs up to the current one
    const tabsToKeep = tabs.value.slice(0, index + 1)
    const tabsToRemove = tabs.value.slice(index + 1)
    
    // Filter out pinned tabs from the removal list (if any logic allowed pinned tabs to be on the right, though usually pinned are on left/top)
    // But based on requirement, pinned tabs are separate. Let's assume "Close Right" only affects unpinned tabs if we are in unpinned section, 
    // or just strictly follows the list order.
    // However, pinned tabs are usually "before" unpinned tabs in display order if we sort them. 
    // But here the array order might be mixed if we don't sort.
    // Let's just remove everything after the index, but preserve pinned tabs if they happen to be there (though they shouldn't be if we manage order correctly).
    
    tabs.value = tabs.value.filter((t, i) => i <= index || t.pinned)
  }

  // 切换固定状态
  function togglePin(tabId) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.pinned = !tab.pinned
      reorderTabsByPinnedState()
    }
  }

  function setTabsPinned(tabIds, pinned) {
    const targetIds = new Set(tabIds)
    if (targetIds.size === 0) return

    let hasMatchedTab = false
    let hasChanged = false

    tabs.value.forEach((tab) => {
      if (!targetIds.has(tab.id)) return
      hasMatchedTab = true
      if (tab.pinned === pinned) return
      tab.pinned = pinned
      hasChanged = true
    })

    if (!hasMatchedTab) {
      return
    }

    if (hasChanged) {
      reorderTabsByPinnedState()
    }
  }

  function moveTab(tabId, targetTabId) {
    if (!tabId || !targetTabId || tabId === targetTabId) return

    const sourceTab = tabs.value.find(t => t.id === tabId)
    const targetTab = tabs.value.find(t => t.id === targetTabId)

    if (!sourceTab || !targetTab) return

    if (sourceTab.pinned === targetTab.pinned) {
      const targetList = tabs.value.filter(t => t.pinned === sourceTab.pinned)
      const sourceIndex = targetList.findIndex(t => t.id === tabId)
      const targetIndex = targetList.findIndex(t => t.id === targetTabId)

      if (sourceIndex === -1 || targetIndex === -1) return

      const [movedTab] = targetList.splice(sourceIndex, 1)
      targetList.splice(targetIndex, 0, movedTab)

      tabs.value = sourceTab.pinned
        ? [...targetList, ...tabs.value.filter(t => !t.pinned)]
        : [...tabs.value.filter(t => t.pinned), ...targetList]
      return
    }

    const sourceList = tabs.value.filter(t => t.pinned === sourceTab.pinned)
    const destinationList = tabs.value.filter(t => t.pinned === targetTab.pinned)
    const sourceIndex = sourceList.findIndex(t => t.id === tabId)
    const destinationIndex = destinationList.findIndex(t => t.id === targetTabId)

    if (sourceIndex === -1 || destinationIndex === -1) return

    const [movedTab] = sourceList.splice(sourceIndex, 1)
    movedTab.pinned = targetTab.pinned
    destinationList.splice(destinationIndex, 0, movedTab)

    tabs.value = targetTab.pinned
      ? [...destinationList, ...sourceList]
      : [...sourceList, ...destinationList]
  }

  function reorderTabsByPinnedState() {
    const pinnedTabs = tabs.value.filter(tab => tab.pinned)
    const unpinnedTabs = tabs.value.filter(tab => !tab.pinned)
    tabs.value = [...pinnedTabs, ...unpinnedTabs]
  }

  // 更新标签页内容
  function updateTabContent(tabId, content) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.content = content
      tab.isDirty = content !== tab.originalContent
    }
  }

  // 更新标签页语言
  function updateTabLanguage(tabId, language) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.language = language
    }
  }

  // 更新标签页字体大小
  function updateTabFontSize(tabId, size) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.fontSize = size
    }
  }

  function updateTabSqlDialect(tabId, sqlDialect) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.sqlDialect = sqlDialect
    }
  }

  // 保存标签页
  function saveTab(tabId) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.originalContent = tab.content
      tab.isDirty = false
    }
  }

  // 获取活动标签页
  function getActiveTab() {
    if (!activeTabId.value) return null
    return tabs.value.find(t => t.id === activeTabId.value) || null
  }

  // 设置活动标签页
  function setActiveTab(tabId) {
    if (tabs.value.find(t => t.id === tabId)) {
      activeTabId.value = tabId
    }
  }

  // 更新光标位置
  function updateCursorPosition(line, column) {
    cursorPosition.value = { line, column }
  }

  // 根据路径查找标签页
  function findTabByPath(filePath) {
    if (!filePath) return null
    return tabs.value.find(t => t.filePath === filePath)
  }

  // 检测语言
  function detectLanguage(filename) {
    const ext = getFileExtension(filename)
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'json': 'json',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'xml': 'xml',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'sql': 'sql',
      'txt': 'plaintext',
      'log': 'log'
    }
    return languageMap[ext] || 'plaintext'
  }

  // 检查是否为二进制文件
  function isBinaryFile(filename) {
    return isBinaryFileName(filename)
  }

  function isSupportedFile(filename) {
    return isSupportedFileName(filename)
  }

  return {
    tabs,
    activeTabId,
    cursorPosition,
    createTab,
    closeTab,
    closeTabs,
    updateTabContent,
    updateTabLanguage,
    updateTabFontSize,
    updateTabSqlDialect,
    updateCursorPosition,
    saveTab,
    getActiveTab,
    setActiveTab,
    findTabByPath,
    detectLanguage,
    isBinaryFile,
    isSupportedFile,
    loadSession,
    closeOtherTabs,
    closeAllTabs,
    closeTabsToRight,
    togglePin,
    setTabsPinned,
    moveTab,
    reorderTabsByPinnedState
  }
})
