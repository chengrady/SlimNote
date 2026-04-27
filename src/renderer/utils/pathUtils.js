export function getPathFileName(filePath = '') {
  const normalizedPath = String(filePath || '').trim()
  if (!normalizedPath) return ''

  const segments = normalizedPath.split(/[\\/]/)
  return segments[segments.length - 1] || ''
}

export function getDirectoryPath(filePath = '') {
  const normalizedPath = String(filePath || '').trim()
  if (!normalizedPath) return ''

  return normalizedPath.replace(/[\\/][^\\/]+$/, '')
}
