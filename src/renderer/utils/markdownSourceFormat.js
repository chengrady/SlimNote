const LIST_TYPE_UNORDERED = 'unordered'
const LIST_TYPE_ORDERED = 'ordered'
const LIST_TYPE_TASK = 'task'
const LINE_BREAK_PATTERN = /\r\n|\n/
const TASK_MARKER_PATTERN = /^(\s*)([-+*])\s+\[([ xX])\]\s*/
const ORDERED_MARKER_PATTERN = /^(\s*)\d+[.)]\s+/
const UNORDERED_MARKER_PATTERN = /^(\s*)[-+*]\s+/

function splitTextLines(text = '') {
  const value = String(text || '')
  const eol = value.includes('\r\n') ? '\r\n' : '\n'
  return {
    eol,
    lines: value.split(LINE_BREAK_PATTERN)
  }
}

function readListLine(line = '') {
  const value = String(line || '')
  const taskMatch = value.match(TASK_MARKER_PATTERN)
  if (taskMatch) {
    return {
      indent: taskMatch[1] || '',
      checked: String(taskMatch[3] || ' ').toLowerCase() === 'x',
      text: value.slice(taskMatch[0].length)
    }
  }

  const orderedMatch = value.match(ORDERED_MARKER_PATTERN)
  if (orderedMatch) {
    return {
      indent: orderedMatch[1] || '',
      checked: false,
      text: value.slice(orderedMatch[0].length)
    }
  }

  const unorderedMatch = value.match(UNORDERED_MARKER_PATTERN)
  if (unorderedMatch) {
    return {
      indent: unorderedMatch[1] || '',
      checked: false,
      text: value.slice(unorderedMatch[0].length)
    }
  }

  const indent = value.match(/^\s*/)?.[0] || ''
  return {
    indent,
    checked: false,
    text: value.slice(indent.length)
  }
}

function formatMarkdownListLine(line, type, orderedIndex) {
  if (!String(line || '').trim()) {
    return {
      line,
      consumesOrder: false
    }
  }

  const parsed = readListLine(line)
  if (type === LIST_TYPE_ORDERED) {
    return {
      line: `${parsed.indent}${orderedIndex}. ${parsed.text}`,
      consumesOrder: true
    }
  }

  if (type === LIST_TYPE_TASK) {
    const marker = parsed.checked ? '[x]' : '[ ]'
    return {
      line: `${parsed.indent}- ${marker} ${parsed.text}`,
      consumesOrder: true
    }
  }

  return {
    line: `${parsed.indent}- ${parsed.text}`,
    consumesOrder: true
  }
}

export function formatMarkdownSourceListBlock(text = '', type = LIST_TYPE_UNORDERED) {
  const normalizedType = type === LIST_TYPE_ORDERED || type === LIST_TYPE_TASK ? type : LIST_TYPE_UNORDERED
  const { eol, lines } = splitTextLines(text)
  let orderedIndex = 1
  const formattedLines = lines.map((line) => {
    const formatted = formatMarkdownListLine(line, normalizedType, orderedIndex)
    if (formatted.consumesOrder) {
      orderedIndex += 1
    }
    return formatted.line
  })
  const formattedText = formattedLines.join(eol)

  return {
    text: formattedText,
    changed: formattedText !== String(text || '')
  }
}

export function isMultilineMarkdownSelection(selection) {
  if (!selection || selection.isEmpty?.()) return false
  return Number(selection.startLineNumber) !== Number(selection.endLineNumber)
}

export function getMarkdownSelectedLineRange(selection, model) {
  if (!selection || !model || !isMultilineMarkdownSelection(selection)) return null

  const startLineNumber = Math.min(selection.startLineNumber, selection.endLineNumber)
  let endLineNumber = Math.max(selection.startLineNumber, selection.endLineNumber)
  const normalizedEndColumn = selection.endLineNumber >= selection.startLineNumber ? selection.endColumn : selection.startColumn

  if (normalizedEndColumn === 1 && endLineNumber > startLineNumber) {
    endLineNumber -= 1
  }

  return {
    startLineNumber,
    startColumn: 1,
    endLineNumber,
    endColumn: model.getLineMaxColumn(endLineNumber)
  }
}
