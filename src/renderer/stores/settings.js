import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { setLocale } from '../locales'

const DEFAULT_SETTINGS = {
  theme: 'light',
  uiFontSize: 14,
  fontSize: 14,
  fontFamily: 'Microsoft YaHei',
  tabSize: 4,
  autoSave: true,
  autoSaveDelay: 2000,
  wordWrap: true,
  unicodeHighlight: false,
  lineNumbers: true,
  minimap: false,
  sidebarCollapsed: false,
  rightSidebarCollapsed: false,
  sidebarWidth: 280,
  rightSidebarWidth: 380,
  tabDensity: 'comfortable',
  unpinnedTabMaxRows: 10,
  locale: 'zh-CN'
}

const MIN_FONT_SIZE = 8
const MAX_FONT_SIZE = 72
const MIN_UI_FONT_SIZE = 11
const MAX_UI_FONT_SIZE = 20
const MIN_SIDEBAR_WIDTH = 220
const MAX_SIDEBAR_WIDTH = 1200
const MIN_RIGHT_SIDEBAR_WIDTH = 320
const MAX_RIGHT_SIDEBAR_WIDTH = 1200
const MIN_UNPINNED_TAB_MAX_ROWS = 1
const MAX_UNPINNED_TAB_MAX_ROWS = 10

function normalizeFontSize(value, fallback = DEFAULT_SETTINGS.fontSize) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, parsed))
}

function normalizeUiFontSize(value, fallback = DEFAULT_SETTINGS.uiFontSize) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(MIN_UI_FONT_SIZE, Math.min(MAX_UI_FONT_SIZE, parsed))
}

function normalizeUnpinnedTabMaxRows(value, fallback = DEFAULT_SETTINGS.unpinnedTabMaxRows) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(MIN_UNPINNED_TAB_MAX_ROWS, Math.min(MAX_UNPINNED_TAB_MAX_ROWS, parsed))
}

function normalizeWidth(value, fallback, minValue, maxValue) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(minValue, Math.min(maxValue, parsed))
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({ ...DEFAULT_SETTINGS })

  // 加载设置
  function loadSettings() {
    const saved = localStorage.getItem('settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = {
          ...settings.value,
          ...parsed,
          uiFontSize: normalizeUiFontSize(parsed.uiFontSize, settings.value.uiFontSize),
          fontSize: normalizeFontSize(parsed.fontSize, settings.value.fontSize),
          sidebarWidth: normalizeWidth(parsed.sidebarWidth, settings.value.sidebarWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH),
          rightSidebarWidth: normalizeWidth(parsed.rightSidebarWidth, settings.value.rightSidebarWidth, MIN_RIGHT_SIDEBAR_WIDTH, MAX_RIGHT_SIDEBAR_WIDTH),
          unpinnedTabMaxRows: normalizeUnpinnedTabMaxRows(parsed.unpinnedTabMaxRows, settings.value.unpinnedTabMaxRows)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    applyTheme()
  }

  // 保存设置
  function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings.value))
  }

  // 更新设置
  function updateSettings(newSettings) {
    const nextTabDensity = newSettings.tabDensity ?? settings.value.tabDensity
    const nextSidebarWidth = newSettings.sidebarWidth ?? settings.value.sidebarWidth
    const nextRightSidebarWidth = newSettings.rightSidebarWidth ?? settings.value.rightSidebarWidth
    const nextUiFontSize = normalizeUiFontSize(newSettings.uiFontSize ?? settings.value.uiFontSize, DEFAULT_SETTINGS.uiFontSize)
    const nextFontSize = normalizeFontSize(newSettings.fontSize ?? settings.value.fontSize, DEFAULT_SETTINGS.fontSize)
    const nextUnpinnedTabMaxRows = normalizeUnpinnedTabMaxRows(newSettings.unpinnedTabMaxRows ?? settings.value.unpinnedTabMaxRows)

    settings.value = {
      ...settings.value,
      ...newSettings,
      uiFontSize: nextUiFontSize,
      fontSize: nextFontSize,
      sidebarWidth: normalizeWidth(nextSidebarWidth, DEFAULT_SETTINGS.sidebarWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH),
      rightSidebarWidth: normalizeWidth(nextRightSidebarWidth, DEFAULT_SETTINGS.rightSidebarWidth, MIN_RIGHT_SIDEBAR_WIDTH, MAX_RIGHT_SIDEBAR_WIDTH),
      tabDensity: ['comfortable', 'compact'].includes(nextTabDensity) ? nextTabDensity : DEFAULT_SETTINGS.tabDensity,
      unpinnedTabMaxRows: nextUnpinnedTabMaxRows
    }
    saveSettings()
    applyTheme()
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
    saveSettings()
    applyTheme()
  }

  // 应用主题
  function applyTheme() {
    const html = document.documentElement
    const theme = settings.value.theme
    const uiFontSize = normalizeUiFontSize(settings.value.uiFontSize, DEFAULT_SETTINGS.uiFontSize)
    html.style.setProperty('--app-ui-font-size', `${uiFontSize}px`)
    html.style.setProperty('--ui-font-size-2xs', `${Math.max(MIN_UI_FONT_SIZE - 1, uiFontSize - 4)}px`)
    html.style.setProperty('--ui-font-size-xs', `${Math.max(MIN_UI_FONT_SIZE - 1, uiFontSize - 3)}px`)
    html.style.setProperty('--ui-font-size-sm', `${Math.max(MIN_UI_FONT_SIZE, uiFontSize - 2)}px`)
    html.style.setProperty('--ui-font-size-md', `${uiFontSize}px`)
    html.style.setProperty('--ui-font-size-lg', `${uiFontSize + 1}px`)
    html.style.setProperty('--ui-font-size-xl', `${uiFontSize + 5}px`)
    html.style.setProperty('--field-font-size', `${Math.max(MIN_UI_FONT_SIZE, uiFontSize - 1)}px`)
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark')
    } else {
      html.removeAttribute('data-theme')
    }
    // Sync with Electron native theme
    if (window.electronAPI) {
      window.electronAPI.setTheme(theme)
    }
  }

  // 切换主题
  function toggleTheme() {
    const newTheme = settings.value.theme === 'dark' ? 'light' : 'dark'
    updateSettings({ theme: newTheme })
  }

  // 更新语言
  function updateLocale(locale) {
    if (setLocale(locale)) {
      settings.value.locale = locale
      saveSettings()
      // 通知主进程更新菜单
      if (window.electronAPI?.updateLocale) {
        window.electronAPI.updateLocale(locale)
      }
    }
  }

  // 监听设置变化
  watch(settings, () => {
    saveSettings()
    applyTheme()
  }, { deep: true })

  return {
    settings,
    loadSettings,
    updateSettings,
    resetSettings,
    toggleTheme,
    updateLocale,
    applyTheme,
    DEFAULT_SETTINGS
  }
})
