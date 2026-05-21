import shortcutRegistry from '../../shared/shortcutRegistry.json'

const MODIFIER_ORDER = ['ctrl', 'cmd', 'alt', 'shift']
const GLOBAL_SCOPES = new Set(['global', 'native', 'developer'])

export const SHORTCUT_CATEGORY_ORDER = ['all', 'file', 'edit', 'view', 'json', 'sql', 'log', 'developer']

export function isMacPlatform(platform = navigator.platform) {
  return /Mac|iPhone|iPad|iPod/i.test(platform || '')
}

export function getShortcutDefinitions(options = {}) {
  const includeDev = Boolean(options.includeDev)
  return shortcutRegistry.filter(shortcut => includeDev || !shortcut.devOnly)
}

export function getShortcutById(id) {
  return shortcutRegistry.find(shortcut => shortcut.id === id) || null
}

export function getShortcutByAction(action) {
  return shortcutRegistry.find(shortcut => shortcut.action === action) || null
}

export function resolveShortcutAccelerator(shortcut, mac = isMacPlatform(), overrides = {}) {
  if (shortcut?.id && Object.prototype.hasOwnProperty.call(overrides, shortcut.id)) {
    return String(overrides[shortcut.id] ?? '').trim()
  }
  if (!shortcut?.accelerator) return ''
  const accelerator = shortcut.accelerator
  if (typeof accelerator === 'string') return accelerator
  if (mac && accelerator.darwin) return accelerator.darwin
  return accelerator.default || ''
}

export function formatShortcutAccelerator(accelerator, mac = isMacPlatform()) {
  if (!accelerator) return ''
  return accelerator.split('+').map(part => {
    if (part === 'CmdOrCtrl') return mac ? 'Cmd' : 'Ctrl'
    if (part === 'CommandOrControl') return mac ? 'Cmd' : 'Ctrl'
    if (part === 'Command') return 'Cmd'
    if (part === 'Control') return 'Ctrl'
    if (part === 'Option') return 'Alt'
    return part
  }).join('+')
}

export function shortcutDisplayById(id, mac = isMacPlatform(), overrides = {}) {
  const shortcut = getShortcutById(id)
  return shortcutDisplay(shortcut, mac, overrides)
}

export function shortcutDisplayByAction(action, mac = isMacPlatform(), overrides = {}) {
  const shortcut = getShortcutByAction(action)
  return shortcutDisplay(shortcut, mac, overrides)
}

export function shortcutDisplay(shortcut, mac = isMacPlatform(), overrides = {}) {
  return formatShortcutAccelerator(resolveShortcutAccelerator(shortcut, mac, overrides), mac)
}

export function normalizeShortcutAccelerator(accelerator, mac = isMacPlatform()) {
  const display = formatShortcutAccelerator(accelerator, mac)
  if (!display) return ''

  const parts = display.split('+').map(part => part.trim()).filter(Boolean)
  const modifiers = []
  const keys = []

  for (const part of parts) {
    const normalized = part.toLowerCase()
    const modifier = normalized === 'control' ? 'ctrl' : normalized === 'command' ? 'cmd' : normalized
    if (MODIFIER_ORDER.includes(modifier)) {
      modifiers.push(modifier)
    } else {
      keys.push(modifier)
    }
  }

  const orderedModifiers = MODIFIER_ORDER.filter(modifier => modifiers.includes(modifier))
  return [...orderedModifiers, ...keys].join('+')
}

export function buildShortcutConflictMap(shortcuts, mac = isMacPlatform(), overrides = {}) {
  const groups = new Map()

  for (const shortcut of shortcuts) {
    const accelerator = resolveShortcutAccelerator(shortcut, mac, overrides)
    const key = normalizeShortcutAccelerator(accelerator, mac)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(shortcut)
  }

  const conflicts = new Map()

  for (const group of groups.values()) {
    if (group.length < 2) continue

    for (const shortcut of group) {
      const related = group.filter(other => other.id !== shortcut.id && shortcutScopesOverlap(shortcut, other))
      if (related.length) conflicts.set(shortcut.id, related)
    }
  }

  return conflicts
}

export function isShortcutCustomized(shortcut, overrides = {}) {
  return Boolean(shortcut?.id && Object.prototype.hasOwnProperty.call(overrides, shortcut.id))
}

export function eventToShortcutAccelerator(event, mac = isMacPlatform()) {
  const key = normalizeEventKey(event)
  if (!key) {
    return {
      accelerator: '',
      error: 'modifier-only'
    }
  }

  const modifiers = []
  if (mac) {
    if (event.metaKey) modifiers.push('CmdOrCtrl')
    if (event.ctrlKey) modifiers.push('Ctrl')
  } else {
    if (event.ctrlKey) modifiers.push('CmdOrCtrl')
    if (event.metaKey) modifiers.push('Cmd')
  }
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')

  if (!modifiers.length && !/^F([1-9]|1[0-9]|2[0-4])$/.test(key)) {
    return {
      accelerator: '',
      error: 'missing-modifier'
    }
  }

  return {
    accelerator: [...modifiers, key].join('+'),
    error: ''
  }
}

export function isShortcutEvent(event, shortcutOrId, mac = isMacPlatform(), overrides = {}) {
  const shortcut = typeof shortcutOrId === 'string' ? getShortcutById(shortcutOrId) : shortcutOrId
  const accelerator = resolveShortcutAccelerator(shortcut, mac, overrides)
  if (!accelerator) return false
  const eventAccelerator = eventToShortcutAccelerator(event, mac).accelerator
  if (!eventAccelerator) return false
  return normalizeShortcutAccelerator(eventAccelerator, mac) === normalizeShortcutAccelerator(accelerator, mac)
}

function shortcutScopesOverlap(left, right) {
  if (left.scope === right.scope) return true
  return GLOBAL_SCOPES.has(left.scope) || GLOBAL_SCOPES.has(right.scope)
}

function normalizeEventKey(event) {
  const key = String(event.key || '')
  if (!key) return ''

  const lowerKey = key.toLowerCase()
  if (['control', 'ctrl', 'shift', 'alt', 'meta', 'os', 'command'].includes(lowerKey)) return ''

  const code = String(event.code || '')
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toUpperCase()
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code

  const keyMap = {
    ' ': 'Space',
    Spacebar: 'Space',
    Escape: 'Esc',
    Esc: 'Esc',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    '/': '/',
    '\\': '\\',
    ',': ',',
    '.': '.',
    ';': ';',
    "'": "'",
    '[': '[',
    ']': ']',
    '-': '-',
    '=': '=',
    '`': '`',
    '+': 'Plus'
  }

  if (keyMap[key]) return keyMap[key]
  if (key.length === 1) return key.toUpperCase()
  return key
}
