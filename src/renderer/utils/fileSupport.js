const SUPPORTED_FILE_EXTENSIONS = new Set([
  'txt', 'text', 'md', 'markdown', 'mdx',
  'json', 'jsonc', 'yaml', 'yml', 'xml', 'toml', 'ini', 'conf', 'config', 'properties',
  'log', 'sql', 'csv', 'tsv',
  'js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'jsx', 'tsx', 'vue',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'py', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'
])

const SUPPORTED_FILE_NAMES = new Set([
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  'dockerfile',
  'makefile',
  'readme',
  'license',
  'changelog'
])

const BINARY_FILE_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg',
  'zip', 'rar', '7z', 'tar', 'gz',
  'exe', 'dll', 'so', 'dylib',
  'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac',
  'iso', 'dmg', 'bin'
])

function normalizeFileName(filename = '') {
  return String(filename).split(/[\\/]/).pop()?.trim() || ''
}

export function getFileExtension(filename = '') {
  const normalized = normalizeFileName(filename)
  const lastDotIndex = normalized.lastIndexOf('.')

  if (lastDotIndex <= 0 || lastDotIndex === normalized.length - 1) {
    return ''
  }

  return normalized.slice(lastDotIndex + 1).toLowerCase()
}

export function isBinaryFile(filename = '') {
  const ext = getFileExtension(filename)
  return ext ? BINARY_FILE_EXTENSIONS.has(ext) : false
}

export function isSupportedFile(filename = '') {
  const normalized = normalizeFileName(filename)
  if (!normalized) return false

  const lowerName = normalized.toLowerCase()
  if (SUPPORTED_FILE_NAMES.has(lowerName)) {
    return true
  }

  if (lowerName === '.env' || lowerName.startsWith('.env.')) {
    return true
  }

  const ext = getFileExtension(normalized)
  if (!ext) {
    return true
  }

  return SUPPORTED_FILE_EXTENSIONS.has(ext)
}

export { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_NAMES, BINARY_FILE_EXTENSIONS }