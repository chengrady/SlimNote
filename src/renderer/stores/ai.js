import { defineStore } from 'pinia'
import { ref } from 'vue'
import { normalizeLocalAiSettings } from '../utils/aiSettingsView'

function getElectronAPI() {
  return typeof window === 'undefined' ? null : window.electronAPI
}

function createMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `ai-message-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getIpcErrorMessage(error, fallback) {
  return String(error?.message || error || fallback)
}

function normalizeMessage(message = {}) {
  return {
    ...message,
    id: message.id || createMessageId(),
    role: message.role || 'user',
    content: typeof message.content === 'string' ? message.content : '',
    createdAt: message.createdAt || new Date().toISOString()
  }
}

function isSavableSessionMessage(message = {}) {
  return ['user', 'assistant'].includes(message.role) && typeof message.content === 'string' && message.content.trim().length > 0
}

function isSavedSession(session) {
  return session && typeof session === 'object' && !Array.isArray(session) && typeof session.id === 'string' && session.id.trim() && Array.isArray(session.messages) && session.messages.some(isSavableSessionMessage)
}

function normalizeNonNegativeInteger(value) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) && number > 0 ? number : 0
}

export const useAIStore = defineStore('ai', () => {
  const settings = ref(null)
  const sessions = ref([])
  const activeSessionId = ref('')
  const messages = ref([])
  const conversationSummary = ref('')
  const conversationSummaryMessageCount = ref(0)
  const conversationSummaryUpdatedAt = ref('')
  const isGenerating = ref(false)
  const activeRequestId = ref('')
  const errorMessage = ref('')

  function applySessionSummary(session = {}) {
    conversationSummary.value = typeof session.summary === 'string' ? session.summary : ''
    conversationSummaryMessageCount.value = normalizeNonNegativeInteger(session.summaryMessageCount)
    conversationSummaryUpdatedAt.value = typeof session.summaryUpdatedAt === 'string' ? session.summaryUpdatedAt : ''
  }

  async function loadSettings() {
    const electronAPI = getElectronAPI()
    if (!electronAPI?.getAISettings) {
      errorMessage.value = 'AI settings IPC is not available.'
      return { ok: false, message: errorMessage.value }
    }

    try {
      settings.value = normalizeLocalAiSettings(await electronAPI.getAISettings())
      errorMessage.value = ''
      return { ok: true, settings: settings.value }
    } catch (error) {
      errorMessage.value = getIpcErrorMessage(error, 'Failed to load AI settings.')
      console.error('Failed to load AI settings:', error)
      return { ok: false, message: errorMessage.value }
    }
  }

  async function saveSettings(payload) {
    const electronAPI = getElectronAPI()
    if (!electronAPI?.updateAISettings) {
      errorMessage.value = 'AI settings IPC is not available.'
      return { ok: false, message: errorMessage.value }
    }

    try {
      const safePayload = payload || {}
      settings.value = normalizeLocalAiSettings(await electronAPI.updateAISettings(safePayload), {
        responseLanguage: safePayload.responseLanguage
      })
      errorMessage.value = ''
      return { ok: true, settings: settings.value }
    } catch (error) {
      errorMessage.value = getIpcErrorMessage(error, 'Failed to save AI settings.')
      console.error('Failed to save AI settings:', error)
      return { ok: false, message: errorMessage.value }
    }
  }

  async function loadSessions() {
    const electronAPI = getElectronAPI()
    if (!electronAPI?.listAISessions) {
      errorMessage.value = 'AI sessions IPC is not available.'
      sessions.value = []
      return { ok: false, message: errorMessage.value, sessions: sessions.value }
    }

    try {
      const result = await electronAPI.listAISessions()
      sessions.value = Array.isArray(result) ? result : []
      errorMessage.value = ''
      return { ok: true, sessions: sessions.value }
    } catch (error) {
      errorMessage.value = getIpcErrorMessage(error, 'Failed to load AI sessions.')
      console.error('Failed to load AI sessions:', error)
      sessions.value = []
      return { ok: false, message: errorMessage.value, sessions: sessions.value }
    }
  }

  async function saveActiveSession(meta = {}) {
    const electronAPI = getElectronAPI()
    if (!electronAPI?.saveAISession) {
      errorMessage.value = 'AI sessions IPC is not available.'
      return { ok: false, success: false, message: errorMessage.value }
    }

    const now = new Date().toISOString()
    const normalizedMessages = messages.value.map(normalizeMessage)
    if (!normalizedMessages.some(isSavableSessionMessage)) {
      errorMessage.value = 'AI session must include at least one user or assistant message.'
      return { ok: false, success: false, message: errorMessage.value }
    }

    const session = {
      ...meta,
      id: meta.id || activeSessionId.value,
      updatedAt: now,
      messages: normalizedMessages,
      summary: conversationSummary.value,
      summaryMessageCount: conversationSummaryMessageCount.value,
      summaryUpdatedAt: conversationSummaryUpdatedAt.value
    }

    if (!session.createdAt) {
      const existingSession = session.id ? sessions.value.find(item => item.id === session.id) : null
      session.createdAt = existingSession?.createdAt || now
    }

    try {
      const result = await electronAPI.saveAISession(session)
      if (!result?.success) {
        errorMessage.value = result?.message || 'Failed to save AI session.'
        return { ok: false, success: false, message: errorMessage.value }
      }
      if (!isSavedSession(result.session)) {
        errorMessage.value = result?.message || 'AI session save returned an invalid session.'
        return { ok: false, success: false, message: errorMessage.value }
      }

      activeSessionId.value = result.session.id
      messages.value = result.session.messages
      applySessionSummary(result.session)
      const refreshResult = await loadSessions()
      if (!refreshResult.ok) return { ok: true, success: true, session: result.session, warning: refreshResult.message || 'Failed to refresh AI sessions after save.' }
      errorMessage.value = ''
      return { ok: true, success: true, session: result.session }
    } catch (error) {
      errorMessage.value = getIpcErrorMessage(error, 'Failed to save AI session.')
      console.error('Failed to save AI session:', error)
      return { ok: false, success: false, message: errorMessage.value }
    }
  }

  function activateSession(session = {}) {
    if (!isSavedSession(session)) {
      errorMessage.value = 'AI session is not available.'
      return { ok: false, message: errorMessage.value }
    }

    activeSessionId.value = session.id
    messages.value = session.messages.map(normalizeMessage)
    applySessionSummary(session)
    isGenerating.value = false
    activeRequestId.value = ''
    errorMessage.value = ''
    return { ok: true, session }
  }

  async function deleteSession(id) {
    const electronAPI = getElectronAPI()
    if (!electronAPI?.deleteAISession) {
      errorMessage.value = 'AI sessions IPC is not available.'
      return { ok: false, message: errorMessage.value, sessions: sessions.value }
    }

    const sessionId = typeof id === 'string' ? id.trim() : ''
    if (!sessionId) {
      errorMessage.value = 'AI session id is required.'
      return { ok: false, message: errorMessage.value, sessions: sessions.value }
    }

    try {
      const result = await electronAPI.deleteAISession(sessionId)
      sessions.value = Array.isArray(result) ? result : []
      if (activeSessionId.value === sessionId) resetSessionState()
      errorMessage.value = ''
      return { ok: true, sessions: sessions.value }
    } catch (error) {
      errorMessage.value = getIpcErrorMessage(error, 'Failed to delete AI session.')
      console.error('Failed to delete AI session:', error)
      return { ok: false, message: errorMessage.value, sessions: sessions.value }
    }
  }

  async function clearSessions() {
    const electronAPI = getElectronAPI()
    if (!electronAPI?.clearAISessions) {
      errorMessage.value = 'AI sessions IPC is not available.'
      return { ok: false, message: errorMessage.value, sessions: sessions.value }
    }

    try {
      const hadActiveSavedSession = Boolean(activeSessionId.value)
      const result = await electronAPI.clearAISessions()
      sessions.value = Array.isArray(result) ? result : []
      if (hadActiveSavedSession) resetSessionState()
      errorMessage.value = ''
      return { ok: true, sessions: sessions.value }
    } catch (error) {
      errorMessage.value = getIpcErrorMessage(error, 'Failed to clear AI sessions.')
      console.error('Failed to clear AI sessions:', error)
      return { ok: false, message: errorMessage.value, sessions: sessions.value }
    }
  }

  function appendMessage(message) {
    const nextMessage = normalizeMessage(message)
    messages.value.push(nextMessage)
    return nextMessage
  }

  function updateAssistantMessage(messageId, text) {
    const message = messages.value.find(item => item.id === messageId && item.role === 'assistant')
    if (!message) return null

    message.content = typeof text === 'string' ? text : ''
    return message
  }

  function setConversationSummary(summary = '', messageCount = 0) {
    conversationSummary.value = typeof summary === 'string' ? summary.trim() : ''
    conversationSummaryMessageCount.value = normalizeNonNegativeInteger(messageCount)
    conversationSummaryUpdatedAt.value = conversationSummary.value ? new Date().toISOString() : ''
  }

  async function stopGenerating() {
    const requestId = activeRequestId.value
    const electronAPI = getElectronAPI()

    try {
      if (!requestId) {
        errorMessage.value = 'No active AI request to stop.'
        return { ok: false, message: errorMessage.value }
      }
      if (!electronAPI?.stopAIChat) {
        errorMessage.value = 'AI chat IPC is not available.'
        return { ok: false, message: errorMessage.value }
      }
      const result = await electronAPI.stopAIChat(requestId)
      if (result?.ok === false) {
        errorMessage.value = result.message || 'Failed to stop AI chat.'
      }
      return result
    } catch (error) {
      errorMessage.value = getIpcErrorMessage(error, 'Failed to stop AI chat.')
      console.error('Failed to stop AI chat:', error)
      return { ok: false, message: errorMessage.value }
    } finally {
      isGenerating.value = false
      activeRequestId.value = ''
    }
  }

  function resetSessionState() {
    activeSessionId.value = ''
    messages.value = []
    conversationSummary.value = ''
    conversationSummaryMessageCount.value = 0
    conversationSummaryUpdatedAt.value = ''
    isGenerating.value = false
    activeRequestId.value = ''
    errorMessage.value = ''
  }

  return {
    settings,
    sessions,
    activeSessionId,
    messages,
    conversationSummary,
    conversationSummaryMessageCount,
    conversationSummaryUpdatedAt,
    isGenerating,
    activeRequestId,
    errorMessage,
    loadSettings,
    saveSettings,
    loadSessions,
    saveActiveSession,
    activateSession,
    deleteSession,
    clearSessions,
    appendMessage,
    updateAssistantMessage,
    setConversationSummary,
    stopGenerating,
    resetSessionState
  }
})
