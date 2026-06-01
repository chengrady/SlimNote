export const CONVERSATION_SUMMARY_RECENT_MESSAGE_LIMIT = 16
export const CONVERSATION_SUMMARY_MIN_RECENT_MESSAGE_LIMIT = 8
export const CONVERSATION_SUMMARY_CHAR_THRESHOLD = 24000

const SUMMARY_SOURCE_MESSAGE_CONTENT_LIMIT = 6000
const SUMMARY_SOURCE_TOTAL_LIMIT = 32000
const CONVERSATION_MESSAGE_ROLES = new Set(['user', 'assistant'])

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMessage(message = {}) {
  const role = CONVERSATION_MESSAGE_ROLES.has(message?.role) ? message.role : ''
  const content = normalizeText(message?.content)
  return role && content ? { role, content } : null
}

function normalizeMessageCount(value, max) {
  const count = Number.parseInt(value, 10)
  if (!Number.isFinite(count) || count < 0) return 0
  return Math.min(count, max)
}

function countConversationChars(messages) {
  return messages.reduce((total, message) => total + message.content.length, 0)
}

function formatSummarySourceMessages(messages = []) {
  const lines = []
  let usedLength = 0

  for (const message of messages.map(normalizeMessage).filter(Boolean)) {
    const label = message.role === 'assistant' ? 'Assistant' : 'User'
    const content = message.content.slice(-SUMMARY_SOURCE_MESSAGE_CONTENT_LIMIT)
    const block = `${label}: ${content}`
    const nextLength = usedLength + block.length + 2
    if (nextLength > SUMMARY_SOURCE_TOTAL_LIMIT) break
    lines.push(block)
    usedLength = nextLength
  }

  return lines.join('\n\n')
}

export function buildConversationCompressionPlan({ messages = [], summary = '', summaryMessageCount = 0 } = {}) {
  const normalizedMessages = Array.isArray(messages) ? messages.map(normalizeMessage).filter(Boolean) : []
  const previousSummary = normalizeText(summary)
  const coveredCount = normalizeMessageCount(summaryMessageCount, normalizedMessages.length)
  const totalChars = countConversationChars(normalizedMessages)
  const needsCompression = normalizedMessages.length > CONVERSATION_SUMMARY_RECENT_MESSAGE_LIMIT || totalChars > CONVERSATION_SUMMARY_CHAR_THRESHOLD

  if (!needsCompression) {
    return {
      shouldCompress: false,
      previousSummary,
      coveredMessageCount: coveredCount,
      messagesToSummarize: [],
      recentMessages: normalizedMessages
    }
  }

  let cutoff = Math.max(0, normalizedMessages.length - CONVERSATION_SUMMARY_RECENT_MESSAGE_LIMIT)
  if (totalChars > CONVERSATION_SUMMARY_CHAR_THRESHOLD && cutoff <= coveredCount && normalizedMessages.length > CONVERSATION_SUMMARY_MIN_RECENT_MESSAGE_LIMIT) {
    cutoff = Math.max(cutoff, normalizedMessages.length - CONVERSATION_SUMMARY_MIN_RECENT_MESSAGE_LIMIT)
  }

  const coveredMessageCount = Math.min(normalizedMessages.length, Math.max(coveredCount, cutoff))
  if (coveredMessageCount <= coveredCount) {
    return {
      shouldCompress: false,
      previousSummary,
      coveredMessageCount: coveredCount,
      messagesToSummarize: [],
      recentMessages: normalizedMessages.slice(-CONVERSATION_SUMMARY_RECENT_MESSAGE_LIMIT)
    }
  }

  return {
    shouldCompress: true,
    previousSummary,
    coveredMessageCount,
    messagesToSummarize: normalizedMessages.slice(coveredCount, coveredMessageCount),
    recentMessages: normalizedMessages.slice(coveredMessageCount)
  }
}

export function buildConversationSummaryMessages({ previousSummary = '', messagesToSummarize = [] } = {}) {
  const sourceMessages = formatSummarySourceMessages(messagesToSummarize)
  const userParts = []

  if (normalizeText(previousSummary)) {
    userParts.push('## Existing Summary')
    userParts.push(normalizeText(previousSummary))
  }

  userParts.push('## New Messages To Compress')
  userParts.push(sourceMessages || 'No valid user or assistant messages.')

  return [
    {
      role: 'system',
      content: [
        'You summarize SlimNote AI chat history for future turns.',
        'Keep durable facts, user intent, constraints, decisions, pending tasks, and generated outputs that may be referenced later.',
        'Do not invent details. Remove filler, greetings, and transient wording.',
        'Keep code, commands, configuration keys, file names, error messages, and quoted original text unchanged.',
        'Return a concise summary in the same language mix as the source conversation.'
      ].join('\n')
    },
    {
      role: 'user',
      content: userParts.join('\n\n')
    }
  ]
}
