export function getDirectoryFileUrl(filePath = '') {
  if (!filePath) return ''

  const normalized = String(filePath).replace(/\\/g, '/')
  const lastSlashIndex = normalized.lastIndexOf('/')
  const directoryPath = lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex + 1) : normalized

  if (!directoryPath) return ''

  if (/^[A-Za-z]:\//.test(directoryPath)) {
    return encodeURI(`file:///${directoryPath}`)
  }

  return encodeURI(`file://${directoryPath.startsWith('/') ? '' : '/'}${directoryPath}`)
}

export function fileUrlToPath(url = '') {
  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'file:') return ''

    let filePath = decodeURIComponent(parsedUrl.pathname || '')
    if (/^\/[A-Za-z]:/.test(filePath)) {
      filePath = filePath.slice(1)
    }

    return filePath.replace(/\//g, '\\')
  } catch {
    return ''
  }
}

export function resolveRelativeFilePath(href = '', sourcePath = '') {
  const target = String(href || '').trim()
  if (!target || target.startsWith('#')) return ''

  if (/^file:/i.test(target)) {
    return fileUrlToPath(target)
  }

  if (/^[A-Za-z][A-Za-z\d+.-]*:/i.test(target)) {
    return ''
  }

  const sourceFileUrl = getDirectoryFileUrl(sourcePath)
  if (!sourceFileUrl) return ''

  try {
    return fileUrlToPath(new URL(target, sourceFileUrl).toString())
  } catch {
    return ''
  }
}
