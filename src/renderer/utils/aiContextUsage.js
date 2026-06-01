export const DEFAULT_CONTEXT_WINDOW_TOKENS = 128000
export const ESTIMATED_CHARS_PER_TOKEN = 4
export const DEFAULT_SYSTEM_OVERHEAD_CHARS = 2200
export const CURRENT_DOCUMENT_CONTENT_LIMIT = 12000
export const ATTACHMENT_CONTENT_LIMIT = 12000
export const HISTORY_MESSAGE_LIMIT = 16
export const HISTORY_MESSAGE_CONTENT_LIMIT = 8000

const FALLBACK_MAX_OUTPUT_TOKENS = 4096
const CONTEXT_STATUS_THRESHOLDS = {
  warning: 0.6,
  danger: 0.85,
  full: 1
}

function normalizeText(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeModelName(model = {}) {
  return normalizeText(model.model || model.name || model.id).toLowerCase()
}

export function estimateTokensFromText(text = '') {
  const length = normalizeText(text).length
  return length ? Math.ceil(length / ESTIMATED_CHARS_PER_TOKEN) : 0
}

export function inferContextWindowTokens(model = {}) {
  const explicit = normalizeNumber(model.contextWindowTokens || model.contextWindow || model.maxInputTokens)
  if (explicit > 0) return Math.round(explicit)

  const modelName = normalizeModelName(model)
  if (/claude|anthropic/.test(modelName)) return 200000
  if (/gemini-1\.5|gemini-2|gemini.*pro/.test(modelName)) return 1000000
  if (/gpt-4\.1|gpt-4o|o3|o4|deepseek|qwen|glm|mimo|minimax/.test(modelName)) return 128000
  if (/turbo|gpt-3\.5/.test(modelName)) return 16000
  return DEFAULT_CONTEXT_WINDOW_TOKENS
}

function clampContent(text = '', limit = Number.POSITIVE_INFINITY) {
  const normalized = normalizeText(text)
  return normalized.length > limit ? normalized.slice(0, limit) : normalized
}

function estimatePart(label, text = '') {
  const chars = normalizeText(text).length
  return {
    label,
    chars,
    tokens: estimateTokensFromText(text)
  }
}

function estimateHistoryText(messages = []) {
  if (!Array.isArray(messages)) return ''

  return messages
    .filter(message => ['user', 'assistant'].includes(message?.role))
    .map(message => ({
      role: message.role,
      content: normalizeText(message.content).trim()
    }))
    .filter(message => message.content)
    .slice(-HISTORY_MESSAGE_LIMIT)
    .map(message => clampContent(message.content, HISTORY_MESSAGE_CONTENT_LIMIT))
    .join('')
}

function estimateAttachmentText(attachments = []) {
  if (!Array.isArray(attachments)) return ''

  return attachments
    .filter(attachment => attachment?.selected !== false)
    .map(attachment => {
      const content = normalizeText(attachment.content || attachment.text)
      if (content) return clampContent(content, ATTACHMENT_CONTENT_LIMIT)
      const type = normalizeText(attachment.type)
      if (type === 'folder' || type === 'file') return 'x'.repeat(ATTACHMENT_CONTENT_LIMIT)
      return normalizeText(attachment.name || attachment.path || attachment.filePath)
    })
    .filter(Boolean)
    .join('\n\n')
}

function resolveStatus(ratio) {
  if (ratio >= CONTEXT_STATUS_THRESHOLDS.full) return 'full'
  if (ratio >= CONTEXT_STATUS_THRESHOLDS.danger) return 'danger'
  if (ratio >= CONTEXT_STATUS_THRESHOLDS.warning) return 'warning'
  return 'normal'
}

export function buildContextUsageStats({
  model = {},
  conversationSummary = '',
  messages = [],
  activeTab = {},
  currentDocumentSelected = true,
  contextAttachments = [],
  userInput = '',
  systemOverheadChars = DEFAULT_SYSTEM_OVERHEAD_CHARS
} = {}) {
  const contextWindowTokens = inferContextWindowTokens(model)
  const maxOutputTokens = Math.max(0, normalizeNumber(model.maxTokens, FALLBACK_MAX_OUTPUT_TOKENS))
  const inputBudgetTokens = Math.max(1, contextWindowTokens - maxOutputTokens)
  const currentDocumentText = currentDocumentSelected ? clampContent(activeTab?.content, CURRENT_DOCUMENT_CONTENT_LIMIT) : ''
  const parts = {
    system: estimatePart('System and task', 'x'.repeat(Math.max(0, normalizeNumber(systemOverheadChars)))),
    summary: estimatePart('Conversation summary', conversationSummary),
    history: estimatePart('Recent messages', estimateHistoryText(messages)),
    currentDocument: estimatePart('Current document', currentDocumentText),
    attachments: estimatePart('Attachments', estimateAttachmentText(contextAttachments)),
    userInput: estimatePart('User input', userInput)
  }
  const usedTokens = Object.values(parts).reduce((total, part) => total + part.tokens, 0)
  const ratio = usedTokens / inputBudgetTokens
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)))

  return {
    contextWindowTokens,
    inputBudgetTokens,
    maxOutputTokens,
    usedTokens,
    ratio,
    percent,
    status: resolveStatus(ratio),
    parts
  }
}
