import { FREEFORM_EDIT_ACTION_ID } from './aiAutoApply.js'

export const POLISH_DOCUMENT_ACTION_ID = 'polish-document'
export const PROOFREAD_DOCUMENT_ACTION_ID = 'proofread-document'

export const AI_ACTIONS = [
  { id: POLISH_DOCUMENT_ACTION_ID, labelKey: 'ai.actions.polishDocument', requiresEditable: true },
  { id: PROOFREAD_DOCUMENT_ACTION_ID, labelKey: 'ai.actions.proofreadDocument', requiresEditable: true },
  { id: 'continue-writing', labelKey: 'ai.actions.continueWriting', requiresEditable: true },
  { id: 'summarize-document', labelKey: 'ai.actions.summarizeDocument', requiresEditable: false },
  { id: 'explain-content', labelKey: 'ai.actions.explainContent', requiresEditable: false }
]

const ACTION_INSTRUCTIONS = {
  [FREEFORM_EDIT_ACTION_ID]: 'Edit the selected text or current document exactly according to the User Instruction. Return the complete replacement text for the target, and nothing else.',
  [POLISH_DOCUMENT_ACTION_ID]: 'Polish the full current document while preserving its meaning, structure, formatting, and language. Return the complete polished document, and nothing else.',
  [PROOFREAD_DOCUMENT_ACTION_ID]: 'Proofread the full current document. Correct only typos, wrong characters, obvious grammar issues, duplicated words, punctuation, spacing, and formatting mistakes while preserving meaning, tone, structure, Markdown formatting, code blocks, inline code, links, commands, file paths, and configuration keys. Return the complete corrected document, and nothing else.',
  'continue-writing': 'Continue writing from the provided context. Match the existing tone, style, and formatting.',
  'summarize-document': 'Summarize the document clearly and concisely. Focus on key points and conclusions.',
  'explain-content': 'Explain the provided content in plain language. Mention important details, risks, or assumptions when relevant.'
}

const NON_EDITABLE_EDIT_ACTION_INSTRUCTIONS = {
  [POLISH_DOCUMENT_ACTION_ID]: 'Analyze the current document and provide suggestions for polishing it. Do not return directly replaceable text.',
  [PROOFREAD_DOCUMENT_ACTION_ID]: 'Analyze the current document and point out typo, punctuation, grammar, spacing, or formatting corrections. Do not return directly replaceable text.',
  'continue-writing': 'Analyze the context and suggest possible continuation directions. Do not generate directly insertable continuation text.'
}

const EDIT_ACTION_IDS = new Set([
  FREEFORM_EDIT_ACTION_ID,
  POLISH_DOCUMENT_ACTION_ID,
  PROOFREAD_DOCUMENT_ACTION_ID,
  'continue-writing'
])

const RESPONSE_LANGUAGE_OPTIONS = new Set(['app', 'document', 'zh-CN', 'en-US'])
const RESPONSE_LANGUAGE_NAMES = {
  'zh-CN': 'Simplified Chinese',
  'en-US': 'English'
}
const CONVERSATION_HISTORY_MESSAGE_LIMIT = 16
const CONVERSATION_HISTORY_CONTENT_LIMIT = 8000
const CONVERSATION_HISTORY_ROLES = new Set(['user', 'assistant'])

function normalizeText(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeLocale(value) {
  const locale = normalizeText(value).trim()
  if (locale.toLowerCase().startsWith('en')) return 'en-US'
  return 'zh-CN'
}

function normalizeResponseLanguage(value) {
  return RESPONSE_LANGUAGE_OPTIONS.has(value) ? value : 'app'
}

function resolveDefaultLanguageName(options = {}) {
  const responseLanguage = normalizeResponseLanguage(options.responseLanguage)
  if (responseLanguage === 'document') return RESPONSE_LANGUAGE_NAMES[normalizeLocale(options.appLocale)]
  const locale = responseLanguage === 'app' ? normalizeLocale(options.appLocale) : responseLanguage
  return RESPONSE_LANGUAGE_NAMES[locale] || RESPONSE_LANGUAGE_NAMES['zh-CN']
}

function buildVisibleReasoningLanguageInstruction(defaultLanguageName) {
  if (defaultLanguageName === RESPONSE_LANGUAGE_NAMES['zh-CN']) {
    return '如果模型会向应用输出可见的 reasoning_content、reasoning 或 thinking 流，必须使用简体中文书写这些可见思考内容；不要使用英文步骤标题或英文解释，代码、命令、配置键名、文件名、错误信息和原文引用除外。'
  }

  return 'If the model exposes visible reasoning_content, reasoning, or thinking streams to the app, write that visible reasoning in English; do not use another natural language except for code, commands, configuration keys, file names, error messages, and quoted original text.'
}

function buildResponseLanguageInstructions(context, actionId, options = {}) {
  const responseLanguage = normalizeResponseLanguage(options.responseLanguage)
  const defaultLanguageName = resolveDefaultLanguageName(options)
  const commonInstruction = 'Keep code, commands, configuration keys, file names, error messages, and quoted original text unchanged unless translation is explicitly requested.'
  const reasoningLanguageInstruction = buildVisibleReasoningLanguageInstruction(defaultLanguageName)

  if (context?.isEditable && EDIT_ACTION_IDS.has(actionId)) {
    return [
      'For edit actions that produce insertable text, preserve the dominant language of the selected text or document.',
      `If there is no clear source language, use ${defaultLanguageName}.`,
      'If the user explicitly requests a different output language, follow that request.',
      reasoningLanguageInstruction,
      commonInstruction
    ]
  }

  if (responseLanguage === 'document') {
    return [
      'Use the primary natural language of the provided document/context.',
      `If the language is unclear, use ${defaultLanguageName}.`,
      'If the user explicitly requests a different output language, follow that request.',
      reasoningLanguageInstruction,
      commonInstruction
    ]
  }

  return [
    `Default response language: ${defaultLanguageName}.`,
    'If the user explicitly requests a different output language, follow that request.',
    reasoningLanguageInstruction,
    commonInstruction
  ]
}

function buildModelIdentityInstructions(options = {}) {
  const providerName = normalizeText(options.aiProviderName || options.providerName).trim()
  const modelName = normalizeText(options.aiModelName || options.modelName).trim()
  const modelValue = normalizeText(options.aiModelValue || options.modelValue || options.model).trim()
  const modelLabel = modelName && modelValue && modelName !== modelValue ? `${modelName} (${modelValue})` : (modelName || modelValue)
  const instructions = []

  if (providerName) instructions.push(`Current configured AI provider: ${providerName}.`)
  if (modelLabel) instructions.push(`Current configured AI model: ${modelLabel}.`)
  if (instructions.length) {
    instructions.push('If the user asks what model, provider, or underlying AI powers you, answer from this SlimNote configuration instead of guessing from training data.')
  }

  return instructions
}

function buildContextPriorityInstructions() {
  return [
    'Latest user instruction and conversation history take precedence over document/context sections.',
    'Use document/context sections as supporting material only unless the latest user instruction explicitly asks to edit, summarize, explain, or continue that document/context.'
  ]
}

function appendSection(parts, title, content) {
  if (!content) return
  parts.push(`## ${title}`)
  parts.push(content)
}

function buildSystemMessage(context, actionId, options = {}) {
  const isEditable = Boolean(context?.isEditable)
  const isEditAction = EDIT_ACTION_IDS.has(actionId)
  const languageInstructions = buildResponseLanguageInstructions(context, actionId, options)
  const modelIdentityInstructions = buildModelIdentityInstructions(options)
  const contextPriorityInstructions = buildContextPriorityInstructions()

  if (isEditable && isEditAction) {
    return [
      'You are an AI writing assistant inside SlimNote.',
      ...modelIdentityInstructions,
      ...languageInstructions,
      ...contextPriorityInstructions,
      'For Markdown or plain text edit tasks, return only the directly applicable body text.',
      'Do not wrap the answer in code fences unless the requested body text itself requires them.',
      'Do not add explanations, prefixes, or suffixes outside the replacement/insertable text.'
    ].join('\n')
  }

  if (!isEditable && isEditAction) {
    return [
      'You are an AI assistant inside SlimNote.',
      ...modelIdentityInstructions,
      ...languageInstructions,
      ...contextPriorityInstructions,
      'The current file type is not AI-editable.',
      'Only provide suggestions or analysis. Do not produce directly replaceable or insertable content.'
    ].join('\n')
  }

  return [
    'You are an AI assistant inside SlimNote.',
    ...modelIdentityInstructions,
    ...languageInstructions,
    ...contextPriorityInstructions,
    'Use the provided context to answer the task clearly.',
    'If the context is truncated, mention that the answer is based only on the provided excerpt.'
  ].join('\n')
}

function getActionInstruction(actionId, context) {
  if (!context?.isEditable && EDIT_ACTION_IDS.has(actionId)) {
    return NON_EDITABLE_EDIT_ACTION_INSTRUCTIONS[actionId] || 'Only provide suggestions or analysis. Do not return directly replaceable or insertable content.'
  }

  return ACTION_INSTRUCTIONS[actionId] || 'Follow the user instruction using the provided context.'
}

function shouldIncludeFileInfo(context) {
  if (typeof context?.includeFileInfo === 'boolean') return context.includeFileInfo
  return Array.isArray(context?.includedParts) ? context.includedParts.includes('fileInfo') : true
}

function normalizeConversationHistory(messages = []) {
  if (!Array.isArray(messages)) return []

  return messages
    .filter(message => CONVERSATION_HISTORY_ROLES.has(message?.role))
    .map(message => ({
      role: message.role,
      content: normalizeText(message.content).trim()
    }))
    .filter(message => message.content)
    .slice(-CONVERSATION_HISTORY_MESSAGE_LIMIT)
    .map(message => ({
      ...message,
      content: message.content.slice(-CONVERSATION_HISTORY_CONTENT_LIMIT)
    }))
}

export function buildAiMessages({ context = {}, userInput = '', actionId = '', appLocale = 'zh-CN', responseLanguage = 'app', conversationMessages = [], conversationSummary = '', aiProviderName = '', aiModelName = '', aiModelValue = '' } = {}) {
  const safeContext = context || {}
  const userParts = []
  const historyMessages = normalizeConversationHistory(conversationMessages)
  const summaryText = normalizeText(conversationSummary).trim()

  appendSection(userParts, 'Conversation Summary', summaryText)

  userParts.push('## Task')
  userParts.push(getActionInstruction(actionId, safeContext))

  if (shouldIncludeFileInfo(safeContext)) {
    userParts.push('## File Info')
    userParts.push([
      `File name: ${normalizeText(safeContext.fileName) || 'Untitled'}`,
      `Language: ${normalizeText(safeContext.language) || 'plaintext'}`,
      `AI editable: ${safeContext.isEditable ? 'yes' : 'no'}`,
      `Cursor offset: ${Number.isFinite(Number(safeContext.cursorOffset)) ? Number(safeContext.cursorOffset) : 0}`,
      `Content length: ${Number.isFinite(Number(safeContext.contentLength)) ? Number(safeContext.contentLength) : 0}`,
      `Included context: ${Array.isArray(safeContext.includedParts) ? safeContext.includedParts.join(', ') : normalizeText(safeContext.contextSummary) || 'none'}`,
      `Context truncated: ${safeContext.isTruncated ? 'yes' : 'no'}`,
      `Manual full document needed: ${safeContext.requiresManualFullDocument ? 'yes' : 'no'}`
    ].join('\n'))
  }

  appendSection(userParts, 'Selection', normalizeText(safeContext.selection))
  appendSection(userParts, 'Nearby Text', normalizeText(safeContext.nearbyText))
  appendSection(userParts, 'Full Document', normalizeText(safeContext.fullDocument))
  appendSection(userParts, 'Context Attachments', normalizeText(safeContext.attachmentText))
  appendSection(userParts, 'User Instruction', normalizeText(userInput).trim())

  return [
    {
      role: 'system',
      content: buildSystemMessage(safeContext, actionId, { appLocale, responseLanguage, aiProviderName, aiModelName, aiModelValue })
    },
    ...historyMessages,
    {
      role: 'user',
      content: userParts.join('\n\n')
    }
  ]
}
