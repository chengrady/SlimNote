import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  DEFAULT_MARKDOWN_THEME_REF,
  MARKDOWN_BUILTIN_THEMES,
  buildAppThemeStyleVars,
  buildMarkdownThemeCssVariables,
  buildMarkdownThemeStyleVars,
  getMarkdownThemeOptions,
  normalizeMarkdownThemeRef,
  resolveMarkdownTheme
} from '../src/renderer/utils/markdownThemes.js'

const editorStoreSource = readFileSync(new URL('../src/renderer/stores/editor.js', import.meta.url), 'utf8')
const settingsStoreSource = readFileSync(new URL('../src/renderer/stores/settings.js', import.meta.url), 'utf8')
const activityBarSource = readFileSync(new URL('../src/renderer/components/ActivityBar.vue', import.meta.url), 'utf8')
const editorPanelSource = readFileSync(new URL('../src/renderer/components/EditorPanel.vue', import.meta.url), 'utf8')
const modeToolbarSource = readFileSync(new URL('../src/renderer/components/MarkdownModeToolbar.vue', import.meta.url), 'utf8')
const markdownPreviewSource = readFileSync(new URL('../src/renderer/components/MarkdownPreview.vue', import.meta.url), 'utf8')
const milkdownSource = readFileSync(new URL('../src/renderer/components/MilkdownEditor.vue', import.meta.url), 'utf8')
const markdownPdfSource = readFileSync(new URL('../src/renderer/utils/markdownPdf.js', import.meta.url), 'utf8')
const mainEditorSource = readFileSync(new URL('../src/renderer/views/MainEditor.vue', import.meta.url), 'utf8')
const monacoThemesSource = readFileSync(new URL('../src/renderer/utils/monacoThemes.js', import.meta.url), 'utf8')
const monacoEditorSource = readFileSync(new URL('../src/renderer/components/MonacoEditor.vue', import.meta.url), 'utf8')
const settingsDialogSource = readFileSync(new URL('../src/renderer/components/SettingsDialog.vue', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../src/renderer/style.css', import.meta.url), 'utf8')

describe('markdown theme support', () => {
  it('defines nine extensible built-in themes for manual selection', () => {
    assert.equal(DEFAULT_MARKDOWN_THEME_REF, 'clean-paper')
    assert.deepEqual(MARKDOWN_BUILTIN_THEMES.map((theme) => theme.id), [
      'clean-paper',
      'ink-white',
      'warm-note',
      'soft-color',
      'green-sprout',
      'star-blue',
      'dusk-purple',
      'night-orange',
      'pure-black'
    ])
    assert.deepEqual(MARKDOWN_BUILTIN_THEMES.map((theme) => theme.name), [
      '清纸',
      '墨白',
      '暖笺',
      '淡彩',
      '青芽',
      '星蓝',
      '暮紫',
      '夜橙',
      '玄黑'
    ])
    assert.equal(MARKDOWN_BUILTIN_THEMES.some((theme) => theme.id === 'frost-blue' || theme.name === '霜蓝'), false)
    assert.equal(MARKDOWN_BUILTIN_THEMES.every((theme) => theme.source === 'builtin' && theme.mode && theme.colors), true)
    assert.deepEqual(getMarkdownThemeOptions().fixed.map((theme) => theme.id), MARKDOWN_BUILTIN_THEMES.map((theme) => theme.id))
    assert.equal(Object.prototype.hasOwnProperty.call(getMarkdownThemeOptions(), 'follow'), false)
  })

  it('resolves fixed themes manually without following the system color mode', () => {
    assert.equal(resolveMarkdownTheme('clean-paper', 'dark').id, 'clean-paper')
    assert.equal(resolveMarkdownTheme('star-blue', 'light').id, 'star-blue')
    assert.equal(resolveMarkdownTheme('frost-blue', 'dark').id, 'dusk-purple')
    assert.equal(normalizeMarkdownThemeRef('follow-clean-star', 'dark'), 'star-blue')
    assert.equal(normalizeMarkdownThemeRef('frost-blue', 'dark'), 'dusk-purple')
    assert.equal(normalizeMarkdownThemeRef('follow-ink-black', 'light'), 'ink-white')
    assert.equal(resolveMarkdownTheme('missing-theme', 'dark').id, 'clean-paper')

    const styleVars = buildMarkdownThemeStyleVars(resolveMarkdownTheme('night-orange', 'dark'))
    const appVars = buildAppThemeStyleVars(resolveMarkdownTheme('night-orange', 'dark'))
    const cssVars = buildMarkdownThemeCssVariables(resolveMarkdownTheme('night-orange', 'dark'))
    assert.equal(Boolean(styleVars['--md-bg']), true)
    assert.equal(Boolean(appVars['--surface-panel-strong']), true)
    assert.equal(Boolean(appVars['--json-key-color']), true)
    assert.match(cssVars, /--page-bg:/)
    assert.match(cssVars, /--mermaid-bg:/)
  })

  it('keeps primary button text readable on light and dark accent colors', () => {
    const pureBlackAppVars = buildAppThemeStyleVars(resolveMarkdownTheme('pure-black'))
    const primaryHoverStart = styleSource.indexOf('.btn-primary:hover,')
    const primaryHoverBlock = styleSource.slice(primaryHoverStart, styleSource.indexOf('}', primaryHoverStart) + 1)
    assert.equal(pureBlackAppVars['--btn-primary-text'], '#000000')
    assert.match(pureBlackAppVars['--btn-primary-hover-bg'], /#ffffff/)
    assert.equal(buildAppThemeStyleVars(resolveMarkdownTheme('ink-white'))['--btn-primary-text'], '#ffffff')
    assert.match(styleSource, /color:\s*var\(--btn-primary-text,\s*#ffffff\);/)
    assert.match(primaryHoverBlock, /background:\s*var\(--btn-primary-hover-bg,\s*var\(--accent-primary-hover\)\);/)
    assert.doesNotMatch(primaryHoverBlock, /--surface-hover/)
  })

  it('stores the selected theme globally instead of on tabs or file paths', () => {
    assert.match(settingsStoreSource, /themeRef:\s*DEFAULT_MARKDOWN_THEME_REF/)
    assert.match(settingsStoreSource, /function setThemeRef/)
    assert.match(settingsStoreSource, /buildAppThemeStyleVars/)
    assert.doesNotMatch(settingsStoreSource, /prefers-color-scheme/)
    assert.doesNotMatch(settingsStoreSource, /matchMedia/)
    assert.doesNotMatch(settingsStoreSource, /systemTheme/)
    assert.doesNotMatch(settingsStoreSource, /ensureSystemThemeWatcher/)
    assert.doesNotMatch(editorStoreSource, /markdownThemeRef/)
    assert.doesNotMatch(editorStoreSource, /updateTabMarkdownTheme/)
    assert.doesNotMatch(mainEditorSource, /getMarkdownThemeRefForPath/)
    assert.doesNotMatch(mainEditorSource, /setMarkdownThemeRefForPath/)
    assert.doesNotMatch(mainEditorSource, /markdownThemeRef/)
  })

  it('wires the global theme popup, Markdown surfaces, PDF/browser export, and Monaco to one theme', () => {
    assert.match(activityBarSource, /app-theme-menu/)
    assert.match(activityBarSource, /theme-palette-icon/)
    assert.match(activityBarSource, /settingsStore\.setThemeRef/)
    assert.doesNotMatch(activityBarSource, /followThemeOptions/)
    assert.doesNotMatch(activityBarSource, /getFollowThemeSwatchStyle/)
    assert.doesNotMatch(activityBarSource, /moon-icon|sun-icon|theme-toggle-btn\.is-dark/)
    assert.doesNotMatch(activityBarSource, /theme-toggle-btn:(?:hover|active)[\s\S]*theme-palette-icon/)
    assert.doesNotMatch(activityBarSource, /theme-palette-icon[\s\S]*transform:\s*(?:rotate|scale)/)
    assert.match(activityBarSource, /\.theme-toggle-btn:hover,\s*\.theme-toggle-btn:not\(:disabled\):active\s*\{[\s\S]*transform:\s*none;/)
    assert.match(settingsDialogSource, /activeSettingsThemeRef/)
    assert.match(settingsDialogSource, /selectSettingsTheme/)
    assert.match(settingsDialogSource, /settings-theme-picker/)
    assert.match(settingsDialogSource, /settings-theme-option/)
    assert.doesNotMatch(settingsDialogSource, /appThemeOptions\.follow/)
    assert.doesNotMatch(modeToolbarSource, /set-theme/)
    assert.doesNotMatch(modeToolbarSource, /themeOptions/)
    assert.doesNotMatch(editorPanelSource, /@set-theme="setActiveMarkdownTheme"/)
    assert.match(editorPanelSource, /settingsStore\.settings\.themeRef/)
    assert.match(editorPanelSource, /<MilkdownEditor[\s\S]*:markdown-theme="activeMarkdownTheme"/)
    assert.match(editorPanelSource, /:markdown-theme="activeMarkdownTheme"/)
    assert.match(editorPanelSource, /theme:\s*activeMarkdownTheme\.value/)
    assert.match(editorPanelSource, /\.context-preview-panel :deep\(\.markdown-preview\)[\s\S]*background:\s*var\(--md-bg\);/)
    assert.match(markdownPreviewSource, /markdownTheme:/)
    assert.match(markdownPreviewSource, /settingsStore\.effectiveTheme/)
    assert.match(markdownPreviewSource, /buildMarkdownThemeStyleVars/)
    assert.match(markdownPreviewSource, /--md-bg/)
    assert.match(milkdownSource, /markdownTheme:/)
    assert.match(milkdownSource, /settingsStore\.effectiveTheme/)
    assert.match(milkdownSource, /buildMarkdownThemeStyleVars/)
    assert.match(milkdownSource, /pendingExternalMarkdown/)
    assert.match(milkdownSource, /applyExternalMarkdown\(pendingExternalMarkdown \?\? props\.modelValue\)/)
    assert.match(milkdownSource, /background:\s*var\(--md-bg\);/)
    assert.match(milkdownSource, /color:\s*var\(--md-text\);/)
    assert.doesNotMatch(markdownPreviewSource, /settingsStore\.settings\.theme === 'dark'/)
    assert.match(markdownPdfSource, /buildMarkdownThemeCssVariables/)
    assert.doesNotMatch(markdownPdfSource, /const pdfTheme = 'light'/)
    assert.match(monacoThemesSource, /defineSlimNoteEditorTheme/)
    assert.match(monacoEditorSource, /defineSlimNoteEditorTheme/)
  })
})
