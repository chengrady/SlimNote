import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const monacoSource = readFileSync(new URL('../src/renderer/components/MonacoEditor.vue', import.meta.url), 'utf8')
const milkdownSource = readFileSync(new URL('../src/renderer/components/MilkdownEditor.vue', import.meta.url), 'utf8')
const jsonTreePanelSource = readFileSync(new URL('../src/renderer/components/JsonTreePanel.vue', import.meta.url), 'utf8')
const treeNodeSource = readFileSync(new URL('../src/renderer/components/TreeNode.vue', import.meta.url), 'utf8')
const welcomeWorkbenchSource = readFileSync(new URL('../src/renderer/components/WelcomeWorkbench.vue', import.meta.url), 'utf8')

describe('P2 editor comfort polish', () => {
  it('adds top and bottom padding inside the Monaco editor viewport', () => {
    assert.match(monacoSource, /scrollBeyondLastLine:\s*false,[\s\S]*padding:\s*\{\s*top:\s*16,\s*bottom:\s*32\s*\}/)
  })

  it('keeps Milkdown horizontal rhythm while adding more vertical breathing room', () => {
    assert.match(milkdownSource, /\.milkdown-editor-container :deep\(\.ProseMirror\)\s*\{[\s\S]*padding:\s*clamp\(28px,\s*3vw,\s*42px\)\s+clamp\(20px,\s*2\.8vw,\s*36px\)\s+clamp\(40px,\s*4vw,\s*60px\);/)
  })

  it('aligns JSON container keys with leaf keys by moving the disclosure affordance left', () => {
    assert.match(treeNodeSource, /--json-tree-disclosure-space:\s*22px;/)
    assert.match(treeNodeSource, /\.expand-icon\s*\{[\s\S]*margin-left:\s*calc\(var\(--json-tree-disclosure-space\) \* -1\);/)
    assert.match(jsonTreePanelSource, /\.tree-content\s*\{[\s\S]*padding:\s*10px 10px 14px 20px;/)
  })

  it('keeps the welcome workbench from drawing a second editor border', () => {
    assert.match(welcomeWorkbenchSource, /<div class="empty-editor">/)
    assert.doesNotMatch(welcomeWorkbenchSource, /<div class="empty-editor ui-pane">/)
  })
})
