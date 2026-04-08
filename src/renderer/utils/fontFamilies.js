const BASE_FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial', isMonospace: false },
  { label: 'Bahnschrift', value: 'Bahnschrift', isMonospace: false },
  { label: 'Cascadia Code', value: '"Cascadia Code"', isMonospace: true },
  { label: 'Cascadia Mono', value: '"Cascadia Mono"', isMonospace: true },
  { label: 'Consolas', value: 'Consolas', isMonospace: true },
  { label: 'Courier New', value: '"Courier New"', isMonospace: true },
  { label: 'DengXian', value: 'DengXian', isMonospace: false },
  { label: 'Fira Code', value: '"Fira Code"', isMonospace: true },
  { label: 'Georgia', value: 'Georgia', isMonospace: false },
  { label: 'JetBrains Mono', value: '"JetBrains Mono"', isMonospace: true },
  { label: 'KaiTi', value: 'KaiTi', isMonospace: false },
  { label: 'Lucida Console', value: '"Lucida Console"', isMonospace: true },
  { label: 'Menlo', value: 'Menlo', isMonospace: true },
  { label: 'Microsoft YaHei', value: 'Microsoft YaHei', isMonospace: false },
  { label: 'Microsoft YaHei UI', value: '"Microsoft YaHei UI"', isMonospace: false },
  { label: 'Monaco', value: 'Monaco', isMonospace: true },
  { label: 'Segoe UI', value: '"Segoe UI"', isMonospace: false },
  { label: 'SimHei', value: 'SimHei', isMonospace: false },
  { label: 'SimSun', value: 'SimSun', isMonospace: false },
  { label: 'Source Code Pro', value: '"Source Code Pro"', isMonospace: true },
  { label: 'Tahoma', value: 'Tahoma', isMonospace: false },
  { label: 'Times New Roman', value: '"Times New Roman"', isMonospace: false },
  { label: 'Trebuchet MS', value: '"Trebuchet MS"', isMonospace: false },
  { label: 'Verdana', value: 'Verdana', isMonospace: false }
]

export const FONT_FAMILIES = Object.freeze(
  [...BASE_FONT_FAMILIES].sort((left, right) => left.label.localeCompare(right.label, 'en-US', { sensitivity: 'base' }))
)

export function normalizeFontFamilyValue(value = '') {
  return String(value || '').replace(/"/g, '').trim()
}

export function findFontFamilyOption(value) {
  const normalized = normalizeFontFamilyValue(value)
  if (!normalized) return null

  return FONT_FAMILIES.find((font) => normalizeFontFamilyValue(font.value) === normalized) || null
}

export function isMonospaceFontFamily(value) {
  return Boolean(findFontFamilyOption(value)?.isMonospace)
}

export function getFontOptionStyle(font) {
  if (!font) {
    return {}
  }

  return {
    fontFamily: font.value,
    fontWeight: font.isMonospace ? '700' : '400'
  }
}
