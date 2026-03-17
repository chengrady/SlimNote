/**
 * JSON Schema 生成和验证工具
 */
import Ajv from 'ajv'
import toJsonSchema from 'to-json-schema'

const ajv = new Ajv({ allErrors: true, strict: false })

/**
 * 从 JSON 数据生成 JSON Schema
 * @param {string} json - JSON 字符串
 * @returns {object} { success: boolean, schema?: object, error?: string }
 */
export function generateSchema(json) {
  try {
    const obj = JSON.parse(json)
    const schema = toJsonSchema(obj, {
      arrays: { mode: 'first' },
      objects: { additionalProperties: false }
    })
    return {
      success: true,
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...schema
      }
    }
  } catch (e) {
    return {
      success: false,
      error: `Schema 生成失败: ${e.message}`
    }
  }
}

/**
 * 验证 JSON 数据是否符合 Schema
 * @param {string} json - JSON 字符串
 * @param {string|object} schema - JSON Schema 字符串或对象
 * @returns {object} { valid: boolean, errors?: array, error?: string }
 */
export function validateAgainstSchema(json, schema) {
  try {
    const data = JSON.parse(json)
    const schemaObj = typeof schema === 'string' ? JSON.parse(schema) : schema

    const validate = ajv.compile(schemaObj)
    const valid = validate(data)

    if (valid) {
      return { valid: true }
    } else {
      return {
        valid: false,
        errors: validate.errors.map(err => ({
          path: err.instancePath || '/',
          message: err.message,
          keyword: err.keyword,
          params: err.params
        }))
      }
    }
  } catch (e) {
    return {
      valid: false,
      error: `验证失败: ${e.message}`
    }
  }
}

/**
 * 格式化验证错误为可读文本
 * @param {array} errors - 错误数组
 * @returns {string} 格式化的错误文本
 */
export function formatValidationErrors(errors) {
  if (!errors || errors.length === 0) return ''

  return errors.map((err, index) => {
    return `${index + 1}. 路径: ${err.path}\n   错误: ${err.message}`
  }).join('\n\n')
}

/**
 * 生成 Schema 并格式化为字符串
 * @param {string} json - JSON 字符串
 * @returns {object} { success: boolean, schema?: string, error?: string }
 */
export function generateSchemaString(json) {
  const result = generateSchema(json)
  if (result.success) {
    return {
      success: true,
      schema: JSON.stringify(result.schema, null, 2)
    }
  }
  return result
}
