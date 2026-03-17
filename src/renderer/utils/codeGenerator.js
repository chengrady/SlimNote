/**
 * 代码生成工具
 * 从 JSON 数据生成各种编程语言的类型定义
 */

/**
 * 生成 TypeScript 接口
 * @param {string} json - JSON 字符串
 * @param {string} typeName - 类型名称
 * @returns {string} TypeScript 代码
 */
export function generateTypeScript(json, typeName = 'Root') {
  try {
    const obj = JSON.parse(json)
    const interfaces = []
    generateTsInterface(obj, typeName, interfaces, new Set())
    return interfaces.join('\n\n')
  } catch (e) {
    throw new Error(`TypeScript 生成失败: ${e.message}`)
  }
}

function generateTsInterface(obj, name, interfaces, generated) {
  if (generated.has(name)) return
  generated.add(name)

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const itemType = getTsType(obj[0], name + 'Item', interfaces, generated)
      interfaces.push(`export type ${name} = ${itemType}[];`)
    } else {
      interfaces.push(`export type ${name} = any[];`)
    }
    return
  }

  const lines = [`export interface ${name} {`]
  for (const [key, value] of Object.entries(obj)) {
    const tsKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
    lines.push(`  ${tsKey}: ${getTsType(value, name + '_' + key, interfaces, generated)};`)
  }
  lines.push('}')
  interfaces.push(lines.join('\n'))
}

function getTsType(value, suggestedName, interfaces, generated) {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    if (value.length > 0) {
      const itemType = getTsType(value[0], suggestedName + 'Item', interfaces, generated)
      return `(${itemType})[]`
    }
    return 'any[]'
  }
  if (typeof value === 'object') {
    generateTsInterface(value, suggestedName, interfaces, generated)
    return suggestedName
  }
  switch (typeof value) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    default: return 'any'
  }
}

/**
 * 生成 Go struct
 * @param {string} json - JSON 字符串
 * @param {string} typeName - 类型名称
 * @returns {string} Go 代码
 */
export function generateGo(json, typeName = 'Root') {
  try {
    const obj = JSON.parse(json)
    const structs = []
    generateGoStruct(obj, typeName, structs, new Set())
    return structs.join('\n\n')
  } catch (e) {
    throw new Error(`Go 生成失败: ${e.message}`)
  }
}

function generateGoStruct(obj, name, structs, generated) {
  if (generated.has(name)) return
  generated.add(name)

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const itemType = getGoType(obj[0], name + 'Item', structs, generated)
      structs.push(`type ${name} []${itemType}`)
    } else {
      structs.push(`type ${name} []interface{}`)
    }
    return
  }

  const lines = [`type ${name} struct {`]
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/[^a-zA-Z0-9]/g, '')
    const goType = getGoType(value, name + fieldName, structs, generated)
    lines.push(`  ${fieldName} ${goType} \`json:"${key}"\``)
  }
  lines.push('}')
  structs.push(lines.join('\n'))
}

function getGoType(value, suggestedName, structs, generated) {
  if (value === null) return 'interface{}'
  if (Array.isArray(value)) {
    if (value.length > 0) {
      const itemType = getGoType(value[0], suggestedName + 'Item', structs, generated)
      return `[]${itemType}`
    }
    return '[]interface{}'
  }
  if (typeof value === 'object') {
    generateGoStruct(value, suggestedName, structs, generated)
    return suggestedName
  }
  switch (typeof value) {
    case 'string': return 'string'
    case 'number': return Number.isInteger(value) ? 'int64' : 'float64'
    case 'boolean': return 'bool'
    default: return 'interface{}'
  }
}

/**
 * 生成 Python dataclass
 * @param {string} json - JSON 字符串
 * @param {string} typeName - 类型名称
 * @returns {string} Python 代码
 */
export function generatePython(json, typeName = 'Root') {
  try {
    const obj = JSON.parse(json)
    const classes = []
    const imports = new Set(['from dataclasses import dataclass', 'from typing import Any, List, Optional, Dict'])

    generatePythonDataclass(obj, typeName, classes, new Set(), imports)

    return Array.from(imports).join('\n') + '\n\n' + classes.join('\n\n')
  } catch (e) {
    throw new Error(`Python 生成失败: ${e.message}`)
  }
}

function generatePythonDataclass(obj, name, classes, generated, imports) {
  if (generated.has(name)) return
  generated.add(name)

  const lines = ['@dataclass', `class ${name}:`]

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const itemType = getPythonType(obj[0], name + 'Item', classes, generated, imports)
      lines.push(`    items: List[${itemType}]`)
    } else {
      lines.push('    items: List[Any]')
    }
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const pyKey = key.replace(/[^a-zA-Z0-9_]/g, '_')
      const pyType = getPythonType(value, name + '_' + pyKey, classes, generated, imports)
      lines.push(`    ${pyKey}: ${pyType}`)
    }
    if (Object.keys(obj).length === 0) {
      lines.push('    pass')
    }
  }

  classes.push(lines.join('\n'))
}

function getPythonType(value, suggestedName, classes, generated, imports) {
  if (value === null) {
    imports.add('from typing import Optional')
    return 'Optional[Any]'
  }
  if (Array.isArray(value)) {
    if (value.length > 0) {
      const itemType = getPythonType(value[0], suggestedName + 'Item', classes, generated, imports)
      return `List[${itemType}]`
    }
    return 'List[Any]'
  }
  if (typeof value === 'object') {
    generatePythonDataclass(value, suggestedName, classes, generated, imports)
    return suggestedName
  }
  switch (typeof value) {
    case 'string': return 'str'
    case 'number': return Number.isInteger(value) ? 'int' : 'float'
    case 'boolean': return 'bool'
    default: return 'Any'
  }
}

/**
 * 生成 Java POJO
 * @param {string} json - JSON 字符串
 * @param {string} typeName - 类型名称
 * @returns {string} Java 代码
 */
export function generateJava(json, typeName = 'Root') {
  try {
    const obj = JSON.parse(json)
    const classes = []
    generateJavaClass(obj, typeName, classes, new Set())
    return classes.join('\n\n')
  } catch (e) {
    throw new Error(`Java 生成失败: ${e.message}`)
  }
}

function generateJavaClass(obj, name, classes, generated) {
  if (generated.has(name)) return
  generated.add(name)

  const lines = [`public class ${name} {`]

  if (Array.isArray(obj)) {
    lines.push('}')
    classes.push(lines.join('\n'))
    return
  }

  const fields = []
  const methods = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = key.replace(/[^a-zA-Z0-9]/g, '_')
    const capitalizedName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    const javaType = getJavaType(value, name + capitalizedName, classes, generated)

    // Field
    fields.push(`    private ${javaType} ${fieldName};`)

    // Getter
    methods.push(`    public ${javaType} get${capitalizedName}() {`)
    methods.push(`        return ${fieldName};`)
    methods.push('    }')

    // Setter
    methods.push(`    public void set${capitalizedName}(${javaType} ${fieldName}) {`)
    methods.push(`        this.${fieldName} = ${fieldName};`)
    methods.push('    }')
  }

  lines.push(fields.join('\n'))
  lines.push('')
  lines.push(methods.join('\n'))
  lines.push('}')

  classes.push(lines.join('\n'))
}

function getJavaType(value, suggestedName, classes, generated) {
  if (value === null) return 'Object'
  if (Array.isArray(value)) {
    if (value.length > 0) {
      const itemType = getJavaType(value[0], suggestedName + 'Item', classes, generated)
      return `List<${itemType}>`
    }
    return 'List<Object>'
  }
  if (typeof value === 'object') {
    generateJavaClass(value, suggestedName, classes, generated)
    return suggestedName
  }
  switch (typeof value) {
    case 'string': return 'String'
    case 'number': return Number.isInteger(value) ? 'Long' : 'Double'
    case 'boolean': return 'Boolean'
    default: return 'Object'
  }
}

/**
 * 生成 Rust struct
 * @param {string} json - JSON 字符串
 * @param {string} typeName - 类型名称
 * @returns {string} Rust 代码
 */
export function generateRust(json, typeName = 'Root') {
  try {
    const obj = JSON.parse(json)
    const structs = []
    generateRustStruct(obj, typeName, structs, new Set())
    return '#[derive(Debug, Clone, Serialize, Deserialize)]\n' + structs.join('\n\n#[derive(Debug, Clone, Serialize, Deserialize)]\n')
  } catch (e) {
    throw new Error(`Rust 生成失败: ${e.message}`)
  }
}

function generateRustStruct(obj, name, structs, generated) {
  if (generated.has(name)) return
  generated.add(name)

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const itemType = getRustType(obj[0], name + 'Item', structs, generated)
      structs.push(`pub type ${name} = Vec<${itemType}>;`)
    } else {
      structs.push(`pub type ${name} = Vec<serde_json::Value>;`)
    }
    return
  }

  const lines = [`pub struct ${name} {`]
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = key.replace(/[^a-zA-Z0-9]/g, '_')
    const rustType = getRustType(value, name + '_' + fieldName, structs, generated)
    lines.push(`    #[serde(rename = "${key}")]`)
    lines.push(`    pub ${fieldName}: ${rustType},`)
  }
  lines.push('}')
  structs.push(lines.join('\n'))
}

function getRustType(value, suggestedName, structs, generated) {
  if (value === null) return 'Option<serde_json::Value>'
  if (Array.isArray(value)) {
    if (value.length > 0) {
      const itemType = getRustType(value[0], suggestedName + 'Item', structs, generated)
      return `Vec<${itemType}>`
    }
    return 'Vec<serde_json::Value>'
  }
  if (typeof value === 'object') {
    generateRustStruct(value, suggestedName, structs, generated)
    return suggestedName
  }
  switch (typeof value) {
    case 'string': return 'String'
    case 'number': return Number.isInteger(value) ? 'i64' : 'f64'
    case 'boolean': return 'bool'
    default: return 'serde_json::Value'
  }
}

/**
 * 支持的代码生成语言
 */
export const languages = [
  { id: 'typescript', name: 'TypeScript', extension: '.ts', generator: generateTypeScript },
  { id: 'go', name: 'Go', extension: '.go', generator: generateGo },
  { id: 'python', name: 'Python', extension: '.py', generator: generatePython },
  { id: 'java', name: 'Java', extension: '.java', generator: generateJava },
  { id: 'rust', name: 'Rust', extension: '.rs', generator: generateRust }
]

/**
 * 生成代码
 * @param {string} json - JSON 字符串
 * @param {string} language - 语言 ID
 * @param {string} typeName - 类型名称
 * @returns {string} 生成的代码
 */
export function generateCode(json, language, typeName = 'Root') {
  const lang = languages.find(l => l.id === language)
  if (!lang) {
    throw new Error(`不支持的语言: ${language}`)
  }
  return lang.generator(json, typeName)
}
