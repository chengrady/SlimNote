export const AI_EDITABLE_LANGUAGES = new Set(['markdown', 'plaintext'])
export const SHORT_DOCUMENT_LIMIT = 12000
export const NEARBY_TEXT_RADIUS = 4000
export const ATTACHMENT_CONTENT_LIMIT = 12000

export function canApplyAiEdits(language) {
  return AI_EDITABLE_LANGUAGES.has(String(language || '').toLowerCase())
}

function normalizeText(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeLanguage(language) {
  return String(language || 'plaintext').toLowerCase()
}

function getFileName(tab = {}) {
  const title = normalizeText(tab?.title).trim()
  if (title) return title

  const filePath = normalizeText(tab?.filePath).trim()
  return filePath.split(/[\\/]/).pop() || ''
}

function normalizeOffset(offset, contentLength) {
  const numericOffset = Number(offset)
  if (!Number.isFinite(numericOffset)) return 0
  return Math.min(Math.max(Math.trunc(numericOffset), 0), contentLength)
}

function getOffsetFromPosition(content, position) {
  if (!position) return null

  const line = Number(position.line ?? position.lineNumber)
  const column = Number(position.column ?? position.startColumn)
  if (!Number.isFinite(line) || !Number.isFinite(column)) return null

  const lines = content.split('\n')
  const targetLine = Math.min(Math.max(Math.trunc(line), 1), lines.length)
  const targetColumn = Math.max(Math.trunc(column), 1)
  let offset = 0

  for (let index = 0; index < targetLine - 1; index += 1) {
    offset += lines[index].length + 1
  }

  return normalizeOffset(offset + targetColumn - 1, content.length)
}

function getSelectionText(selection) {
  if (typeof selection === 'string') return selection
  if (!selection || typeof selection !== 'object') return ''
  return normalizeText(selection.text || selection.value || selection.content)
}

function getSelectionOffset(selection, content) {
  if (!selection || typeof selection !== 'object') return null

  const startOffset = Number(selection.startOffset ?? selection.start)
  if (Number.isFinite(startOffset)) return normalizeOffset(startOffset, content.length)

  const index = content.indexOf(getSelectionText(selection))
  return index >= 0 ? index : null
}

function normalizeRadius(radius) {
  const numericRadius = Number(radius)
  return Number.isFinite(numericRadius) ? Math.max(0, numericRadius) : NEARBY_TEXT_RADIUS
}

function getTextRange(content, start, end) {
  const safeStart = normalizeOffset(start, content.length)
  const safeEnd = normalizeOffset(end, content.length)
  const rangeStart = Math.min(safeStart, safeEnd)
  const rangeEnd = Math.max(safeStart, safeEnd)

  return {
    text: content.slice(rangeStart, rangeEnd),
    start: rangeStart,
    end: rangeEnd
  }
}

function getNearbyTextRange(content, cursorOffset, radius = NEARBY_TEXT_RADIUS) {
  if (!content) return { text: '', start: cursorOffset, end: cursorOffset }

  const safeRadius = normalizeRadius(radius)
  return getTextRange(content, cursorOffset - safeRadius, cursorOffset + safeRadius)
}

function addIncludedPart(includedParts, part) {
  if (!includedParts.includes(part)) {
    includedParts.push(part)
  }
}

function getAttachmentName(attachment = {}) {
  const name = normalizeText(attachment.name || attachment.title).trim()
  if (name) return name

  const filePath = normalizeText(attachment.path || attachment.filePath).trim()
  return filePath.split(/[\\/]/).pop() || 'Context'
}

function normalizeAttachmentType(type) {
  const value = normalizeText(type).trim()
  return value || 'file'
}

function normalizeContextAttachment(attachment = {}, index = 0) {
  const rawContent = normalizeText(attachment.content || attachment.text)
  const contentLimit = Number.isFinite(Number(attachment.contentLimit)) ? Math.max(0, Number(attachment.contentLimit)) : ATTACHMENT_CONTENT_LIMIT
  const content = rawContent.length > contentLimit ? rawContent.slice(0, contentLimit) : rawContent

  return {
    id: normalizeText(attachment.id).trim() || `attachment-${index + 1}`,
    type: normalizeAttachmentType(attachment.type),
    name: getAttachmentName(attachment),
    path: normalizeText(attachment.path || attachment.filePath),
    content,
    contentLength: rawContent.length,
    isTruncated: Boolean(attachment.isTruncated) || rawContent.length > content.length
  }
}

function normalizeContextAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return []
  return attachments
    .filter(attachment => attachment?.selected !== false)
    .map((attachment, index) => normalizeContextAttachment(attachment, index))
    .filter(attachment => attachment.content || attachment.name || attachment.path)
}

function buildAttachmentText(attachments = []) {
  return attachments.map(attachment => {
    const parts = [
      `### ${attachment.name}`,
      [
        `Type: ${attachment.type}`,
        `Path: ${attachment.path || '-'}`,
        `Content length: ${attachment.contentLength}`,
        `Content truncated: ${attachment.isTruncated ? 'yes' : 'no'}`
      ].join('\n')
    ]

    if (attachment.content) parts.push(attachment.content)
    return parts.join('\n\n')
  }).join('\n\n')
}

export function buildAiContext(tab, options = {}) {
  const content = normalizeText(tab?.content)
  const language = normalizeLanguage(tab?.language)
  const fileName = getFileName(tab)
  const manualContext = options.manualContext || {}
  const contextMode = options.contextMode || 'auto'
  const actionId = options.actionId || ''
  const selectedText = getSelectionText(options.selection ?? manualContext.selection)
  const selectionOffset = getSelectionOffset(options.selection ?? manualContext.selection, content)
  const rawCursorOffset = options.cursorOffset ?? tab?.cursorOffset ?? selectionOffset ?? getOffsetFromPosition(content, options.cursorPosition ?? tab?.cursorPosition)
  const cursorOffset = normalizeOffset(rawCursorOffset, content.length)
  const includedParts = []
  const context = {
    language,
    fileName,
    filePath: normalizeText(tab?.filePath),
    isEditable: canApplyAiEdits(language),
    includeFileInfo: false,
    selection: '',
    nearbyText: '',
    fullDocument: '',
    cursorOffset,
    contentLength: content.length,
    selectionLength: 0,
    nearbyTextStart: 0,
    nearbyTextEnd: 0,
    nearbyTextLength: 0,
    fullDocumentLength: 0,
    isTruncated: false,
    requiresManualFullDocument: false,
    fullDocumentSkipped: false,
    attachments: [],
    attachmentText: '',
    attachmentCount: 0,
    contextSummary: '',
    summary: '',
    includedParts
  }

  if (Array.isArray(options.contextAttachments)) {
    context.attachments = normalizeContextAttachments(options.contextAttachments)
    context.attachmentCount = context.attachments.length
    context.attachmentText = buildAttachmentText(context.attachments)
    context.isTruncated = context.attachments.some(attachment => attachment.isTruncated)

    if (context.attachments.length > 0) {
      context.includeFileInfo = true
      addIncludedPart(includedParts, 'fileInfo')
      addIncludedPart(includedParts, 'attachments')
    }

    context.contextSummary = includedParts.length > 0 ? includedParts.join(', ') : 'none'
    context.summary = context.contextSummary
    return context
  }

  if (contextMode === 'manual') {
    if (manualContext.fileInfo !== false) {
      context.includeFileInfo = true
      addIncludedPart(includedParts, 'fileInfo')
    }
    if (manualContext.selection && selectedText) {
      context.selection = selectedText
      context.selectionLength = selectedText.length
      addIncludedPart(includedParts, 'selection')
    }
    if (manualContext.nearbyText) {
      const nearbyTextRange = getNearbyTextRange(content, cursorOffset, options.nearbyTextRadius)
      context.nearbyText = nearbyTextRange.text
      context.nearbyTextStart = nearbyTextRange.start
      context.nearbyTextEnd = nearbyTextRange.end
      context.nearbyTextLength = nearbyTextRange.text.length
      context.isTruncated = nearbyTextRange.text.length < content.length
      addIncludedPart(includedParts, 'nearbyText')
    }
    if (manualContext.fullDocument) {
      context.fullDocument = content
      context.fullDocumentLength = content.length
      context.isTruncated = false
      context.requiresManualFullDocument = false
      context.fullDocumentSkipped = false
      addIncludedPart(includedParts, 'fullDocument')
    }
  } else {
    context.includeFileInfo = true
    addIncludedPart(includedParts, 'fileInfo')

    if (selectedText) {
      context.selection = selectedText
      context.selectionLength = selectedText.length
      addIncludedPart(includedParts, 'selection')
    } else if (content.length <= SHORT_DOCUMENT_LIMIT) {
      context.fullDocument = content
      context.fullDocumentLength = content.length
      addIncludedPart(includedParts, 'fullDocument')
    } else if (actionId === 'summarize-document') {
      const truncatedRange = getTextRange(content, 0, SHORT_DOCUMENT_LIMIT)
      context.nearbyText = truncatedRange.text
      context.nearbyTextStart = truncatedRange.start
      context.nearbyTextEnd = truncatedRange.end
      context.nearbyTextLength = truncatedRange.text.length
      context.isTruncated = true
      context.requiresManualFullDocument = true
      context.fullDocumentSkipped = true
      addIncludedPart(includedParts, 'nearbyText')
    } else {
      const nearbyTextRange = getNearbyTextRange(content, cursorOffset, options.nearbyTextRadius)
      context.nearbyText = nearbyTextRange.text
      context.nearbyTextStart = nearbyTextRange.start
      context.nearbyTextEnd = nearbyTextRange.end
      context.nearbyTextLength = nearbyTextRange.text.length
      context.isTruncated = nearbyTextRange.text.length < content.length
      context.fullDocumentSkipped = true
      addIncludedPart(includedParts, 'nearbyText')
    }
  }

  context.contextSummary = includedParts.length > 0 ? includedParts.join(', ') : 'none'
  context.summary = context.contextSummary

  return context
}
