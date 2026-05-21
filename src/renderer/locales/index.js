import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
}

const SUPPORTED_LOCALES = ['zh-CN', 'en-US']

/**
 * 获取默认语言
 * 优先级：1. localStorage 中保存的语言 2. 系统语言 3. 默认中文
 */
function getDefaultLocale() {
  // 1. 检查 localStorage
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
    return savedLocale
  }

  // 2. 检查浏览器语言（作为备用，Electron 环境下使用系统语言）
  const browserLang = navigator.language || navigator.userLanguage
  if (browserLang) {
    // 匹配完整语言代码 (如 zh-CN)
    if (SUPPORTED_LOCALES.includes(browserLang)) {
      return browserLang
    }
    // 匹配语言前缀 (如 zh, en)
    const langPrefix = browserLang.split('-')[0]
    if (langPrefix === 'zh') {
      return 'zh-CN'
    }
    if (langPrefix === 'en') {
      return 'en-US'
    }
  }

  // 3. 默认中文
  return 'zh-CN'
}

export const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages
})

/**
 * 切换语言
 * @param {string} locale - 语言代码 ('zh-CN' 或 'en-US')
 */
export function setLocale(locale) {
  if (SUPPORTED_LOCALES.includes(locale)) {
    i18n.global.locale.value = locale
    localStorage.setItem('locale', locale)
    document.documentElement.setAttribute('lang', locale)
    return true
  }
  return false
}

/**
 * 获取当前语言
 * @returns {string} 当前语言代码
 */
export function getLocale() {
  return i18n.global.locale.value
}

/**
 * 获取支持的语言列表
 * @returns {Array} 支持的语言列表
 */
export function getSupportedLocales() {
  return SUPPORTED_LOCALES.map(locale => ({
    value: locale,
    label: locale === 'zh-CN' ? '简体中文' : 'English'
  }))
}

/**
 * 异步初始化语言设置（用于 Electron 环境）
 * 从主进程获取系统语言
 */
export async function initLocaleFromSystem() {
  // 如果已经有保存的语言设置，直接返回
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
    return
  }

  // 尝试从 Electron 主进程获取系统语言
  if (window.electronAPI?.getSystemLocale) {
    try {
      const systemLocale = await window.electronAPI.getSystemLocale()
      if (systemLocale) {
        // 匹配完整语言代码
        if (SUPPORTED_LOCALES.includes(systemLocale)) {
          setLocale(systemLocale)
          return
        }
        // 匹配语言前缀
        const langPrefix = systemLocale.split('-')[0]
        if (langPrefix === 'zh') {
          setLocale('zh-CN')
          return
        }
        if (langPrefix === 'en') {
          setLocale('en-US')
          return
        }
      }
    } catch (e) {
      console.warn('Failed to get system locale:', e)
    }
  }
}

export default i18n
