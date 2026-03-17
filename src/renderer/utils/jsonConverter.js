/**
 * JSON 格式转换工具
 * 支持 JSON 与 YAML、XML、TOML、CSV 之间的相互转换
 */
import YAML from 'yaml'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import TOML from 'smol-toml'
import Papa from 'papaparse'

// ============ YAML ============

/**
 * JSON 转 YAML
 * @param {string} json - JSON 字符串
 * @returns {string} YAML 字符串
 */
export function jsonToYaml(json) {
  try {
    const obj = JSON.parse(json)
    return YAML.stringify(obj)
  } catch (e) {
    throw new Error(`JSON 转 YAML 失败: ${e.message}`)
  }
}

/**
 * YAML 转 JSON
 * @param {string} yaml - YAML 字符串
 * @returns {string} JSON 字符串
 */
export function yamlToJson(yaml) {
  try {
    const obj = YAML.parse(yaml)
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    throw new Error(`YAML 转 JSON 失败: ${e.message}`)
  }
}

// ============ XML ============

/**
 * JSON 转 XML
 * @param {string} json - JSON 字符串
 * @returns {string} XML 字符串
 */
export function jsonToXml(json) {
  try {
    const obj = JSON.parse(json)
    const builder = new XMLBuilder({
      format: true,
      indentBy: '  ',
      ignoreAttributes: false
    })
    return builder.build(obj)
  } catch (e) {
    throw new Error(`JSON 转 XML 失败: ${e.message}`)
  }
}

/**
 * XML 转 JSON
 * @param {string} xml - XML 字符串
 * @returns {string} JSON 字符串
 */
export function xmlToJson(xml) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    const obj = parser.parse(xml)
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    throw new Error(`XML 转 JSON 失败: ${e.message}`)
  }
}

// ============ TOML ============

/**
 * JSON 转 TOML
 * @param {string} json - JSON 字符串
 * @returns {string} TOML 字符串
 */
export function jsonToToml(json) {
  try {
    const obj = JSON.parse(json)
    return TOML.stringify(obj)
  } catch (e) {
    throw new Error(`JSON 转 TOML 失败: ${e.message}`)
  }
}

/**
 * TOML 转 JSON
 * @param {string} toml - TOML 字符串
 * @returns {string} JSON 字符串
 */
export function tomlToJson(toml) {
  try {
    const obj = TOML.parse(toml)
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    throw new Error(`TOML 转 JSON 失败: ${e.message}`)
  }
}

// ============ CSV ============

/**
 * JSON 转 CSV
 * @param {string} json - JSON 字符串（必须是数组）
 * @returns {string} CSV 字符串
 */
export function jsonToCsv(json) {
  try {
    const data = JSON.parse(json)
    if (!Array.isArray(data)) {
      throw new Error('只有 JSON 数组才能转换为 CSV')
    }
    return Papa.unparse(data)
  } catch (e) {
    throw new Error(`JSON 转 CSV 失败: ${e.message}`)
  }
}

/**
 * CSV 转 JSON
 * @param {string} csv - CSV 字符串
 * @returns {string} JSON 字符串
 */
export function csvToJson(csv) {
  try {
    const result = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true
    })
    return JSON.stringify(result.data, null, 2)
  } catch (e) {
    throw new Error(`CSV 转 JSON 失败: ${e.message}`)
  }
}

// ============ 通用转换函数 ============

/**
 * 支持的转换格式
 */
export const formats = {
  json: { name: 'JSON', extensions: ['.json'] },
  yaml: { name: 'YAML', extensions: ['.yaml', '.yml'] },
  xml: { name: 'XML', extensions: ['.xml'] },
  toml: { name: 'TOML', extensions: ['.toml'] },
  csv: { name: 'CSV', extensions: ['.csv'] }
}

/**
 * 通用转换函数
 * @param {string} content - 内容
 * @param {string} fromFormat - 源格式
 * @param {string} toFormat - 目标格式
 * @returns {string} 转换后的内容
 */
export function convert(content, fromFormat, toFormat) {
  // 如果源格式是 JSON
  if (fromFormat === 'json') {
    switch (toFormat) {
      case 'yaml': return jsonToYaml(content)
      case 'xml': return jsonToXml(content)
      case 'toml': return jsonToToml(content)
      case 'csv': return jsonToCsv(content)
      default: throw new Error(`不支持的目标格式: ${toFormat}`)
    }
  }

  // 如果目标格式是 JSON
  if (toFormat === 'json') {
    switch (fromFormat) {
      case 'yaml': return yamlToJson(content)
      case 'xml': return xmlToJson(content)
      case 'toml': return tomlToJson(content)
      case 'csv': return csvToJson(content)
      default: throw new Error(`不支持的源格式: ${fromFormat}`)
    }
  }

  // 其他情况：先转 JSON，再转目标格式
  const json = convert(content, fromFormat, 'json')
  return convert(json, 'json', toFormat)
}
