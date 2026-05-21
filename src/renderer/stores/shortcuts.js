import { defineStore } from 'pinia'
import { ref } from 'vue'
import { normalizeShortcutAccelerator } from '../utils/shortcuts'

const WEB_SHORTCUTS_STORAGE_KEY = 'shortcutOverrides'

export const useShortcutsStore = defineStore('shortcuts', () => {
  const shortcutOverrides = ref({})
  const loaded = ref(false)
  let shortcutsChangedCleanup = null

  async function loadShortcuts() {
    if (loaded.value) return shortcutOverrides.value

    if (window.electronAPI?.getShortcuts) {
      try {
        applyShortcutPayload(await window.electronAPI.getShortcuts())
        bindShortcutsChanged()
        loaded.value = true
        return shortcutOverrides.value
      } catch (error) {
        console.error('Failed to load shortcuts:', error)
      }
    }

    loadWebFallback()
    loaded.value = true
    return shortcutOverrides.value
  }

  async function updateShortcut(id, accelerator) {
    if (window.electronAPI?.updateShortcut) {
      try {
        const result = await window.electronAPI.updateShortcut({ id, accelerator })
        if (result?.ok) applyShortcutPayload(result)
        return result
      } catch (error) {
        console.error('Failed to update shortcut:', error)
        return { ok: false, message: getIpcErrorMessage(error) }
      }
    }

    const nextOverrides = { ...shortcutOverrides.value }
    if (accelerator == null) {
      delete nextOverrides[id]
    } else {
      nextOverrides[id] = String(accelerator)
    }
    shortcutOverrides.value = nextOverrides
    saveWebFallback()
    return { ok: true, overrides: nextOverrides }
  }

  async function clearShortcut(id) {
    return updateShortcut(id, '')
  }

  async function resetShortcut(id) {
    if (window.electronAPI?.resetShortcut) {
      try {
        const result = await window.electronAPI.resetShortcut(id)
        if (result?.ok) applyShortcutPayload(result)
        return result
      } catch (error) {
        console.error('Failed to reset shortcut:', error)
        return { ok: false, message: getIpcErrorMessage(error) }
      }
    }

    const nextOverrides = { ...shortcutOverrides.value }
    delete nextOverrides[id]
    shortcutOverrides.value = nextOverrides
    saveWebFallback()
    return { ok: true, overrides: nextOverrides }
  }

  async function resetShortcuts() {
    if (window.electronAPI?.resetShortcuts) {
      try {
        const result = await window.electronAPI.resetShortcuts()
        if (result?.ok) applyShortcutPayload(result)
        return result
      } catch (error) {
        console.error('Failed to reset shortcuts:', error)
        return { ok: false, message: getIpcErrorMessage(error) }
      }
    }

    shortcutOverrides.value = {}
    saveWebFallback()
    return { ok: true, overrides: {} }
  }

  function applyShortcutPayload(payload = {}) {
    shortcutOverrides.value = sanitizeShortcutOverrides(payload.overrides)
  }

  function bindShortcutsChanged() {
    if (shortcutsChangedCleanup || !window.electronAPI?.onShortcutsChanged) return
    shortcutsChangedCleanup = window.electronAPI.onShortcutsChanged((payload) => {
      applyShortcutPayload(payload)
    })
  }

  function loadWebFallback() {
    try {
      shortcutOverrides.value = sanitizeShortcutOverrides(JSON.parse(localStorage.getItem(WEB_SHORTCUTS_STORAGE_KEY) || '{}'))
      saveWebFallback()
    } catch (error) {
      console.error('Failed to load web shortcut overrides:', error)
      shortcutOverrides.value = {}
    }
  }

  function saveWebFallback() {
    localStorage.setItem(WEB_SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcutOverrides.value))
  }

  function sanitizeShortcutOverrides(overrides = {}) {
    return Object.entries(overrides || {}).reduce((result, [id, accelerator]) => {
      if (typeof accelerator !== 'string') return result
      if (isDeprecatedShortcutOverride(id, accelerator)) return result
      result[id] = accelerator
      return result
    }, {})
  }

  function isDeprecatedShortcutOverride(id, accelerator) {
    return id === 'dev.forceReload' && normalizeShortcutAccelerator(accelerator) === normalizeShortcutAccelerator('CmdOrCtrl+Shift+R')
  }

  function getIpcErrorMessage(error) {
    const message = String(error?.message || error || '')
    if (message.includes('No handler registered')) return 'Shortcut IPC handler is not available. Please restart SlimNote.'
    return message || 'Shortcut IPC handler failed.'
  }

  return {
    shortcutOverrides,
    loaded,
    loadShortcuts,
    updateShortcut,
    clearShortcut,
    resetShortcut,
    resetShortcuts
  }
})
