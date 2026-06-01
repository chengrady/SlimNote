const { app } = require('electron')
const { dirname, join } = require('path')
const crypto = require('crypto')
const fs = require('fs')

const AI_SESSIONS_FILE = 'ai-chat-sessions.json'
const MAX_SESSIONS = 100
const MAX_MESSAGES_PER_SESSION = 200
const DEFAULT_SESSION_TITLE = 'AI Chat'
const MAX_TITLE_LENGTH = 80
const MAX_CONTENT_LENGTH = 20000
const MAX_SUMMARY_LENGTH = 12000
const MAX_SUMMARY_MESSAGE_COUNT = 100000
const MAX_CONTEXT_SUMMARY_LENGTH = 500
const MAX_ACTION_ID_LENGTH = 120
const MAX_ACTION_VALUE_LENGTH = 160
const MAX_MODEL_PROVIDER_LENGTH = 160
const PERSISTED_MESSAGE_ROLES = new Set(['user', 'assistant'])
const PERSISTED_APPLIED_ACTION_FIELDS = new Set(['id', 'type', 'title', 'label', 'status'])

function getAISessionsPath() {
  return join(app.getPath('userData'), AI_SESSIONS_FILE)
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeLimitedString(value, maxLength, fallback = '') {
  const normalized = normalizeString(value, fallback)
  return normalized ? normalized.slice(0, maxLength) : fallback
}

function normalizeDate(value, fallback = new Date().toISOString()) {
  if (typeof value !== 'string') return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function normalizeNonNegativeInteger(value, max = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(value, 10)
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.min(number, max)
}

function createSessionId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `ai-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function sanitizeAppliedAction(value) {
  if (typeof value === 'string') return normalizeLimitedString(value, MAX_ACTION_VALUE_LENGTH)
  if (!value || typeof value !== 'object') return undefined

  const sanitized = Object.entries(value).reduce((result, [key, item]) => {
    if (!PERSISTED_APPLIED_ACTION_FIELDS.has(key)) return result
    if (!['string', 'number', 'boolean'].includes(typeof item)) return result
    const sanitizedItem = typeof item === 'string' ? normalizeLimitedString(item, MAX_ACTION_VALUE_LENGTH) : item
    if (sanitizedItem !== '') result[key] = sanitizedItem
    return result
  }, {})

  return Object.keys(sanitized).length ? sanitized : undefined
}

function sanitizeMessage(message = {}) {
  message = normalizeObject(message)
  const content = normalizeLimitedString(message.content, MAX_CONTENT_LENGTH)
  const role = normalizeString(message.role)
  if (!PERSISTED_MESSAGE_ROLES.has(role)) return null
  if (!content) return null

  const sanitized = {
    id: normalizeString(message.id) || createSessionId(),
    role,
    content,
    createdAt: normalizeDate(message.createdAt)
  }

  const actionId = normalizeLimitedString(message.actionId, MAX_ACTION_ID_LENGTH)
  const contextSummary = normalizeLimitedString(message.contextSummary, MAX_CONTEXT_SUMMARY_LENGTH)
  const appliedAction = sanitizeAppliedAction(message.appliedAction)

  if (actionId) sanitized.actionId = actionId
  if (contextSummary) sanitized.contextSummary = contextSummary
  if (appliedAction !== undefined) sanitized.appliedAction = appliedAction

  return sanitized
}

function buildSessionTitle(session, messages) {
  const explicitTitle = normalizeLimitedString(session.title, MAX_TITLE_LENGTH)
  if (explicitTitle) return explicitTitle

  const firstUserMessage = messages.find(message => message.role === 'user' && message.content)
  if (!firstUserMessage) return DEFAULT_SESSION_TITLE

  const title = firstUserMessage.content.replace(/\s+/g, ' ').trim()
  return title ? title.slice(0, 40) : DEFAULT_SESSION_TITLE
}

function normalizeSession(session = {}) {
  session = normalizeObject(session)
  const now = new Date().toISOString()
  const messages = (Array.isArray(session.messages) ? session.messages : []).map(sanitizeMessage).filter(Boolean).slice(-MAX_MESSAGES_PER_SESSION)
  const createdAt = normalizeDate(session.createdAt, now)
  const updatedAt = normalizeDate(session.updatedAt, now)
  const sanitized = {
    id: normalizeString(session.id) || createSessionId(),
    title: buildSessionTitle(session, messages),
    createdAt,
    updatedAt,
    messages
  }
  const summary = normalizeLimitedString(session.summary, MAX_SUMMARY_LENGTH)
  const summaryMessageCount = normalizeNonNegativeInteger(session.summaryMessageCount, MAX_SUMMARY_MESSAGE_COUNT)
  const summaryUpdatedAt = normalizeDate(session.summaryUpdatedAt, updatedAt)
  const model = normalizeLimitedString(session.model, MAX_MODEL_PROVIDER_LENGTH)
  const provider = normalizeLimitedString(session.provider, MAX_MODEL_PROVIDER_LENGTH)

  if (summary) {
    sanitized.summary = summary
    sanitized.summaryMessageCount = summaryMessageCount
    sanitized.summaryUpdatedAt = summaryUpdatedAt
  }
  if (model) sanitized.model = model
  if (provider) sanitized.provider = provider

  return sanitized
}

function normalizeStoredSession(session = {}) {
  session = normalizeObject(session)
  const hasMessages = Array.isArray(session.messages) && session.messages.length > 0
  if (!session.id && !session.title && !hasMessages) return null
  const normalized = normalizeSession(session)
  return normalized.messages.length ? normalized : null
}

function sortSessions(sessions) {
  return sessions.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

function readStoredAISessions() {
  try {
    const sessionsPath = getAISessionsPath()
    if (!fs.existsSync(sessionsPath)) return []
    const parsed = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'))
    const sessions = Array.isArray(parsed) ? parsed : parsed?.sessions
    if (!Array.isArray(sessions)) return []
    return sortSessions(sessions.map(normalizeStoredSession).filter(Boolean)).slice(0, MAX_SESSIONS)
  } catch (error) {
    console.error('Failed to load AI chat sessions:', error)
    return []
  }
}

function writeStoredAISessions(sessions) {
  try {
    const sessionsPath = getAISessionsPath()
    fs.mkdirSync(dirname(sessionsPath), { recursive: true })
    fs.writeFileSync(sessionsPath, JSON.stringify(sortSessions(sessions).slice(0, MAX_SESSIONS), null, 2), 'utf8')
    return { success: true }
  } catch (error) {
    console.error('Failed to save AI chat sessions:', error)
    return { success: false, message: 'Failed to save AI chat sessions' }
  }
}

function listAISessions() {
  return readStoredAISessions()
}

function saveAISession(session = {}) {
  const nextSession = normalizeSession(session)
  if (!nextSession.messages.length) {
    return { success: false, message: 'AI session must include at least one user or assistant message' }
  }

  const sessions = readStoredAISessions().filter(item => item.id !== nextSession.id)
  const nextSessions = [nextSession, ...sessions]
  const writeResult = writeStoredAISessions(nextSessions)
  if (!writeResult.success) return writeResult
  return { success: true, session: nextSession }
}

function deleteAISession(id) {
  const sessionId = normalizeString(id)
  if (!sessionId) return listAISessions()

  const sessions = readStoredAISessions().filter(session => session.id !== sessionId)
  writeStoredAISessions(sessions)
  return sessions
}

function clearAISessions() {
  try {
    const sessionsPath = getAISessionsPath()
    if (fs.existsSync(sessionsPath)) {
      fs.unlinkSync(sessionsPath)
    }
  } catch (error) {
    console.error('Failed to clear AI chat sessions:', error)
  }

  return []
}

module.exports = {
  listAISessions,
  saveAISession,
  deleteAISession,
  clearAISessions
}
