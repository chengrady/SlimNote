export const MARKDOWN_THEME_STORAGE_KEY = 'slimnote:markdown-theme-ref'
export const DEFAULT_MARKDOWN_THEME_REF = 'clean-paper'
const LEGACY_MARKDOWN_THEME_STORAGE_KEY = 'slimnote:markdown-theme-by-file'

const LEGACY_THEME_ALIASES = {
  light: 'clean-paper',
  dark: 'star-blue',
  'frost-blue': 'dusk-purple'
}

const LEGACY_FOLLOW_THEME_ALIASES = {
  'follow-clean-star': {
    light: 'clean-paper',
    dark: 'star-blue'
  },
  'follow-ink-black': {
    light: 'ink-white',
    dark: 'pure-black'
  },
  'follow-warm-orange': {
    light: 'warm-note',
    dark: 'night-orange'
  }
}

const BASE_COLORS = {
  pageBg: '#ffffff',
  surfaceBg: '#ffffff',
  textMain: '#1f2937',
  textMuted: '#6b7280',
  heading: '#111827',
  border: 'rgba(15, 23, 42, 0.12)',
  accent: '#2563eb',
  accentRgb: '37, 99, 235',
  codeBg: '#f6f8fb',
  codeText: '#111827',
  inlineCode: '#7c2d12',
  quoteBg: 'rgba(37, 99, 235, 0.06)',
  tableStripe: 'rgba(15, 23, 42, 0.03)',
  markBg: 'rgba(255, 214, 10, 0.35)',
  selectionBg: 'rgba(37, 99, 235, 0.18)',
  mermaidBg: '#ffffff'
}

function themeColors(colors = {}) {
  return { ...BASE_COLORS, ...colors }
}

function parseRgbColor(rgbValue) {
  const channels = String(rgbValue || '').split(',').map((channel) => Number(channel.trim()))
  if (channels.length < 3 || channels.slice(0, 3).some((channel) => !Number.isFinite(channel))) return null
  return channels.slice(0, 3).map((channel) => Math.min(255, Math.max(0, channel)))
}

function getRelativeLuminance(channel) {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function getContrastingTextColor(rgbValue) {
  const channels = parseRgbColor(rgbValue)
  if (!channels) return '#ffffff'
  const [r, g, b] = channels.map(getRelativeLuminance)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const whiteContrast = 1.05 / (luminance + 0.05)
  const blackContrast = (luminance + 0.05) / 0.05
  return blackContrast > whiteContrast ? '#000000' : '#ffffff'
}

export const MARKDOWN_BUILTIN_THEMES = [
  {
    id: 'clean-paper',
    name: '清纸',
    description: '干净白纸，接近当前默认预览。',
    source: 'builtin',
    mode: 'light',
    colors: themeColors()
  },
  {
    id: 'ink-white',
    name: '墨白',
    description: '白底黑字，正文更利落。',
    source: 'builtin',
    mode: 'light',
    colors: themeColors({
      textMain: '#050505',
      textMuted: '#222222',
      heading: '#000000',
      border: 'rgba(0, 0, 0, 0.18)',
      accent: '#000000',
      accentRgb: '0, 0, 0',
      codeText: '#000000',
      inlineCode: '#000000',
      quoteBg: 'rgba(0, 0, 0, 0.04)',
      tableStripe: 'rgba(0, 0, 0, 0.035)',
      selectionBg: 'rgba(0, 0, 0, 0.12)'
    })
  },
  {
    id: 'warm-note',
    name: '暖笺',
    description: '暖纸色，适合长文阅读。',
    source: 'builtin',
    mode: 'light',
    colors: themeColors({
      pageBg: '#fff7ed',
      surfaceBg: '#fffaf2',
      textMain: '#3f3428',
      textMuted: '#8a6f57',
      heading: '#2d241c',
      border: 'rgba(126, 79, 43, 0.18)',
      accent: '#b45309',
      accentRgb: '180, 83, 9',
      codeBg: '#f8ead8',
      codeText: '#4a2f1a',
      inlineCode: '#9a3412',
      quoteBg: 'rgba(217, 119, 6, 0.12)',
      tableStripe: 'rgba(180, 83, 9, 0.06)',
      markBg: 'rgba(250, 204, 21, 0.36)',
      selectionBg: 'rgba(180, 83, 9, 0.17)',
      mermaidBg: '#fffaf2'
    })
  },
  {
    id: 'soft-color',
    name: '淡彩',
    description: '浅色彩点缀，层次更活泼。',
    source: 'builtin',
    mode: 'light',
    colors: themeColors({
      pageBg: '#fbfdff',
      surfaceBg: '#ffffff',
      textMain: '#1e293b',
      textMuted: '#64748b',
      heading: '#0f172a',
      border: 'rgba(59, 130, 246, 0.16)',
      accent: '#7c3aed',
      accentRgb: '124, 58, 237',
      codeBg: '#f0f7ff',
      codeText: '#172554',
      inlineCode: '#be123c',
      quoteBg: 'rgba(20, 184, 166, 0.11)',
      tableStripe: 'rgba(124, 58, 237, 0.045)',
      markBg: 'rgba(251, 191, 36, 0.34)',
      selectionBg: 'rgba(124, 58, 237, 0.16)',
      mermaidBg: '#ffffff'
    })
  },
  {
    id: 'green-sprout',
    name: '青芽',
    description: '清淡绿色，安静柔和。',
    source: 'builtin',
    mode: 'light',
    colors: themeColors({
      pageBg: '#f7fbf4',
      surfaceBg: '#fbfff7',
      textMain: '#24352c',
      textMuted: '#697a70',
      heading: '#14251d',
      border: 'rgba(73, 115, 88, 0.2)',
      accent: '#2f855a',
      accentRgb: '47, 133, 90',
      codeBg: '#edf7ec',
      codeText: '#123524',
      inlineCode: '#166534',
      quoteBg: 'rgba(47, 133, 90, 0.1)',
      tableStripe: 'rgba(47, 133, 90, 0.055)',
      markBg: 'rgba(190, 242, 100, 0.36)',
      selectionBg: 'rgba(47, 133, 90, 0.16)',
      mermaidBg: '#fbfff7'
    })
  },
  {
    id: 'star-blue',
    name: '星蓝',
    description: '深蓝夜色，颜色更丰富。',
    source: 'builtin',
    mode: 'dark',
    colors: themeColors({
      pageBg: '#101827',
      surfaceBg: '#162034',
      textMain: '#e6edf7',
      textMuted: '#9fb0c6',
      heading: '#f8fbff',
      border: 'rgba(148, 163, 184, 0.24)',
      accent: '#7dd3fc',
      accentRgb: '125, 211, 252',
      codeBg: '#0b1220',
      codeText: '#e2e8f0',
      inlineCode: '#f9a8d4',
      quoteBg: 'rgba(125, 211, 252, 0.12)',
      tableStripe: 'rgba(125, 211, 252, 0.06)',
      markBg: 'rgba(250, 204, 21, 0.24)',
      selectionBg: 'rgba(125, 211, 252, 0.2)',
      mermaidBg: '#162034'
    })
  },
  {
    id: 'dusk-purple',
    name: '暮紫',
    description: '深紫黑底，紫粉青点缀。',
    source: 'builtin',
    mode: 'dark',
    colors: themeColors({
      pageBg: '#282a36',
      surfaceBg: '#303241',
      textMain: '#f8f8f2',
      textMuted: '#b6bdd8',
      heading: '#ffffff',
      border: 'rgba(189, 147, 249, 0.24)',
      accent: '#bd93f9',
      accentRgb: '189, 147, 249',
      codeBg: '#1e1f29',
      codeText: '#f8f8f2',
      inlineCode: '#ff79c6',
      quoteBg: 'rgba(139, 233, 253, 0.1)',
      tableStripe: 'rgba(189, 147, 249, 0.06)',
      markBg: 'rgba(241, 250, 140, 0.24)',
      selectionBg: 'rgba(189, 147, 249, 0.22)',
      mermaidBg: '#303241'
    })
  },
  {
    id: 'night-orange',
    name: '夜橙',
    description: '黑底暖橙，适合夜间阅读。',
    source: 'builtin',
    mode: 'dark',
    colors: themeColors({
      pageBg: '#120f0c',
      surfaceBg: '#1c1712',
      textMain: '#f5eadf',
      textMuted: '#b9a38d',
      heading: '#fff7ed',
      border: 'rgba(251, 146, 60, 0.24)',
      accent: '#fb923c',
      accentRgb: '251, 146, 60',
      codeBg: '#0d0b09',
      codeText: '#fed7aa',
      inlineCode: '#fdba74',
      quoteBg: 'rgba(251, 146, 60, 0.12)',
      tableStripe: 'rgba(251, 146, 60, 0.06)',
      markBg: 'rgba(251, 191, 36, 0.24)',
      selectionBg: 'rgba(251, 146, 60, 0.2)',
      mermaidBg: '#1c1712'
    })
  },
  {
    id: 'pure-black',
    name: '玄黑',
    description: '纯黑背景，纯白正文。',
    source: 'builtin',
    mode: 'dark',
    colors: themeColors({
      pageBg: '#000000',
      surfaceBg: '#000000',
      textMain: '#ffffff',
      textMuted: '#d6d6d6',
      heading: '#ffffff',
      border: 'rgba(255, 255, 255, 0.22)',
      accent: '#ffffff',
      accentRgb: '255, 255, 255',
      codeBg: '#050505',
      codeText: '#ffffff',
      inlineCode: '#ffffff',
      quoteBg: 'rgba(255, 255, 255, 0.08)',
      tableStripe: 'rgba(255, 255, 255, 0.055)',
      markBg: 'rgba(255, 255, 255, 0.2)',
      selectionBg: 'rgba(255, 255, 255, 0.2)',
      mermaidBg: '#000000'
    })
  }
]

const BUILTIN_THEME_MAP = new Map(MARKDOWN_BUILTIN_THEMES.map((theme) => [theme.id, theme]))

export function getMarkdownThemeOptions() {
  return {
    fixed: MARKDOWN_BUILTIN_THEMES
  }
}

function resolveLegacyThemeAlias(raw, preferredMode = 'light') {
  if (LEGACY_THEME_ALIASES[raw]) return LEGACY_THEME_ALIASES[raw]
  const followAlias = LEGACY_FOLLOW_THEME_ALIASES[raw]
  if (!followAlias) return raw
  return preferredMode === 'dark' ? followAlias.dark : followAlias.light
}

export function normalizeMarkdownThemeRef(themeRef, preferredMode = 'light') {
  const raw = String(themeRef || '').trim()
  const normalized = resolveLegacyThemeAlias(raw, preferredMode)
  if (BUILTIN_THEME_MAP.has(normalized)) {
    return normalized
  }
  return DEFAULT_MARKDOWN_THEME_REF
}

export function getMarkdownThemeById(themeId) {
  return BUILTIN_THEME_MAP.get(normalizeMarkdownThemeRef(themeId)) || BUILTIN_THEME_MAP.get(DEFAULT_MARKDOWN_THEME_REF)
}

export function resolveMarkdownTheme(themeRef = DEFAULT_MARKDOWN_THEME_REF, appTheme = 'light') {
  if (themeRef && typeof themeRef === 'object' && themeRef.colors) {
    return themeRef
  }

  const normalizedRef = normalizeMarkdownThemeRef(themeRef, appTheme)
  const theme = BUILTIN_THEME_MAP.get(normalizedRef) || BUILTIN_THEME_MAP.get(DEFAULT_MARKDOWN_THEME_REF)

  return {
    ...theme,
    selectedThemeRef: normalizedRef,
    selectedThemeName: theme.name
  }
}

export function buildMarkdownThemeStyleVars(theme = MARKDOWN_BUILTIN_THEMES[0]) {
  const colors = theme?.colors || BASE_COLORS

  return {
    '--md-bg': colors.pageBg,
    '--md-surface': colors.surfaceBg,
    '--md-text': colors.textMain,
    '--md-muted': colors.textMuted,
    '--md-heading': colors.heading,
    '--md-border': colors.border,
    '--md-accent': colors.accent,
    '--md-accent-rgb': colors.accentRgb,
    '--md-code-bg': colors.codeBg,
    '--md-code-text': colors.codeText,
    '--md-inline-code': colors.inlineCode,
    '--md-quote-bg': colors.quoteBg,
    '--md-table-stripe': colors.tableStripe,
    '--md-mark-bg': colors.markBg,
    '--md-selection-bg': colors.selectionBg,
    '--md-mermaid-bg': colors.mermaidBg
  }
}

export function buildAppThemeStyleVars(theme = MARKDOWN_BUILTIN_THEMES[0]) {
  const colors = theme?.colors || BASE_COLORS
  const isDark = theme?.mode === 'dark'
  const panelMix = isDark ? 92 : 96
  const toolbarMix = isDark ? 86 : 90
  const hoverAlpha = isDark ? 0.16 : 0.08
  const selectedAlpha = isDark ? 0.24 : 0.12
  const activeAlpha = isDark ? 0.22 : 0.1
  const accentRgb = colors.accentRgb || BASE_COLORS.accentRgb
  const btnPrimaryText = getContrastingTextColor(accentRgb)
  const accentSecondary = `color-mix(in srgb, ${colors.accent} 76%, ${colors.textMain})`
  const accentHover = `color-mix(in srgb, ${colors.accent} 86%, ${colors.textMain})`
  const accentGradient = `linear-gradient(90deg, ${colors.accent}, ${accentSecondary})`
  const accentGradientHover = `linear-gradient(90deg, ${accentHover}, color-mix(in srgb, ${colors.accent} 72%, ${colors.textMain}))`

  return {
    '--bg-deep': colors.pageBg,
    '--bg-primary': colors.surfaceBg,
    '--bg-secondary': colors.codeBg,
    '--bg-gradient': `linear-gradient(180deg, ${colors.pageBg} 0%, ${colors.surfaceBg} 100%)`,
    '--bg-overlay-gradient': `radial-gradient(circle at top, rgba(${accentRgb}, ${isDark ? 0.12 : 0.07}) 0%, transparent 62%)`,
    '--glass-bg': `color-mix(in srgb, ${colors.surfaceBg} ${isDark ? 92 : 94}%, transparent)`,
    '--glass-bg-hover': `color-mix(in srgb, ${colors.surfaceBg} ${isDark ? 96 : 98}%, ${colors.accent} ${isDark ? 4 : 2}%)`,
    '--glass-bg-active': colors.surfaceBg,
    '--glass-border': colors.border,
    '--surface-panel': `color-mix(in srgb, ${colors.surfaceBg} ${panelMix}%, ${colors.accent})`,
    '--surface-panel-strong': colors.surfaceBg,
    '--surface-toolbar': `color-mix(in srgb, ${colors.codeBg} ${toolbarMix}%, ${colors.surfaceBg})`,
    '--surface-hover': `rgba(${accentRgb}, ${hoverAlpha})`,
    '--surface-active': `rgba(${accentRgb}, ${activeAlpha})`,
    '--surface-popover': `color-mix(in srgb, ${colors.surfaceBg} 94%, ${colors.pageBg})`,
    '--shadow-subtle': isDark ? '0 1px 2px rgba(0, 0, 0, 0.34), 0 1px 0 rgba(255, 255, 255, 0.035) inset' : '0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 0 rgba(255, 255, 255, 0.72) inset',
    '--shadow-panel': isDark ? '0 14px 34px rgba(0, 0, 0, 0.42), 0 1px 0 rgba(255, 255, 255, 0.045) inset' : '0 10px 30px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255, 255, 255, 0.76) inset',
    '--shadow-floating': isDark ? '0 18px 46px rgba(0, 0, 0, 0.56), 0 1px 0 rgba(255, 255, 255, 0.05) inset' : '0 16px 42px rgba(15, 23, 42, 0.14), 0 1px 0 rgba(255, 255, 255, 0.68) inset',
    '--shadow-popover': isDark ? '0 22px 52px rgba(0, 0, 0, 0.62), 0 8px 20px rgba(0, 0, 0, 0.32), 0 1px 0 rgba(255, 255, 255, 0.055) inset' : '0 18px 44px rgba(15, 23, 42, 0.16), 0 6px 16px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255, 255, 255, 0.72) inset',
    '--shadow-press': isDark ? 'inset 0 1px 2px rgba(0, 0, 0, 0.46)' : 'inset 0 1px 2px rgba(15, 23, 42, 0.1)',
    '--glass-shadow': 'var(--shadow-floating)',
    '--panel-card-shadow': 'var(--shadow-panel)',
    '--menu-card-shadow': 'var(--shadow-popover)',
    '--interactive-hover-bg': `rgba(${accentRgb}, ${hoverAlpha})`,
    '--interactive-hover-border': `rgba(${accentRgb}, ${isDark ? 0.32 : 0.2})`,
    '--interactive-hover-ring': `0 0 0 1px rgba(${accentRgb}, ${isDark ? 0.2 : 0.08})`,
    '--interactive-active-shadow': isDark ? '0 8px 18px rgba(0, 0, 0, 0.38)' : '0 6px 16px rgba(15, 23, 42, 0.08)',
    '--interactive-selected-bg': `rgba(${accentRgb}, ${selectedAlpha})`,
    '--interactive-selected-border': `rgba(${accentRgb}, ${isDark ? 0.42 : 0.24})`,
    '--interactive-hover-bg-strong': `rgba(${accentRgb}, ${isDark ? 0.22 : 0.12})`,
    '--interactive-selected-bg-strong': `rgba(${accentRgb}, ${isDark ? 0.28 : 0.14})`,
    '--interactive-selected-border-strong': `rgba(${accentRgb}, ${isDark ? 0.56 : 0.4})`,
    '--interactive-drag-shadow': `inset 0 0 0 1px rgba(${accentRgb}, ${isDark ? 0.36 : 0.24})`,
    '--icon-button-hover-bg': `rgba(${accentRgb}, ${isDark ? 0.15 : 0.08})`,
    '--icon-button-hover-color': colors.accent,
    '--window-control-hover-bg': `rgba(${accentRgb}, ${hoverAlpha})`,
    '--window-control-hover-color': colors.textMain,
    '--resizer-handle-bg': `rgba(${accentRgb}, ${isDark ? 0.18 : 0.12})`,
    '--resizer-active-bg': `rgba(${accentRgb}, ${isDark ? 0.6 : 0.45})`,
    '--accent-primary': colors.accent,
    '--accent-secondary': accentSecondary,
    '--accent-gradient': accentGradient,
    '--accent-primary-hover': accentHover,
    '--accent-primary-rgb': accentRgb,
    '--btn-primary-bg': accentGradient,
    '--btn-primary-hover-bg': accentGradientHover,
    '--btn-primary-text': btnPrimaryText,
    '--text-main': colors.textMain,
    '--text-muted': colors.textMuted,
    '--text-dim': `color-mix(in srgb, ${colors.textMuted} 76%, ${colors.pageBg})`,
    '--text-interactive': colors.textMuted,
    '--text-interactive-hover': colors.textMain,
    '--text-interactive-active': colors.accent,
    '--text-shortcut': colors.textMuted,
    '--input-bg': colors.surfaceBg,
    '--btn-bg': `color-mix(in srgb, ${colors.codeBg} 78%, ${colors.surfaceBg})`,
    '--btn-hover-bg': `rgba(${accentRgb}, ${hoverAlpha})`,
    '--scrollbar-thumb': `rgba(${accentRgb}, ${isDark ? 0.34 : 0.22})`,
    '--scrollbar-thumb-hover': `rgba(${accentRgb}, ${isDark ? 0.48 : 0.34})`,
    '--editor-bg': colors.codeBg,
    '--color-bg-secondary': colors.codeBg,
    '--color-bg-tertiary': `color-mix(in srgb, ${colors.codeBg} 82%, ${colors.accent})`,
    '--color-border': colors.border,
    '--color-text': colors.textMain,
    '--color-text-primary': colors.textMain,
    '--color-text-secondary': colors.textMuted,
    '--color-primary': colors.accent,
    '--json-surface-bg': `linear-gradient(180deg, ${colors.surfaceBg} 0%, ${colors.codeBg} 100%)`,
    '--json-toolbar-bg': `color-mix(in srgb, ${colors.surfaceBg} 88%, transparent)`,
    '--json-toolbar-border': colors.border,
    '--json-input-bg': colors.surfaceBg,
    '--json-input-border': colors.border,
    '--json-input-focus': `rgba(${accentRgb}, 0.18)`,
    '--json-tree-hover-bg': `rgba(${accentRgb}, ${hoverAlpha})`,
    '--json-tree-match-bg': colors.markBg,
    '--json-tree-match-border': `rgba(${accentRgb}, 0.24)`,
    '--json-tree-guide-color': `rgba(${accentRgb}, ${isDark ? 0.28 : 0.18})`,
    '--json-tree-active-bg': `rgba(${accentRgb}, ${selectedAlpha})`,
    '--json-tree-active-border': `rgba(${accentRgb}, ${isDark ? 0.34 : 0.22})`,
    '--json-tree-active-glow': `0 10px 24px rgba(${accentRgb}, ${isDark ? 0.16 : 0.08})`,
    '--json-stats-bg': `color-mix(in srgb, ${colors.surfaceBg} 92%, transparent)`,
    '--json-stats-border': colors.border,
    '--json-key-color': colors.accent,
    '--json-string-color': isDark ? '#9ece6a' : '#2f855a',
    '--json-number-color': isDark ? '#ffb86c' : '#c05621',
    '--json-boolean-color': isDark ? '#c4b5fd' : '#7c3aed',
    '--json-null-color': colors.textMuted,
    '--json-valid-color': isDark ? '#34d399' : '#1f9d68',
    '--json-invalid-color': isDark ? '#f87171' : '#dc2626',
    '--json-chip-bg': `rgba(${accentRgb}, ${hoverAlpha})`,
    '--json-chip-border': `rgba(${accentRgb}, ${isDark ? 0.18 : 0.12})`
  }
}

export function buildMarkdownThemeCssVariables(theme = MARKDOWN_BUILTIN_THEMES[0]) {
  const colors = theme?.colors || BASE_COLORS

  return [
    `--page-bg: ${colors.pageBg};`,
    `--surface-bg: ${colors.surfaceBg};`,
    `--text-main: ${colors.textMain};`,
    `--text-muted: ${colors.textMuted};`,
    `--heading-color: ${colors.heading};`,
    `--border-color: ${colors.border};`,
    `--accent: ${colors.accent};`,
    `--accent-rgb: ${colors.accentRgb};`,
    `--code-bg: ${colors.codeBg};`,
    `--code-text: ${colors.codeText};`,
    `--inline-code: ${colors.inlineCode};`,
    `--quote-bg: ${colors.quoteBg};`,
    `--table-stripe: ${colors.tableStripe};`,
    `--mark-bg: ${colors.markBg};`,
    `--selection-bg: ${colors.selectionBg};`,
    `--mermaid-bg: ${colors.mermaidBg};`
  ].join('\n\t\t\t\t')
}

function readLegacyGlobalThemeRef() {
  if (typeof localStorage === 'undefined') return DEFAULT_MARKDOWN_THEME_REF

  try {
    const raw = localStorage.getItem(LEGACY_MARKDOWN_THEME_STORAGE_KEY)
    if (!raw) return DEFAULT_MARKDOWN_THEME_REF
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.global) {
      return normalizeMarkdownThemeRef(parsed.global)
    }
    if (parsed && typeof parsed === 'object' && parsed.themeRef) {
      return normalizeMarkdownThemeRef(parsed.themeRef)
    }
  } catch (error) {
    console.error('Failed to load legacy Markdown theme ref', error)
  }

  return DEFAULT_MARKDOWN_THEME_REF
}

export function getGlobalMarkdownThemeRef() {
  if (typeof localStorage === 'undefined') return DEFAULT_MARKDOWN_THEME_REF

  try {
    const raw = localStorage.getItem(MARKDOWN_THEME_STORAGE_KEY)
    if (raw) return normalizeMarkdownThemeRef(raw)
  } catch (error) {
    console.error('Failed to load global Markdown theme ref', error)
  }

  return readLegacyGlobalThemeRef()
}

export function setGlobalMarkdownThemeRef(themeRef = DEFAULT_MARKDOWN_THEME_REF) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(MARKDOWN_THEME_STORAGE_KEY, normalizeMarkdownThemeRef(themeRef))
  } catch (error) {
    console.error('Failed to save global Markdown theme ref', error)
  }
}
