/**
 * JSON 修复工具
 * 使用 jsonrepair 库自动修复无效的 JSON
 */
import { jsonrepair } from 'jsonrepair'

/**
 * 尝试修复无效的 JSON 字符串
 * @param {string} text - 可能无效的 JSON 字符串
 * @returns {string} 修复后的有效 JSON 字符串
 */
export function repairJson(text) {
  try {
    const repaired = jsonrepair(text)
    return repaired
  } catch (e) {
    throw new Error(`JSON 修复失败: ${e.message}`)
  }
}

/**
 * 检查 JSON 是否有效
 * @param {string} text - JSON 字符串
 * @returns {boolean} 是否有效
 */
export function isValidJson(text) {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

/**
 * 尝试修复并格式化 JSON
 * @param {string} text - JSON 字符串
 * @returns {object} { success: boolean, result?: string, error?: string }
 */
export function repairAndFormat(text) {
  try {
    // 如果已经有效，直接格式化
    if (isValidJson(text)) {
      const parsed = JSON.parse(text)
      return {
        success: true,
        result: JSON.stringify(parsed, null, 2),
        wasRepaired: false
      }
    }

    // 尝试修复
    const repaired = repairJson(text)
    const parsed = JSON.parse(repaired)
    return {
      success: true,
      result: JSON.stringify(parsed, null, 2),
      wasRepaired: true
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    }
  }
}
