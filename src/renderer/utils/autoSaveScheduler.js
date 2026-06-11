export const MIN_AUTO_SAVE_DELAY_SECONDS = 1
export const MAX_AUTO_SAVE_DELAY_SECONDS = 60
export const DEFAULT_AUTO_SAVE_DELAY_SECONDS = 10

export function normalizeAutoSaveDelaySeconds(value, fallback = DEFAULT_AUTO_SAVE_DELAY_SECONDS) {
  const parsed = Number.parseFloat(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return fallback

  const seconds = parsed > MAX_AUTO_SAVE_DELAY_SECONDS ? parsed / 1000 : parsed
  return Math.max(MIN_AUTO_SAVE_DELAY_SECONDS, Math.min(MAX_AUTO_SAVE_DELAY_SECONDS, Math.round(seconds)))
}

export function createAutoSaveScheduler(options = {}) {
  const {
    getTabs,
    getSettings,
    writeFile,
    markSaved,
    handleError,
    setTimer = setTimeout,
    clearTimer = clearTimeout
  } = options
  const timers = new Map()

  function createScheduleSignature(tab) {
    return [
      tab.filePath || '',
      tab.content || '',
      tab.encoding || 'utf-8',
      tab.isDirty ? 'dirty' : 'clean'
    ].join('\u0000')
  }

  function getCurrentTabs() {
    const tabs = typeof getTabs === 'function' ? getTabs() : []
    return Array.isArray(tabs) ? tabs : []
  }

  function getTab(tabId) {
    return getCurrentTabs().find(tab => tab?.id === tabId) || null
  }

  function clearTabTimer(tabId) {
    const entry = timers.get(tabId)
    if (!entry) return
    clearTimer(entry.timer)
    timers.delete(tabId)
  }

  function clearAllTimers() {
    timers.forEach(entry => clearTimer(entry.timer))
    timers.clear()
  }

  async function saveTab(tabId) {
    const tab = getTab(tabId)
    if (!tab?.filePath || !tab.isDirty || typeof writeFile !== 'function') return

    const snapshot = {
      filePath: tab.filePath,
      content: tab.content,
      encoding: tab.encoding || 'utf-8'
    }

    try {
      await writeFile(snapshot.filePath, snapshot.content, snapshot.encoding)
      const latestTab = getTab(tabId)
      if (latestTab?.filePath === snapshot.filePath && latestTab.content === snapshot.content) {
        markSaved?.(tabId)
      }
    } catch (error) {
      handleError?.(error, snapshot, tabId)
    }
  }

  function schedule() {
    const settings = typeof getSettings === 'function' ? getSettings() : {}
    if (!settings?.autoSave || typeof writeFile !== 'function') {
      clearAllTimers()
      return
    }

    const tabs = getCurrentTabs()
    const liveTabIds = new Set(tabs.map(tab => tab?.id).filter(Boolean))
    for (const tabId of timers.keys()) {
      if (!liveTabIds.has(tabId)) clearTabTimer(tabId)
    }

    const delay = normalizeAutoSaveDelaySeconds(settings.autoSaveDelay) * 1000
    for (const tab of tabs) {
      if (!tab?.id) continue
      if (!tab.filePath || !tab.isDirty) {
        clearTabTimer(tab.id)
        continue
      }
      const signature = createScheduleSignature(tab)
      const existingEntry = timers.get(tab.id)
      if (existingEntry?.signature === signature) continue
      clearTabTimer(tab.id)

      const timer = setTimer(() => {
        timers.delete(tab.id)
        void saveTab(tab.id)
      }, delay)
      timers.set(tab.id, { timer, signature })
    }
  }

  return {
    schedule,
    saveTab,
    dispose: clearAllTimers
  }
}
