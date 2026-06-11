const { dirname, join } = require('path')
const fs = require('fs')

const DEFAULT_AUTO_CHECK_DELAY_MS = 0
const DEFAULT_AUTO_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000
const UPDATE_CHECK_STATE_FILE = 'update-check-state.json'

function normalizeUpdateInfo(info = {}) {
  return {
    latestVersion: String(info.version || '').trim(),
    releaseName: String(info.releaseName || info.version || '').trim(),
    releaseNotes: info.releaseNotes || '',
    releaseDate: info.releaseDate || ''
  }
}

function createUpdateManager({
  app,
  updater,
  getMainWindow,
  releaseUrl,
  feed,
  onBeforeInstall,
  autoCheckDelayMs = DEFAULT_AUTO_CHECK_DELAY_MS,
  autoCheckIntervalMs = DEFAULT_AUTO_CHECK_INTERVAL_MS
}) {
  let status = 'idle'
  let source = 'manual'
  let checkTimer = null
  let updateInfo = null
  let progress = null
  let message = ''
  let isChecking = false
  let isDownloading = false
  let hasDownloadedUpdate = false
  const updateClient = updater || require('electron-updater').autoUpdater

  updateClient.autoDownload = false
  updateClient.autoInstallOnAppQuit = false

  if (feed) {
    updateClient.setFeedURL(feed)
  }

  function getStatePath() {
    return join(app.getPath('userData'), UPDATE_CHECK_STATE_FILE)
  }

  function readCheckState() {
    try {
      const statePath = getStatePath()
      if (!fs.existsSync(statePath)) return {}
      return JSON.parse(fs.readFileSync(statePath, 'utf8'))
    } catch (error) {
      return {}
    }
  }

  function writeCheckState(patch = {}) {
    try {
      const statePath = getStatePath()
      fs.mkdirSync(dirname(statePath), { recursive: true })
      fs.writeFileSync(statePath, JSON.stringify({ ...readCheckState(), ...patch }, null, 2), 'utf8')
    } catch (error) {
      console.warn('Failed to persist update check state:', error)
    }
  }

  function buildState(overrides = {}) {
    const info = normalizeUpdateInfo(updateInfo || {})
    return {
      ok: status !== 'error' && status !== 'not-supported',
      status,
      source,
      currentVersion: app.getVersion(),
      latestVersion: info.latestVersion || app.getVersion(),
      releaseName: info.releaseName,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
      releaseUrl,
      progress,
      message,
      isChecking,
      isDownloading,
      hasDownloadedUpdate,
      ...overrides
    }
  }

  function sendState(overrides = {}) {
    const state = buildState(overrides)
    const targetWindow = getMainWindow?.()
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send('update-state-changed', state)
    }
    return state
  }

  function setStatus(nextStatus, patch = {}) {
    status = nextStatus
    if (Object.prototype.hasOwnProperty.call(patch, 'source')) source = patch.source
    if (Object.prototype.hasOwnProperty.call(patch, 'updateInfo')) updateInfo = patch.updateInfo
    if (Object.prototype.hasOwnProperty.call(patch, 'progress')) progress = patch.progress
    if (Object.prototype.hasOwnProperty.call(patch, 'message')) message = patch.message
    if (Object.prototype.hasOwnProperty.call(patch, 'isChecking')) isChecking = patch.isChecking
    if (Object.prototype.hasOwnProperty.call(patch, 'isDownloading')) isDownloading = patch.isDownloading
    if (Object.prototype.hasOwnProperty.call(patch, 'hasDownloadedUpdate')) hasDownloadedUpdate = patch.hasDownloadedUpdate
    return sendState()
  }

  updateClient.on('checking-for-update', () => {
    setStatus('checking', {
      isChecking: true,
      isDownloading: false,
      progress: null,
      message: ''
    })
  })

  updateClient.on('update-available', (info) => {
    setStatus('available', {
      updateInfo: info,
      isChecking: false,
      isDownloading: false,
      hasDownloadedUpdate: false,
      progress: null,
      message: ''
    })
  })

  updateClient.on('update-not-available', (info) => {
    setStatus('not-available', {
      updateInfo: info,
      isChecking: false,
      isDownloading: false,
      hasDownloadedUpdate: false,
      progress: null,
      message: ''
    })
  })

  updateClient.on('download-progress', (downloadProgress) => {
    setStatus('downloading', {
      isChecking: false,
      isDownloading: true,
      progress: {
        percent: Number(downloadProgress.percent) || 0,
        bytesPerSecond: Number(downloadProgress.bytesPerSecond) || 0,
        transferred: Number(downloadProgress.transferred) || 0,
        total: Number(downloadProgress.total) || 0
      },
      message: ''
    })
  })

  updateClient.on('update-downloaded', (info) => {
    setStatus('downloaded', {
      updateInfo: info,
      isChecking: false,
      isDownloading: false,
      hasDownloadedUpdate: true,
      progress: null,
      message: ''
    })
  })

  updateClient.on('error', (error) => {
    setStatus('error', {
      isChecking: false,
      isDownloading: false,
      message: error?.message || 'Unable to complete update request.'
    })
  })

  async function checkForUpdates(options = {}) {
    const manual = options.manual !== false
    source = manual ? 'manual' : 'auto'

    if (!app.isPackaged) {
      return setStatus('not-supported', {
        source,
        isChecking: false,
        isDownloading: false,
        message: 'In-app updates are only available in packaged builds.'
      })
    }

    if (isChecking) {
      return buildState()
    }

    if (!manual) {
      writeCheckState({ lastAutomaticCheckAt: Date.now() })
    }

    try {
      isChecking = true
      const result = await updateClient.checkForUpdates()
      if (!result && status === 'checking') {
        return setStatus('not-supported', {
          isChecking: false,
          isDownloading: false,
          message: 'Updater is not active for this build.'
        })
      }
      if (status === 'checking') {
        return setStatus('not-available', {
          updateInfo: result?.updateInfo,
          isChecking: false,
          isDownloading: false,
          hasDownloadedUpdate: false,
          progress: null,
          message: ''
        })
      }
      return buildState()
    } catch (error) {
      return setStatus('error', {
        isChecking: false,
        isDownloading: false,
        message: error?.message || 'Unable to check for updates.'
      })
    } finally {
      isChecking = false
      if (!manual) scheduleAutoCheck(autoCheckIntervalMs)
    }
  }

  async function downloadUpdate() {
    if (!app.isPackaged) {
      return setStatus('not-supported', {
        isDownloading: false,
        message: 'In-app updates are only available in packaged builds.'
      })
    }

    if (hasDownloadedUpdate) return buildState()
    if (isDownloading) return buildState()
    if (status !== 'available') {
      return setStatus('error', {
        isDownloading: false,
        message: 'No update is ready to download.'
      })
    }

    try {
      setStatus('downloading', {
        isChecking: false,
        isDownloading: true,
        progress: {
          percent: 0,
          bytesPerSecond: 0,
          transferred: 0,
          total: 0
        },
        message: ''
      })
      await updateClient.downloadUpdate()
      return buildState()
    } catch (error) {
      return setStatus('error', {
        isDownloading: false,
        message: error?.message || 'Unable to download update.'
      })
    }
  }

  function installUpdate() {
    if (!hasDownloadedUpdate) {
      return {
        ok: false,
        message: 'No downloaded update is ready to install.'
      }
    }

    onBeforeInstall?.()
    updateClient.quitAndInstall(false, true)
    return { ok: true }
  }

  function scheduleAutoCheck(delayMs = autoCheckDelayMs) {
    if (!app.isPackaged || checkTimer) return

    checkTimer = setTimeout(() => {
      checkTimer = null
      checkForUpdates({ manual: false })
    }, Math.max(0, delayMs))
    checkTimer.unref?.()
  }

  function destroy() {
    if (checkTimer) {
      clearTimeout(checkTimer)
      checkTimer = null
    }
  }

  return {
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    scheduleAutoCheck,
    getState: () => buildState(),
    destroy
  }
}

module.exports = {
  createUpdateManager
}
