import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../src/renderer/utils/markdownPdf.js', import.meta.url), 'utf8')
const editorPanelSource = readFileSync(new URL('../src/renderer/components/EditorPanel.vue', import.meta.url), 'utf8')

describe('markdown PDF list prefixes', () => {
  it('decorates list prefixes before the no-Mermaid fast path returns', () => {
    const decorateIndex = source.indexOf('decorateListPrefixes(root, { includeTaskListPrefix: false })')
    const noMermaidFastPathIndex = source.indexOf('if (!mermaidBlocks.length)')

    assert.ok(decorateIndex > -1)
    assert.ok(noMermaidFastPathIndex > -1)
    assert.ok(decorateIndex < noMermaidFastPathIndex)
    assert.match(source, /\.markdown-body ul,\s*\.markdown-body ol \{[\s\S]*list-style:\s*none;/)
  })

  it('does not pass the file name as an extra PDF document header', () => {
    assert.match(editorPanelSource, /buildMarkdownPdfDocument\(\{[\s\S]*title:\s*''/)
    assert.doesNotMatch(editorPanelSource, /stripMarkdownFileExtension/)
  })
})
