export const DEFAULT_LIST_PREFIX_CLASS = 'slimnote-list-prefix'

export function getListDepth(element) {
  let depth = 0
  let current = element?.parentElement

  while (current) {
    if (current.tagName === 'UL' || current.tagName === 'OL') {
      depth += 1
    }
    current = current.parentElement
  }

  return Math.max(0, depth - 1)
}

function getListItemIndex(item) {
  const siblings = Array.from(item?.parentElement?.children || []).filter((child) => child.tagName === 'LI')
  return Math.max(0, siblings.indexOf(item))
}

export function buildListPrefixText(item, options = {}) {
  const {
    indentUnit = '  ',
    unorderedMarker = '• ',
    checkedMarker = '[x] ',
    uncheckedMarker = '[ ] ',
    orderedSuffix = '. '
  } = options

  const list = item?.parentElement
  if (!list) return ''

  const depth = getListDepth(item)
  const indent = depth > 0 ? indentUnit.repeat(depth) : ''
  const checkbox = item.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]')

  if (checkbox) {
    const checked = checkbox.hasAttribute('checked') || checkbox.checked
    return `${indent}${checked ? checkedMarker : uncheckedMarker}`
  }

  if (list.tagName === 'OL') {
    const start = Number(list.getAttribute('start') || 1)
    return `${indent}${start + getListItemIndex(item)}${orderedSuffix}`
  }

  return `${indent}${unorderedMarker}`
}

export function decorateListPrefixes(container, options = {}) {
  if (!container) return

  const {
    prefixClassName = DEFAULT_LIST_PREFIX_CLASS,
    prefixHostSelector = ':scope > p, :scope > div',
    ...prefixOptions
  } = options

  container.querySelectorAll(`.${prefixClassName}`).forEach((node) => node.remove())

  container.querySelectorAll('li').forEach((item) => {
    const prefixText = buildListPrefixText(item, prefixOptions)
    if (!prefixText) return

    const prefix = container.ownerDocument.createElement('span')
    prefix.className = prefixClassName
    prefix.textContent = prefixText

    const leadBlock = item.querySelector(prefixHostSelector)
    if (leadBlock) {
      leadBlock.prepend(prefix)
    } else {
      item.prepend(prefix)
    }
  })
}

export function buildStructuredPlainText(sourceRoot, options = {}) {
  if (!sourceRoot) return ''

  const {
    prefixClassName = DEFAULT_LIST_PREFIX_CLASS,
    trim = true,
    headingIndentUnit = '  '
  } = options

  const textRoot = sourceRoot.cloneNode(true)
  decorateListPrefixes(textRoot, { ...options, prefixClassName })

  textRoot.querySelectorAll('style, script').forEach((node) => node.remove())

  textRoot.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const level = Number(heading.tagName.slice(1)) || 1
    if (level > 1) {
      heading.prepend(textRoot.ownerDocument.createTextNode(headingIndentUnit.repeat(level - 1)))
    }
  })

  const text = (textRoot.innerText || textRoot.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')

  return trim ? text.trim() : text
}