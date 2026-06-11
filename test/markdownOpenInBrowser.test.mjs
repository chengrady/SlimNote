import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const mainSource = readFileSync(new URL('../electron/main.js', import.meta.url), 'utf8')
const preloadSource = readFileSync(new URL('../electron/preload.js', import.meta.url), 'utf8')
const editorPanelSource = readFileSync(new URL('../src/renderer/components/EditorPanel.vue', import.meta.url), 'utf8')
const modeToolbarSource = readFileSync(new URL('../src/renderer/components/MarkdownModeToolbar.vue', import.meta.url), 'utf8')
const markdownPdfSource = readFileSync(new URL('../src/renderer/utils/markdownPdf.js', import.meta.url), 'utf8')

describe('markdown open in browser wiring', () => {
  it('renders a Markdown mode toolbar button for browser HTML preview', () => {
    assert.match(modeToolbarSource, /在浏览器中打开渲染后的 Markdown/)
    assert.match(modeToolbarSource, /@click="\$emit\('open-browser'\)"/)
    assert.match(modeToolbarSource, /defineEmits\(\[[\s\S]*'open-browser'[\s\S]*\]\)/)
  })

  it('builds browser HTML from current Markdown content and calls the preload API', () => {
    assert.match(editorPanelSource, /@open-browser="openMarkdownInBrowser"/)
    assert.match(editorPanelSource, /buildMarkdownBrowserDocument\(\{[\s\S]*content:\s*activeTab\.value\.content/)
    assert.match(editorPanelSource, /openMarkdownHtmlInBrowser/)
  })

  it('exposes a dedicated preload and main-process IPC for browser HTML previews', () => {
    assert.match(preloadSource, /openMarkdownHtmlInBrowser:\s*\(payload\)\s*=>\s*ipcRenderer\.invoke\('open-markdown-html-in-browser', payload\)/)
    assert.doesNotMatch(preloadSource, /from 'fs'|from 'os'|from 'path'|from 'url'/)
    assert.doesNotMatch(preloadSource, /openMarkdownHtmlInBrowserFromPreload|isMissingIpcHandlerError/)
    assert.match(mainSource, /ipcMain\.handle\('open-markdown-html-in-browser'/)
    assert.match(mainSource, /http\.createServer\(handleMarkdownBrowserPreviewRequest\)/)
    assert.match(mainSource, /markdownBrowserPreviewPages\.set\(token/)
    assert.match(mainSource, /const previewUrl = `\$\{origin\}\/markdown-preview\/\$\{token\}`/)
    assert.match(mainSource, /await shell\.openExternal\(previewUrl\)/)
    assert.match(mainSource, /execFileAsync\('cmd\.exe', \['\/d', '\/s', '\/c', 'start', '', previewUrl\]/)
    assert.doesNotMatch(mainSource, /shell\.openPath\(filePath\)/)
  })

  it('shows a restart hint when the renderer is newer than the running main process', () => {
    assert.match(editorPanelSource, /No handler registered for 'open-markdown-html-in-browser'/)
    assert.match(editorPanelSource, /请完全退出 SlimNote 后重新打开/)
  })

  it('provides a browser document builder without the PDF export subtitle', () => {
    assert.match(markdownPdfSource, /export async function buildMarkdownBrowserDocument/)
    assert.doesNotMatch(markdownPdfSource.match(/export async function buildMarkdownBrowserDocument[\s\S]*?export async function buildMarkdownPdfDocument/)?.[0] || '', /由 SlimNote 导出为 PDF/)
  })
})
