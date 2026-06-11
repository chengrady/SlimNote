import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { setLocale } from '../locales'
import { DEFAULT_AUTO_SAVE_DELAY_SECONDS, normalizeAutoSaveDelaySeconds } from '../utils/autoSaveScheduler'
import {
  DEFAULT_MARKDOWN_THEME_REF,
  buildAppThemeStyleVars,
  getGlobalMarkdownThemeRef,
  normalizeMarkdownThemeRef,
  resolveMarkdownTheme,
  setGlobalMarkdownThemeRef
} from '../utils/markdownThemes'

const DEFAULT_SETTINGS = {
  theme: 'light',
  themeRef: DEFAULT_MARKDOWN_THEME_REF,
  uiFontSize: 14,
  fontSize: 14,
  fontFamily: 'Microsoft YaHei',
  tabSize: 4,
  autoSave: true,
  autoSaveDelay: DEFAULT_AUTO_SAVE_DELAY_SECONDS,
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

function resolveInitialThemeRef(parsed = {}) {
  if (parsed.themeRef) {
    return normalizeMarkdownThemeRef(parsed.themeRef, parsed.theme)
  }

  const storedThemeRef = getGlobalMarkdownThemeRef()
  if (storedThemeRef !== DEFAULT_MARKDOWN_THEME_REF || !parsed.theme) {
    return storedThemeRef
  }

  return normalizeMarkdownThemeRef(parsed.theme)
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({ ...DEFAULT_SETTINGS })
  const effectiveTheme = computed(() => resolveMarkdownTheme(settings.value.themeRef || DEFAULT_MARKDOWN_THEME_REF))
  const effectiveThemeMode = computed(() => effectiveTheme.value?.mode === 'dark' ? 'dark' : 'light')

  // 加载设置
  function loadSettings() {
    const saved = localStorage.getItem('settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = {
          ...settings.value,
          ...parsed,
          themeRef: resolveInitialThemeRef(parsed),
          uiFontSize: normalizeUiFontSize(parsed.uiFontSize, settings.value.uiFontSize),
          fontSize: normalizeFontSize(parsed.fontSize, settings.value.fontSize),
          autoSave: Object.prototype.hasOwnProperty.call(parsed, 'autoSave') ? Boolean(parsed.autoSave) : settings.value.autoSave,
          autoSaveDelay: normalizeAutoSaveDelaySeconds(parsed.autoSaveDelay, settings.value.autoSaveDelay),
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
    const nextThemeRef = Object.prototype.hasOwnProperty.call(newSettings, 'themeRef')
      ? normalizeMarkdownThemeRef(newSettings.themeRef)
      : settings.value.themeRef
    const nextTabDensity = newSettings.tabDensity ?? settings.value.tabDensity
    const nextSidebarWidth = newSettings.sidebarWidth ?? settings.value.sidebarWidth
    const nextRightSidebarWidth = newSettings.rightSidebarWidth ?? settings.value.rightSidebarWidth
    const nextUiFontSize = normalizeUiFontSize(newSettings.uiFontSize ?? settings.value.uiFontSize, DEFAULT_SETTINGS.uiFontSize)
    const nextFontSize = normalizeFontSize(newSettings.fontSize ?? settings.value.fontSize, DEFAULT_SETTINGS.fontSize)
    const nextAutoSave = Object.prototype.hasOwnProperty.call(newSettings, 'autoSave') ? Boolean(newSettings.autoSave) : settings.value.autoSave
    const nextAutoSaveDelay = normalizeAutoSaveDelaySeconds(newSettings.autoSaveDelay ?? settings.value.autoSaveDelay, DEFAULT_SETTINGS.autoSaveDelay)
    const nextUnpinnedTabMaxRows = normalizeUnpinnedTabMaxRows(newSettings.unpinnedTabMaxRows ?? settings.value.unpinnedTabMaxRows)

    settings.value = {
      ...settings.value,
      ...newSettings,
      themeRef: nextThemeRef,
      uiFontSize: nextUiFontSize,
      fontSize: nextFontSize,
      autoSave: nextAutoSave,
      autoSaveDelay: nextAutoSaveDelay,
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
    const theme = effectiveTheme.value
    const mode = effectiveThemeMode.value
    const uiFontSize = normalizeUiFontSize(settings.value.uiFontSize, DEFAULT_SETTINGS.uiFontSize)
    html.style.setProperty('--app-ui-font-size', `${uiFontSize}px`)
    html.style.setProperty('--ui-font-size-2xs', `${Math.max(MIN_UI_FONT_SIZE - 1, uiFontSize - 4)}px`)
    html.style.setProperty('--ui-font-size-xs', `${Math.max(MIN_UI_FONT_SIZE - 1, uiFontSize - 3)}px`)
    html.style.setProperty('--ui-font-size-sm', `${Math.max(MIN_UI_FONT_SIZE, uiFontSize - 2)}px`)
    html.style.setProperty('--ui-font-size-md', `${uiFontSize}px`)
    html.style.setProperty('--ui-font-size-lg', `${uiFontSize + 1}px`)
    html.style.setProperty('--ui-font-size-xl', `${uiFontSize + 5}px`)
    html.style.setProperty('--field-font-size', `${Math.max(MIN_UI_FONT_SIZE, uiFontSize - 1)}px`)
    for (const [name, value] of Object.entries(buildAppThemeStyleVars(theme))) {
      html.style.setProperty(name, value)
    }
    html.dataset.themeRef = settings.value.themeRef || DEFAULT_SETTINGS.themeRef
    html.dataset.themeId = theme.id || DEFAULT_SETTINGS.themeRef
    settings.value.theme = mode
    setGlobalMarkdownThemeRef(settings.value.themeRef)
    if (mode === 'dark') {
      html.setAttribute('data-theme', 'dark')
    } else {
      html.removeAttribute('data-theme')
    }
    // Sync with Electron native theme
    if (window.electronAPI) {
      window.electronAPI.setTheme(mode)
    }
  }

  // 切换主题
  function toggleTheme() {
    const nextThemeRef = effectiveThemeMode.value === 'dark' ? 'clean-paper' : 'star-blue'
    updateSettings({ themeRef: nextThemeRef })
  }

  function setThemeRef(themeRef) {
    updateSettings({ themeRef: normalizeMarkdownThemeRef(themeRef) })
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
    setThemeRef,
    updateLocale,
    applyTheme,
    effectiveTheme,
    effectiveThemeMode,
    DEFAULT_SETTINGS
  }
})
