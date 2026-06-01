import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const aiPanelSource = readFileSync(new URL('../src/renderer/components/AiAssistantPanel.vue', import.meta.url), 'utf8')
const editorPanelSource = readFileSync(new URL('../src/renderer/components/EditorPanel.vue', import.meta.url), 'utf8')
const aiPromptsSource = readFileSync(new URL('../src/renderer/utils/aiPrompts.js', import.meta.url), 'utf8')
const zhCN = readFileSync(new URL('../src/renderer/locales/zh-CN.json', import.meta.url), 'utf8')
const enUS = readFileSync(new URL('../src/renderer/locales/en-US.json', import.meta.url), 'utf8')

describe('AI assistant apply actions', () => {
  it('keeps replace-selection enabled by refreshing editor selection from document events', () => {
    assert.match(aiPanelSource, /const currentSelectionText = ref\(''\)/)
    assert.match(aiPanelSource, /function syncCurrentSelectionText\(/)
    assert.match(aiPanelSource, /function handleDocumentSelectionRefresh\(/)
    assert.match(aiPanelSource, /document\.addEventListener\('selectionchange', handleDocumentSelectionRefresh, true\)/)
    assert.match(aiPanelSource, /document\.addEventListener\('mouseup', handleDocumentSelectionRefresh, true\)/)
    assert.match(aiPanelSource, /document\.addEventListener\('keyup', handleDocumentSelectionRefresh, true\)/)
    assert.match(aiPanelSource, /document\.removeEventListener\('selectionchange', handleDocumentSelectionRefresh, true\)/)
  })

  it('offers an explicit replace-current-document action for full document updates', () => {
    assert.match(aiPanelSource, /:title="t\('ai\.replaceDocument'\)"/)
    assert.match(aiPanelSource, /@click="handleApplyResult\('replace-document', message\.content\)"/)
    assert.match(editorPanelSource, /if \(action === 'replace-document'\) \{[\s\S]*editorStore\.updateTabContent\(activeTab\.value\.id, content\)[\s\S]*return[\s\S]*\}/)
    assert.match(zhCN, /"replaceDocument": "替换全文"/)
    assert.match(enUS, /"replaceDocument": "Replace Document"/)
  })

  it('auto-applies clear freeform edit requests after the AI response completes', () => {
    assert.match(aiPanelSource, /import \{ resolveAiAutoApplyIntent \} from '\.\.\/utils\/aiAutoApply'/)
    assert.match(aiPanelSource, /const autoApplyIntent = resolveAiAutoApplyIntent\(/)
    assert.match(aiPanelSource, /rememberAutoApplyIntent\(requestId, autoApplyIntent\)/)
    assert.match(aiPanelSource, /applyAutoResult\(autoApplyIntent, assistantMessage\?\.content \|\| ''\)/)
  })

  it('treats the quick polish action as a full-document edit', () => {
    assert.match(aiPromptsSource, /export const POLISH_DOCUMENT_ACTION_ID = 'polish-document'/)
    assert.match(aiPromptsSource, /labelKey: 'ai\.actions\.polishDocument'/)
    assert.match(aiPromptsSource, /Polish the full current document/)
    assert.match(aiPanelSource, /'polish-selection': POLISH_DOCUMENT_ACTION_ID/)
    assert.match(aiPanelSource, /function isFullDocumentQuickEditAction\(actionId\) \{[\s\S]*POLISH_DOCUMENT_ACTION_ID[\s\S]*PROOFREAD_DOCUMENT_ACTION_ID/)
    assert.match(aiPanelSource, /manualContext:\s*\{[\s\S]*fullDocument: true/)
    assert.match(zhCN, /"polishDocument": "润色"/)
    assert.match(enUS, /"polishDocument": "Polish"/)
  })

  it('adds a proofread quick action for conservative typo and punctuation correction', () => {
    assert.match(aiPromptsSource, /export const PROOFREAD_DOCUMENT_ACTION_ID = 'proofread-document'/)
    assert.match(aiPromptsSource, /labelKey: 'ai\.actions\.proofreadDocument'/)
    assert.match(aiPromptsSource, /Proofread the full current document/)
    assert.match(aiPromptsSource, /Correct only typos, wrong characters, obvious grammar issues, duplicated words, punctuation, spacing, and formatting mistakes/)
    assert.match(aiPromptsSource, /code blocks, inline code, links, commands, file paths, and configuration keys/)
    assert.match(aiPanelSource, /PROOFREAD_DOCUMENT_ACTION_ID/)
    assert.match(zhCN, /"proofreadDocument": "纠错"/)
    assert.match(enUS, /"proofreadDocument": "Proofread"/)
  })

  it('omits retired title and outline quick actions', () => {
    assert.doesNotMatch(aiPromptsSource, /generate-title/)
    assert.doesNotMatch(aiPromptsSource, /generate-outline/)
    assert.doesNotMatch(aiPromptsSource, /ai\.actions\.generateTitle/)
    assert.doesNotMatch(aiPromptsSource, /ai\.actions\.generateOutline/)
    assert.doesNotMatch(zhCN, /"generateTitle"/)
    assert.doesNotMatch(zhCN, /"generateOutline"/)
    assert.doesNotMatch(enUS, /"generateTitle"/)
    assert.doesNotMatch(enUS, /"generateOutline"/)
  })
})
