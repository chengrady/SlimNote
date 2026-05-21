import { getCurrentInstance, inject, ref } from 'vue'

const I18N_SYMBOL = Symbol('slimnote-i18n')
const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g

function resolvePath(source, path) {
  return String(path || '').split('.').reduce((current, key) => current?.[key], source)
}

function formatMessage(message, params = {}) {
  if (typeof message === 'function') {
    return message({
      named(key) {
        return params[key]
      }
    })
  }

  if (typeof message !== 'string') {
    return message
  }

  return message.replace(PLACEHOLDER_PATTERN, (_, key) => {
    const value = params[key]
    return value == null ? `{${key}}` : String(value)
  })
}

function createContext(options = {}) {
  const locale = ref(options.locale || 'zh-CN')
  const fallbackLocale = options.fallbackLocale || 'zh-CN'
  const messages = options.messages || {}

  function getMessage(localeValue, key) {
    return resolvePath(messages[localeValue], key)
  }

  function te(key, localeValue = locale.value) {
    return getMessage(localeValue, key) != null || getMessage(fallbackLocale, key) != null
  }

  function t(key, params = {}) {
    const message = getMessage(locale.value, key)
    if (message != null) {
      return formatMessage(message, params)
    }

    const fallbackMessage = getMessage(fallbackLocale, key)
    if (fallbackMessage != null) {
      return formatMessage(fallbackMessage, params)
    }

    return key
  }

  return {
    locale,
    fallbackLocale,
    messages,
    t,
    te
  }
}

export function createI18n(options = {}) {
  const context = createContext(options)

  return {
    mode: 'composition',
    global: {
      locale: context.locale,
      t: context.t,
      te: context.te
    },
    install(app) {
      app.provide(I18N_SYMBOL, context)
      app.config.globalProperties.$t = context.t
      app.config.globalProperties.$te = context.te
      app.config.globalProperties.$i18n = { locale: context.locale }
    }
  }
}

export function useI18n() {
  const instance = getCurrentInstance()
  const context = inject(I18N_SYMBOL, null)

  if (!context) {
    throw new Error('No i18n instance available. Call app.use(i18n) before useI18n().')
  }

  if (!instance) {
    return {
      t: context.t,
      te: context.te,
      locale: context.locale
    }
  }

  return {
    t: context.t,
    te: context.te,
    locale: context.locale
  }
}