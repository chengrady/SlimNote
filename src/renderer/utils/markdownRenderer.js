import katex from 'katex'
import { sanitizeHtml } from './htmlSanitizer.js'

const ALERT_TYPES = new Set(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])
const CONTAINER_TYPES = new Set(['INFO', 'NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function slugifyFootnoteId(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'note'
}

function stripFrontMatter(content = '') {
  return String(content).replace(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '')
}

function extractFootnotes(content = '') {
  const lines = String(content).split(/\r?\n/)
  const footnotes = []
  const output = []
  let index = 0

  while (index < lines.length) {
    const definition = lines[index].match(/^\[\^([^\]]+)\]:\s*(.*)$/)
    if (!definition) {
      output.push(lines[index])
      index += 1
      continue
    }

    const id = definition[1]
    const parts = [definition[2]]
    index += 1

    while (index < lines.length && /^(?: {4}|\t)/.test(lines[index])) {
      parts.push(lines[index].replace(/^(?: {4}|\t)/, ''))
      index += 1
    }

    footnotes.push({
      id,
      safeId: slugifyFootnoteId(id),
      content: parts.join('\n').trim()
    })
  }

  return {
    content: output.join('\n'),
    footnotes
  }
}

function renderFootnoteDefinitions(footnotes = []) {
  if (!footnotes.length) return ''

  const items = footnotes.map((footnote) => {
    const safeId = escapeHtml(footnote.safeId)
    const content = escapeHtml(footnote.content)

    return `<li id="fn-${safeId}">${content} <a class="footnote-backref" href="#fnref-${safeId}" aria-label="返回正文">↩</a></li>`
  }).join('')

  return `\n\n<div class="footnotes">\n<hr>\n<ol>\n${items}\n</ol>\n</div>`
}

function applyFootnoteReferences(content = '', footnotes = []) {
  if (!footnotes.length) return content

  const footnoteIds = new Map(footnotes.map((footnote, index) => [footnote.id, {
    number: index + 1,
    safeId: footnote.safeId
  }]))

  return String(content).replace(/\[\^([^\]]+)\]/g, (match, id) => {
    const footnote = footnoteIds.get(id)
    if (!footnote) return match

    const safeId = escapeHtml(footnote.safeId)
    const number = escapeHtml(String(footnote.number))
    return `<sup class="footnote-ref" id="fnref-${safeId}"><a href="#fn-${safeId}">${number}</a></sup>`
  })
}

function transformDefinitionLists(content = '') {
  const lines = String(content).split(/\r?\n/)
  const output = []
  let inFence = false
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      output.push(line)
      index += 1
      continue
    }

    if (!inFence && line.trim() && index + 1 < lines.length && /^:\s+/.test(lines[index + 1])) {
      const items = []

      while (index < lines.length && lines[index].trim() && index + 1 < lines.length && /^:\s+/.test(lines[index + 1])) {
        const term = lines[index].trim()
        const definitions = []
        index += 1

        while (index < lines.length && /^:\s+/.test(lines[index])) {
          definitions.push(lines[index].replace(/^:\s+/, '').trim())
          index += 1
        }

        const renderedDefinitions = definitions.map(definition => `<dd>${escapeHtml(definition)}</dd>`).join('')
        items.push(`<dt>${escapeHtml(term)}</dt>${renderedDefinitions}`)

        if (index < lines.length && lines[index].trim() === '') {
          index += 1
        }
      }

      output.push(`<dl>\n${items.join('\n')}\n</dl>`)
      continue
    }

    output.push(line)
    index += 1
  }

  return output.join('\n')
}

function renderInlineContainerContent(value = '') {
  return escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>')
}

function renderMarkdownContainer(type = '', bodyLines = []) {
  const normalizedType = type.toUpperCase()
  const classType = normalizedType.toLowerCase()
  const body = bodyLines.join('\n').trim()
  const paragraphs = body
    ? body.split(/\n{2,}/).map(paragraph => `<p>${renderInlineContainerContent(paragraph).replace(/\n/g, '<br>')}</p>`).join('\n')
    : ''

  return `<div class="markdown-container markdown-container-${classType}">\n<p class="markdown-container-title">${escapeHtml(normalizedType)}</p>\n${paragraphs}\n</div>`
}

function transformMarkdownContainers(content = '') {
  const lines = String(content).split(/\r?\n/)
  const output = []
  let inFence = false
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      output.push(line)
      index += 1
      continue
    }

    const containerStart = !inFence ? line.match(/^:::\s*([A-Za-z][\w-]*)\s*$/) : null
    const normalizedType = containerStart?.[1]?.toUpperCase()
    if (!normalizedType || !CONTAINER_TYPES.has(normalizedType)) {
      output.push(line)
      index += 1
      continue
    }

    const bodyLines = []
    index += 1
    while (index < lines.length && !/^:::\s*$/.test(lines[index])) {
      bodyLines.push(lines[index])
      index += 1
    }

    if (index < lines.length && /^:::\s*$/.test(lines[index])) {
      index += 1
    }

    output.push(renderMarkdownContainer(normalizedType, bodyLines))
  }

  return output.join('\n')
}

function renderMath(source = '', displayMode = false) {
  const rendered = katex.renderToString(String(source).trim(), {
    displayMode,
    output: 'html',
    throwOnError: false
  })

  return displayMode ? `\n\n${rendered}\n\n` : rendered
}

function transformMathInSegment(segment = '') {
  return String(segment)
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, source) => renderMath(source, true))
    .replace(/(^|[^\\$])\$([^\n$]+?)\$/g, (match, prefix, source) => `${prefix}${renderMath(source, false)}`)
}

function transformMath(content = '') {
  const lines = String(content).split(/\r?\n/)
  const output = []
  const segment = []
  let inFence = false

  const flushSegment = () => {
    if (!segment.length) return
    output.push(transformMathInSegment(segment.join('\n')))
    segment.length = 0
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flushSegment()
      inFence = !inFence
      output.push(line)
      continue
    }

    if (inFence) {
      output.push(line)
      continue
    }

    segment.push(line)
  }

  flushSegment()
  return output.join('\n')
}

function enhanceAlertBlockquotes(html = '') {
  return String(html).replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, innerHtml) => {
    const firstParagraph = innerHtml.match(/^\s*<p>\s*\[!([A-Z]+)\]\s*(?:<br\s*\/?>)?\s*([\s\S]*?)<\/p>\s*$/i)
    if (!firstParagraph) return match

    const type = firstParagraph[1].toUpperCase()
    if (!ALERT_TYPES.has(type)) return match

    const body = firstParagraph[2].trim()
    const classType = type.toLowerCase()
    const bodyHtml = body ? `<p>${body}</p>` : ''
    return `<blockquote class="markdown-alert markdown-alert-${classType}"><p class="markdown-alert-title">${type}</p>${bodyHtml}</blockquote>`
  })
}

function addImageReferrerPolicy(html = '') {
  return String(html).replace(/<img\b([^>]*)>/gi, (match, attributes) => {
    if (/\sreferrerpolicy\s*=/i.test(attributes)) return match
    return `<img${attributes} referrerpolicy="no-referrer">`
  })
}

export function preprocessMarkdownContent(content = '') {
  const frontMatterFree = stripFrontMatter(content)
  const { content: withoutFootnoteDefinitions, footnotes } = extractFootnotes(frontMatterFree)
  const withFootnoteReferences = applyFootnoteReferences(withoutFootnoteDefinitions, footnotes)
  const withDefinitionLists = transformDefinitionLists(withFootnoteReferences)
  const withContainers = transformMarkdownContainers(withDefinitionLists)
  const withMath = transformMath(withContainers)

  return `${withMath}${renderFootnoteDefinitions(footnotes)}`
}

export function enhanceMarkdownHtml(html = '') {
  const safeHtml = typeof DOMParser === 'undefined' ? String(html || '') : sanitizeHtml(html)
  return addImageReferrerPolicy(enhanceAlertBlockquotes(safeHtml))
}
