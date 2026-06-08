export const DEFAULT_INLINE_COMPLETION_LANGUAGES = [
  'plaintext',
  'markdown',
  'javascript',
  'typescript',
  'json',
  'yaml',
  'toml',
  'ini',
  'sql',
  'html',
  'css',
  'scss',
  'xml',
  'python',
  'java',
  'c',
  'cpp',
  'csharp'
]
export const INLINE_COMPLETION_ACCEPT_MODE_VALUES = ['line', 'snippet']

export const INLINE_COMPLETION_COLOR_PRESETS = {
  gray: { light: '#64748b', dark: '#94a3b8' },
  blue: { light: '#2563eb', dark: '#60a5fa' },
  cyan: { light: '#0891b2', dark: '#22d3ee' },
  green: { light: '#16a34a', dark: '#4ade80' },
  red: { light: '#dc2626', dark: '#f87171' }
}

export const DEFAULT_INLINE_COMPLETION_SETTINGS = {
  enabled: true,
  delayMs: 500,
  maxChars: 600,
  prefixChars: 6000,
  suffixChars: 2000,
  includeLog: false,
  acceptMode: 'line',
  colorPreset: 'cyan',
  customColor: '#22c7d9',
  opacity: 0.7,
  languages: DEFAULT_INLINE_COMPLETION_LANGUAGES
}

const MIN_DELAY_MS = 150
const MAX_DELAY_MS = 3000
const MIN_MAX_CHARS = 20
const MAX_MAX_CHARS = 1200
const MIN_CONTEXT_CHARS = 200
const MAX_PREFIX_CHARS = 20000
const MAX_SUFFIX_CHARS = 8000
const MIN_TRIGGER_PREFIX_CHARS = 2
const EXPLANATION_PREFIX_RE = /^(?:sure|of course|here(?:'|’)s|here is|以下是|当然|好的|可以)[,，:\s]+/i
const CODE_FENCE_RE = /^```[a-zA-Z0-9_-]*\s*[\r\n]+([\s\S]*?)[\r\n]*```$/

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeInteger(value, fallback, minValue, maxValue) {
  const number = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maxValue, Math.max(minValue, number))
}

function normalizeNumber(value, fallback, minValue, maxValue) {
  if (value === '' || value === null || typeof value === 'undefined') return fallback
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maxValue, Math.max(minValue, number))
}

function normalizeLanguage(language) {
  return String(language || 'plaintext').trim().toLowerCase() || 'plaintext'
}

function normalizeLanguages(languages, fallback = DEFAULT_INLINE_COMPLETION_LANGUAGES) {
  const source = Array.isArray(languages) && languages.length ? languages : fallback
  return Array.from(new Set(source.map(normalizeLanguage).filter(Boolean)))
}

function normalizeAcceptMode(value, fallback = DEFAULT_INLINE_COMPLETION_SETTINGS.acceptMode) {
  const normalized = String(value || fallback).trim().toLowerCase()
  return INLINE_COMPLETION_ACCEPT_MODE_VALUES.includes(normalized) ? normalized : fallback
}

function getLineBeforeCurrentLine(beforeCursor) {
  const currentLineStart = beforeCursor.lastIndexOf('\n') + 1
  if (currentLineStart <= 0) return ''
  const beforeCurrentLine = beforeCursor.slice(0, currentLineStart - 1)
  const previousLineStart = beforeCurrentLine.lastIndexOf('\n') + 1
  return beforeCurrentLine.slice(previousLineStart)
}

function hasListOrQuoteContext(beforeCursor) {
  return /(?:^|\n)\s*(?:[-*+] |\d+[.)] |> )/.test(beforeCursor.slice(-160))
}

function shouldRequestEmptyLineCompletion(beforeCursor) {
  const previousLine = getLineBeforeCurrentLine(beforeCursor)
  const trimmedPreviousLine = previousLine.trim()
  if (trimmedPreviousLine.length < MIN_TRIGGER_PREFIX_CHARS) return false
  if (/^#{1,6}$/.test(trimmedPreviousLine)) return false
  if (/^(?:[-*+]|\d+[.)]|>)$/.test(trimmedPreviousLine)) return false
  if (/^(?:```|~~~)/.test(trimmedPreviousLine)) return false
  return true
}

function normalizeColorPreset(value, fallback = DEFAULT_INLINE_COMPLETION_SETTINGS.colorPreset) {
  const normalized = String(value || fallback).trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(INLINE_COMPLETION_COLOR_PRESETS, normalized)
    ? normalized
    : fallback
}

function normalizeHexColor(value, fallback = DEFAULT_INLINE_COMPLETION_SETTINGS.customColor) {
  const normalized = String(value || fallback).trim()
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toLowerCase()
  const shortMatch = normalized.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (shortMatch) return `#${shortMatch[1]}${shortMatch[1]}${shortMatch[2]}${shortMatch[2]}${shortMatch[3]}${shortMatch[3]}`.toLowerCase()
  return fallback
}

function hexToRgb(color) {
  const normalized = normalizeHexColor(color)
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  }
}

function rgba(color, opacity) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function normalizeInlineCompletionSettings(settings = {}) {
  const source = isPlainObject(settings?.inlineCompletion) ? settings.inlineCompletion : settings
  const fallback = DEFAULT_INLINE_COMPLETION_SETTINGS
  return {
    enabled: normalizeBoolean(source.enabled, fallback.enabled),
    delayMs: normalizeInteger(source.delayMs, fallback.delayMs, MIN_DELAY_MS, MAX_DELAY_MS),
    maxChars: normalizeInteger(source.maxChars, fallback.maxChars, MIN_MAX_CHARS, MAX_MAX_CHARS),
    prefixChars: normalizeInteger(source.prefixChars, fallback.prefixChars, MIN_CONTEXT_CHARS, MAX_PREFIX_CHARS),
    suffixChars: normalizeInteger(source.suffixChars, fallback.suffixChars, 0, MAX_SUFFIX_CHARS),
    includeLog: normalizeBoolean(source.includeLog, fallback.includeLog),
    acceptMode: normalizeAcceptMode(source.acceptMode, fallback.acceptMode),
    colorPreset: normalizeColorPreset(source.colorPreset, fallback.colorPreset),
    customColor: normalizeHexColor(source.customColor, fallback.customColor),
    opacity: normalizeNumber(source.opacity, fallback.opacity, 0.3, 1),
    languages: normalizeLanguages(source.languages, fallback.languages)
  }
}

export function resolveInlineCompletionAcceptText(text, settings = {}) {
  const suggestion = typeof text === 'string' ? text : ''
  if (!suggestion) return ''
  const normalizedSettings = normalizeInlineCompletionSettings(settings)
  if (normalizedSettings.acceptMode === 'snippet') return suggestion
  const normalizedSuggestion = suggestion.replace(/\r\n/g, '\n')
  const lineBreakIndex = normalizedSuggestion.indexOf('\n')
  return lineBreakIndex === -1 ? normalizedSuggestion : normalizedSuggestion.slice(0, lineBreakIndex)
}

export function consumeInlineCompletionLine(text) {
  const suggestion = typeof text === 'string' ? text.replace(/\r\n/g, '\n') : ''
  if (!suggestion) return { acceptedText: '', remainingText: '' }
  const lineBreakIndex = suggestion.indexOf('\n')
  if (lineBreakIndex === -1) return { acceptedText: suggestion, remainingText: '' }
  return {
    acceptedText: suggestion.slice(0, lineBreakIndex + 1),
    remainingText: suggestion.slice(lineBreakIndex + 1)
  }
}

export function buildInlineCompletionStyleVars(settings = {}, theme = 'light') {
  const normalized = normalizeInlineCompletionSettings(settings)
  const colorMode = theme === 'dark' ? 'dark' : 'light'
  const preset = INLINE_COMPLETION_COLOR_PRESETS[normalized.colorPreset]
  const color = preset?.[colorMode] || preset?.light || DEFAULT_INLINE_COMPLETION_SETTINGS.customColor
  const opacity = normalized.opacity

  return {
    '--inline-completion-color': rgba(color, opacity),
    '--inline-completion-strong-color': rgba(color, Math.min(0.96, opacity + 0.16)),
    '--inline-completion-keycap-bg': rgba(color, colorMode === 'dark' ? 0.16 : 0.12),
    '--inline-completion-keycap-border': rgba(color, colorMode === 'dark' ? 0.46 : 0.38),
    '--vscode-editorGhostText-foreground': rgba(color, opacity),
    '--vscode-editorGhostText-background': 'transparent',
    '--vscode-editorGhostText-border': 'transparent'
  }
}

export function isInlineCompletionLanguageAllowed(language, settings = {}) {
  const normalizedSettings = normalizeInlineCompletionSettings(settings)
  const normalizedLanguage = normalizeLanguage(language)
  if (normalizedLanguage === 'log') return normalizedSettings.includeLog
  return normalizedSettings.languages.includes(normalizedLanguage)
}

export function shouldRequestInlineCompletion(options = {}) {
  const settings = normalizeInlineCompletionSettings(options.settings || {})
  if (!settings.enabled) return false
  if (options.isComposing) return false
  if (options.hasSelection) return false
  if (!isInlineCompletionLanguageAllowed(options.language, settings)) return false

  const content = typeof options.content === 'string' ? options.content : ''
  const cursorOffset = Math.min(Math.max(Number(options.cursorOffset) || 0, 0), content.length)
  const beforeCursor = content.slice(0, cursorOffset)
  const currentLineBeforeCursor = beforeCursor.slice(beforeCursor.lastIndexOf('\n') + 1)
  if (beforeCursor.trim().length < MIN_TRIGGER_PREFIX_CHARS && currentLineBeforeCursor.trim().length < MIN_TRIGGER_PREFIX_CHARS) return false
  if (/^\s*$/.test(currentLineBeforeCursor) && !hasListOrQuoteContext(beforeCursor) && !shouldRequestEmptyLineCompletion(beforeCursor)) return false

  return true
}

export function buildInlineCompletionContext(options = {}) {
  const settings = normalizeInlineCompletionSettings(options.settings || {})
  const content = typeof options.content === 'string' ? options.content : ''
  const cursorOffset = Math.min(Math.max(Number(options.cursorOffset) || 0, 0), content.length)
  const prefixStart = Math.max(0, cursorOffset - settings.prefixChars)
  const suffixEnd = Math.min(content.length, cursorOffset + settings.suffixChars)
  const prefix = content.slice(prefixStart, cursorOffset)
  const suffix = content.slice(cursorOffset, suffixEnd)
  const lineStart = content.lastIndexOf('\n', Math.max(0, cursorOffset - 1)) + 1
  const lineEndIndex = content.indexOf('\n', cursorOffset)
  const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex

  return {
    fileName: String(options.fileName || '').trim(),
    language: normalizeLanguage(options.language),
    editorMode: String(options.editorMode || 'source'),
    cursorOffset,
    prefix,
    suffix,
    currentLine: content.slice(lineStart, lineEnd),
    maxChars: settings.maxChars
  }
}

function trimCodeFence(text) {
  const match = text.match(CODE_FENCE_RE)
  return match ? match[1] : text
}

function removeRepeatedPrefix(text, prefix) {
  const trimmedPrefix = String(prefix || '').slice(-1200)
  if (!trimmedPrefix || !text) return text

  const maxOverlap = Math.min(trimmedPrefix.length, text.length)
  for (let length = maxOverlap; length >= 4; length -= 1) {
    if (trimmedPrefix.endsWith(text.slice(0, length))) {
      return text.slice(length)
    }
  }
  return text
}

function cutToReasonableBoundary(text, maxChars) {
  if (text.length <= maxChars) return text
  const clipped = text.slice(0, maxChars)
  const boundary = Math.max(
    clipped.lastIndexOf('\n\n'),
    clipped.lastIndexOf('\n'),
    clipped.lastIndexOf('。'),
    clipped.lastIndexOf('. '),
    clipped.lastIndexOf(';'),
    clipped.lastIndexOf(',')
  )
  if (boundary >= Math.max(20, Math.floor(maxChars * 0.45))) {
    return clipped.slice(0, boundary + 1)
  }
  return clipped
}

export function cleanInlineCompletionText(text, options = {}) {
  const settings = normalizeInlineCompletionSettings(options.settings || { maxChars: options.maxChars })
  let nextText = typeof text === 'string' ? text : ''
  nextText = nextText.replace(/\r\n/g, '\n')
  nextText = trimCodeFence(nextText.trimEnd())
  nextText = nextText.replace(EXPLANATION_PREFIX_RE, '')
  nextText = removeRepeatedPrefix(nextText, options.prefix || '')
  nextText = nextText.replace(/^\s*\[?INSERTION\]?:?/i, '')
  nextText = cutToReasonableBoundary(nextText, settings.maxChars).trimEnd()

  if (!nextText.trim()) return ''
  if (/^(?:```|~~~)/.test(nextText.trim())) return ''
  if (/^(?:Here is|以下|解释|说明)[:：]/i.test(nextText.trim())) return ''
  return nextText
}

export function createInlineCompletionRequestId(prefix = 'inline-completion') {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now()}-${randomPart}`
}
