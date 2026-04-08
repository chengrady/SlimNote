import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { setLocale } from '../locales'

const DEFAULT_SETTINGS = {
  theme: 'light',
  fontSize: 14,
  fontFamily: 'Microsoft YaHei',
  tabSize: 4,
  autoSave: true,
  autoSaveDelay: 2000,
  wordWrap: true,
  unicodeHighlight: false,
  lineNumbers: true,
  minimap: true,
  sidebarCollapsed: false,
  sidebarWidth: 250,
  tabDensity: 'comfortable',
  locale: 'zh-CN'
}

const MIN_FONT_SIZE = 8
const MAX_FONT_SIZE = 72

function normalizeFontSize(value, fallback = DEFAULT_SETTINGS.fontSize) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, parsed))
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
          fontSize: normalizeFontSize(parsed.fontSize, settings.value.fontSize)
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
    const nextSidebarWidth = Number(newSettings.sidebarWidth ?? settings.value.sidebarWidth)
    const nextFontSize = normalizeFontSize(newSettings.fontSize ?? settings.value.fontSize, DEFAULT_SETTINGS.fontSize)

    settings.value = {
      ...settings.value,
      ...newSettings,
      fontSize: nextFontSize,
      sidebarWidth: Math.max(220, Math.min(420, Number.isFinite(nextSidebarWidth) ? nextSidebarWidth : DEFAULT_SETTINGS.sidebarWidth)),
      tabDensity: ['comfortable', 'compact'].includes(nextTabDensity) ? nextTabDensity : DEFAULT_SETTINGS.tabDensity
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
