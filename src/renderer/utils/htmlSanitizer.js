const BLOCKED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'template'
])

const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul'
])

const GLOBAL_ATTRIBUTES = new Set([
  'class',
  'id',
  'title',
  'role'
])

const TAG_ATTRIBUTES = {
  a: new Set(['href', 'name', 'rel', 'target']),
  img: new Set(['alt', 'height', 'loading', 'referrerpolicy', 'src', 'width']),
  input: new Set(['checked', 'disabled', 'type']),
  ol: new Set(['start', 'type']),
  th: new Set(['align', 'colspan', 'rowspan']),
  td: new Set(['align', 'colspan', 'rowspan']),
  col: new Set(['span']),
  colgroup: new Set(['span'])
}

const SAFE_HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'file:'])
const SAFE_SRC_PROTOCOLS = new Set(['http:', 'https:', 'file:'])
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isRelativeUrl(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return false
  if (trimmed.startsWith('//')) return false
  return trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../') || !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
}

function isSafeUrl(value = '', protocols = SAFE_HREF_PROTOCOLS, options = {}) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return false
  if (options.allowDataImage && SAFE_DATA_IMAGE_PATTERN.test(trimmed)) return true
  const protocolProbe = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '')
  if (isRelativeUrl(protocolProbe)) return true

  try {
    return protocols.has(new URL(protocolProbe).protocol)
  } catch {
    return false
  }
}

function isAllowedAttribute(tagName, attributeName) {
  if (GLOBAL_ATTRIBUTES.has(attributeName) || attributeName.startsWith('aria-') || attributeName.startsWith('data-')) return true
  return TAG_ATTRIBUTES[tagName]?.has(attributeName) || false
}

function sanitizeAttributes(element, tagName) {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    const value = attribute.value

    if (name.startsWith('on') || name === 'style' || name === 'srcdoc' || !isAllowedAttribute(tagName, name)) {
      element.removeAttribute(attribute.name)
      continue
    }

    if (name === 'href' && !isSafeUrl(value, SAFE_HREF_PROTOCOLS)) {
      element.removeAttribute(attribute.name)
      continue
    }

    if (name === 'src' && !isSafeUrl(value, SAFE_SRC_PROTOCOLS, { allowDataImage: true })) {
      element.removeAttribute(attribute.name)
      continue
    }

    if (name === 'target' && !['_blank', '_self', '_parent', '_top'].includes(value)) {
      element.removeAttribute(attribute.name)
    }
  }

  if (tagName === 'a' && element.getAttribute('target') === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer')
  }

  if (tagName === 'input') {
    if ((element.getAttribute('type') || '').toLowerCase() !== 'checkbox') {
      element.remove()
      return
    }
    element.setAttribute('disabled', '')
  }
}

function unwrapElement(element) {
  const parent = element.parentNode
  if (!parent) return

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }
  parent.removeChild(element)
}

function sanitizeElement(element) {
  const tagName = element.tagName.toLowerCase()

  if (BLOCKED_TAGS.has(tagName)) {
    element.remove()
    return
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    sanitizeChildren(element)
    unwrapElement(element)
    return
  }

  sanitizeAttributes(element, tagName)
  if (element.isConnected) sanitizeChildren(element)
}

function sanitizeChildren(root) {
  for (const child of Array.from(root.children)) {
    sanitizeElement(child)
  }
}

export function sanitizeHtml(html = '') {
  if (typeof DOMParser === 'undefined') {
    return escapeHtml(html)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''

  sanitizeChildren(root)
  return root.innerHTML
}
