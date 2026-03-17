/**
 * JSON 统计工具
 * 计算 JSON 的各种统计信息
 */

/**
 * 获取 JSON 的统计信息
 * @param {string} json - JSON 字符串
 * @returns {object} 统计信息对象
 */
export function getJsonStats(json) {
  const stats = {
    keys: 0,
    depth: 0,
    size: new Blob([json]).size,
    lines: json.split('\n').length,
    arrays: 0,
    objects: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    isValid: false
  }

  function count(obj, depth) {
    stats.depth = Math.max(stats.depth, depth)

    if (Array.isArray(obj)) {
      stats.arrays++
      obj.forEach(item => count(item, depth + 1))
    } else if (typeof obj === 'object' && obj !== null) {
      stats.objects++
      const keys = Object.keys(obj)
      stats.keys += keys.length
      Object.values(obj).forEach(val => count(val, depth + 1))
    } else if (typeof obj === 'string') {
      stats.strings++
    } else if (typeof obj === 'number') {
      stats.numbers++
    } else if (typeof obj === 'boolean') {
      stats.booleans++
    } else if (obj === null) {
      stats.nulls++
    }
  }

  try {
    const parsed = JSON.parse(json)
    stats.isValid = true
    count(parsed, 1)
  } catch {
    stats.isValid = false
  }

  return stats
}

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * 获取格式化的统计信息文本
 * @param {object} stats - 统计信息对象
 * @returns {string} 格式化后的文本
 */
export function getStatsText(stats) {
  const parts = []
  parts.push(`键: ${stats.keys}`)
  parts.push(`深度: ${stats.depth}`)
  parts.push(`大小: ${formatSize(stats.size)}`)
  parts.push(`行数: ${stats.lines}`)
  return parts.join(' | ')
}
